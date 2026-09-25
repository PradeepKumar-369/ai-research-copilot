import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import authRouter from './auth.js';
import entitiesRouter from './routes/entities.js';
import functionsRouter from './routes/functions.js';
import uploadRouter, { UPLOAD_DIR } from './routes/upload.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 8787;

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const app = express();
app.use(express.json({ limit: '2mb' }));

app.get('/api/app/public-settings', (req, res) => {
  res.json({ id: 'local', public_settings: {} });
});

app.use('/api/auth', authRouter);
app.use('/api/entities', entitiesRouter);
app.use('/api/functions', functionsRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/uploads', express.static(UPLOAD_DIR));

app.listen(PORT, () => {
  console.log(`[server] Local backend running on http://localhost:${PORT}`);
  if (!process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY && !process.env.XAI_API_KEY && !process.env.GROQ_API_KEY) {
    console.log('[server] WARNING: no LLM API key set in server/.env — Ask, Discover gaps, Review, and Analyze will fail.');
  }
});
