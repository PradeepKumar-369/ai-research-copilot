import { jsPDF } from 'jspdf';

// Minimal, dependency-free (beyond jsPDF, already installed) Markdown → PDF
// renderer. Good enough for the AI-generated literature review's structure
// (headings, bullets, bold/italic emphasis, paragraphs) without needing a
// full Markdown-to-HTML-to-canvas pipeline.
export function downloadMarkdownAsPdf(markdown, filename, title) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const marginX = 48;
  const marginY = 56;
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();
  const maxWidth = pageWidth - marginX * 2;
  let y = marginY;

  const ensureSpace = (lineHeight) => {
    if (y + lineHeight > pageHeight - marginY) {
      doc.addPage();
      y = marginY;
    }
  };

  const stripInlineMarkup = (text) => text.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1').replace(/`(.*?)`/g, '$1');

  if (title) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.splitTextToSize(title, maxWidth).forEach((line) => {
      ensureSpace(22);
      doc.text(line, marginX, y);
      y += 22;
    });
    y += 10;
  }

  for (const raw of (markdown || '').split(/\r?\n/)) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      y += 8;
      continue;
    }

    const headingMatch = /^(#{1,6})\s+(.*)/.exec(line);
    const bulletMatch = /^[-*]\s+(.*)/.exec(line);

    if (headingMatch) {
      const level = headingMatch[1].length;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(level <= 2 ? 14 : 12);
      doc.splitTextToSize(stripInlineMarkup(headingMatch[2]), maxWidth).forEach((line2) => {
        ensureSpace(18);
        doc.text(line2, marginX, y);
        y += 18;
      });
      y += 4;
      continue;
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10.5);
    const indent = bulletMatch ? 14 : 0;
    const content = bulletMatch ? `•  ${stripInlineMarkup(bulletMatch[1])}` : stripInlineMarkup(line);
    doc.splitTextToSize(content, maxWidth - indent).forEach((line2) => {
      ensureSpace(15);
      doc.text(line2, marginX + indent, y);
      y += 15;
    });
  }

  doc.save(filename);
}
