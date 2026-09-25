import { AlertTriangle } from 'lucide-react';

export default function CompareTab({ papers }) {
  const completed = papers.filter(p => p.processing_status === 'completed');

  if (completed.length < 2) {
    return <p className="text-sm text-slate-400 text-center py-10">Analyze at least two papers to compare them.</p>;
  }

  const join = (arr) => (arr && arr.length ? arr.join(', ') : '—');

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 text-slate-500 text-left">
            <th className="px-3 py-3 font-medium">Paper</th>
            <th className="px-3 py-3 font-medium">Problem</th>
            <th className="px-3 py-3 font-medium">Dataset</th>
            <th className="px-3 py-3 font-medium">Model</th>
            <th className="px-3 py-3 font-medium">Method</th>
            <th className="px-3 py-3 font-medium">Metrics</th>
            <th className="px-3 py-3 font-medium">Results</th>
            <th className="px-3 py-3 font-medium">Limitations</th>
          </tr>
        </thead>
        <tbody>
          {completed.map(p => (
            <tr key={p.id} className="border-t border-slate-100 align-top">
              <td className="px-3 py-3 font-medium text-slate-800 max-w-[180px]">
                {p.title || p.file_name}
                {p.year && <span className="block text-xs text-slate-400 font-normal">{p.year}</span>}
              </td>
              <td className="px-3 py-3 text-slate-600 max-w-[200px]">{(p.extracted?.problem_statement) || '—'}</td>
              <td className="px-3 py-3 text-slate-600 max-w-[160px]">{join(p.extracted?.datasets)}</td>
              <td className="px-3 py-3 text-slate-600 max-w-[160px]">{join(p.extracted?.models)}</td>
              <td className="px-3 py-3 text-slate-600 max-w-[180px]">{join(p.extracted?.methods)}</td>
              <td className="px-3 py-3 text-slate-600 max-w-[150px]">{join(p.extracted?.metrics)}</td>
              <td className="px-3 py-3 text-slate-600 max-w-[200px]">{(p.extracted?.results) || '—'}</td>
              <td className="px-3 py-3 text-slate-600 max-w-[220px]">{join(p.extracted?.limitations)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex items-center gap-2 px-3 py-2.5 bg-amber-50/60 border-t border-slate-100 text-xs text-amber-700">
        <AlertTriangle className="w-3.5 h-3.5" />
        Metrics across different datasets or experimental setups are not directly comparable — treat cross-paper numbers with caution.
      </div>
    </div>
  );
}