function escapeBraces(text) {
  return String(text || '').replace(/[{}]/g, '');
}

function citationKey(paper, usedKeys) {
  const lastName = ((paper.authors && paper.authors[0]) || paper.file_name || 'ref')
    .split(' ')
    .pop()
    .replace(/[^a-zA-Z0-9]/g, '') || 'ref';
  const base = `${lastName}${paper.year || ''}`.toLowerCase() || 'ref';
  let key = base;
  let suffix = 0;
  while (usedKeys.has(key)) {
    suffix += 1;
    key = `${base}${String.fromCharCode(96 + suffix)}`;
  }
  usedKeys.add(key);
  return key;
}

export function papersToBibtex(papers) {
  const usedKeys = new Set();
  return papers
    .filter(p => p.title || p.file_name)
    .map(p => {
      const key = citationKey(p, usedKeys);
      const fields = [
        ['title', p.title || p.file_name],
        ['author', (p.authors || []).join(' and ')],
        ['year', p.year],
        ['journal', p.venue],
        ['abstract', p.abstract],
        ['keywords', (p.keywords || []).join(', ')],
      ]
        .filter(([, value]) => value)
        .map(([field, value]) => `  ${field} = {${escapeBraces(value)}}`)
        .join(',\n');
      return `@article{${key},\n${fields}\n}`;
    })
    .join('\n\n');
}

export function downloadBibtex(papers, filename) {
  const content = papersToBibtex(papers);
  const blob = new Blob([content], { type: 'application/x-bibtex' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
