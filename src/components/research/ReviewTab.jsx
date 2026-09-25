import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, FileText, Download, FileDown } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { downloadMarkdownAsPdf } from '@/lib/markdownToPdf';
import { toast } from '@/components/ui/use-toast';

export default function ReviewTab({ project, papers }) {
  const [review, setReview] = useState('');
  const [loading, setLoading] = useState(false);
  const completed = papers.filter(p => p.processing_status === 'completed').length;

  const generate = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('generateLiteratureReview', { project_id: project.id });
      setReview(res.data?.review || '');
    } catch (e) {
      const message = e?.response?.data?.error || e.message;
      setReview('Error: ' + message);
      toast({ title: 'Review generation failed', description: message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const downloadMarkdown = () => {
    const blob = new Blob([review], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${(project.name || 'literature').replace(/\s+/g, '_')}_review.md`;
    a.click(); URL.revokeObjectURL(url);
  };

  const downloadPdf = () => {
    downloadMarkdownAsPdf(review, `${(project.name || 'literature').replace(/\s+/g, '_')}_review.pdf`, `${project.name || 'Literature Review'} — Literature Review`);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-display text-lg font-medium text-slate-800">Themed literature review</p>
          <p className="text-sm text-slate-400">Organized by themes, not paper-by-paper, with citations.</p>
        </div>
        <div className="flex gap-2">
          {review && (
            <>
              <Button variant="outline" title="Download as Markdown" onClick={downloadMarkdown}><Download className="w-4 h-4" /></Button>
              <Button variant="outline" title="Download as PDF" onClick={downloadPdf}><FileDown className="w-4 h-4" /></Button>
            </>
          )}
          <Button onClick={generate} disabled={loading || completed < 2}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            <span className="ml-1.5">{loading ? 'Writing…' : review ? 'Regenerate' : 'Generate review'}</span>
          </Button>
        </div>
      </div>
      {!review && !loading && (
        <Card className="p-10 text-center"><p className="text-sm text-slate-400">Generate a structured literature review from your analyzed papers.</p></Card>
      )}
      {review && (
        <Card className="p-8 prose prose-sm max-w-none prose-headings:font-display prose-headings:text-slate-800 prose-p:text-slate-600 prose-li:text-slate-600">
          <ReactMarkdown>{review}</ReactMarkdown>
        </Card>
      )}
    </div>
  );
}