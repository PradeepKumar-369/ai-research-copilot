import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';
import { chunkSections } from '../../shared/chunking.ts';

const SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    authors: { type: "array", items: { type: "string" } },
    year: { type: "string" },
    venue: { type: "string" },
    abstract: { type: "string" },
    keywords: { type: "array", items: { type: "string" } },
    sections: { type: "array", items: { type: "object", properties: { name: { type: "string" }, text: { type: "string" } } } },
    problem_statement: { type: "string" },
    research_objective: { type: "string" },
    proposed_method: { type: "string" },
    models: { type: "array", items: { type: "string" } },
    datasets: { type: "array", items: { type: "string" } },
    methods: { type: "array", items: { type: "string" } },
    metrics: { type: "array", items: { type: "string" } },
    results: { type: "string" },
    limitations: { type: "array", items: { type: "string" } },
    future_work: { type: "array", items: { type: "string" } }
  }
};

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const { paper_id } = await req.json();
    if (!paper_id) return Response.json({ error: 'paper_id required' }, { status: 400 });

    const paper = await base44.entities.Paper.get(paper_id);
    if (!paper) return Response.json({ error: 'Paper not found' }, { status: 404 });

    await base44.entities.Paper.update(paper_id, { processing_status: 'processing', processing_error: '' });

    const extraction = await base44.asServiceRole.integrations.Core.ExtractDataFromUploadedFile({
      file_url: paper.file_url,
      json_schema: SCHEMA
    });

    if (!extraction || extraction.status === 'error') {
      await base44.entities.Paper.update(paper_id, { processing_status: 'failed', processing_error: (extraction && extraction.details) || 'Extraction failed' });
      return Response.json({ error: (extraction && extraction.details) || 'Extraction failed' }, { status: 500 });
    }

    const data = extraction.output || {};
    const sections = Array.isArray(data.sections) ? data.sections : [];
    const chunks = chunkSections(sections);

    if (chunks.length) {
      await base44.entities.Chunk.bulkCreate(chunks.map(c => ({
        paper_id,
        project_id: paper.project_id,
        chunk_index: c.chunk_index,
        section: c.section,
        text: c.text
      })));
    }

    const trimmedSections = sections.map(s => ({ name: s.name || 'Section', text: (s.text || '').slice(0, 1200) }));
    const extracted = {
      problem_statement: data.problem_statement || '',
      research_objective: data.research_objective || '',
      proposed_method: data.proposed_method || '',
      models: data.models || [],
      datasets: data.datasets || [],
      methods: data.methods || [],
      metrics: data.metrics || [],
      results: data.results || '',
      limitations: data.limitations || [],
      future_work: data.future_work || []
    };

    await base44.entities.Paper.update(paper_id, {
      title: data.title || paper.file_name,
      authors: data.authors || [],
      year: data.year || '',
      venue: data.venue || '',
      abstract: data.abstract || '',
      keywords: data.keywords || [],
      sections: trimmedSections,
      extracted,
      chunk_count: chunks.length,
      processing_status: 'completed'
    });

    return Response.json({ ok: true, chunks: chunks.length, title: data.title || paper.file_name });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}