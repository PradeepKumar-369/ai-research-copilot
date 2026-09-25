import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

export default function CreateProjectDialog({ open, onOpenChange, onCreated }) {
  const [name, setName] = useState('');
  const [domain, setDomain] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onCreated({ name: name.trim(), domain: domain.trim(), description: description.trim() });
      setName(''); setDomain(''); setDescription('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">New research project</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="pn">Project name</Label>
            <Input id="pn" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Diabetic Retinopathy Detection" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pd">Research domain</Label>
            <Input id="pd" value={domain} onChange={e => setDomain(e.target.value)} placeholder="e.g. Medical image analysis" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pdesc">Description</Label>
            <Textarea id="pdesc" value={description} onChange={e => setDescription(e.target.value)} placeholder="What are you investigating?" rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving || !name.trim()}>{saving ? 'Creating…' : 'Create project'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}