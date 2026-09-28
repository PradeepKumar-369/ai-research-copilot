# AGENTS.md

## Project Context

AI Research Copilot: a React/Vite frontend backed by a local Node/Express server (`server/`). There is no hosted backend and no external database — entity data lives in JSON files under `server/data/`, uploaded PDFs under `server/uploads/` (both gitignored, created on demand).

Start with `README.md` for setup, environment variables, and architecture.

## Key Files

- `src/`: frontend application source.
- `src/api/client.js`: frontend API client — talks to the local Express backend over `/api/*` (proxied by Vite in dev).
- `server/index.js`: backend entry point (auth, entities, functions, uploads).
- `server/llm.js`: pluggable LLM client (OpenAI / Anthropic / Grok / Groq — auto-detected from whichever key is set in `server/.env`).
- `server/tfidf.js`: TF-IDF retrieval used by the cross-paper Q&A function.
- `vite.config.js`: Vite config, including the `@` → `src` path alias and the `/api` dev proxy to the backend.

## Working Notes

- Run frontend + backend together with `npm run dev:all`, or separately with `npm run server` and `npm run dev`.
- The backend only reads `server/.env` at startup — restart it after changing env vars.
- `npm test` runs the backend's automated tests (Node's built-in test runner) against `server/*.test.js`.
- Run the relevant checks from `package.json` (`lint`, `typecheck`, `test`) before finishing code changes.
