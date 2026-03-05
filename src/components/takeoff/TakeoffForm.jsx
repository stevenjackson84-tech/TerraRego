import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export default function TakeoffForm({ onSave, onClose, isLoading, takeoff }) {
  const [form, setForm] = useState({
    name: takeoff?.name || "",
    development_type: takeoff?.development_type || "single_family",
    lot_count: takeoff?.lot_count || "",
    total_site_area_sf: takeoff?.total_site_area_sf || "",
    total_street_lf: takeoff?.total_street_lf || "",
    total_utility_lf: takeoff?.total_utility_lf || "",
    avg_lot_size_sf: takeoff?.avg_lot_size_sf || "",
    avg_unit_size_sf: takeoff?.avg_unit_size_sf || "",
    deal_id: takeoff?.deal_id || "",
    project_id: takeoff?.project_id || "",
    status: takeoff?.status || "draft",
    notes: takeoff?.notes || ""
  });

  const { data: deals = [] } = useQuery({
    queryKey: ["deals-list"],
    queryFn: () => base44.entities.Deal.list("-created_date", 100)
  });

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = { ...form };
    ["lot_count", "total_site_area_sf", "total_street_lf", "total_utility_lf", "avg_lot_size_sf", "avg_unit_size_sf"]
      .forEach(k => { if (data[k] !== "") data[k] = Number(data[k]); else delete data[k]; });
    if (!data.deal_id) delete data.deal_id;
    if (!data.project_id) delete data.project_id;
    onSave(data);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{takeoff ? "Edit Takeoff" : "New Project Takeoff"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Takeoff Name *</Label>
            <Input value={form.name} onChange={e => set("name", e.target.value)} required placeholder="e.g. Sunset Ridge Phase 1" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Development Type</Label>
              <Select value={form.development_type} onValueChange={v => set("development_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="single_family">Single Family</SelectItem>
                  <SelectItem value="townhome">Townhome</SelectItem>
                  <SelectItem value="multifamily">Multifamily</SelectItem>
                  <SelectItem value="mixed_use">Mixed Use</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="complete">Complete</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="border-t pt-4">
            <p className="text-sm font-medium text-slate-700 mb-3">Site Measurements</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Lot Count</Label>
                <Input type="number" value={form.lot_count} onChange={e => set("lot_count", e.target.value)} placeholder="# lots" />
              </div>
              <div>
                <Label>Total Site Area (SF)</Label>
                <Input type="number" value={form.total_site_area_sf} onChange={e => set("total_site_area_sf", e.target.value)} placeholder="sq ft" />
              </div>
              <div>
                <Label>Total Street Length (LF)</Label>
                <Input type="number" value={form.total_street_lf} onChange={e => set("total_street_lf", e.target.value)} placeholder="linear ft" />
              </div>
              <div>
                <Label>Total Utility Run (LF)</Label>
                <Input type="number" value={form.total_utility_lf} onChange={e => set("total_utility_lf", e.target.value)} placeholder="linear ft" />
              </div>
              <div>
                <Label>Avg Lot Size (SF)</Label>
                <Input type="number" value={form.avg_lot_size_sf} onChange={e => set("avg_lot_size_sf", e.target.value)} placeholder="sq ft" />
              </div>
              <div>
                <Label>Avg Unit Size (SF)</Label>
                <Input type="number" value={form.avg_unit_size_sf} onChange={e => set("avg_unit_size_sf", e.target.value)} placeholder="sq ft" />
              </div>
            </div>
          </div>

          <div>
            <Label>Link to Deal (optional)</Label>
            <Select value={form.deal_id} onValueChange={v => set("deal_id", v === "none" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Select a deal..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— None —</SelectItem>
                {deals.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={3} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isLoading} className="bg-slate-900 hover:bg-slate-800">
              {isLoading ? "Saving..." : "Save Takeoff"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}