import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClipboardPlus, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

export default function QuickTaskCreate({ open, onClose, project, prefillTitle = "", prefillDescription = "", dealId = null }) {
  const queryClient = useQueryClient();
  const [generating, setGenerating] = useState(false);
  const [form, setForm] = useState({
    title: prefillTitle,
    description: prefillDescription,
    priority: "medium",
    category: "general",
    due_date: "",
    deal_id: dealId || ""
  });

  const createTask = useMutation({
    mutationFn: (data) => base44.entities.Task.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success("Task created successfully");
      onClose();
    }
  });

  const generateDescription = async () => {
    if (!form.title) { toast.error("Enter a title first"); return; }
    setGenerating(true);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Write a concise task description (2-3 sentences) for a real estate land development team.
Project: ${project?.name || 'N/A'}
Task title: ${form.title}
Focus on what needs to be done, why it matters, and any key considerations.`
    });
    setForm(prev => ({ ...prev, description: result }));
    setGenerating(false);
  };

  const handleSave = () => {
    if (!form.title.trim()) { toast.error("Title is required"); return; }
    const data = {
      title: form.title,
      description: form.description,
      priority: form.priority,
      category: form.category,
      due_date: form.due_date || undefined,
      deal_id: form.deal_id || undefined
    };
    createTask.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardPlus className="h-5 w-5" />
            Create Task
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {project && (
            <div className="text-xs text-slate-500 bg-slate-50 rounded px-3 py-2">
              From project: <span className="font-medium text-slate-700">{project.name}</span>
            </div>
          )}

          <div>
            <Label>Title *</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g., Submit grading permit application"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <Label>Description</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={generateDescription}
                disabled={generating || !form.title}
                className="text-purple-600 hover:text-purple-700 h-7 px-2"
              >
                {generating ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}
                AI Draft
              </Button>
            </div>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              placeholder="Task details..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="due_diligence">Due Diligence</SelectItem>
                  <SelectItem value="legal">Legal</SelectItem>
                  <SelectItem value="financial">Financial</SelectItem>
                  <SelectItem value="entitlement">Entitlement</SelectItem>
                  <SelectItem value="construction">Construction</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Due Date</Label>
            <Input
              type="date"
              value={form.due_date}
              onChange={(e) => setForm({ ...form, due_date: e.target.value })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleSave}
            disabled={createTask.isPending || !form.title.trim()}
            className="bg-slate-900 hover:bg-slate-800"
          >
            {createTask.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating...</> : <><ClipboardPlus className="h-4 w-4 mr-2" />Create Task</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}