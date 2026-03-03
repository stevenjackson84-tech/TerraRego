import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Award, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

const fmtPct = (v) => v != null && !isNaN(v) ? `${parseFloat(v).toFixed(1)}%` : "—";
const n = (v) => parseFloat(v) || 0;

const STAGE_LABELS = {
  prospecting: "Prospecting", loi: "LOI", controlled_not_approved: "Ctrl (Unapp.)",
  controlled_approved: "Ctrl (App.)", owned: "Owned", entitlements: "Entitlements",
  development: "Development", closed: "Closed"
};

export default function PerformanceRankingsWidget({ deals = [], proformas = [] }) {
  const ranked = useMemo(() => {
    return deals.map(deal => {
      const pf = proformas.find(p => p.deal_id === deal.id);
      if (!pf) return null;
      const pts = pf.product_types || [];
      const purchasePrice = n(pf.purchase_price);
      const devCosts = n(pf.development_costs);
      const softCosts = n(pf.soft_costs);
      const grossRevenue = pts.reduce((s, pt) => s + n(pt.number_of_units) * n(pt.sales_price_per_unit), 0);
      const totalDirectCosts = pts.reduce((s, pt) => s + n(pt.number_of_units) * n(pt.direct_cost_per_unit), 0);
      const contingency = (purchasePrice + devCosts + softCosts + totalDirectCosts) * (n(pf.contingency_percentage || 5) / 100);
      const totalCosts = purchasePrice + devCosts + softCosts + totalDirectCosts + contingency;
      const profit = grossRevenue - totalCosts;
      const margin = grossRevenue > 0 ? (profit / grossRevenue) * 100 : null;
      return margin !== null ? { deal, margin } : null;
    }).filter(Boolean).sort((a, b) => b.margin - a.margin);
  }, [deals, proformas]);

  const top = ranked.slice(0, 3);
  const bottom = [...ranked].reverse().slice(0, 3);

  if (ranked.length === 0) {
    return (
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-3">Performance Rankings</h2>
        <Card className="border-0 shadow-sm p-8 text-center">
          <p className="text-sm text-slate-400">Add proforma data to deals to see rankings</p>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-slate-900 mb-3">Performance Rankings</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Award className="h-4 w-4 text-emerald-600" /> Top Performers
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {top.map((e, i) => (
              <div key={e.deal.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-emerald-200 bg-emerald-50">
                <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{e.deal.name}</p>
                  <p className="text-xs text-slate-500">{STAGE_LABELS[e.deal.stage] || e.deal.stage}</p>
                </div>
                <p className="text-sm font-bold text-emerald-700 shrink-0">{fmtPct(e.margin)}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" /> Under Performers
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {bottom.map((e, i) => (
              <div key={e.deal.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-red-200 bg-red-50">
                <div className="w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{e.deal.name}</p>
                  <p className="text-xs text-slate-500">{STAGE_LABELS[e.deal.stage] || e.deal.stage}</p>
                </div>
                <p className="text-sm font-bold text-red-700 shrink-0">{fmtPct(e.margin)}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}