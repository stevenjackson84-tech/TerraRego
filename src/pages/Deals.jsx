import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, LayoutGrid, Kanban, List } from "lucide-react";
import DealCard from "@/components/deals/DealCard";
import DealPipeline from "@/components/deals/DealPipeline";
import DealForm from "@/components/deals/DealForm";
import { cn } from "@/lib/utils";

export default function Deals() {
  const [view, setView] = useState("pipeline");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingDeal, setEditingDeal] = useState(null);
  const [filterStage, setFilterStage] = useState("all");
  
  const queryClient = useQueryClient();

  const { data: deals = [], isLoading } = useQuery({
    queryKey: ['deals'],
    queryFn: () => base44.entities.Deal.list('-created_date')
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Deal.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      setShowForm(false);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Deal.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      setShowForm(false);
      setEditingDeal(null);
    }
  });

  const handleSave = (data) => {
    if (editingDeal) {
      updateMutation.mutate({ id: editingDeal.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleUpdateDeal = (id, data) => {
    updateMutation.mutate({ id, data });
  };

  const filteredDeals = deals.filter(deal => {
    const matchesSearch = !search || 
      deal.name?.toLowerCase().includes(search.toLowerCase()) ||
      deal.address?.toLowerCase().includes(search.toLowerCase()) ||
      deal.city?.toLowerCase().includes(search.toLowerCase());
    const matchesStage = filterStage === "all" || deal.stage === filterStage;
    return matchesSearch && matchesStage;
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Deals</h1>
            <p className="text-slate-500 mt-1">Manage your land acquisition pipeline</p>
          </div>
          <Button onClick={() => setShowForm(true)} className="bg-slate-900 hover:bg-slate-800">
            <Plus className="h-4 w-4 mr-2" />
            New Deal
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search deals..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Tabs value={filterStage} onValueChange={setFilterStage}>
              <TabsList className="bg-white border">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="prospecting">Prospecting</TabsTrigger>
                <TabsTrigger value="under_contract">Contract</TabsTrigger>
                <TabsTrigger value="entitlements">Entitlements</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex border rounded-lg bg-white p-1">
              <Button
                variant="ghost"
                size="icon"
                className={cn("h-8 w-8", view === "pipeline" && "bg-slate-100")}
                onClick={() => setView("pipeline")}
              >
                <Kanban className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={cn("h-8 w-8", view === "grid" && "bg-slate-100")}
                onClick={() => setView("grid")}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        {view === "pipeline" ? (
          <DealPipeline 
            deals={filteredDeals} 
            onUpdateDeal={handleUpdateDeal}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDeals.map(deal => (
              <DealCard key={deal.id} deal={deal} />
            ))}
            {filteredDeals.length === 0 && (
              <div className="col-span-full text-center py-12 text-slate-500">
                No deals found. Create your first deal to get started.
              </div>
            )}
          </div>
        )}

        {/* Form Modal */}
        <DealForm
          deal={editingDeal}
          open={showForm}
          onClose={() => {
            setShowForm(false);
            setEditingDeal(null);
          }}
          onSave={handleSave}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      </div>
    </div>
  );
}