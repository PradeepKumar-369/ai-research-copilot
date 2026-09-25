import { PDFParse } from 'pdf-parse';

const HEADING_PATTERN = /^(abstract|introduction|related work|background|method(?:ology)?|approach|experiments?|evaluation|results?|discussion|limitations?|conclusion|conclusions and future work|future work|references|acknowledge?ments?)\b/i;

export async function extractText(buffer) {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return result.text || '';
  } finally {
    await parser.destroy();
  }
}

// Base44's hosted extraction returns layout-aware sections; without that, we
// approximate by splitting on short lines that look like section headings.
export function splitSections(text) {
  const lines = text.split(/\r?\n/);
  const sections = [];
  let current = { name: 'Full Text', text: [] };

  for (const line of lines) {
    const trimmed = line.trim();
    const looksLikeHeading = trimmed.length > 0 && trimmed.length < 60 && HEADING_PATTERN.test(trimmed);
    if (looksLikeHeading) {
      if (current.text.length) sections.push({ name: current.name, text: current.text.join('\n').trim() });
      current = { name: trimmed.replace(/\s+/g, ' '), text: [] };
    } else {
      current.text.push(line);
    }
  }
  if (current.text.length) sections.push({ name: current.name, text: current.text.join('\n').trim() });

  return sections.filter(s => s.text.length > 0);
}
