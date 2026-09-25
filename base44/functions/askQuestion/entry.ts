import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';

const STOP = new Set(['the','a','an','of','to','in','on','for','and','or','what','which','how','are','is','was','were','used','use','using','across','these','papers','paper','between','difference','compare','commonly','most','frequently','repeatedly','mentioned','many','this','that','with','from','their','they','have','has','been','can','could','would','should','there','some','about','into','such','each','other','than','then']);

function tokenize(q) {
  const m = q.toLowerCase().match(/[a-z0-9]{3,}/g) || [];
  return m.filter(t => !STOP.has(t));
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const { project_id, question } = await req.json();
    if (!project_id || !question) return Response.json({ error: 'project_id and question required' }, { status: 400 });

    const chunks = await base44.entities.Chunk.filter({ project_id });
    const papers = await base44.entities.Paper.filter({ project_id });
    const titleMap = {};
    papers.forEach(p => { titleMap[p.id] = p.title || p.file_name; });

    if (!chunks.length) {
      return Response.json({ answer: 'No processed papers found in this project yet. Upload and process papers first, then ask across the collection.', sources: [] });
    }

    const qTokens = tokenize(question);
    const scored = chunks.map(c => {
      const text = (c.text || '').toLowerCase();
      let score = 0;
      for (const t of qTokens) { if (text.includes(t)) score++; }
      return { c, score };
    }).sort((a, b) => b.score - a.score);

    const pool = (scored[0] && scored[0].score > 0) ? scored.filter(s => s.score > 0) : scored;
    const top = pool.slice(0, 8);

    const context = top.map((s, i) =>
      `[C${i + 1}] Paper: "${titleMap[s.c.paper_id] || 'Unknown'}" | Section: ${s.c.section || 'N/A'}\n${s.c.text}`
    ).join('\n\n');

    const prompt = `You are a rigorous research assistant analyzing a collection of academic papers. Answer the researcher's question using ONLY the context chunks below. Cite every factual claim with [C1], [C2], etc. matching the chunk labels. If the context does not contain sufficient evidence, respond exactly: "The analyzed papers do not contain sufficient evidence to answer this question." Be concise, specific, and synthesize across chunks when relevant.\n\nContext:\n${context}\n\nQuestion: ${question}`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({ prompt });
    const answer = typeof result === 'string' ? result : (result.answer || JSON.stringify(result));
    const sources = top.map((s, i) => ({
      label: `C${i + 1}`,
      paper_id: s.c.paper_id,
      paper_title: titleMap[s.c.paper_id] || 'Unknown',
      section: s.c.section || 'N/A',
      text: (s.c.text || '').slice(0, 300)
    }));

    return Response.json({ answer, sources });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}