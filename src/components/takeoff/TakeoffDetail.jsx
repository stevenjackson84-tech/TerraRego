import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Upload, Trash2, TrendingUp, Ruler, Home, Layers } from "lucide-react";
import LineItemRow from "./LineItemRow.jsx";
import LineItemForm from "./LineItemForm.jsx";
import BidUploadPanel from "./BidUploadPanel.jsx";
import BidComparisonView from "./BidComparisonView.jsx";
import TakeoffForm from "./TakeoffForm.jsx";

const CATEGORY_LABELS = {
  grading: "Grading",
  paving: "Paving",
  curb_gutter: "Curb & Gutter",
  storm_drain: "Storm Drain",
  sanitary_sewer: "Sanitary Sewer",
  water: "Water",
  dry_utilities: "Dry Utilities",
  street_lights: "Street Lights",
  landscaping: "Landscaping",
  walls_fencing: "Walls & Fencing",
  offsite_improvements: "Offsite Improvements",
  permits_fees: "Permits & Fees",
  engineering_survey: "Engineering / Survey",
  general_conditions: "General Conditions",
  other: "Other"
};

const UOM_LABELS = {
  per_lot: "/lot",
  per_lf: "/LF",
  per_sf: "/SF",
  lump_sum: "LS",
  per_unit: "/unit"
};

const devTypeLabels = {
  single_family: "Single Family",
  townhome: "Townhome",
  multifamily: "Multifamily",
  mixed_use: "Mixed Use",
  custom: "Custom"
};

export default function TakeoffDetail({ takeoff, onClose, onUpdate }) {
  const [showLineItemForm, setShowLineItemForm] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [tab, setTab] = useState("estimate");
  const queryClient = useQueryClient();

  const { data: lineItems = [] } = useQuery({
    queryKey: ["takeoff-items", takeoff.id],
    queryFn: () => base44.entities.TakeoffLineItem.filter({ takeoff_id: takeoff.id })
  });

  const { data: bidUploads = [] } = useQuery({
    queryKey: ["bid-uploads", takeoff.id],
    queryFn: () => base44.entities.BidUpload.filter({ takeoff_id: takeoff.id })
  });

  const createItemMutation = useMutation({
    mutationFn: (data) => base44.entities.TakeoffLineItem.create({ ...data, takeoff_id: takeoff.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["takeoff-items", takeoff.id] });
      setShowLineItemForm(false);
    }
  });

  const deleteItemMutation = useMutation({
    mutationFn: (id) => base44.entities.TakeoffLineItem.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["takeoff-items", takeoff.id] })
  });

  const updateTakeoffMutation = useMutation({
    mutationFn: (data) => base44.entities.Takeoff.update(takeoff.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["takeoffs"] });
      onUpdate();
      setShowEdit(false);
    }
  });

  const totalEstimate = lineItems.reduce((sum, item) => {
    const qty = item.quantity || 0;
    const cost = item.estimated_unit_cost || 0;
    return sum + qty * cost;
  }, 0);

  const perLotCost = takeoff.lot_count ? totalEstimate / takeoff.lot_count : null;
  const perSfCost = takeoff.total_site_area_sf ? totalEstimate / takeoff.total_site_area_sf : null;
  const perLfCost = takeoff.total_street_lf ? totalEstimate / takeoff.total_street_lf : null;

  const fmt = (n) => n != null ? `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "—";
  const fmtDec = (n) => n != null ? `$${n.toFixed(2)}` : "—";

  return (
    <Sheet open onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-4xl overflow-y-auto">
        <SheetHeader className="mb-4">
          <div className="flex items-start justify-between">
            <div>
              <SheetTitle className="text-xl">{takeoff.name}</SheetTitle>
              <p className="text-sm text-slate-500 mt-1">{devTypeLabels[takeoff.development_type]}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowEdit(true)}>Edit</Button>
          </div>
        </SheetHeader>

        {/* Site Measurements Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-slate-50 rounded-lg p-3 text-center">
            <p className="text-xs text-slate-500">Lots</p>
            <p className="text-xl font-bold text-slate-900">{takeoff.lot_count ?? "—"}</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-3 text-center">
            <p className="text-xs text-slate-500">Site Area</p>
            <p className="text-lg font-bold text-slate-900">
              {takeoff.total_site_area_sf ? `${takeoff.total_site_area_sf.toLocaleString()} SF` : "—"}
            </p>
            {takeoff.total_site_area_sf && (
              <p className="text-xs text-slate-400">{(takeoff.total_site_area_sf / 43560).toFixed(2)} ac</p>
            )}
          </div>
          <div className="bg-slate-50 rounded-lg p-3 text-center">
            <p className="text-xs text-slate-500">Street Length</p>
            <p className="text-lg font-bold text-slate-900">
              {takeoff.total_street_lf ? `${takeoff.total_street_lf.toLocaleString()} LF` : "—"}
            </p>
          </div>
          <div className="bg-slate-50 rounded-lg p-3 text-center">
            <p className="text-xs text-slate-500">Utility Run</p>
            <p className="text-lg font-bold text-slate-900">
              {takeoff.total_utility_lf ? `${takeoff.total_utility_lf.toLocaleString()} LF` : "—"}
            </p>
          </div>
        </div>

        {/* Cost Summary */}
        {totalEstimate > 0 && (
          <div className="bg-slate-900 text-white rounded-xl p-4 mb-6">
            <p className="text-xs text-slate-400 mb-2">Total Estimate</p>
            <p className="text-3xl font-bold mb-3">{fmt(totalEstimate)}</p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-xs text-slate-400">Per Lot</p>
                <p className="font-semibold">{perLotCost != null ? fmtDec(perLotCost) : "—"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Per SF</p>
                <p className="font-semibold">{perSfCost != null ? fmtDec(perSfCost) : "—"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Per LF (Street)</p>
                <p className="font-semibold">{perLfCost != null ? fmtDec(perLfCost) : "—"}</p>
              </div>
            </div>
          </div>
        )}

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="estimate">Cost Estimate ({lineItems.length})</TabsTrigger>
            <TabsTrigger value="bids">Bid Uploads ({bidUploads.length})</TabsTrigger>
            <TabsTrigger value="compare">Compare Bids</TabsTrigger>
          </TabsList>

          <TabsContent value="estimate">
            <div className="flex justify-between items-center mb-3">
              <p className="text-sm text-slate-600">Line items with historical averages from uploaded bids</p>
              <Button size="sm" onClick={() => setShowLineItemForm(true)} className="bg-slate-900 hover:bg-slate-800">
                <Plus className="h-3 w-3 mr-1" /> Add Line Item
              </Button>
            </div>

            {lineItems.length === 0 ? (
              <div className="text-center py-10 text-slate-400 border border-dashed border-slate-200 rounded-xl">
                No line items yet. Add your first cost item.
              </div>
            ) : (
              <div className="space-y-2">
                {/* Group by category */}
                {Object.entries(
                  lineItems.reduce((acc, item) => {
                    const cat = item.category || "other";
                    if (!acc[cat]) acc[cat] = [];
                    acc[cat].push(item);
                    return acc;
                  }, {})
                ).map(([cat, items]) => (
                  <div key={cat} className="border border-slate-100 rounded-lg overflow-hidden">
                    <div className="bg-slate-50 px-4 py-2 flex justify-between items-center">
                      <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                        {CATEGORY_LABELS[cat] || cat}
                      </p>
                      <p className="text-xs font-semibold text-slate-900">
                        {fmt(items.reduce((s, i) => s + (i.quantity || 0) * (i.estimated_unit_cost || 0), 0))}
                      </p>
                    </div>
                    {items.map(item => (
                      <LineItemRow
                        key={item.id}
                        item={item}
                        uomLabels={UOM_LABELS}
                        onDelete={() => deleteItemMutation.mutate(item.id)}
                        onUpdate={() => queryClient.invalidateQueries({ queryKey: ["takeoff-items", takeoff.id] })}
                      />
                    ))}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="bids">
            <BidUploadPanel
              takeoff={takeoff}
              bidUploads={bidUploads ?? []}
              onUpdate={() => {
                queryClient.invalidateQueries({ queryKey: ["bid-uploads", takeoff.id] });
                queryClient.invalidateQueries({ queryKey: ["takeoff-items", takeoff.id] });
              }}
            />
          </TabsContent>

          <TabsContent value="compare">
            <BidComparisonView bidUploads={bidUploads} />
          </TabsContent>
        </Tabs>

        {showLineItemForm && (
          <LineItemForm
            onSave={(data) => createItemMutation.mutate(data)}
            onClose={() => setShowLineItemForm(false)}
            isLoading={createItemMutation.isPending}
            categoryLabels={CATEGORY_LABELS}
            takeoff={takeoff}
          />
        )}

        {showEdit && (
          <TakeoffForm
            takeoff={takeoff}
            onSave={(data) => updateTakeoffMutation.mutate(data)}
            onClose={() => setShowEdit(false)}
            isLoading={updateTakeoffMutation.isPending}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}