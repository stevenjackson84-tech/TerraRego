import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Bell, Plus, Trash2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { format, differenceInDays, isPast, isToday } from "date-fns";
import { toast } from "sonner";

export default function DDDeadlineReminders({ dealId, deal }) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ title: "", due_date: "", notify_email: "", description: "" });
  const queryClient = useQueryClient();

  // We reuse the Task entity for deadline reminders (category: due_diligence)
  const { data: reminders = [] } = useQuery({
    queryKey: ["dd_reminders", dealId],
    queryFn: () => base44.entities.Task.filter({ deal_id: dealId, category: "due_diligence" }, "due_date"),
    enabled: !!dealId
  });

  const createReminder = useMutation({
    mutationFn: (data) => base44.entities.Task.create({
      ...data,
      deal_id: dealId,
      category: "due_diligence",
      status: "todo",
      priority: "high"
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dd_reminders", dealId] });
      setShowForm(false);
      setFormData({ title: "", due_date: "", notify_email: "", description: "" });
      toast.success("Deadline reminder created");
    }
  });

  const deleteReminder = useMutation({
    mutationFn: (id) => base44.entities.Task.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["dd_reminders", dealId] })
  });

  const toggleComplete = useMutation({
    mutationFn: ({ id, status }) => base44.entities.Task.update(id, {
      status,
      completed_date: status === "completed" ? new Date().toISOString().split("T")[0] : null
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["dd_reminders", dealId] })
  });

  const sendEmailReminder = async (reminder) => {
    if (!reminder.assigned_to) { toast.error("No email set for this reminder"); return; }
    await base44.integrations.Core.SendEmail({
      to: reminder.assigned_to,
      subject: `DD Deadline Reminder: ${reminder.title} — ${deal?.name || ""}`,
      body: `This is a reminder that the following due diligence deadline is approaching:\n\n${reminder.title}\nDue: ${reminder.due_date}\n\n${reminder.description || ""}\n\nDeal: ${deal?.name || ""}\nAddress: ${deal?.address || ""}`
    });
    toast.success("Reminder email sent");
  };

  const getUrgency = (dueDate, status) => {
    if (status === "completed") return "done";
    if (!dueDate) return "none";
    const date = new Date(dueDate);
    if (isPast(date) && !isToday(date)) return "overdue";
    const days = differenceInDays(date, new Date());
    if (days <= 3) return "urgent";
    if (days <= 7) return "warning";
    return "ok";
  };

  const urgencyConfig = {
    done: { color: "bg-emerald-50 border-emerald-200", badge: "bg-emerald-100 text-emerald-700", label: "Done" },
    overdue: { color: "bg-red-50 border-red-200", badge: "bg-red-100 text-red-700", label: "Overdue" },
    urgent: { color: "bg-orange-50 border-orange-200", badge: "bg-orange-100 text-orange-700", label: "Due Soon" },
    warning: { color: "bg-amber-50 border-amber-200", badge: "bg-amber-100 text-amber-700", label: "This Week" },
    ok: { color: "border-slate-200", badge: "bg-slate-100 text-slate-600", label: "Upcoming" },
    none: { color: "border-slate-200", badge: "bg-slate-100 text-slate-600", label: "" }
  };

  return (
    <>
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="h-4 w-4" />
              DD Deadline Reminders
            </CardTitle>
            <Button size="sm" onClick={() => setShowForm(true)} className="bg-slate-900 hover:bg-slate-800 h-8 text-xs">
              <Plus className="h-3 w-3 mr-1" /> Add Deadline
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {reminders.length === 0 ? (
            <p className="text-center py-4 text-sm text-slate-400">No deadlines set yet</p>
          ) : (
            <div className="space-y-2">
              {reminders.map(r => {
                const urgency = getUrgency(r.due_date, r.status);
                const cfg = urgencyConfig[urgency];
                const daysLeft = r.due_date ? differenceInDays(new Date(r.due_date), new Date()) : null;
                return (
                  <div key={r.id} className={`border rounded-lg p-3 ${cfg.color}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className={`text-sm font-medium ${r.status === "completed" ? "line-through text-slate-400" : "text-slate-900"}`}>{r.title}</p>
                          {cfg.label && <Badge className={`text-xs ${cfg.badge}`}>{cfg.label}</Badge>}
                        </div>
                        {r.due_date && (
                          <p className="text-xs text-slate-500 mt-0.5">
                            {format(new Date(r.due_date), "MMM d, yyyy")}
                            {daysLeft !== null && r.status !== "completed" && (
                              <span className="ml-1">
                                {daysLeft < 0 ? `(${Math.abs(daysLeft)}d overdue)` : daysLeft === 0 ? "(today)" : `(${daysLeft}d left)`}
                              </span>
                            )}
                          </p>
                        )}
                        {r.description && <p className="text-xs text-slate-500 mt-0.5">{r.description}</p>}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Toggle complete"
                          onClick={() => toggleComplete.mutate({ id: r.id, status: r.status === "completed" ? "todo" : "completed" })}>
                          <CheckCircle2 className={`h-3.5 w-3.5 ${r.status === "completed" ? "text-emerald-600" : "text-slate-300"}`} />
                        </Button>
                        {r.assigned_to && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-600" title="Send email reminder"
                            onClick={() => sendEmailReminder(r)}>
                            <Bell className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => deleteReminder.mutate(r.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add DD Deadline</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Title *</Label>
              <Input placeholder="e.g., Phase 1 ESA due" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
            </div>
            <div>
              <Label>Due Date *</Label>
              <Input type="date" value={formData.due_date} onChange={e => setFormData({ ...formData, due_date: e.target.value })} />
            </div>
            <div>
              <Label>Notify Email (optional)</Label>
              <Input type="email" placeholder="user@example.com" value={formData.notify_email} onChange={e => setFormData({ ...formData, assigned_to: e.target.value, notify_email: e.target.value })} />
            </div>
            <div>
              <Label>Notes</Label>
              <Input placeholder="Additional notes..." value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button disabled={!formData.title || !formData.due_date || createReminder.isPending} onClick={() => createReminder.mutate(formData)} className="bg-slate-900 hover:bg-slate-800">
              {createReminder.isPending ? "Saving..." : "Add Deadline"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}