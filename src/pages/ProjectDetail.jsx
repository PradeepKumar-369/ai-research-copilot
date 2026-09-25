import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ArrowLeft, LayoutDashboard, FileText, GitCompare, Network, Sparkles, MessageSquare, BookOpen } from 'lucide-react';
import PapersTab from '@/components/research/PapersTab';
import OverviewTab from '@/components/research/OverviewTab';
import CompareTab from '@/components/research/CompareTab';
import KnowledgeGraphTab from '@/components/research/KnowledgeGraphTab';
import GapsTab from '@/components/research/GapsTab';
import ChatTab from '@/components/research/ChatTab';
import ReviewTab from '@/components/research/ReviewTab';

export default function ProjectDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [project, setProject] = useState(null);
  const [papers, setPapers] = useState([]);
  const [tab, setTab] = useState('overview');

  const load = useCallback(async () => {
    const p = await base44.entities.Project.get(id);
    setProject(p);
    const list = await base44.entities.Paper.filter({ project_id: id }, '-created_date');
    setPapers(list);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (!project) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-slate-200 border-t-indigo-500 rounded-full animate-spin" /></div>;

  const completed = papers.filter(p => p.processing_status === 'completed').length;

  return (
    <div className="min-h-screen bg-slate-50/40">
      <header className="bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => nav('/')}><ArrowLeft className="w-4 h-4" /> Projects</Button>
          <div className="h-5 w-px bg-slate-200" />
          <div className="min-w-0">
            <h1 className="font-display text-lg font-medium text-slate-800 truncate">{project.name}</h1>
            <p className="text-xs text-slate-400">{completed}/{papers.length} papers analyzed</p>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="bg-white border border-slate-200 p-1">
            <TabsTrigger value="overview" className="gap-1.5"><LayoutDashboard className="w-3.5 h-3.5" /> Overview</TabsTrigger>
            <TabsTrigger value="papers" className="gap-1.5"><FileText className="w-3.5 h-3.5" /> Papers</TabsTrigger>
            <TabsTrigger value="compare" className="gap-1.5"><GitCompare className="w-3.5 h-3.5" /> Compare</TabsTrigger>
            <TabsTrigger value="graph" className="gap-1.5"><Network className="w-3.5 h-3.5" /> Graph</TabsTrigger>
            <TabsTrigger value="gaps" className="gap-1.5"><Sparkles className="w-3.5 h-3.5" /> Gaps</TabsTrigger>
            <TabsTrigger value="chat" className="gap-1.5"><MessageSquare className="w-3.5 h-3.5" /> Ask</TabsTrigger>
            <TabsTrigger value="review" className="gap-1.5"><BookOpen className="w-3.5 h-3.5" /> Review</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="mt-6"><OverviewTab papers={papers} /></TabsContent>
          <TabsContent value="papers" className="mt-6"><PapersTab project={project} papers={papers} reload={load} /></TabsContent>
          <TabsContent value="compare" className="mt-6"><CompareTab papers={papers} /></TabsContent>
          <TabsContent value="graph" className="mt-6"><KnowledgeGraphTab papers={papers} /></TabsContent>
          <TabsContent value="gaps" className="mt-6"><GapsTab project={project} papers={papers} /></TabsContent>
          <TabsContent value="chat" className="mt-6"><ChatTab project={project} papers={papers} /></TabsContent>
          <TabsContent value="review" className="mt-6"><ReviewTab project={project} papers={papers} /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}