import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';

function freq(papers, field) {
  const c = {};
  papers.forEach(p => {
    (p.extracted && p.extracted[field] || []).forEach(v => {
      const k = String(v).trim();
      if (k) c[k] = (c[k] || 0) + 1;
    });
  });
  return Object.entries(c).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const { project_id } = await req.json();
    if (!project_id) return Response.json({ error: 'project_id required' }, { status: 400 });

    const papers = await base44.entities.Paper.filter({ project_id, processing_status: 'completed' });
    if (!papers.length) return Response.json({ error: 'No processed papers to analyze yet.' }, { status: 400 });

    const stats = {
      models: freq(papers, 'models'),
      datasets: freq(papers, 'datasets'),
      methods: freq(papers, 'methods'),
      metrics: freq(papers, 'metrics'),
      limitations: freq(papers, 'limitations'),
      future_work: freq(papers, 'future_work')
    };

    const paperSummaries = papers.map((p, i) => ({
      id: `P${i + 1}`,
      title: p.title || p.file_name,
      limitations: (p.extracted && p.extracted.limitations) || [],
      future_work: (p.extracted && p.extracted.future_work) || [],
      models: (p.extracted && p.extracted.models) || [],
      datasets: (p.extracted && p.extracted.datasets) || [],
      methods: (p.extracted && p.extracted.methods) || []
    }));

    const prompt = `You are a research intelligence engine. Based on the following aggregated evidence from ${papers.length} analyzed papers, generate candidate research-gap opportunities. Each gap MUST be DERIVED from observable evidence: repeated limitations, underexplored method+dataset combinations, dataset concentration, contradictions, or future-work consensus. Do NOT claim guaranteed novelty. Provide evidence_strength (0-100) reflecting how strongly the literature supports the gap (more supporting papers + repeated limitations + future-work consensus = higher). For each gap include concrete evidence items referencing the paper title and the specific limitation/future-work text. Use these gap types: "Repeated Limitation", "Methodological Underexploration", "Dataset Gap", "Combination Gap", "Contradictory Findings", "Future Work Consensus". Generate up to 6 candidates, strongest first.\n\nAggregated frequencies:\n${JSON.stringify(stats)}\n\nPapers:\n${JSON.stringify(paperSummaries)}`;

    const schema = {
      type: "object",
      properties: {
        gaps: {
          type: "array",
          items: {
            type: "object",
            properties: {
              type: { type: "string" },
              title: { type: "string" },
              description: { type: "string" },
              evidence_strength: { type: "number" },
              evidence: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    paper_title: { type: "string" },
                    section: { type: "string" },
                    text: { type: "string" }
                  },
                  required: ["paper_title", "text"]
                }
              },
              supporting_papers: { type: "array", items: { type: "string" } }
            },
            required: ["type", "title", "description", "evidence_strength", "evidence"]
          }
        }
      },
      required: ["gaps"]
    };

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({ prompt, response_json_schema: schema });
    const gaps = (result && result.gaps) || [];

    await base44.entities.GapCandidate.deleteMany({ project_id });
    if (gaps.length) {
      await base44.entities.GapCandidate.bulkCreate(gaps.map(g => ({
        project_id,
        type: g.type || 'gap',
        title: g.title,
        description: g.description,
        evidence_strength: g.evidence_strength || 0,
        evidence: g.evidence || [],
        supporting_papers: g.supporting_papers || []
      })));
    }

    return Response.json({ ok: true, count: gaps.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}