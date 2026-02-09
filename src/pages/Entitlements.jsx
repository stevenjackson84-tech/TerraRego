import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search } from "lucide-react";
import EntitlementCard from "@/components/entitlements/EntitlementCard";
import EntitlementForm from "@/components/entitlements/EntitlementForm";

export default function Entitlements() {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingEntitlement, setEditingEntitlement] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  
  const queryClient = useQueryClient();

  const { data: entitlements = [] } = useQuery({
    queryKey: ['entitlements'],
    queryFn: () => base44.entities.Entitlement.list('-created_date')
  });

  const { data: deals = [] } = useQuery({
    queryKey: ['deals'],
    queryFn: () => base44.entities.Deal.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Entitlement.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entitlements'] });
      setShowForm(false);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Entitlement.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entitlements'] });
      setShowForm(false);
      setEditingEntitlement(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Entitlement.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['entitlements'] })
  });

  const handleSave = (data) => {
    if (editingEntitlement) {
      updateMutation.mutate({ id: editingEntitlement.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (entitlement) => {
    setEditingEntitlement(entitlement);
    setShowForm(true);
  };

  const handleDelete = (entitlement) => {
    if (window.confirm(`Delete "${entitlement.name}"?`)) {
      deleteMutation.mutate(entitlement.id);
    }
  };

  const getDealName = (dealId) => {
    const deal = deals.find(d => d.id === dealId);
    return deal?.name;
  };

  const filteredEntitlements = entitlements.filter(ent => {
    const matchesSearch = !search || 
      ent.name?.toLowerCase().includes(search.toLowerCase()) ||
      ent.agency?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === "all" || ent.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Entitlements</h1>
            <p className="text-slate-500 mt-1">Track permits, approvals, and entitlement progress</p>
          </div>
          <Button onClick={() => setShowForm(true)} className="bg-slate-900 hover:bg-slate-800">
            <Plus className="h-4 w-4 mr-2" />
            Add Entitlement
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search entitlements..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Tabs value={filterStatus} onValueChange={setFilterStatus}>
            <TabsList className="bg-white border flex-wrap">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="not_started">Not Started</TabsTrigger>
              <TabsTrigger value="in_progress">In Progress</TabsTrigger>
              <TabsTrigger value="submitted">Submitted</TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Entitlements Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredEntitlements.map(entitlement => (
            <EntitlementCard
              key={entitlement.id}
              entitlement={entitlement}
              dealName={getDealName(entitlement.deal_id)}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
          {filteredEntitlements.length === 0 && (
            <div className="col-span-full text-center py-12 text-slate-500">
              No entitlements found. Add your first entitlement to get started.
            </div>
          )}
        </div>

        {/* Form Modal */}
        <EntitlementForm
          entitlement={editingEntitlement}
          deals={deals}
          open={showForm}
          onClose={() => {
            setShowForm(false);
            setEditingEntitlement(null);
          }}
          onSave={handleSave}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      </div>
    </div>
  );
}