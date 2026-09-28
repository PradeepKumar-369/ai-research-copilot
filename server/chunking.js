// Semantic chunking: respects section boundaries, uses overlapping windows.
export function chunkSections(sections, targetSize = 1000, overlap = 150) {
  const chunks = [];
  let globalIndex = 0;
  for (const sec of sections || []) {
    const text = (sec && sec.text ? sec.text : '').trim();
    if (!text) continue;
    const name = (sec && sec.name) || 'Unknown';
    let start = 0;
    while (start < text.length) {
      const end = Math.min(text.length, start + targetSize);
      chunks.push({
        section: name,
        chunk_index: globalIndex++,
        text: text.slice(start, end),
      });
      if (end >= text.length) break;
      start = Math.max(end - overlap, start + 1);
    }
  }
  return chunks;
}
