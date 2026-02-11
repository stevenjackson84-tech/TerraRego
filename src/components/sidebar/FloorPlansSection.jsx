import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Home, Trash2, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

export default function FloorPlansSection() {
  const [showForm, setShowForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    square_footage: "",
    bedrooms: "",
    bathrooms: "",
    garage_count: "",
    product_type: ""
  });

  const queryClient = useQueryClient();

  const { data: floorPlans = [] } = useQuery({
    queryKey: ['floorPlans'],
    queryFn: () => base44.entities.FloorPlan.list()
  });

  const planMutation = useMutation({
    mutationFn: (data) => editingPlan 
      ? base44.entities.FloorPlan.update(editingPlan.id, data)
      : base44.entities.FloorPlan.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['floorPlans'] });
      setShowForm(false);
      setEditingPlan(null);
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.FloorPlan.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['floorPlans'] })
  });

  const resetForm = () => {
    setFormData({
      name: "",
      square_footage: "",
      bedrooms: "",
      bathrooms: "",
      garage_count: "",
      product_type: ""
    });
  };

  const handleEdit = (plan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name || "",
      square_footage: plan.square_footage || "",
      bedrooms: plan.bedrooms || "",
      bathrooms: plan.bathrooms || "",
      garage_count: plan.garage_count || "",
      product_type: plan.product_type || ""
    });
    setShowForm(true);
  };

  const handleSubmit = () => {
    const data = {
      ...formData,
      square_footage: formData.square_footage ? parseFloat(formData.square_footage) : null,
      bedrooms: formData.bedrooms ? parseFloat(formData.bedrooms) : null,
      bathrooms: formData.bathrooms ? parseFloat(formData.bathrooms) : null,
      garage_count: formData.garage_count ? parseFloat(formData.garage_count) : null
    };
    planMutation.mutate(data);
  };

  return (
    <div className="p-4 border-t border-slate-200">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-900">Floor Plans</h3>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-6 w-6"
          onClick={() => {
            resetForm();
            setEditingPlan(null);
            setShowForm(true);
          }}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {floorPlans.map(plan => (
          <div key={plan.id} className="group bg-slate-50 rounded-lg p-2 hover:bg-slate-100 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">{plan.name}</p>
                <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                  {plan.square_footage && <span>{plan.square_footage.toLocaleString()} sqft</span>}
                  {plan.bedrooms && <span>{plan.bedrooms} bed</span>}
                  {plan.bathrooms && <span>{plan.bathrooms} bath</span>}
                  {plan.garage_count && <span>{plan.garage_count} car</span>}
                </div>
                {plan.product_type && (
                  <p className="text-xs text-slate-400 mt-0.5">{plan.product_type}</p>
                )}
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6"
                  onClick={() => handleEdit(plan)}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6 text-red-600"
                  onClick={() => deleteMutation.mutate(plan.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        ))}
        {floorPlans.length === 0 && (
          <div className="text-center py-6">
            <Home className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs text-slate-500">No floor plans yet</p>
          </div>
        )}
      </div>

      <Dialog open={showForm} onOpenChange={(open) => {
        setShowForm(open);
        if (!open) {
          setEditingPlan(null);
          resetForm();
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPlan ? 'Edit' : 'Add'} Floor Plan</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Floor Plan Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Plan A"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="square_footage">Square Footage</Label>
                <Input
                  id="square_footage"
                  value={formData.square_footage}
                  onChange={(e) => setFormData({ ...formData, square_footage: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="product_type">Product Type</Label>
                <Input
                  id="product_type"
                  value={formData.product_type}
                  onChange={(e) => setFormData({ ...formData, product_type: e.target.value })}
                  placeholder="Single Family"
                />
              </div>
              <div>
                <Label htmlFor="bedrooms">Bedrooms</Label>
                <Input
                  id="bedrooms"
                  value={formData.bedrooms}
                  onChange={(e) => setFormData({ ...formData, bedrooms: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="bathrooms">Bathrooms</Label>
                <Input
                  id="bathrooms"
                  value={formData.bathrooms}
                  onChange={(e) => setFormData({ ...formData, bathrooms: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="garage_count">Garage Spaces</Label>
                <Input
                  id="garage_count"
                  value={formData.garage_count}
                  onChange={(e) => setFormData({ ...formData, garage_count: e.target.value })}
                  placeholder="0"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={!formData.name || planMutation.isPending}
              className="bg-slate-900 hover:bg-slate-800"
            >
              {planMutation.isPending ? "Saving..." : editingPlan ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}