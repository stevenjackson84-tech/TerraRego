import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, ScanSearch, ChevronRight, Trash2, Home, Ruler } from "lucide-react";
import ParcelInputForm from "@/components/siteanalysis/ParcelInputForm";
import AnalysisResults from "@/components/siteanalysis/AnalysisResults";
import { createPageUrl } from "@/utils";
import { useNavigate } from "react-router-dom";

const devTypeLabels = {
  single_family: "Single Family",
  townhome: "Townhome",
  multifamily: "Multifamily",
  mixed_use: "Mixed Use",
  custom: "Custom",
};

export default function SiteAnalysisPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [view, setView] = useState("list"); // "list" | "new" | "results" | "saved"
  const [pendingData, setPendingData] = useState(null);
  const [selectedAnalysis, setSelectedAnalysis] = useState(null);

  const { data: analyses = [], isLoading } = useQuery({
    queryKey: ["site-analyses"],
    queryFn: () => base44.entities.SiteAnalysis.list("-created_date"),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => data.id
      ? base44.entities.SiteAnalysis.update(data.id, data)
      : base44.entities.SiteAnalysis.create(data),
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ["site-analyses"] });
      setSelectedAnalysis(saved);
      setView("saved");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.SiteAnalysis.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["site-analyses"] }),
  });

  const handleAnalyze = (formData) => {
    setPendingData(formData);
    setView("results");
  };

  const handleSave = () => {
    // Re-run calculation to persist computed values
    const grossSF = pendingData.gross_site_area_sf || (pendingData.gross_site_area_acres * 43560);
    const grossAcres = pendingData.gross_site_area_acres || (grossSF / 43560);
    const totalDeductionPct = (
      (pendingData.street_dedication_pct || 0) +
      (pendingData.open_space_pct || 0) +
      (pendingData.utility_easement_pct || 0) +
      (pendingData.slope_constraint_pct || 0) +
      (pendingData.wetland_constraint_pct || 0)
    );
    const netSF = grossSF * (1 - totalDeductionPct / 100);
    const netAcres = netSF / 43560;
    const maxByDensity = pendingData.max_density_du_per_acre ? Math.floor(netAcres * pendingData.max_density_du_per_acre) : null;
    const maxByLotSize = pendingData.min_lot_size_sf ? Math.floor(netSF / pendingData.min_lot_size_sf) : null;
    const maxUnits = maxByDensity != null && maxByLotSize != null ? Math.min(maxByDensity, maxByLotSize) : (maxByDensity ?? maxByLotSize);
    const probableUnits = maxUnits ? Math.floor(maxUnits * 0.85) : null;

    saveMutation.mutate({
      ...pendingData,
      gross_site_area_sf: grossSF,
      calculated_net_area_sf: netSF,
      calculated_max_units: maxUnits,
      calculated_probable_units: probableUnits,
      status: "complete",
    });
  };

  const handleCreateTakeoff = () => {
    // Save first if not yet saved, then navigate to Takeoff with prefill params
    const d = pendingData || selectedAnalysis;
    const params = new URLSearchParams({
      prefill_name: d.name || "",
      prefill_dev_type: d.development_type || "single_family",
      prefill_lots: d.calculated_probable_units || "",
      prefill_site_sf: d.gross_site_area_sf || "",
    });
    navigate(createPageUrl("Takeoff") + "?" + params.toString());
  };

  const handleOpenSaved = (analysis) => {
    setSelectedAnalysis(analysis);
    setPendingData(analysis);
    setView("saved");
  };

  // List view
  if (view === "list") {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                <ScanSearch className="h-8 w-8 text-slate-700" />
                Site Analysis
              </h1>
              <p className="text-slate-500 mt-1">Calculate density, setbacks, and yield before formal takeoff</p>
            </div>
            <Button onClick={() => { setPendingData(null); setView("new"); }} className="bg-slate-900 hover:bg-slate-800">
              <Plus className="h-4 w-4 mr-2" /> New Analysis
            </Button>
          </div>

          {isLoading ? (
            <div className="text-center py-12 text-slate-400">Loading...</div>
          ) : analyses.length === 0 ? (
            <div className="text-center py-20">
              <ScanSearch className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 font-medium mb-1">No site analyses yet</p>
              <p className="text-slate-400 text-sm mb-6">Run a parcel analysis to calculate density, setbacks, and yield potential before creating a takeoff.</p>
              <Button onClick={() => setView("new")} className="bg-slate-900 hover:bg-slate-800">
                <Plus className="h-4 w-4 mr-2" /> Run First Analysis
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {analyses.map(a => (
                <div
                  key={a.id}
                  className="bg-white rounded-xl border border-slate-200 p-5 cursor-pointer hover:shadow-md transition-shadow group"
                  onClick={() => handleOpenSaved(a)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0 pr-2">
                      <h3 className="font-semibold text-slate-900 text-sm truncate">{a.name}</h3>
                      {a.address && <p className="text-xs text-slate-400 truncate">{a.address}</p>}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {a.zoning_code && <Badge variant="secondary" className="text-xs">{a.zoning_code}</Badge>}
                      <button
                        onClick={(e) => { e.stopPropagation(); if (confirm("Delete this analysis?")) deleteMutation.mutate(a.id); }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-red-500 transition-all"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mb-4">{devTypeLabels[a.development_type] || a.development_type}</p>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-slate-50 rounded-lg p-2">
                      <p className="text-xs text-slate-400">Acres</p>
                      <p className="font-bold text-slate-900 text-sm">{a.gross_site_area_acres?.toFixed(1) ?? "—"}</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-2">
                      <p className="text-xs text-slate-400">Probable Units</p>
                      <p className="font-bold text-green-700 text-sm">{a.calculated_probable_units ?? "—"}</p>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-2">
                      <p className="text-xs text-slate-400">Max Units</p>
                      <p className="font-bold text-blue-700 text-sm">{a.calculated_max_units ?? "—"}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-end mt-3 text-xs text-slate-400 group-hover:text-slate-600">
                    View results <ChevronRight className="h-3 w-3 ml-1" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Input form view
  if (view === "new") {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => setView("list")} className="text-sm text-slate-400 hover:text-slate-700">← Back</button>
            <h1 className="text-xl font-bold text-slate-900">New Site Analysis</h1>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <ParcelInputForm onAnalyze={handleAnalyze} />
          </div>
        </div>
      </div>
    );
  }

  // Results view (unsaved)
  if (view === "results") {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => setView("new")} className="text-sm text-slate-400 hover:text-slate-700">← Edit Inputs</button>
            <h1 className="text-xl font-bold text-slate-900">Analysis Results</h1>
            <Badge className="bg-amber-100 text-amber-700 border-0">Unsaved</Badge>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <AnalysisResults
              data={pendingData}
              onSave={handleSave}
              onCreateTakeoff={handleCreateTakeoff}
              isSaving={saveMutation.isPending}
            />
          </div>
        </div>
      </div>
    );
  }

  // Saved results view
  if (view === "saved") {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => setView("list")} className="text-sm text-slate-400 hover:text-slate-700">← All Analyses</button>
            <h1 className="text-xl font-bold text-slate-900">Analysis Results</h1>
            <Badge className="bg-green-100 text-green-700 border-0">Saved</Badge>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <AnalysisResults
              data={selectedAnalysis}
              onSave={() => {}}
              onCreateTakeoff={handleCreateTakeoff}
              isSaving={false}
            />
          </div>
        </div>
      </div>
    );
  }

  return null;
}