import express from 'express';
import * as store from '../store.js';
import { requireAuth } from '../auth.js';

const ALLOWED = new Set(['project', 'paper', 'chunk', 'chatmessage', 'gapcandidate', 'user']);

const router = express.Router();
router.use(requireAuth);

router.param('name', (req, res, next, name) => {
  if (!ALLOWED.has(name)) return res.status(404).json({ error: `Unknown entity "${name}"` });
  next();
});

router.get('/:name', (req, res) => {
  res.json(store.list(req.params.name, req.query.sort));
});

router.post('/:name/filter', (req, res) => {
  const { query, sort, limit } = req.body || {};
  res.json(store.filter(req.params.name, query, sort, limit));
});

router.post('/:name/bulk', (req, res) => {
  const { records } = req.body || {};
  res.json(store.bulkCreate(req.params.name, Array.isArray(records) ? records : []));
});

router.post('/:name/delete-many', (req, res) => {
  const { query } = req.body || {};
  const count = store.removeMany(req.params.name, query);
  res.json({ ok: true, count });
});

router.get('/:name/:id', (req, res) => {
  const record = store.get(req.params.name, req.params.id);
  if (!record) return res.status(404).json({ error: 'Not found' });
  res.json(record);
});

router.post('/:name', (req, res) => {
  res.json(store.create(req.params.name, req.body || {}));
});

router.put('/:name/:id', (req, res) => {
  const record = store.update(req.params.name, req.params.id, req.body || {});
  if (!record) return res.status(404).json({ error: 'Not found' });
  res.json(record);
});

router.delete('/:name/:id', (req, res) => {
  const ok = store.remove(req.params.name, req.params.id);
  if (!ok) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
});

export default router;
