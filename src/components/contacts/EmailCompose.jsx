import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";

export default function EmailCompose({ contact, open, onClose }) {
  const [form, setForm] = useState({
    subject: "",
    body: ""
  });
  const [sending, setSending] = useState(false);
  const [drafting, setDrafting] = useState(false);

  const generateDraft = async () => {
    if (!form.subject) { toast.error("Enter a subject first"); return; }
    setDrafting(true);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Write a professional email for a land developer / real estate company.

Contact: ${contact.first_name} ${contact.last_name}${contact.company ? ` at ${contact.company}` : ""}
Contact type: ${contact.contact_type}
Subject: ${form.subject}

Write a concise, professional email body (3-5 sentences). Do not include a subject line or greeting like "Dear" - just the email body paragraphs. Sign off with "Best regards," but leave the name blank.`
    });
    setForm(prev => ({ ...prev, body: result }));
    setDrafting(false);
  };

  const handleSend = async () => {
    if (!contact.email) { toast.error("This contact has no email address"); return; }
    if (!form.subject || !form.body) { toast.error("Please fill in subject and body"); return; }
    setSending(true);
    await base44.integrations.Core.SendEmail({
      to: contact.email,
      subject: form.subject,
      body: form.body
    });
    toast.success(`Email sent to ${contact.first_name} ${contact.last_name}`);
    setForm({ subject: "", body: "" });
    setSending(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Email {contact?.first_name} {contact?.last_name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>To</Label>
            <Input value={contact?.email || "No email on file"} disabled className="bg-slate-50" />
          </div>
          <div>
            <Label>Subject</Label>
            <Input
              placeholder="e.g., Follow-up on land acquisition"
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label>Body</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={generateDraft}
                disabled={drafting || !form.subject}
                className="text-purple-600 hover:text-purple-700 h-7 px-2"
              >
                {drafting ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}
                AI Draft
              </Button>
            </div>
            <Textarea
              placeholder="Write your message..."
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              rows={8}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleSend}
            disabled={sending || !form.subject || !form.body || !contact?.email}
            className="bg-slate-900 hover:bg-slate-800"
          >
            {sending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sending...</> : <><Send className="h-4 w-4 mr-2" />Send</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}