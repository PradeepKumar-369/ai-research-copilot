// Ported from base44/shared/chunking.ts (kept in sync manually — that file has
// no TypeScript-specific syntax, so this is a straight copy for use in the
// local Node backend without a TS loader).
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
