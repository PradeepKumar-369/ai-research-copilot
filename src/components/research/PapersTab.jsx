import { useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FileText, UploadCloud, Loader2, RefreshCw, Trash2, Quote } from 'lucide-react';
import { statusInfo } from '@/lib/researchUtils';
import { downloadBibtex } from '@/lib/bibtex';
import { toast } from '@/components/ui/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function PapersTab({ project, papers, reload }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const handleFiles = async (files) => {
    if (!files.length) return;
    setUploading(true);
    try {
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
        await base44.entities.Paper.create({
          project_id: project.id,
          file_name: file.name,
          file_url,
          processing_status: 'pending'
        });
      }
      await reload();
      toast({ title: files.length > 1 ? `${files.length} papers uploaded` : 'Paper uploaded', description: 'Click Analyze to extract structured evidence.' });
    } catch (e) {
      toast({ title: 'Upload failed', description: e?.response?.data?.error || e.message, variant: 'destructive' });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const processPaper = async (paper) => {
    setProcessing(paper.id);
    try {
      await base44.functions.invoke('processPaper', { paper_id: paper.id });
      await reload();
      toast({ title: 'Analysis complete', description: `"${paper.title || paper.file_name}" is ready.` });
    } catch (e) {
      toast({ title: 'Processing failed', description: e?.response?.data?.error || e.message, variant: 'destructive' });
    } finally {
      setProcessing(null);
    }
  };

  const confirmRemove = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await base44.entities.Chunk.deleteMany({ paper_id: pendingDelete.id });
      await base44.entities.Paper.delete(pendingDelete.id);
      await reload();
      toast({ title: 'Paper removed' });
    } catch (e) {
      toast({ title: 'Could not remove paper', description: e?.response?.data?.error || e.message, variant: 'destructive' });
    } finally {
      setDeleting(false);
      setPendingDelete(null);
    }
  };

  const exportBibtex = () => {
    downloadBibtex(papers, `${(project.name || 'library').replace(/\s+/g, '_')}.bib`);
  };

  return (
    <div className="space-y-5">
      <div
        className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors p-8 text-center cursor-pointer"
        onClick={() => inputRef.current?.click()}
      >
        <input ref={inputRef} type="file" accept="application/pdf" multiple className="hidden" onChange={e => handleFiles(Array.from(e.target.files))} />
        <UploadCloud className="w-8 h-8 text-indigo-400 mx-auto mb-2" />
        <p className="font-medium text-slate-700">{uploading ? 'Uploading…' : 'Drop research papers here'}</p>
        <p className="text-sm text-slate-400 mt-0.5">PDF files · multiple selection supported</p>
      </div>

      {papers.length > 0 && (
        <div className="flex justify-end">
          <Button size="sm" variant="outline" onClick={exportBibtex}><Quote className="w-3.5 h-3.5" /><span className="ml-1.5">Export BibTeX</span></Button>
        </div>
      )}

      <div className="space-y-3">
        {papers.length === 0 && <p className="text-sm text-slate-400 text-center py-6">No papers yet. Upload PDFs to begin analysis.</p>}
        {papers.map(p => {
          const s = statusInfo(p.processing_status);
          return (
            <Card key={p.id} className="p-4 flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 text-indigo-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-800 truncate">{p.title || p.file_name}</p>
                <p className="text-xs text-slate-400 truncate mt-0.5">
                  {p.authors && p.authors.length ? p.authors.slice(0, 3).join(', ') : 'Authors unavailable'}
                  {p.year ? ` · ${p.year}` : ''}
                  {p.chunk_count ? ` · ${p.chunk_count} chunks` : ''}
                </p>
                {p.processing_status === 'failed' && (
                  <p className="text-xs text-rose-500 mt-1">{p.processing_error || 'Processing failed'}</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-[11px] px-2 py-1 rounded-full border ${s.color}`}>{s.label}</span>
                {p.processing_status !== 'completed' && (
                  <Button size="sm" variant="outline" disabled={processing === p.id} onClick={() => processPaper(p)}>
                    {processing === p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    <span className="ml-1.5">{processing === p.id ? 'Analyzing' : 'Analyze'}</span>
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => setPendingDelete(p)}><Trash2 className="w-3.5 h-3.5 text-rose-400" /></Button>
              </div>
            </Card>
          );
        })}
      </div>

      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this paper?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete && `"${pendingDelete.title || pendingDelete.file_name}" and all of its extracted evidence (chunks) will be permanently deleted.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemove} disabled={deleting} className="bg-rose-600 hover:bg-rose-700">
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
