import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rankByTfIdf, tokenize } from './tfidf.js';

test('tokenize lowercases, strips short/stop words', () => {
  const tokens = tokenize('The Transformer model uses Attention Is All You Need');
  assert.ok(!tokens.includes('the'));
  assert.ok(!tokens.includes('is'));
  assert.ok(tokens.includes('transformer'));
  assert.ok(tokens.includes('attention'));
});

test('rankByTfIdf ranks the document containing the query terms above unrelated ones', () => {
  const docs = [
    { id: 'a', text: 'Convolutional neural networks are used for image classification tasks.' },
    { id: 'b', text: 'Transformer architectures rely on self-attention for sequence modeling.' },
    { id: 'c', text: 'Gradient descent optimizes the loss function during training.' },
  ];
  const ranked = rankByTfIdf('How does self-attention work in transformers?', docs);
  assert.equal(ranked[0].id, 'b');
  assert.ok(ranked[0].score > ranked[1].score);
});

test('rankByTfIdf gives every document a zero score when the query shares no terms', () => {
  const docs = [
    { id: 'a', text: 'Convolutional neural networks for vision.' },
    { id: 'b', text: 'Transformer architectures for language.' },
  ];
  const ranked = rankByTfIdf('xyzzy plugh quux', docs);
  assert.ok(ranked.every(r => r.score === 0));
});

test('rankByTfIdf down-weights a term that appears in every document', () => {
  const docs = [
    { id: 'a', text: 'The model achieves high accuracy on the benchmark dataset for classification.' },
    { id: 'b', text: 'The model achieves high accuracy on the benchmark dataset for segmentation.' },
    { id: 'c', text: 'The model achieves high accuracy on the benchmark dataset for retrieval.' },
  ];
  // "classification" is unique to doc a — it should outrank the others despite
  // all three sharing the rest of the sentence almost verbatim.
  const ranked = rankByTfIdf('classification accuracy', docs);
  assert.equal(ranked[0].id, 'a');
});
