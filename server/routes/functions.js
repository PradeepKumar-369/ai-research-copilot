import path from 'node:path';
import fs from 'node:fs';
import express from 'express';
import * as store from '../store.js';
import { requireAuth } from '../auth.js';
import { invokeLLM } from '../llm.js';
import { extractText, splitSections } from '../pdf.js';
import { UPLOAD_DIR } from './upload.js';
import { chunkSections } from '../chunking.js';
import { rankByTfIdf } from '../tfidf.js';

const PAPER_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    authors: { type: 'array', items: { type: 'string' } },
    year: { type: 'string' },
    venue: { type: 'string' },
    abstract: { type: 'string' },
    keywords: { type: 'array', items: { type: 'string' } },
    problem_statement: { type: 'string' },
    research_objective: { type: 'string' },
    proposed_method: { type: 'string' },
    models: { type: 'array', items: { type: 'string' } },
    datasets: { type: 'array', items: { type: 'string' } },
    methods: { type: 'array', items: { type: 'string' } },
    metrics: { type: 'array', items: { type: 'string' } },
    results: { type: 'string' },
    limitations: { type: 'array', items: { type: 'string' } },
    future_work: { type: 'array', items: { type: 'string' } },
  },
};

function freq(papers, field) {
  const c = {};
  papers.forEach(p => {
    (p.extracted?.[field] || []).forEach(v => {
      const k = String(v).trim();
      if (k) c[k] = (c[k] || 0) + 1;
    });
  });
  return Object.entries(c).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
}

async function askQuestion(req, res) {
  const { project_id, question } = req.body || {};
  if (!project_id || !question) return res.status(400).json({ error: 'project_id and question required' });

  const chunks = store.filter('chunk', { project_id });
  const papers = store.filter('paper', { project_id });
  const titleMap = {};
  papers.forEach(p => { titleMap[p.id] = p.title || p.file_name; });

  if (!chunks.length) {
    return res.json({ answer: 'No processed papers found in this project yet. Upload and process papers first, then ask across the collection.', sources: [] });
  }

  // TF-IDF cosine similarity over the project's chunks, not substring
  // counting — down-weights boilerplate terms common across every chunk
  // (e.g. "model", "dataset") in favor of terms that actually distinguish
  // the relevant passages.
  const ranked = rankByTfIdf(question, chunks.map(c => ({ id: c.id, text: c.text })));
  const chunkById = new Map(chunks.map(c => [c.id, c]));
  const pool = (ranked[0] && ranked[0].score > 0) ? ranked.filter(r => r.score > 0) : ranked;
  const top = pool.slice(0, 8).map(r => ({ c: chunkById.get(r.id), score: r.score }));

  const context = top.map((s, i) => `[C${i + 1}] Paper: "${titleMap[s.c.paper_id] || 'Unknown'}" | Section: ${s.c.section || 'N/A'}\n${s.c.text}`).join('\n\n');
  const prompt = `You are a rigorous research assistant analyzing a collection of academic papers. Answer the researcher's question using ONLY the context chunks below. Cite every factual claim with [C1], [C2], etc. matching the chunk labels. If the context does not contain sufficient evidence, respond exactly: "The analyzed papers do not contain sufficient evidence to answer this question." Be concise, specific, and synthesize across chunks when relevant.\n\nContext:\n${context}\n\nQuestion: ${question}`;

  try {
    const answer = await invokeLLM({ prompt });
    const sources = top.map((s, i) => ({
      label: `C${i + 1}`,
      paper_id: s.c.paper_id,
      paper_title: titleMap[s.c.paper_id] || 'Unknown',
      section: s.c.section || 'N/A',
      text: (s.c.text || '').slice(0, 300),
    }));
    res.json({ answer, sources });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function discoverGaps(req, res) {
  const { project_id } = req.body || {};
  if (!project_id) return res.status(400).json({ error: 'project_id required' });

  const papers = store.filter('paper', { project_id, processing_status: 'completed' });
  if (!papers.length) return res.status(400).json({ error: 'No processed papers to analyze yet.' });

  const stats = {
    models: freq(papers, 'models'),
    datasets: freq(papers, 'datasets'),
    methods: freq(papers, 'methods'),
    metrics: freq(papers, 'metrics'),
    limitations: freq(papers, 'limitations'),
    future_work: freq(papers, 'future_work'),
  };

  const paperSummaries = papers.map((p, i) => ({
    id: `P${i + 1}`,
    title: p.title || p.file_name,
    limitations: p.extracted?.limitations || [],
    future_work: p.extracted?.future_work || [],
    models: p.extracted?.models || [],
    datasets: p.extracted?.datasets || [],
    methods: p.extracted?.methods || [],
  }));

  const prompt = `You are a research intelligence engine. Based on the following aggregated evidence from ${papers.length} analyzed papers, generate candidate research-gap opportunities. Each gap MUST be DERIVED from observable evidence: repeated limitations, underexplored method+dataset combinations, dataset concentration, contradictions, or future-work consensus. Do NOT claim guaranteed novelty. Provide evidence_strength (0-100) reflecting how strongly the literature supports the gap (more supporting papers + repeated limitations + future-work consensus = higher). For each gap include concrete evidence items referencing the paper title and the specific limitation/future-work text. Use these gap types: "Repeated Limitation", "Methodological Underexploration", "Dataset Gap", "Combination Gap", "Contradictory Findings", "Future Work Consensus". Generate up to 6 candidates, strongest first.\n\nAggregated frequencies:\n${JSON.stringify(stats)}\n\nPapers:\n${JSON.stringify(paperSummaries)}`;

  const schema = {
    type: 'object',
    properties: {
      gaps: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            type: { type: 'string' },
            title: { type: 'string' },
            description: { type: 'string' },
            evidence_strength: { type: 'number' },
            evidence: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  paper_title: { type: 'string' },
                  section: { type: 'string' },
                  text: { type: 'string' },
                },
                required: ['paper_title', 'text'],
              },
            },
            supporting_papers: { type: 'array', items: { type: 'string' } },
          },
          required: ['type', 'title', 'description', 'evidence_strength', 'evidence'],
        },
      },
    },
    required: ['gaps'],
  };

  try {
    const result = await invokeLLM({ prompt, schema });
    const gaps = result?.gaps || [];

    store.removeMany('gapcandidate', { project_id });
    if (gaps.length) {
      store.bulkCreate('gapcandidate', gaps.map(g => ({
        project_id,
        type: g.type || 'gap',
        title: g.title,
        description: g.description,
        evidence_strength: g.evidence_strength || 0,
        evidence: g.evidence || [],
        supporting_papers: g.supporting_papers || [],
      })));
    }
    res.json({ ok: true, count: gaps.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function generateLiteratureReview(req, res) {
  const { project_id } = req.body || {};
  if (!project_id) return res.status(400).json({ error: 'project_id required' });

  const papers = store.filter('paper', { project_id, processing_status: 'completed' });
  if (!papers.length) return res.status(400).json({ error: 'No processed papers to review yet.' });

  const summaries = papers.map((p, i) => ({
    id: `P${i + 1}`,
    title: p.title || p.file_name,
    year: p.year || '',
    problem: p.extracted?.problem_statement || '',
    method: p.extracted?.proposed_method || '',
    models: p.extracted?.models || [],
    datasets: p.extracted?.datasets || [],
    results: p.extracted?.results || '',
    limitations: p.extracted?.limitations || [],
    future_work: p.extracted?.future_work || [],
  }));

  const prompt = `Write a structured literature review organized by THEMES (not paper-by-paper) based on the following analyzed papers. Use these section headings: "1. Problem Landscape", "2. Methodological Approaches", "3. Datasets and Evaluation", "4. Results and Trends", "5. Recurring Limitations", "6. Potential Research Directions". Cite papers as [P1], [P2] etc. Output in Markdown. Be scholarly, specific, and concise. Only make claims supported by the provided paper data.\n\nPapers:\n${JSON.stringify(summaries)}`;

  try {
    const review = await invokeLLM({ prompt });
    res.json({ review });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function processPaper(req, res) {
  const { paper_id } = req.body || {};
  if (!paper_id) return res.status(400).json({ error: 'paper_id required' });

  const paper = store.get('paper', paper_id);
  if (!paper) return res.status(404).json({ error: 'Paper not found' });

  store.update('paper', paper_id, { processing_status: 'processing', processing_error: '' });

  try {
    const filename = path.basename(paper.file_url);
    const filePath = path.join(UPLOAD_DIR, filename);
    if (!fs.existsSync(filePath)) throw new Error('Uploaded file not found on disk');

    const buffer = fs.readFileSync(filePath);
    const rawText = await extractText(buffer);
    if (!rawText.trim()) throw new Error('Could not extract any text from this PDF');

    const sections = splitSections(rawText);
    // Keep this small: free-tier LLM rate limits (e.g. Groq's 8K TPM) are easy
    // to blow through with a full paper. Sample the start (problem/method,
    // usually in the abstract/intro) and the end (results/limitations,
    // usually near the conclusion) rather than a plain prefix truncation.
    const HEAD = 3500;
    const TAIL = 2000;
    const truncatedText = rawText.length <= HEAD + TAIL
      ? rawText
      : `${rawText.slice(0, HEAD)}\n\n[... omitted for length ...]\n\n${rawText.slice(-TAIL)}`;
    const prompt = `Extract structured metadata from this academic paper's text. Infer fields as best you can from the content; use empty strings/arrays if truly not present.\n\nPaper text:\n${truncatedText}`;

    const data = await invokeLLM({ prompt, schema: PAPER_SCHEMA });

    const chunks = chunkSections(sections);
    if (chunks.length) {
      store.bulkCreate('chunk', chunks.map(c => ({
        paper_id,
        project_id: paper.project_id,
        chunk_index: c.chunk_index,
        section: c.section,
        text: c.text,
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
      future_work: data.future_work || [],
    };

    store.update('paper', paper_id, {
      title: data.title || paper.file_name,
      authors: data.authors || [],
      year: data.year || '',
      venue: data.venue || '',
      abstract: data.abstract || '',
      keywords: data.keywords || [],
      sections: trimmedSections,
      extracted,
      chunk_count: chunks.length,
      processing_status: 'completed',
    });

    res.json({ ok: true, chunks: chunks.length, title: data.title || paper.file_name });
  } catch (error) {
    store.update('paper', paper_id, { processing_status: 'failed', processing_error: error.message });
    res.status(500).json({ error: error.message });
  }
}

const HANDLERS = { askQuestion, discoverGaps, generateLiteratureReview, processPaper };

const router = express.Router();
router.use(requireAuth);

router.post('/:name', (req, res) => {
  const handler = HANDLERS[req.params.name];
  if (!handler) return res.status(404).json({ error: `Unknown function "${req.params.name}"` });
  handler(req, res);
});

export default router;
