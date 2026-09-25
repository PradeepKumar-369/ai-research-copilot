# AI Research Copilot

An evidence-driven research assistant for working through a collection of academic papers: upload PDFs, extract structured data from each one, ask questions across the whole collection, surface research-gap candidates backed by traceable evidence, and generate a themed literature review — not another PDF chatbot.

Originally scaffolded on [Base44](https://base44.com), now a fully self-contained app: a React/Vite frontend backed by a local Node/Express server, with no dependency on any hosted platform.

## Features

- **Paper analysis** — upload PDFs; each one is parsed, chunked, and run through an LLM to extract title, authors, problem statement, method, models, datasets, metrics, limitations, and future work.
- **Cross-paper Q&A** — ask a question against the whole collection; answers are retrieved with TF-IDF cosine similarity over paper chunks (not naive keyword matching) and cited back to source passages.
- **Gap discovery** — aggregates limitations, future-work statements, and method/dataset combinations across papers into evidence-scored research-gap candidates.
- **Literature review generation** — a themed (not paper-by-paper) review with inline citations, exportable as Markdown or PDF.
- **Knowledge graph** — a force-directed graph linking each paper to the models, datasets, methods, and limitations it reports.
- **Overview & compare** — aggregate stats and side-by-side paper comparison.
- **BibTeX export** — one click to export your paper library as a `.bib` file.

## Architecture

```
src/            React + Vite frontend (Tailwind, Radix UI)
server/         Local Node/Express backend
  store.js        JSON-file entity storage (projects, papers, chunks, chat messages, gap candidates, users)
  auth.js         Local email/password auth + sessions
  llm.js          Pluggable LLM client (OpenAI / Anthropic / Grok / Groq)
  pdf.js          PDF text extraction + section detection
  tfidf.js        TF-IDF retrieval for cross-paper Q&A
  routes/         Entity CRUD, the 4 AI-powered functions, file uploads
base44/         Original Base44 entity schemas & function specs (kept for reference; no longer used at runtime)
```

There is no external database — data lives in JSON files under `server/data/` (gitignored), and uploaded PDFs live under `server/uploads/` (also gitignored). This is intentionally simple for local/demo use; swap `server/store.js` for a real database if you need multi-user persistence.

## Getting Started

**Prerequisites:** Node.js 20+ and an API key from one LLM provider (OpenAI, Anthropic, xAI/Grok, or Groq).

```bash
npm install
```

Copy the example env file and fill in one provider's key:

```bash
cp server/.env.example server/.env
```

Edit `server/.env`:

```ini
# Pick ONE provider
OPENAI_API_KEY=sk-...
# ANTHROPIC_API_KEY=sk-ant-...
# XAI_API_KEY=xai-...
# GROQ_API_KEY=gsk_...
```

Run the frontend and backend together:

```bash
npm run dev:all
```

Open **http://localhost:5173**. On first run, register an account (any email/password — this is local auth with no real email service, so there's no verification step) and start a project.

### Running frontend and backend separately

```bash
npm run server   # backend on http://localhost:8787
npm run dev      # frontend on http://localhost:5173, proxies /api to the backend
```

## Testing

```bash
npm test
```

Runs Node's built-in test runner against the backend's core logic: PDF chunking, TF-IDF retrieval, and the data store's CRUD semantics.

## Environment Variables

| Variable | Description |
|---|---|
| `OPENAI_API_KEY` / `OPENAI_MODEL` | OpenAI provider (default model: `gpt-4o-mini`) |
| `ANTHROPIC_API_KEY` / `ANTHROPIC_MODEL` | Anthropic provider (default model: `claude-sonnet-5`) |
| `XAI_API_KEY` / `XAI_MODEL` | Grok (xAI) provider (default model: `grok-4`) |
| `GROQ_API_KEY` / `GROQ_MODEL` | Groq provider (default model: `openai/gpt-oss-120b`) |
| `LLM_PROVIDER` | Force a specific provider instead of auto-detecting from the keys above |
| `PORT` | Backend port (default `8787`) |

Only one provider needs to be configured; `server/llm.js` picks the first one it finds a key for.

## Notes

- This is a local-first, single-machine setup meant for development and demos: sessions, uploaded files, and all entity data live on disk next to the code, not in a managed database.
- The `base44/` folder is retained as a historical reference for the entity schemas and function specs this app was originally built from — it is not read by the app at runtime.
