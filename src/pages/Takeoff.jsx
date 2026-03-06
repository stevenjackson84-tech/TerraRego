import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Ruler, Home, LayoutGrid, Folder, FolderOpen, FileText, ExternalLink, Trash2 } from "lucide-react";
import TakeoffForm from "@/components/takeoff/TakeoffForm.jsx";
import TakeoffDetail from "@/components/takeoff/TakeoffDetail.jsx";

const devTypeLabels = {
  single_family: "Single Family",
  townhome: "Townhome",
  multifamily: "Multifamily",
  mixed_use: "Mixed Use",
  custom: "Custom"
};

const statusColors = {
  draft: "bg-gray-100 text-gray-700",
  active: "bg-blue-100 text-blue-700",
  complete: "bg-green-100 text-green-700"
};

export default function TakeoffPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const prefill = urlParams.get("prefill_name") ? {
    name: urlParams.get("prefill_name") || "",
    development_type: urlParams.get("prefill_dev_type") || "single_family",
    lot_count: urlParams.get("prefill_lots") || "",
    total_site_area_sf: urlParams.get("prefill_site_sf") || "",
  } : null;

  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(!!prefill);
  const [selectedTakeoff, setSelectedTakeoff] = useState(null);
  const queryClient = useQueryClient();

  const { data: takeoffs = [], isLoading } = useQuery({
    queryKey: ["takeoffs"],
    queryFn: () => base44.entities.Takeoff.list("-created_date")
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Takeoff.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["takeoffs"] });
      setShowForm(false);
    }
  });

  const filtered = takeoffs.filter(t =>
    !search || t.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Project Takeoffs</h1>
            <p className="text-slate-500 mt-1">Estimate development costs with historical bid data</p>
          </div>
          <Button onClick={() => setShowForm(true)} className="bg-slate-900 hover:bg-slate-800">
            <Plus className="h-4 w-4 mr-2" />
            New Takeoff
          </Button>
        </div>

        <div className="relative max-w-md mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search takeoffs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-slate-400">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            No takeoffs yet. Create your first one to get started.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(t => (
              <div
                key={t.id}
                className="bg-white rounded-xl border border-slate-200 p-5 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedTakeoff(t)}
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-slate-900 text-sm">{t.name}</h3>
                  <Badge className={`text-xs ${statusColors[t.status] || statusColors.draft}`}>
                    {t.status}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 mb-4">{devTypeLabels[t.development_type] || t.development_type}</p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-slate-50 rounded-lg p-2">
                    <p className="text-xs text-slate-500">Lots</p>
                    <p className="font-bold text-slate-900 text-sm">{t.lot_count ?? "—"}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-2">
                    <p className="text-xs text-slate-500">Site SF</p>
                    <p className="font-bold text-slate-900 text-sm">
                      {t.total_site_area_sf ? `${(t.total_site_area_sf / 43560).toFixed(1)} ac` : "—"}
                    </p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-2">
                    <p className="text-xs text-slate-500">Street LF</p>
                    <p className="font-bold text-slate-900 text-sm">
                      {t.total_street_lf ? `${t.total_street_lf.toLocaleString()}` : "—"}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <TakeoffForm
          onSave={(data) => createMutation.mutate(data)}
          onClose={() => setShowForm(false)}
          isLoading={createMutation.isPending}
          takeoff={prefill}
        />
      )}

      {selectedTakeoff && (
        <TakeoffDetail
          takeoff={selectedTakeoff}
          onClose={() => setSelectedTakeoff(null)}
          onUpdate={() => queryClient.invalidateQueries({ queryKey: ["takeoffs"] })}
        />
      )}
    </div>
  );
}