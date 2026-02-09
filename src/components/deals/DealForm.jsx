import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { X } from "lucide-react";

const defaultDeal = {
  name: "",
  address: "",
  city: "",
  state: "",
  parcel_number: "",
  lot_number: "",
  acreage: "",
  zoning_current: "",
  zoning_target: "",
  asking_price: "",
  offer_price: "",
  estimated_value: "",
  stage: "prospecting",
  deal_type: "acquisition",
  property_type: "land",
  lead_source: "",
  notes: "",
  priority: "medium",
  assigned_to: ""
};

export default function DealForm({ deal, open, onClose, onSave, isLoading }) {
  const [formData, setFormData] = useState(deal || defaultDeal);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      acreage: formData.acreage ? parseFloat(formData.acreage) : null,
      asking_price: formData.asking_price ? parseFloat(formData.asking_price) : null,
      offer_price: formData.offer_price ? parseFloat(formData.offer_price) : null,
      estimated_value: formData.estimated_value ? parseFloat(formData.estimated_value) : null,
    };
    onSave(data);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {deal ? "Edit Deal" : "Add New Deal"}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="name">Deal Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="Enter deal name"
                required
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => handleChange("address", e.target.value)}
                placeholder="Street address"
              />
            </div>

            <div>
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => handleChange("city", e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                value={formData.state}
                onChange={(e) => handleChange("state", e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="parcel_number">Parcel Number</Label>
              <Input
                id="parcel_number"
                value={formData.parcel_number}
                onChange={(e) => handleChange("parcel_number", e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="lot_number">Lot Number</Label>
              <Input
                id="lot_number"
                value={formData.lot_number}
                onChange={(e) => handleChange("lot_number", e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="acreage">Acreage</Label>
              <Input
                id="acreage"
                type="number"
                step="0.01"
                value={formData.acreage}
                onChange={(e) => handleChange("acreage", e.target.value)}
              />
            </div>

            <div>
              <Label>Property Type</Label>
              <Select value={formData.property_type} onValueChange={(v) => handleChange("property_type", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="land">Land</SelectItem>
                  <SelectItem value="residential">Residential</SelectItem>
                  <SelectItem value="commercial">Commercial</SelectItem>
                  <SelectItem value="industrial">Industrial</SelectItem>
                  <SelectItem value="mixed_use">Mixed Use</SelectItem>
                  <SelectItem value="multifamily">Multifamily</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Deal Type</Label>
              <Select value={formData.deal_type} onValueChange={(v) => handleChange("deal_type", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="acquisition">Acquisition</SelectItem>
                  <SelectItem value="disposition">Disposition</SelectItem>
                  <SelectItem value="joint_venture">Joint Venture</SelectItem>
                  <SelectItem value="option">Option</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Stage</Label>
              <Select value={formData.stage} onValueChange={(v) => handleChange("stage", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="prospecting">Prospecting</SelectItem>
                  <SelectItem value="loi">LOI</SelectItem>
                  <SelectItem value="due_diligence">Due Diligence</SelectItem>
                  <SelectItem value="under_contract">Under Contract</SelectItem>
                  <SelectItem value="entitlements">Entitlements</SelectItem>
                  <SelectItem value="development">Development</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                  <SelectItem value="dead">Dead</SelectItem>
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
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="zoning_current">Current Zoning</Label>
              <Input
                id="zoning_current"
                value={formData.zoning_current}
                onChange={(e) => handleChange("zoning_current", e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="zoning_target">Target Zoning</Label>
              <Input
                id="zoning_target"
                value={formData.zoning_target}
                onChange={(e) => handleChange("zoning_target", e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="asking_price">Asking Price ($)</Label>
              <Input
                id="asking_price"
                type="number"
                value={formData.asking_price}
                onChange={(e) => handleChange("asking_price", e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="estimated_value">Estimated Value ($)</Label>
              <Input
                id="estimated_value"
                type="number"
                value={formData.estimated_value}
                onChange={(e) => handleChange("estimated_value", e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="lead_source">Lead Source</Label>
              <Input
                id="lead_source"
                value={formData.lead_source}
                onChange={(e) => handleChange("lead_source", e.target.value)}
                placeholder="e.g., Broker, Direct Mail, Referral"
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
              {isLoading ? "Saving..." : deal ? "Update Deal" : "Create Deal"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}