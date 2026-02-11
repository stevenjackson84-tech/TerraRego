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
  category: "general"
};

export default function TaskForm({ task, deals, open, onClose, onSave, isLoading }) {
  const [formData, setFormData] = useState(task || defaultTask);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
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
              <Input
                id="assigned_to"
                value={formData.assigned_to}
                onChange={(e) => handleChange("assigned_to", e.target.value)}
              />
            </div>
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