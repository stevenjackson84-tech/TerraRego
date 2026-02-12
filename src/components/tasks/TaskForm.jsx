import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

const defaultTask = {
  title: "",
  description: "",
  deal_id: "",
  status: "todo",
  priority: "medium",
  due_date: "",
  assigned_to: "",
  category: "general",
  parent_task_id: "",
  depends_on: [],
  is_recurring: false,
  recurrence_pattern: "weekly",
  recurrence_interval: 1,
  recurrence_end_date: ""
};

export default function TaskForm({ task, deals, open, onClose, onSave, isLoading, allTasks = [] }) {
  const [formData, setFormData] = useState(defaultTask);
  const [notifyAssignee, setNotifyAssignee] = useState(false);

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list()
  });

  useEffect(() => {
    if (task) {
      setFormData({ ...defaultTask, ...task });
    } else {
      setFormData(defaultTask);
    }
  }, [task, open]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleDependency = (taskId) => {
    setFormData(prev => {
      const depends_on = prev.depends_on || [];
      if (depends_on.includes(taskId)) {
        return { ...prev, depends_on: depends_on.filter(id => id !== taskId) };
      } else {
        return { ...prev, depends_on: [...depends_on, taskId] };
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    onSave(formData);
    
    // Send notification email if assignee is set and notify is checked
    if (notifyAssignee && formData.assigned_to) {
      try {
        const assignedUser = users.find(u => u.email === formData.assigned_to);
        if (assignedUser) {
          const dealName = formData.deal_id ? deals.find(d => d.id === formData.deal_id)?.name : '';
          await base44.integrations.Core.SendEmail({
            to: formData.assigned_to,
            subject: `New Task Assigned: ${formData.title}`,
            body: `Hello ${assignedUser.full_name},\n\nYou have been assigned a new task:\n\nTask: ${formData.title}\n${formData.description ? `Description: ${formData.description}\n` : ''}${dealName ? `Deal: ${dealName}\n` : ''}Priority: ${formData.priority}\nDue Date: ${formData.due_date ? new Date(formData.due_date).toLocaleDateString() : 'Not set'}\n\nPlease log in to the system to view and update the task.`
          });
          toast.success('Task saved and assignee notified');
        }
      } catch (error) {
        toast.error('Task saved but notification failed');
      }
    }
  };

  const availableParentTasks = allTasks.filter(t => 
    t.id !== task?.id && !t.parent_task_id && t.status !== 'completed'
  );

  const availableDependencyTasks = allTasks.filter(t => 
    t.id !== task?.id && t.id !== formData.parent_task_id
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {task ? "Edit Task" : "Add New Task"}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Task Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleChange("title", e.target.value)}
              placeholder="Enter task title"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Related Deal</Label>
              <Select value={formData.deal_id || "none"} onValueChange={(v) => handleChange("deal_id", v === "none" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select deal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No deal</SelectItem>
                  {deals?.map(deal => (
                    <SelectItem key={deal.id} value={deal.id}>{deal.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Category</Label>
              <Select value={formData.category} onValueChange={(v) => handleChange("category", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="due_diligence">Due Diligence</SelectItem>
                  <SelectItem value="legal">Legal</SelectItem>
                  <SelectItem value="financial">Financial</SelectItem>
                  <SelectItem value="entitlement">Entitlement</SelectItem>
                  <SelectItem value="construction">Construction</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => handleChange("status", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Priority</Label>
              <Select value={formData.priority} onValueChange={(v) => handleChange("priority", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="due_date">Due Date</Label>
              <Input
                id="due_date"
                type="date"
                value={formData.due_date}
                onChange={(e) => handleChange("due_date", e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="assigned_to">Assigned To</Label>
              <Select
                value={formData.assigned_to}
                onValueChange={(value) => handleChange("assigned_to", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select team member..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Unassigned</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.email}>
                      {user.full_name} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {formData.assigned_to && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="notify"
                checked={notifyAssignee}
                onCheckedChange={setNotifyAssignee}
              />
              <Label htmlFor="notify" className="text-sm font-normal cursor-pointer">
                Send email notification to assignee
              </Label>
            </div>
          )}

          {/* Parent Task (Subtasks) */}
          <div>
            <Label>Parent Task (Optional)</Label>
            <Select
              value={formData.parent_task_id || "none"}
              onValueChange={(v) => handleChange("parent_task_id", v === "none" ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="This is a standalone task" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Standalone Task</SelectItem>
                {availableParentTasks.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500 mt-1">
              Select a parent task to make this a subtask
            </p>
          </div>

          {/* Dependencies */}
          <div>
            <Label>Dependencies (Optional)</Label>
            <div className="border rounded-lg p-3 max-h-40 overflow-y-auto space-y-2">
              {availableDependencyTasks.length === 0 ? (
                <p className="text-sm text-slate-500">No tasks available</p>
              ) : (
                availableDependencyTasks.map((t) => (
                  <div key={t.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`dep-${t.id}`}
                      checked={formData.depends_on?.includes(t.id)}
                      onCheckedChange={() => toggleDependency(t.id)}
                    />
                    <Label htmlFor={`dep-${t.id}`} className="text-sm font-normal cursor-pointer">
                      {t.title}
                    </Label>
                  </div>
                ))
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Select tasks that must be completed before this one
            </p>
          </div>

          {/* Recurring Tasks */}
          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="recurring"
                checked={formData.is_recurring}
                onCheckedChange={(checked) => handleChange("is_recurring", checked)}
              />
              <Label htmlFor="recurring" className="text-sm font-medium cursor-pointer">
                Make this a recurring task
              </Label>
            </div>

            {formData.is_recurring && (
              <div className="pl-6 space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Recurrence Pattern</Label>
                    <Select
                      value={formData.recurrence_pattern}
                      onValueChange={(v) => handleChange("recurrence_pattern", v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="biweekly">Bi-weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="interval">Repeat Every</Label>
                    <Input
                      id="interval"
                      type="number"
                      min="1"
                      value={formData.recurrence_interval}
                      onChange={(e) => handleChange("recurrence_interval", parseInt(e.target.value))}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="end_date">End Date (Optional)</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.recurrence_end_date}
                    onChange={(e) => handleChange("recurrence_end_date", e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="bg-slate-900 hover:bg-slate-800">
              {isLoading ? "Saving..." : task ? "Update Task" : "Create Task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}