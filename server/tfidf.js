const STOP = new Set(['the', 'a', 'an', 'of', 'to', 'in', 'on', 'for', 'and', 'or', 'what', 'which', 'how', 'are', 'is', 'was', 'were', 'used', 'use', 'using', 'across', 'these', 'papers', 'paper', 'between', 'difference', 'compare', 'commonly', 'most', 'frequently', 'repeatedly', 'mentioned', 'many', 'this', 'that', 'with', 'from', 'their', 'they', 'have', 'has', 'been', 'can', 'could', 'would', 'should', 'there', 'some', 'about', 'into', 'such', 'each', 'other', 'than', 'then']);

export function tokenize(text) {
  const matches = (text || '').toLowerCase().match(/[a-z0-9]{3,}/g) || [];
  return matches.filter(t => !STOP.has(t));
}

function termFrequencies(tokens) {
  const tf = new Map();
  for (const t of tokens) tf.set(t, (tf.get(t) || 0) + 1);
  return tf;
}

function magnitude(vec) {
  let sum = 0;
  for (const w of vec.values()) sum += w * w;
  return Math.sqrt(sum);
}

function cosineSimilarity(a, b) {
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  let dot = 0;
  for (const [term, weight] of small) {
    const other = large.get(term);
    if (other) dot += weight * other;
  }
  const magA = magnitude(a);
  const magB = magnitude(b);
  if (!magA || !magB) return 0;
  return dot / (magA * magB);
}

// Ranks `documents` (each { id, text }) against `query` by TF-IDF cosine
// similarity — a real (if small-scale) retrieval step, rather than counting
// substring hits. Returns [{ id, score }], sorted strongest first.
export function rankByTfIdf(query, documents) {
  const docTokens = documents.map(d => tokenize(d.text));
  const docCount = documents.length || 1;

  const docFrequency = new Map();
  docTokens.forEach(tokens => {
    for (const term of new Set(tokens)) {
      docFrequency.set(term, (docFrequency.get(term) || 0) + 1);
    }
  });
  const idf = (term) => Math.log((docCount + 1) / ((docFrequency.get(term) || 0) + 1)) + 1;

  const toVector = (tokens) => {
    const tf = termFrequencies(tokens);
    const vec = new Map();
    for (const [term, count] of tf) vec.set(term, (count / tokens.length) * idf(term));
    return vec;
  };

  const docVectors = docTokens.map(toVector);
  const queryVector = toVector(tokenize(query));

  return documents
    .map((d, i) => ({ id: d.id, score: cosineSimilarity(queryVector, docVectors[i]) }))
    .sort((a, b) => b.score - a.score);
}
