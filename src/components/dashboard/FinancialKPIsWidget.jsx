import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { DollarSign, TrendingUp, Target, Building2, BarChart2, Award } from "lucide-react";
import { cn } from "@/lib/utils";

const fmtM = (v) => v >= 1e6 ? `$${(v / 1e6).toFixed(1)}M` : v >= 1000 ? `$${(v / 1000).toFixed(0)}K` : `$${(v || 0).toFixed(0)}`;
const fmtPct = (v) => v != null && !isNaN(v) ? `${parseFloat(v).toFixed(1)}%` : "—";
const n = (v) => parseFloat(v) || 0;

export default function FinancialKPIsWidget({ deals = [], proformas = [] }) {
  const portfolio = useMemo(() => {
    const enriched = deals.map(deal => {
      const pf = proformas.find(p => p.deal_id === deal.id);
      if (!pf) return null;
      const pts = pf.product_types || [];
      const purchasePrice = n(pf.purchase_price);
      const devCosts = n(pf.development_costs);
      const softCosts = n(pf.soft_costs);
      const numUnits = pts.reduce((s, pt) => s + n(pt.number_of_units), 0);
      const grossRevenue = pts.reduce((s, pt) => s + n(pt.number_of_units) * n(pt.sales_price_per_unit), 0);
      const totalDirectCosts = pts.reduce((s, pt) => s + n(pt.number_of_units) * n(pt.direct_cost_per_unit), 0);
      const contingency = (purchasePrice + devCosts + softCosts + totalDirectCosts) * (n(pf.contingency_percentage || 5) / 100);
      const totalCosts = purchasePrice + devCosts + softCosts + totalDirectCosts + contingency;
      const profit = grossRevenue - totalCosts;
      const margin = grossRevenue > 0 ? (profit / grossRevenue) * 100 : null;
      return { grossRevenue, profit, margin, numUnits, hasFinancials: grossRevenue > 0 };
    }).filter(Boolean);

    const withData = enriched.filter(e => e.hasFinancials);
    return {
      totalRevenue: withData.reduce((s, e) => s + e.grossRevenue, 0),
      totalProfit: withData.reduce((s, e) => s + e.profit, 0),
      avgMargin: withData.filter(e => e.margin !== null).length > 0
        ? withData.filter(e => e.margin !== null).reduce((s, e) => s + e.margin, 0) / withData.filter(e => e.margin !== null).length
        : 0,
      totalUnits: withData.reduce((s, e) => s + (e.numUnits || 0), 0),
      dealsWithData: withData.length,
      profitableDeals: withData.filter(e => e.profit > 0).length,
    };
  }, [deals, proformas]);

  const metrics = [
    { label: "Portfolio Revenue", value: fmtM(portfolio.totalRevenue), icon: DollarSign, color: "text-slate-900" },
    { label: "Projected Profit", value: fmtM(portfolio.totalProfit), icon: TrendingUp, color: portfolio.totalProfit >= 0 ? "text-emerald-700" : "text-red-700" },
    { label: "Avg Gross Margin", value: fmtPct(portfolio.avgMargin), icon: Target, color: portfolio.avgMargin >= 15 ? "text-emerald-700" : portfolio.avgMargin >= 8 ? "text-amber-700" : "text-red-700" },
    { label: "Projected Units", value: portfolio.totalUnits.toLocaleString(), icon: Building2, color: "text-slate-900" },
    { label: "Deals w/ Proformas", value: portfolio.dealsWithData, icon: BarChart2, color: "text-slate-900" },
    { label: "Profitable Deals", value: portfolio.profitableDeals, icon: Award, color: "text-emerald-700" },
  ];

  return (
    <div>
      <h2 className="text-lg font-semibold text-slate-900 mb-3">Financial Overview</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {metrics.map((m) => (
          <Card key={m.label} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-slate-500 mb-1">{m.label}</p>
                  <p className={cn("text-xl font-bold", m.color)}>{m.value}</p>
                </div>
                <div className="p-1.5 bg-slate-100 rounded-lg">
                  <m.icon className="h-4 w-4 text-slate-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}