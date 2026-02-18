import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const DEFAULT = {
  name: "", phase: "define", status: "active", process_area: "general",
  problem_statement: "", goal_statement: "", scope: "", champion: "",
  baseline_metric: "", target_metric: "", actual_metric: "", metric_unit: "",
  estimated_savings: "", actual_savings: "",
  start_date: "", target_completion: "", completion_date: "",
  root_causes: "", solutions: "", control_plan: "", notes: ""
};

export default function ImprovementProjectForm({ project, open, onClose, onSave }) {
  const [form, setForm] = useState(project || DEFAULT);
  const set = (field, val) => setForm(prev => ({ ...prev, [field]: val }));

  const handleSave = () => {
    const data = {
      ...form,
      baseline_metric: form.baseline_metric !== "" ? parseFloat(form.baseline_metric) : null,
      target_metric: form.target_metric !== "" ? parseFloat(form.target_metric) : null,
      actual_metric: form.actual_metric !== "" ? parseFloat(form.actual_metric) : null,
      estimated_savings: form.estimated_savings !== "" ? parseFloat(form.estimated_savings) : null,
      actual_savings: form.actual_savings !== "" ? parseFloat(form.actual_savings) : null,
    };
    onSave(data);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{project ? "Edit Project" : "New DMAIC Project"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Project Name</Label>
              <Input value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g., Reduce Entitlement Cycle Time" />
            </div>
            <div>
              <Label>DMAIC Phase</Label>
              <Select value={form.phase} onValueChange={v => set("phase", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["define","measure","analyze","improve","control"].map(p => (
                    <SelectItem key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Process Area</Label>
              <Select value={form.process_area} onValueChange={v => set("process_area", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="deal_acquisition">Deal Acquisition</SelectItem>
                  <SelectItem value="entitlement">Entitlement</SelectItem>
                  <SelectItem value="development">Development</SelectItem>
                  <SelectItem value="sales">Sales</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Champion / Sponsor</Label>
              <Input value={form.champion} onChange={e => set("champion", e.target.value)} placeholder="Name" />
            </div>
          </div>

          <div>
            <Label>Problem Statement</Label>
            <Textarea value={form.problem_statement} onChange={e => set("problem_statement", e.target.value)} rows={2} placeholder="What is the problem and its impact?" />
          </div>
          <div>
            <Label>Goal Statement</Label>
            <Textarea value={form.goal_statement} onChange={e => set("goal_statement", e.target.value)} rows={2} placeholder="Measurable goal with target date" />
          </div>
          <div>
            <Label>Scope</Label>
            <Input value={form.scope} onChange={e => set("scope", e.target.value)} placeholder="In scope / out of scope" />
          </div>

          {/* Metrics */}
          <div className="border-t pt-4">
            <Label className="text-sm font-semibold text-slate-700 mb-3 block">Key Metric</Label>
            <div className="grid grid-cols-4 gap-3">
              <div>
                <Label className="text-xs">Baseline</Label>
                <Input type="number" value={form.baseline_metric} onChange={e => set("baseline_metric", e.target.value)} placeholder="0" className="[&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
              </div>
              <div>
                <Label className="text-xs">Target</Label>
                <Input type="number" value={form.target_metric} onChange={e => set("target_metric", e.target.value)} placeholder="0" className="[&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
              </div>
              <div>
                <Label className="text-xs">Actual</Label>
                <Input type="number" value={form.actual_metric} onChange={e => set("actual_metric", e.target.value)} placeholder="0" className="[&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
              </div>
              <div>
                <Label className="text-xs">Unit</Label>
                <Input value={form.metric_unit} onChange={e => set("metric_unit", e.target.value)} placeholder="days, %, $" />
              </div>
            </div>
          </div>

          {/* Savings */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Estimated Annual Savings ($)</Label>
              <Input type="number" value={form.estimated_savings} onChange={e => set("estimated_savings", e.target.value)} placeholder="0" className="[&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
            </div>
            <div>
              <Label className="text-xs">Actual Savings ($)</Label>
              <Input type="number" value={form.actual_savings} onChange={e => set("actual_savings", e.target.value)} placeholder="0" className="[&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Start Date</Label>
              <Input type="date" value={form.start_date} onChange={e => set("start_date", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Target Completion</Label>
              <Input type="date" value={form.target_completion} onChange={e => set("target_completion", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Actual Completion</Label>
              <Input type="date" value={form.completion_date} onChange={e => set("completion_date", e.target.value)} />
            </div>
          </div>

          {/* DMAIC Phase Notes */}
          <div className="border-t pt-4 space-y-3">
            <Label className="text-sm font-semibold text-slate-700 block">Phase Details</Label>
            <div>
              <Label className="text-xs">Root Causes (Analyze Phase)</Label>
              <Textarea value={form.root_causes} onChange={e => set("root_causes", e.target.value)} rows={2} placeholder="Fishbone / 5 Whys findings..." />
            </div>
            <div>
              <Label className="text-xs">Solutions (Improve Phase)</Label>
              <Textarea value={form.solutions} onChange={e => set("solutions", e.target.value)} rows={2} placeholder="Countermeasures implemented..." />
            </div>
            <div>
              <Label className="text-xs">Control Plan</Label>
              <Textarea value={form.control_plan} onChange={e => set("control_plan", e.target.value)} rows={2} placeholder="How will improvements be sustained?" />
            </div>
            <div>
              <Label className="text-xs">Notes</Label>
              <Textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={2} />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} className="bg-slate-900 hover:bg-slate-800">Save Project</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}