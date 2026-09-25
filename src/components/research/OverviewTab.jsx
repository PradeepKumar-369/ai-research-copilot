import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { FileText, Cpu, Database, FlaskConical, AlertTriangle, Sparkles } from 'lucide-react';
import { aggregateField } from '@/lib/researchUtils';

const INDIGO = '#6366f1';

function StatCard({ icon: Icon, label, value, tint }) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-3 mb-1">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${tint}`}><Icon className="w-4.5 h-4.5" /></div>
        <span className="text-3xl font-display font-semibold text-slate-800">{value}</span>
      </div>
      <p className="text-sm text-slate-400">{label}</p>
    </Card>
  );
}

function FreqChart({ title, data, color }) {
  const top = (data || []).slice(0, 8);
  return (
    <Card className="p-5">
      <p className="font-display text-base font-medium text-slate-800 mb-4">{title}</p>
      {top.length === 0 ? (
        <p className="text-sm text-slate-400 py-8 text-center">No data yet.</p>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={top} layout="vertical" margin={{ left: 8, right: 16 }}>
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 12, fill: '#64748b' }} />
            <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12 }} />
            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
              {top.map((_, i) => <Cell key={i} fill={color} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}

export default function OverviewTab({ papers }) {
  const completed = useMemo(() => papers.filter(p => p.processing_status === 'completed'), [papers]);
  const models = useMemo(() => aggregateField(completed, 'models'), [completed]);
  const datasets = useMemo(() => aggregateField(completed, 'datasets'), [completed]);
  const methods = useMemo(() => aggregateField(completed, 'methods'), [completed]);
  const limitations = useMemo(() => aggregateField(completed, 'limitations'), [completed]);

  const authors = useMemo(() => {
    const set = new Set();
    completed.forEach(p => (p.authors || []).forEach(a => set.add(a)));
    return set.size;
  }, [completed]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard icon={FileText} label="Papers" value={completed.length} tint="bg-indigo-50 text-indigo-500" />
        <StatCard icon={Sparkles} label="Authors" value={authors} tint="bg-violet-50 text-violet-500" />
        <StatCard icon={Cpu} label="Models" value={models.length} tint="bg-sky-50 text-sky-500" />
        <StatCard icon={Database} label="Datasets" value={datasets.length} tint="bg-emerald-50 text-emerald-500" />
        <StatCard icon={FlaskConical} label="Methods" value={methods.length} tint="bg-amber-50 text-amber-500" />
        <StatCard icon={AlertTriangle} label="Limitations" value={limitations.length} tint="bg-rose-50 text-rose-500" />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <FreqChart title="Most used models" data={models} color="#6366f1" />
        <FreqChart title="Most used datasets" data={datasets} color="#10b981" />
        <FreqChart title="Method distribution" data={methods} color="#f59e0b" />
        <FreqChart title="Recurring limitations" data={limitations} color="#f43f5e" />
      </div>
    </div>
  );
}