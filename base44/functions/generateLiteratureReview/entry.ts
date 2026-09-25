import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const { project_id } = await req.json();
    if (!project_id) return Response.json({ error: 'project_id required' }, { status: 400 });

    const papers = await base44.entities.Paper.filter({ project_id, processing_status: 'completed' });
    if (!papers.length) return Response.json({ error: 'No processed papers to review yet.' }, { status: 400 });

    const summaries = papers.map((p, i) => ({
      id: `P${i + 1}`,
      title: p.title || p.file_name,
      year: p.year || '',
      problem: (p.extracted && p.extracted.problem_statement) || '',
      method: (p.extracted && p.extracted.proposed_method) || '',
      models: (p.extracted && p.extracted.models) || [],
      datasets: (p.extracted && p.extracted.datasets) || [],
      results: (p.extracted && p.extracted.results) || '',
      limitations: (p.extracted && p.extracted.limitations) || [],
      future_work: (p.extracted && p.extracted.future_work) || []
    }));

    const prompt = `Write a structured literature review organized by THEMES (not paper-by-paper) based on the following analyzed papers. Use these section headings: "1. Problem Landscape", "2. Methodological Approaches", "3. Datasets and Evaluation", "4. Results and Trends", "5. Recurring Limitations", "6. Potential Research Directions". Cite papers as [P1], [P2] etc. Output in Markdown. Be scholarly, specific, and concise. Only make claims supported by the provided paper data.\n\nPapers:\n${JSON.stringify(summaries)}`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({ prompt });
    const review = typeof result === 'string' ? result : (result.review || JSON.stringify(result));
    return Response.json({ review });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}