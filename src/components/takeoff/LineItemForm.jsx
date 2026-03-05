import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function LineItemForm({ onSave, onClose, isLoading, categoryLabels, item, takeoff }) {
  const [form, setForm] = useState({
    category: item?.category || "grading",
    description: item?.description || "",
    unit_of_measure: item?.unit_of_measure || "per_lot",
    quantity: item?.quantity || (takeoff?.lot_count || ""),
    estimated_unit_cost: item?.estimated_unit_cost || "",
    notes: item?.notes || ""
  });

  const set = (f, v) => setForm(p => ({ ...p, [f]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = { ...form };
    ["quantity", "estimated_unit_cost"].forEach(k => {
      if (data[k] !== "") data[k] = Number(data[k]);
      else delete data[k];
    });
    onSave(data);
  };

  const qty = Number(form.quantity) || 0;
  const unitCost = Number(form.estimated_unit_cost) || 0;
  const total = qty * unitCost;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{item ? "Edit Line Item" : "Add Line Item"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Category</Label>
            <Select value={form.category} onValueChange={v => set("category", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(categoryLabels).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Description</Label>
            <Input value={form.description} onChange={e => set("description", e.target.value)} placeholder="e.g. Mass grading, import fill" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Unit of Measure</Label>
              <Select value={form.unit_of_measure} onValueChange={v => set("unit_of_measure", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="per_lot">Per Lot</SelectItem>
                  <SelectItem value="per_lf">Per LF</SelectItem>
                  <SelectItem value="per_sf">Per SF</SelectItem>
                  <SelectItem value="lump_sum">Lump Sum</SelectItem>
                  <SelectItem value="per_unit">Per Unit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Quantity</Label>
              <Input type="number" value={form.quantity} onChange={e => set("quantity", e.target.value)} placeholder="qty" />
            </div>
          </div>

          <div>
            <Label>Unit Cost ($)</Label>
            <Input type="number" step="0.01" value={form.estimated_unit_cost} onChange={e => set("estimated_unit_cost", e.target.value)} placeholder="0.00" />
          </div>

          {total > 0 && (
            <div className="bg-slate-50 rounded-lg p-3 text-sm">
              <span className="text-slate-600">Total: </span>
              <span className="font-bold text-slate-900">${total.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
            </div>
          )}

          <div>
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={2} />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isLoading} className="bg-slate-900 hover:bg-slate-800">
              {isLoading ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}