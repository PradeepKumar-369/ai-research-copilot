// Client-side aggregation helpers for the research dashboard.

export function aggregateField(papers, field) {
  const counts = {};
  for (const p of papers || []) {
    const arr = (p.extracted && p.extracted[field]) || [];
    for (const v of arr) {
      const key = String(v).trim();
      if (!key) continue;
      counts[key] = (counts[key] || 0) + 1;
    }
  }
  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

export function statusInfo(status) {
  switch (status) {
    case 'completed': return { label: 'Analyzed', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' };
    case 'processing': return { label: 'Processing', color: 'text-amber-600 bg-amber-50 border-amber-200' };
    case 'failed': return { label: 'Failed', color: 'text-rose-600 bg-rose-50 border-rose-200' };
    default: return { label: 'Pending', color: 'text-slate-500 bg-slate-50 border-slate-200' };
  }
}

export const GAP_TYPE_COLORS = {
  'Repeated Limitation': 'bg-rose-50 text-rose-700 border-rose-200',
  'Methodological Underexploration': 'bg-indigo-50 text-indigo-700 border-indigo-200',
  'Dataset Gap': 'bg-amber-50 text-amber-700 border-amber-200',
  'Combination Gap': 'bg-violet-50 text-violet-700 border-violet-200',
  'Contradictory Findings': 'bg-orange-50 text-orange-700 border-orange-200',
  'Future Work Consensus': 'bg-emerald-50 text-emerald-700 border-emerald-200'
};

export function gapTypeColor(type) {
  return GAP_TYPE_COLORS[type] || 'bg-slate-50 text-slate-700 border-slate-200';
}