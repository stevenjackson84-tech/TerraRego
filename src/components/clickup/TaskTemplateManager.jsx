import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit2, Trash2, Check } from "lucide-react";

const STAGES = [
  { value: "prospecting", label: "Prospecting" },
  { value: "loi", label: "LOI" },
  { value: "controlled_not_approved", label: "Controlled (Not Approved)" },
  { value: "controlled_approved", label: "Controlled (Approved)" },
  { value: "owned", label: "Owned" },
  { value: "entitlements", label: "Entitlements" },
  { value: "development", label: "Development" },
  { value: "closed", label: "Closed" },
];

export default function TaskTemplateManager() {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    deal_stage: "prospecting",
    task_name_template: "",
    description_template: "",
    priority: 3,
    due_date_offset_days: 7,
    is_active: true,
    tags: "",
  });

  const queryClient = useQueryClient();

  const { data: templates = [] } = useQuery({
    queryKey: ["task-templates"],
    queryFn: () => base44.entities.TaskTemplate.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.TaskTemplate.create({
      ...data,
      tags: data.tags ? data.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-templates"] });
      resetForm();
      setOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TaskTemplate.update(id, {
      ...data,
      tags: data.tags ? data.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-templates"] });
      resetForm();
      setOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.TaskTemplate.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-templates"] });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      deal_stage: "prospecting",
      task_name_template: "",
      description_template: "",
      priority: 3,
      due_date_offset_days: 7,
      is_active: true,
      tags: "",
    });
    setEditingId(null);
  };

  const handleEdit = (template) => {
    setFormData({
      ...template,
      tags: template.tags?.join(", ") || "",
    });
    setEditingId(template.id);
    setOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.task_name_template) {
      alert("Please fill in required fields");
      return;
    }

    if (editingId) {
      updateMutation.mutate({ id: editingId, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const stageLabel = (value) => STAGES.find(s => s.value === value)?.label || value;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Task Templates</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => resetForm()}
              className="bg-slate-900 hover:bg-slate-700 gap-2"
            >
              <Plus className="h-4 w-4" />
              New Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingId ? "Edit Template" : "Create Task Template"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Template Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Controlled Approval Follow-up"
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-sm font-medium">Deal Stage *</Label>
                <Select value={formData.deal_stage} onValueChange={(value) => setFormData({ ...formData, deal_stage: value })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STAGES.map((stage) => (
                      <SelectItem key={stage.value} value={stage.value}>
                        {stage.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium">Task Name Template *</Label>
                <Input
                  value={formData.task_name_template}
                  onChange={(e) => setFormData({ ...formData, task_name_template: e.target.value })}
                  placeholder="e.g., {deal_name} - Approval Follow-up"
                  className="mt-1 text-xs"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Use {"{deal_name}"}, {"{deal_address}"} as placeholders
                </p>
              </div>

              <div>
                <Label className="text-sm font-medium">Description Template</Label>
                <Textarea
                  value={formData.description_template}
                  onChange={(e) => setFormData({ ...formData, description_template: e.target.value })}
                  placeholder="Task description template..."
                  className="mt-1 text-xs"
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Priority</Label>
                  <Select value={String(formData.priority)} onValueChange={(value) => setFormData({ ...formData, priority: parseInt(value) })}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Urgent</SelectItem>
                      <SelectItem value="2">High</SelectItem>
                      <SelectItem value="3">Normal</SelectItem>
                      <SelectItem value="4">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-medium">Due Date (days)</Label>
                  <Input
                    type="number"
                    value={formData.due_date_offset_days}
                    onChange={(e) => setFormData({ ...formData, due_date_offset_days: parseInt(e.target.value) })}
                    className="mt-1"
                    min={1}
                  />
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Tags (comma-separated)</Label>
                <Input
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="e.g., urgent, followup, approval"
                  className="mt-1"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="is_active" className="text-sm">
                  Active
                </Label>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="bg-slate-900 hover:bg-slate-700"
                >
                  {editingId ? "Update" : "Create"} Template
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3">
        {templates.map((template) => (
          <Card key={template.id} className="border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-slate-900">{template.name}</h3>
                    {template.is_active ? (
                      <Badge className="bg-green-100 text-green-800 text-xs">Active</Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">Inactive</Badge>
                    )}
                    <Badge variant="outline" className="text-xs text-slate-600">
                      {stageLabel(template.deal_stage)}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-600 mb-2">{template.task_name_template}</p>
                  <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500">
                    <span>Priority: {template.priority}</span>
                    <span>•</span>
                    <span>Due: {template.due_date_offset_days}d</span>
                    {template.tags && template.tags.length > 0 && (
                      <>
                        <span>•</span>
                        <div className="flex gap-1">
                          {template.tags.map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs bg-slate-50">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleEdit(template)}
                    className="text-slate-600 hover:text-slate-900"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteMutation.mutate(template.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {templates.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <p className="text-sm text-slate-500 mb-3">No task templates created yet</p>
            <Button
              size="sm"
              onClick={() => setOpen(true)}
              className="bg-slate-900 hover:bg-slate-700 gap-1"
            >
              <Plus className="h-3 w-3" />
              Create your first template
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}