import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const defaultEntitlement = {
  name: "",
  deal_id: "",
  type: "other",
  status: "not_started",
  agency: "",
  submission_date: "",
  approval_date: "",
  expiration_date: "",
  estimated_cost: "",
  actual_cost: "",
  assigned_to: "",
  notes: ""
};

export default function EntitlementForm({ entitlement, deals, open, onClose, onSave, isLoading, preselectedDealId }) {
  const [formData, setFormData] = useState(
    entitlement || { ...defaultEntitlement, deal_id: preselectedDealId || "" }
  );

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      estimated_cost: formData.estimated_cost ? parseFloat(formData.estimated_cost) : null,
      actual_cost: formData.actual_cost ? parseFloat(formData.actual_cost) : null,
    };
    onSave(data);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {entitlement ? "Edit Entitlement" : "Add New Entitlement"}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Entitlement Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="e.g., Zone Change Application"
              required
            />
          </div>

          <div>
            <Label>Related Deal *</Label>
            <Select value={formData.deal_id} onValueChange={(v) => handleChange("deal_id", v)} required>
              <SelectTrigger>
                <SelectValue placeholder="Select deal" />
              </SelectTrigger>
              <SelectContent>
                {deals?.map(deal => (
                  <SelectItem key={deal.id} value={deal.id}>{deal.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Type</Label>
              <Select value={formData.type} onValueChange={(v) => handleChange("type", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="zoning_change">Zoning Change</SelectItem>
                  <SelectItem value="variance">Variance</SelectItem>
                  <SelectItem value="conditional_use">Conditional Use</SelectItem>
                  <SelectItem value="site_plan">Site Plan</SelectItem>
                  <SelectItem value="subdivision">Subdivision</SelectItem>
                  <SelectItem value="environmental">Environmental</SelectItem>
                  <SelectItem value="traffic_study">Traffic Study</SelectItem>
                  <SelectItem value="utility">Utility</SelectItem>
                  <SelectItem value="building_permit">Building Permit</SelectItem>
                  <SelectItem value="grading_permit">Grading Permit</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
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
                  <SelectItem value="not_started">Not Started</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="under_review">Under Review</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="denied">Denied</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2">
              <Label htmlFor="agency">Agency/Department</Label>
              <Input
                id="agency"
                value={formData.agency}
                onChange={(e) => handleChange("agency", e.target.value)}
                placeholder="e.g., City Planning Department"
              />
            </div>

            <div>
              <Label htmlFor="submission_date">Submission Date</Label>
              <Input
                id="submission_date"
                type="date"
                value={formData.submission_date}
                onChange={(e) => handleChange("submission_date", e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="approval_date">Approval Date</Label>
              <Input
                id="approval_date"
                type="date"
                value={formData.approval_date}
                onChange={(e) => handleChange("approval_date", e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="estimated_cost">Estimated Cost ($)</Label>
              <Input
                id="estimated_cost"
                type="number"
                value={formData.estimated_cost}
                onChange={(e) => handleChange("estimated_cost", e.target.value)}
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

            <div className="col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleChange("notes", e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="bg-slate-900 hover:bg-slate-800">
              {isLoading ? "Saving..." : entitlement ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}