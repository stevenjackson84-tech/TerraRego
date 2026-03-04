import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

const categoryOptions = [
  { value: "surveying", label: "Surveying" },
  { value: "civil_engineering", label: "Civil Engineering" },
  { value: "grading", label: "Grading" },
  { value: "utilities", label: "Utilities" },
  { value: "entitlement_consulting", label: "Entitlement Consulting" },
  { value: "legal", label: "Legal" },
  { value: "architecture", label: "Architecture" },
  { value: "environmental", label: "Environmental" },
  { value: "geotechnical", label: "Geotechnical" },
  { value: "general_contractor", label: "General Contractor" },
  { value: "other", label: "Other" },
];

export default function BidRequestForm({ deals, projects, contacts, onSave, onClose, isLoading }) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    bid_category: "civil_engineering",
    status: "draft",
    due_date: "",
    budget_estimate: "",
    entity_type: "none",
    entity_id: "",
    entity_name: "",
    invited_contacts: [],
    notes: "",
  });

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleEntityChange = (type, id) => {
    set("entity_type", type);
    set("entity_id", id);
    if (type === "deal") {
      const deal = deals.find(d => d.id === id);
      set("entity_name", deal?.name || "");
      if (!form.title && deal) set("title", `${deal.name} — Bid`);
    } else if (type === "project") {
      const proj = projects.find(p => p.id === id);
      set("entity_name", proj?.name || "");
      if (!form.title && proj) set("title", `${proj.name} — Bid`);
    }
  };

  const toggleContact = (contactId) => {
    set("invited_contacts", 
      form.invited_contacts.includes(contactId)
        ? form.invited_contacts.filter(id => id !== contactId)
        : [...form.invited_contacts, contactId]
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...form,
      budget_estimate: form.budget_estimate ? parseFloat(form.budget_estimate) : null,
      entity_type: form.entity_type === "none" ? null : form.entity_type,
      entity_id: form.entity_type === "none" ? null : form.entity_id,
    };
    onSave(data);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Bid Request</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 pt-2">
          {/* Link to deal/project */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Link to</Label>
              <Select value={form.entity_type} onValueChange={(v) => { set("entity_type", v); set("entity_id", ""); set("entity_name", ""); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="deal">Deal</SelectItem>
                  <SelectItem value="project">Project</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.entity_type === "deal" && (
              <div className="space-y-1.5">
                <Label>Select Deal</Label>
                <Select value={form.entity_id} onValueChange={(id) => handleEntityChange("deal", id)}>
                  <SelectTrigger><SelectValue placeholder="Select deal..." /></SelectTrigger>
                  <SelectContent>
                    {deals.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {form.entity_type === "project" && (
              <div className="space-y-1.5">
                <Label>Select Project</Label>
                <Select value={form.entity_id} onValueChange={(id) => handleEntityChange("project", id)}>
                  <SelectTrigger><SelectValue placeholder="Select project..." /></SelectTrigger>
                  <SelectContent>
                    {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 col-span-2">
              <Label>Title *</Label>
              <Input value={form.title} onChange={e => set("title", e.target.value)} placeholder="e.g. Plat Survey — Salem Ridge" required />
            </div>
            <div className="space-y-1.5">
              <Label>Category *</Label>
              <Select value={form.bid_category} onValueChange={v => set("bid_category", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categoryOptions.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Bid Deadline</Label>
              <Input type="date" value={form.due_date} onChange={e => set("due_date", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Budget Estimate ($)</Label>
              <Input type="number" value={form.budget_estimate} onChange={e => set("budget_estimate", e.target.value)} placeholder="Optional" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Scope of Work / Description</Label>
            <Textarea value={form.description} onChange={e => set("description", e.target.value)} rows={4} placeholder="Describe what you need bid on..." />
          </div>

          {/* Contact Selection */}
          <div className="space-y-2">
            <Label>Invite Contacts to Bid ({form.invited_contacts.length} selected)</Label>
            <div className="border rounded-lg max-h-48 overflow-y-auto divide-y">
              {contacts.length === 0 ? (
                <p className="text-sm text-slate-400 p-3">No contacts yet — add contacts first</p>
              ) : (
                contacts.map(c => (
                  <div key={c.id} className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50">
                    <Checkbox
                      checked={form.invited_contacts.includes(c.id)}
                      onCheckedChange={() => toggleContact(c.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800">{c.first_name} {c.last_name}</p>
                      <p className="text-xs text-slate-400 truncate">{c.company}{c.email ? ` — ${c.email}` : ""}</p>
                    </div>
                    <Badge className="text-xs bg-slate-100 text-slate-500 shrink-0">{c.contact_type}</Badge>
                  </div>
                ))
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isLoading} className="bg-slate-900 hover:bg-slate-800">
              {isLoading ? "Creating..." : "Create Bid Request"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}