import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mail, Loader2 } from 'lucide-react';

const defaultTemplates = [
  {
    name: 'Follow-up',
    category: 'follow_up',
    subject: 'Following Up - {deal_name}',
    body: 'Hi {contact_name},\n\nI wanted to follow up regarding {deal_name}.\n\nPlease let me know if you have any questions.\n\nBest regards'
  },
  {
    name: 'Initial Offer',
    category: 'offer',
    subject: 'Offer for {deal_name}',
    body: 'Hi {contact_name},\n\nI hope this message finds you well. We are interested in discussing an offer for {deal_name} located at {deal_address}.\n\nWould you be available for a call this week?\n\nBest regards'
  },
  {
    name: 'Status Update',
    category: 'status_update',
    subject: 'Status Update - {deal_name}',
    body: 'Hi {contact_name},\n\nI wanted to provide you with a status update on {deal_name}.\n\n[Add your update here]\n\nPlease let me know if you have any questions.\n\nBest regards'
  },
  {
    name: 'Introduction',
    category: 'introduction',
    subject: 'Introducing Our Services - {deal_name}',
    body: 'Hi {contact_name},\n\nI wanted to introduce myself and our services regarding {deal_name}.\n\nWe specialize in land development and would love to discuss opportunities with you.\n\nBest regards'
  }
];

export default function EmailComposer({ open, onClose, contactEmail, contactName, dealId, dealName, dealAddress }) {
  const [template, setTemplate] = useState('');
  const [recipient, setRecipient] = useState(contactEmail || '');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [useTemplate, setUseTemplate] = useState(false);

  const queryClient = useQueryClient();

  const { data: templates = [] } = useQuery({
    queryKey: ['emailTemplates'],
    queryFn: () => base44.entities.EmailTemplate.list(),
    enabled: open
  });

  const sendEmailMutation = useMutation({
    mutationFn: async () => {
      const result = await base44.functions.invoke('sendEmail', {
        to: recipient,
        subject,
        body,
        dealId,
        templateId: template || null
      });
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sentEmails'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      resetForm();
      onClose();
    }
  });

  const resetForm = () => {
    setTemplate('');
    setRecipient(contactEmail || '');
    setSubject('');
    setBody('');
    setUseTemplate(false);
  };

  const applyTemplate = (tmpl) => {
    let renderedSubject = tmpl.subject;
    let renderedBody = tmpl.body;

    renderedSubject = renderedSubject
      .replace('{contact_name}', contactName || '')
      .replace('{deal_name}', dealName || '')
      .replace('{deal_address}', dealAddress || '');

    renderedBody = renderedBody
      .replace('{contact_name}', contactName || '')
      .replace('{deal_name}', dealName || '')
      .replace('{deal_address}', dealAddress || '');

    setSubject(renderedSubject);
    setBody(renderedBody);
    setTemplate(tmpl.id || tmpl.name);
  };

  const handleTemplateSelect = (templateId) => {
    const allTemplates = [...templates, ...defaultTemplates];
    const tmpl = allTemplates.find(t => (t.id || t.name) === templateId);
    if (tmpl) {
      applyTemplate(tmpl);
      setUseTemplate(true);
    }
  };

  const allTemplates = [...templates, ...defaultTemplates];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Send Email</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Recipient Email</Label>
            <Input
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="recipient@example.com"
              className="mt-1"
            />
          </div>

          <div>
            <Label>Email Template (optional)</Label>
            <Select value={template} onValueChange={handleTemplateSelect}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select a template..." />
              </SelectTrigger>
              <SelectContent>
                {allTemplates.map((tmpl) => (
                  <SelectItem key={tmpl.id || tmpl.name} value={tmpl.id || tmpl.name}>
                    {tmpl.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Subject</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject"
              className="mt-1"
            />
          </div>

          <div>
            <Label>Message</Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your email message..."
              className="mt-1 h-48 font-mono text-sm"
            />
          </div>

          <div className="bg-slate-50 p-3 rounded-lg text-xs text-slate-600">
            <p className="font-semibold mb-1">Available placeholders:</p>
            <p>{'{contact_name}'}, {'{deal_name}'}, {'{deal_address}'}</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => sendEmailMutation.mutate()}
            disabled={!recipient || !subject || !body || sendEmailMutation.isPending}
            className="bg-slate-900 hover:bg-slate-800 gap-2"
          >
            {sendEmailMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Send Email
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}