import { useEffect, useState } from 'react';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import EvidenceList from '@/components/research/EvidenceList';
import { gapTypeColor } from '@/lib/researchUtils';
import { toast } from '@/components/ui/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

export default function GapsTab({ project, papers }) {
  const [gaps, setGaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [discovering, setDiscovering] = useState(false);
  const [open, setOpen] = useState({});

  const load = async () => {
    setLoading(true);
    const list = await api.entities.GapCandidate.filter({ project_id: project.id }, '-evidence_strength');
    setGaps(list);
    setLoading(false);
  };
  useEffect(() => { load(); }, [project.id]);

  const discover = async () => {
    setDiscovering(true);
    try {
      await api.functions.invoke('discoverGaps', { project_id: project.id });
      await load();
      toast({ title: 'Gap discovery complete' });
    } catch (e) {
      toast({ title: 'Gap discovery failed', description: e?.response?.data?.error || e.message, variant: 'destructive' });
    } finally {
      setDiscovering(false);
    }
  };

  const completed = papers.filter(p => p.processing_status === 'completed').length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-display text-lg font-medium text-slate-800">Research gap candidates</p>
          <p className="text-sm text-slate-400">Evidence-derived opportunities — the researcher decides what is genuinely novel.</p>
        </div>
        <Button onClick={discover} disabled={discovering || completed < 2}>
          {discovering ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          <span className="ml-1.5">{discovering ? 'Analyzing evidence…' : 'Discover gaps'}</span>
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="p-5 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-full" />
            </Card>
          ))}
        </div>
      ) : gaps.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-sm text-slate-400">No gap candidates yet. Analyze at least two papers, then run discovery.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {gaps.map(g => {
            const strength = Math.round(g.evidence_strength || 0);
            const isOpen = open[g.id];
            return (
              <Card key={g.id} className="p-5">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <span className={`text-[11px] px-2 py-0.5 rounded-full border ${gapTypeColor(g.type)}`}>{g.type}</span>
                      <span className="text-[11px] text-slate-400">{(g.supporting_papers || []).length} supporting papers</span>
                    </div>
                    <p className="font-medium text-slate-800">{g.title}</p>
                    <p className="text-sm text-slate-500 mt-1 leading-relaxed">{g.description}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-2xl font-display font-semibold text-slate-800">{strength}</div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide">Evidence<br />strength</p>
                  </div>
                </div>
                <button className="flex items-center gap-1 text-xs text-indigo-600 mt-3" onClick={() => setOpen(o => ({ ...o, [g.id]: !o[g.id] }))}>
                  {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  {isOpen ? 'Hide evidence chain' : `Inspect evidence (${(g.evidence || []).length})`}
                </button>
                {isOpen && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <p className="text-[11px] uppercase tracking-wide text-slate-400 mb-2">Traceable evidence</p>
                    <EvidenceList evidence={g.evidence} />
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}