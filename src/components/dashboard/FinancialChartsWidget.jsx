import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import { cn } from "@/lib/utils";

const fmtM = (v) => v >= 1e6 ? `$${(v / 1e6).toFixed(1)}M` : v >= 1000 ? `$${(v / 1000).toFixed(0)}K` : `$${(v || 0).toFixed(0)}`;
const fmt = (v) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v || 0);
const n = (v) => parseFloat(v) || 0;

const STAGE_LABELS = {
  prospecting: "Prosp.", loi: "LOI", controlled_not_approved: "Ctrl (Un.)",
  controlled_approved: "Ctrl (Ap.)", owned: "Owned", entitlements: "Entitle.",
  development: "Dev.", closed: "Closed"
};

export default function FinancialChartsWidget({ deals = [], proformas = [] }) {
  const enriched = useMemo(() => {
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
      return { deal, grossRevenue, profit, margin, hasFinancials: grossRevenue > 0 };
    }).filter(e => e && e.hasFinancials);
  }, [deals, proformas]);

  const profitByDeal = useMemo(() =>
    [...enriched]
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 8)
      .map(e => ({
        name: e.deal.name.length > 14 ? e.deal.name.slice(0, 13) + "…" : e.deal.name,
        profit: e.profit,
      })),
    [enriched]);

  const marginByStage = useMemo(() => {
    const byStage = {};
    enriched.forEach(e => {
      const s = e.deal.stage || "unknown";
      if (!byStage[s]) byStage[s] = [];
      if (e.margin !== null) byStage[s].push(e.margin);
    });
    return Object.entries(byStage)
      .filter(([, arr]) => arr.length > 0)
      .map(([stage, arr]) => ({
        stage: STAGE_LABELS[stage] || stage,
        avgMargin: arr.reduce((a, b) => a + b, 0) / arr.length,
      }));
  }, [enriched]);

  if (enriched.length === 0) {
    return (
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-3">Financial Charts</h2>
        <Card className="border-0 shadow-sm p-8 text-center">
          <p className="text-sm text-slate-400">Add proforma data to deals to see charts</p>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-slate-900 mb-3">Financial Charts</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700">Projected Profit by Deal</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={profitByDeal} margin={{ top: 5, right: 10, left: 10, bottom: 50 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" interval={0} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => fmtM(v)} />
                <Tooltip formatter={(v) => [fmt(v), "Profit"]} />
                <Bar dataKey="profit" radius={[4, 4, 0, 0]}>
                  {profitByDeal.map((entry, i) => (
                    <Cell key={i} fill={entry.profit >= 0 ? "#10b981" : "#ef4444"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700">Avg Gross Margin by Stage</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={marginByStage} margin={{ top: 5, right: 10, left: 10, bottom: 50 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="stage" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" interval={0} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${v.toFixed(0)}%`} />
                <Tooltip formatter={(v) => [`${v.toFixed(1)}%`, "Avg Margin"]} />
                <Bar dataKey="avgMargin" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}