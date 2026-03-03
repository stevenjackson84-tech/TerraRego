import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Home, Trash2, Pencil, Search, ArrowUpDown } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function FloorPlansLibrary() {
  const [showForm, setShowForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("name");
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

  const filteredPlans = floorPlans
    .filter(plan =>
      plan.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      plan.product_type?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case "sqft_asc": return (a.square_footage || 0) - (b.square_footage || 0);
        case "sqft_desc": return (b.square_footage || 0) - (a.square_footage || 0);
        case "beds_asc": return (a.bedrooms || 0) - (b.bedrooms || 0);
        case "beds_desc": return (b.bedrooms || 0) - (a.bedrooms || 0);
        case "baths_asc": return (a.bathrooms || 0) - (b.bathrooms || 0);
        case "baths_desc": return (b.bathrooms || 0) - (a.bathrooms || 0);
        case "garage_asc": return (a.garage_count || 0) - (b.garage_count || 0);
        case "garage_desc": return (b.garage_count || 0) - (a.garage_count || 0);
        default: return (a.name || "").localeCompare(b.name || "");
      }
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
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Floor Plans Library</h1>
        <p className="text-slate-600">Manage your floor plan templates and specifications</p>
      </div>

      {/* Search and Add */}
      <div className="flex gap-3 mb-6">
        <div className="flex-1 relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search floor plans..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          onClick={() => {
            resetForm();
            setEditingPlan(null);
            setShowForm(true);
          }}
          className="bg-slate-900 hover:bg-slate-800"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Floor Plan
        </Button>
      </div>

      {/* Grid of Plans */}
      {filteredPlans.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPlans.map(plan => (
            <Card key={plan.id} className="hover:shadow-lg transition-shadow overflow-hidden">
              {plan.image_url && (
                <img src={plan.image_url} alt={plan.name} className="w-full h-44 object-cover" />
              )}
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-slate-900">{plan.name}</h3>
                    {plan.product_type && (
                      <p className="text-xs text-slate-500 mt-1">{plan.product_type}</p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleEdit(plan)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-600 hover:text-red-700"
                      onClick={() => deleteMutation.mutate(plan.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {plan.square_footage && (
                    <div className="bg-slate-50 rounded-lg p-2">
                      <p className="text-xs text-slate-500">Square Footage</p>
                      <p className="font-semibold text-slate-900">
                        {plan.square_footage.toLocaleString()}
                      </p>
                    </div>
                  )}
                  {plan.bedrooms && (
                    <div className="bg-slate-50 rounded-lg p-2">
                      <p className="text-xs text-slate-500">Bedrooms</p>
                      <p className="font-semibold text-slate-900">{plan.bedrooms}</p>
                    </div>
                  )}
                  {plan.bathrooms && (
                    <div className="bg-slate-50 rounded-lg p-2">
                      <p className="text-xs text-slate-500">Bathrooms</p>
                      <p className="font-semibold text-slate-900">{plan.bathrooms}</p>
                    </div>
                  )}
                  {plan.garage_count && (
                    <div className="bg-slate-50 rounded-lg p-2">
                      <p className="text-xs text-slate-500">Garage</p>
                      <p className="font-semibold text-slate-900">{plan.garage_count}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Home className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600 mb-2">
            {searchQuery ? "No floor plans match your search" : "No floor plans yet"}
          </p>
          {!searchQuery && (
            <Button
              onClick={() => {
                resetForm();
                setEditingPlan(null);
                setShowForm(true);
              }}
              variant="outline"
              className="mt-4"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create your first floor plan
            </Button>
          )}
        </div>
      )}

      {/* Form Dialog */}
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