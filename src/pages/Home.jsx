import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus, ArrowRight, FileText, Network, Sparkles, MessageSquare } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import CreateProjectDialog from '@/components/research/CreateProjectDialog';

export default function Home() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const nav = useNavigate();

  const load = async () => {
    setLoading(true);
    const list = await api.entities.Project.list('-created_date');
    setProjects(list);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const create = async (data) => {
    const p = await api.entities.Project.create(data);
    setOpen(false);
    nav(`/project/${p.id}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-5xl mx-auto px-6 py-16">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-xs font-medium mb-4">
            <Sparkles className="w-3.5 h-3.5" /> Evidence-driven research intelligence
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-semibold text-slate-900 tracking-tight leading-tight">
            AI Research Copilot
          </h1>
          <p className="text-slate-500 mt-4 max-w-xl mx-auto leading-relaxed">
            Upload a collection of papers, extract structured evidence, and discover traceable research opportunities — not another PDF chatbot.
          </p>
          <div className="flex justify-center gap-6 mt-8 text-sm text-slate-400">
            <span className="flex items-center gap-1.5"><FileText className="w-4 h-4" /> Multi-paper RAG</span>
            <span className="flex items-center gap-1.5"><Network className="w-4 h-4" /> Knowledge graph</span>
            <span className="flex items-center gap-1.5"><Sparkles className="w-4 h-4" /> Gap discovery</span>
          </div>
        </div>

        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-xl font-medium text-slate-800">Your research projects</h2>
          <Button onClick={() => setOpen(true)}><Plus className="w-4 h-4" /> New project</Button>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="p-6 space-y-3">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
                <Skeleton className="h-3 w-full" />
              </Card>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-slate-400 mb-4">No projects yet. Create your first research collection.</p>
            <Button onClick={() => setOpen(true)}><Plus className="w-4 h-4" /> Create project</Button>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {projects.map(p => (
              <Card key={p.id} className="p-6 hover:border-indigo-200 hover:shadow-sm transition-all cursor-pointer group" onClick={() => nav(`/project/${p.id}`)}>
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <p className="font-display text-lg font-medium text-slate-800 truncate">{p.name}</p>
                    {p.domain && <p className="text-xs text-indigo-500 mt-0.5">{p.domain}</p>}
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all" />
                </div>
                {p.description && <p className="text-sm text-slate-500 mt-2 line-clamp-2">{p.description}</p>}
              </Card>
            ))}
          </div>
        )}
      </div>
      <CreateProjectDialog open={open} onOpenChange={setOpen} onCreated={create} />
    </div>
  );
}