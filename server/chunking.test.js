import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chunkSections } from './chunking.js';

test('chunkSections splits long section text into overlapping windows', () => {
  const text = 'a'.repeat(2500);
  const chunks = chunkSections([{ name: 'Intro', text }], 1000, 150);
  assert.equal(chunks.length, 3);
  assert.equal(chunks[0].chunk_index, 0);
  assert.equal(chunks[1].chunk_index, 1);
  // Consecutive windows overlap by the configured amount.
  assert.equal(chunks[0].text.slice(-150), chunks[1].text.slice(0, 150));
});

test('chunkSections keeps a short section as a single chunk', () => {
  const chunks = chunkSections([{ name: 'Abstract', text: 'A short abstract.' }]);
  assert.equal(chunks.length, 1);
  assert.equal(chunks[0].section, 'Abstract');
  assert.equal(chunks[0].text, 'A short abstract.');
});

test('chunkSections skips empty or whitespace-only sections', () => {
  const chunks = chunkSections([{ name: 'Empty', text: '   ' }, { name: 'Real', text: 'content' }]);
  assert.equal(chunks.length, 1);
  assert.equal(chunks[0].section, 'Real');
});

test('chunkSections assigns a global, continuous chunk_index across sections', () => {
  const chunks = chunkSections([
    { name: 'A', text: 'x'.repeat(1200) },
    { name: 'B', text: 'y'.repeat(1200) },
  ], 1000, 150);
  const indices = chunks.map(c => c.chunk_index);
  assert.deepEqual(indices, indices.slice().sort((a, b) => a - b));
  assert.equal(new Set(indices).size, indices.length);
});
