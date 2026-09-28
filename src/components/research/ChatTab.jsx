import { useEffect, useRef, useState } from 'react';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Loader2, MessageSquare } from 'lucide-react';
import EvidenceList from '@/components/research/EvidenceList';

const SUGGESTIONS = [
  'What datasets are commonly used across these papers?',
  'Compare the methodologies used by these papers.',
  'What limitations are repeatedly mentioned?',
  'Which models are most frequently used?'
];

export default function ChatTab({ project, papers }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSources, setShowSources] = useState({});
  const scrollRef = useRef(null);

  const load = async () => {
    const list = await api.entities.ChatMessage.filter({ project_id: project.id }, 'created_date', 100);
    setMessages(list);
  };
  useEffect(() => { load(); }, [project.id]);
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, [messages]);

  const send = async (text) => {
    const q = (text ?? input).trim();
    if (!q || loading) return;
    setInput('');
    const userMsg = { role: 'user', content: q, sources: [] };
    setMessages(m => [...m, userMsg]);
    setLoading(true);
    try {
      await api.entities.ChatMessage.create({ project_id: project.id, role: 'user', content: q });
      const res = await api.functions.invoke('askQuestion', { project_id: project.id, question: q });
      const answer = res.data?.answer || 'No answer returned.';
      const sources = res.data?.sources || [];
      await api.entities.ChatMessage.create({ project_id: project.id, role: 'assistant', content: answer, sources });
      setMessages(m => [...m, { role: 'assistant', content: answer, sources }]);
    } catch (e) {
      const msg = 'Error: ' + (e?.response?.data?.error || e.message);
      setMessages(m => [...m, { role: 'assistant', content: msg, sources: [] }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[640px]">
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 pr-1">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <MessageSquare className="w-8 h-8 text-slate-300 mb-2" />
            <p className="text-sm text-slate-400 mb-4">Ask questions across all analyzed papers.</p>
            <div className="flex flex-wrap gap-2 justify-center max-w-lg">
              {SUGGESTIONS.map(s => (
                <button key={s} onClick={() => send(s)} className="text-xs px-3 py-1.5 rounded-full border border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600 transition-colors">{s}</button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${m.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-700'}`}>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.content}</p>
              {m.sources && m.sources.length > 0 && (
                <div className="mt-2 pt-2 border-t border-slate-100/60">
                  <button className="text-[11px] text-indigo-500" onClick={() => setShowSources(prev => ({ ...prev, [i]: !prev[i] }))}>
                    {showSources[i] ? 'Hide sources' : `Show ${m.sources.length} sources`}
                  </button>
                  {showSources[i] && <div className="mt-2"><EvidenceList evidence={m.sources.map(x => ({ paper_title: x.paper_title, section: x.section, text: x.text }))} /></div>}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && <div className="flex justify-start"><div className="bg-white border border-slate-200 rounded-2xl px-4 py-3"><Loader2 className="w-4 h-4 animate-spin text-slate-400" /></div></div>}
      </div>
      <div className="pt-3 border-t border-slate-100 flex gap-2">
        <Textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder="Ask across your paper collection…" rows={1} className="resize-none" />
        <Button onClick={() => send()} disabled={loading || !input.trim()}><Send className="w-4 h-4" /></Button>
      </div>
    </div>
  );
}