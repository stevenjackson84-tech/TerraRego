import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  ScatterChart, Scatter, LineChart, Line, PieChart, Pie, Cell, Legend
} from "recharts";
import { DollarSign, TrendingUp, TrendingDown, AlertTriangle, Sparkles, Loader2, BarChart2, Building2, Target, Award } from "lucide-react";
import { cn } from "@/lib/utils";
import { base44 as b44 } from "@/api/base44Client";
import PortfolioAIInsights from "@/components/financial/PortfolioAIInsights.jsx";

const fmt = (v) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v || 0);
const fmtM = (v) => v >= 1e6 ? `$${(v / 1e6).toFixed(1)}M` : v >= 1000 ? `$${(v / 1000).toFixed(0)}K` : fmt(v);
const fmtPct = (v) => v != null && !isNaN(v) ? `${parseFloat(v).toFixed(1)}%` : "—";
const n = (v) => parseFloat(v) || 0;

const STAGE_ORDER = ["prospecting", "loi", "controlled_not_approved", "controlled_approved", "owned", "entitlements", "development", "closed"];
const STAGE_LABELS = {
  prospecting: "Prospecting", loi: "LOI", controlled_not_approved: "Controlled (Unapp.)",
  controlled_approved: "Controlled (App.)", owned: "Owned", entitlements: "Entitlements",
  development: "Development", closed: "Closed"
};

const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#84cc16", "#f97316"];

function MetricCard({ label, value, sub, icon: Icon, color, trend }) {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-slate-500 mb-1">{label}</p>
            <p className={cn("text-2xl font-bold", color || "text-slate-900")}>{value}</p>
            {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
          </div>
          {Icon && <div className="p-2 bg-slate-100 rounded-lg"><Icon className="h-5 w-5 text-slate-600" /></div>}
        </div>
        {trend !== undefined && (
          <div className={cn("flex items-center gap-1 mt-2 text-xs font-medium", trend >= 0 ? "text-emerald-600" : "text-red-600")}>
            {trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {fmtPct(Math.abs(trend))} vs benchmark
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DealRankRow({ deal, proforma, rank, metric, value, isTop }) {
  return (
    <div className={cn("flex items-center gap-3 p-3 rounded-lg border", isTop ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50")}>
      <div className={cn("w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
        isTop ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
      )}>
        {rank}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900 truncate">{deal.name}</p>
        <p className="text-xs text-slate-500">{deal.city || deal.address || "—"} · {STAGE_LABELS[deal.stage] || deal.stage}</p>
      </div>
      <div className="text-right shrink-0">
        <p className={cn("text-sm font-bold", isTop ? "text-emerald-700" : "text-red-700")}>{value}</p>
        <p className="text-xs text-slate-400">{metric}</p>
      </div>
    </div>
  );
}

export default function FinancialDashboard() {
  const { data: deals = [] } = useQuery({ queryKey: ["deals"], queryFn: () => base44.entities.Deal.list() });
  const { data: proformas = [] } = useQuery({ queryKey: ["proformas"], queryFn: () => base44.entities.Proforma.list() });

  // Build enriched deal data
  const enriched = useMemo(() => {
    return deals.map(deal => {
      const pf = proformas.find(p => p.deal_id === deal.id);
      if (!pf) return { deal, pf: null, hasFinancials: false, grossRevenue: 0, totalCosts: 0, profit: 0, margin: null, irr: null, roi: null };

      const pts = pf.product_types || [];
      const purchasePrice = n(pf.purchase_price);
      const devCosts = n(pf.development_costs);
      const softCosts = n(pf.soft_costs);
      const numUnits = pts.reduce((s, pt) => s + n(pt.number_of_units), 0);
      const grossRevenue = pts.reduce((s, pt) => s + n(pt.number_of_units) * n(pt.sales_price_per_unit), 0);
      const totalDirectCosts = pts.reduce((s, pt) => s + n(pt.number_of_units) * n(pt.direct_cost_per_unit), 0);
      const totalLotCosts = pts.reduce((s, pt) => s + n(pt.number_of_units) * n(pt.lot_cost), 0);
      const totalPermitCosts = pts.reduce((s, pt) => s + n(pt.number_of_units) * n(pt.building_permit_cost), 0);
      const outsideComm = grossRevenue * (n(pf.outside_sales_commission_pct || 3) / 100);
      const insideComm = grossRevenue * (n(pf.inside_sales_commission_pct || 1) / 100);
      const warranty = grossRevenue * (n(pf.warranty_pct || 0.5) / 100);
      const loanFees = grossRevenue * (n(pf.loan_fees_pct || 1) / 100);
      const contingency = (purchasePrice + devCosts + softCosts + totalDirectCosts + totalPermitCosts) * (n(pf.contingency_percentage || 5) / 100);
      const totalCosts = purchasePrice + devCosts + softCosts + totalLotCosts + totalDirectCosts + totalPermitCosts + outsideComm + insideComm + warranty + loanFees + contingency;
      const profit = grossRevenue - totalCosts;
      const margin = grossRevenue > 0 ? (profit / grossRevenue) * 100 : null;
      const invested = purchasePrice + devCosts + softCosts;
      const roi = invested > 0 ? (profit / invested) * 100 : null;

      return { deal, pf, hasFinancials: grossRevenue > 0 || totalCosts > 0, grossRevenue, totalCosts, profit, margin, irr: null, roi, numUnits };
    });
  }, [deals, proformas]);

  const withFinancials = enriched.filter(e => e.hasFinancials);

  // Portfolio-level metrics
  const portfolio = useMemo(() => {
    const totalRevenue = withFinancials.reduce((s, e) => s + e.grossRevenue, 0);
    const totalCosts = withFinancials.reduce((s, e) => s + e.totalCosts, 0);
    const totalProfit = withFinancials.reduce((s, e) => s + e.profit, 0);
    const avgMargin = withFinancials.length > 0
      ? withFinancials.filter(e => e.margin !== null).reduce((s, e) => s + e.margin, 0) / withFinancials.filter(e => e.margin !== null).length
      : 0;
    const totalUnits = withFinancials.reduce((s, e) => s + (e.numUnits || 0), 0);
    const profitableDeals = withFinancials.filter(e => e.profit > 0).length;
    return { totalRevenue, totalCosts, totalProfit, avgMargin, totalUnits, profitableDeals };
  }, [withFinancials]);

  // Charts
  const marginByStage = useMemo(() => {
    const byStage = {};
    withFinancials.forEach(e => {
      const s = e.deal.stage || "unknown";
      if (!byStage[s]) byStage[s] = { margins: [], revenues: [] };
      if (e.margin !== null) byStage[s].margins.push(e.margin);
      byStage[s].revenues.push(e.grossRevenue);
    });
    return STAGE_ORDER.filter(s => byStage[s]).map(s => ({
      stage: STAGE_LABELS[s] || s,
      avgMargin: byStage[s].margins.length > 0 ? byStage[s].margins.reduce((a, b) => a + b, 0) / byStage[s].margins.length : 0,
      totalRevenue: byStage[s].revenues.reduce((a, b) => a + b, 0),
      count: byStage[s].margins.length
    }));
  }, [withFinancials]);

  const profitByDeal = useMemo(() =>
    withFinancials
      .filter(e => e.grossRevenue > 0)
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 10)
      .map(e => ({ name: e.deal.name.length > 18 ? e.deal.name.slice(0, 17) + "…" : e.deal.name, profit: e.profit, margin: e.margin })),
    [withFinancials]);

  const roiData = useMemo(() =>
    withFinancials.filter(e => e.roi !== null).map(e => ({
      name: e.deal.name, roi: e.roi, revenue: e.grossRevenue, stage: e.deal.stage
    })),
    [withFinancials]);

  const propertyTypeDist = useMemo(() => {
    const counts = {};
    withFinancials.forEach(e => {
      const t = e.deal.property_type || "other";
      counts[t] = (counts[t] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [withFinancials]);

  // Top / Under performers
  const sorted = [...withFinancials.filter(e => e.margin !== null)].sort((a, b) => b.margin - a.margin);
  const topPerformers = sorted.slice(0, 3);
  const underPerformers = [...sorted].reverse().slice(0, 3);

  if (deals.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <BarChart2 className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="text-lg font-semibold text-slate-700">No deals found</p>
          <p className="text-sm text-slate-400 mt-1">Add deals and proformas to see financial analytics</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Financial Dashboard</h1>
          <p className="text-slate-500 mt-1">{withFinancials.length} deals with proforma data · Portfolio overview</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <MetricCard label="Total Portfolio Revenue" value={fmtM(portfolio.totalRevenue)} icon={DollarSign} />
          <MetricCard label="Total Projected Profit" value={fmtM(portfolio.totalProfit)} color={portfolio.totalProfit >= 0 ? "text-emerald-700" : "text-red-700"} icon={TrendingUp} />
          <MetricCard label="Avg Gross Margin" value={fmtPct(portfolio.avgMargin)} color={portfolio.avgMargin >= 15 ? "text-emerald-700" : portfolio.avgMargin >= 8 ? "text-amber-700" : "text-red-700"} icon={Target} trend={portfolio.avgMargin - 17} />
          <MetricCard label="Projected Units" value={portfolio.totalUnits.toLocaleString()} icon={Building2} sub="across all deals" />
          <MetricCard label="Deals w/ Proformas" value={withFinancials.length} icon={BarChart2} sub={`of ${deals.length} total`} />
          <MetricCard label="Profitable Deals" value={portfolio.profitableDeals} color="text-emerald-700" icon={Award} sub={`of ${withFinancials.length} with data`} />
        </div>

        {/* AI Insights */}
        <div className="mb-8">
          <PortfolioAIInsights enriched={withFinancials} portfolio={portfolio} deals={deals} />
        </div>

        <Tabs defaultValue="performance" className="space-y-6">
          <TabsList className="bg-white border">
            <TabsTrigger value="performance">Performance Rankings</TabsTrigger>
            <TabsTrigger value="charts">Charts & Trends</TabsTrigger>
            <TabsTrigger value="table">Deal Table</TabsTrigger>
          </TabsList>

          {/* ─── PERFORMANCE RANKINGS ─── */}
          <TabsContent value="performance" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Award className="h-4 w-4 text-emerald-600" />
                    Top Performers (by Gross Margin)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {topPerformers.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-4">No deals with margin data</p>
                  ) : topPerformers.map((e, i) => (
                    <DealRankRow key={e.deal.id} deal={e.deal} proforma={e.pf} rank={i + 1} metric="Gross Margin" value={fmtPct(e.margin)} isTop={true} />
                  ))}
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    Under Performers (by Gross Margin)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {underPerformers.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-4">No deals with margin data</p>
                  ) : underPerformers.map((e, i) => (
                    <DealRankRow key={e.deal.id} deal={e.deal} proforma={e.pf} rank={i + 1} metric="Gross Margin" value={fmtPct(e.margin)} isTop={false} />
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* ROI ranking */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">ROI Ranking — All Deals with Proformas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {[...withFinancials.filter(e => e.roi !== null)].sort((a, b) => b.roi - a.roi).map((e, i) => {
                    const barPct = Math.min(Math.max((e.roi / 100) * 100, 0), 100);
                    return (
                      <div key={e.deal.id} className="flex items-center gap-3">
                        <span className="text-xs text-slate-400 w-5 text-right">{i + 1}</span>
                        <span className="text-sm text-slate-700 w-36 truncate">{e.deal.name}</span>
                        <div className="flex-1 bg-slate-100 rounded-full h-2">
                          <div
                            className={cn("h-2 rounded-full", e.roi >= 20 ? "bg-emerald-500" : e.roi >= 10 ? "bg-amber-400" : "bg-red-400")}
                            style={{ width: `${barPct}%` }}
                          />
                        </div>
                        <span className={cn("text-sm font-bold w-14 text-right", e.roi >= 20 ? "text-emerald-700" : e.roi >= 10 ? "text-amber-700" : "text-red-700")}>
                          {fmtPct(e.roi)}
                        </span>
                      </div>
                    );
                  })}
                  {withFinancials.filter(e => e.roi !== null).length === 0 && (
                    <p className="text-sm text-slate-400 text-center py-4">Add proforma data to deals to see ROI rankings</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── CHARTS ─── */}
          <TabsContent value="charts" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Profit by Deal Bar Chart */}
              <Card className="border-0 shadow-sm">
                <CardHeader><CardTitle className="text-base">Projected Profit by Deal (Top 10)</CardTitle></CardHeader>
                <CardContent>
                  {profitByDeal.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-12">No data available</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={profitByDeal} margin={{ top: 5, right: 10, left: 10, bottom: 60 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" interval={0} />
                        <YAxis tick={{ fontSize: 11 }} tickFormatter={v => fmtM(v)} />
                        <Tooltip formatter={(v) => [fmt(v), "Profit"]} />
                        <Bar dataKey="profit" radius={[4, 4, 0, 0]}>
                          {profitByDeal.map((entry, i) => (
                            <Cell key={i} fill={entry.profit >= 0 ? "#10b981" : "#ef4444"} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* Avg Margin by Stage */}
              <Card className="border-0 shadow-sm">
                <CardHeader><CardTitle className="text-base">Avg Gross Margin by Deal Stage</CardTitle></CardHeader>
                <CardContent>
                  {marginByStage.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-12">No stage data</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={marginByStage} margin={{ top: 5, right: 10, left: 10, bottom: 60 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="stage" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" interval={0} />
                        <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${v.toFixed(0)}%`} />
                        <Tooltip formatter={(v) => [`${v.toFixed(1)}%`, "Avg Margin"]} />
                        <Bar dataKey="avgMargin" fill="#6366f1" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* ROI Scatter */}
              <Card className="border-0 shadow-sm">
                <CardHeader><CardTitle className="text-base">Revenue vs ROI (bubble = deal size)</CardTitle></CardHeader>
                <CardContent>
                  {roiData.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-12">No ROI data available</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={280}>
                      <ScatterChart margin={{ top: 5, right: 10, left: 10, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="revenue" name="Revenue" tick={{ fontSize: 11 }} tickFormatter={v => fmtM(v)} />
                        <YAxis dataKey="roi" name="ROI %" tick={{ fontSize: 11 }} tickFormatter={v => `${v.toFixed(0)}%`} />
                        <Tooltip cursor={{ strokeDasharray: "3 3" }} content={({ payload }) => {
                          if (!payload?.length) return null;
                          const d = payload[0].payload;
                          return (
                            <div className="bg-white border border-slate-200 rounded-lg p-2 shadow text-xs">
                              <p className="font-semibold">{d.name}</p>
                              <p>Revenue: {fmtM(d.revenue)}</p>
                              <p>ROI: {fmtPct(d.roi)}</p>
                            </div>
                          );
                        }} />
                        <Scatter data={roiData} fill="#6366f1" opacity={0.7} />
                      </ScatterChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* Property Type Distribution */}
              <Card className="border-0 shadow-sm">
                <CardHeader><CardTitle className="text-base">Portfolio Mix by Property Type</CardTitle></CardHeader>
                <CardContent>
                  {propertyTypeDist.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-12">No data</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie data={propertyTypeDist} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                          {propertyTypeDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ─── TABLE ─── */}
          <TabsContent value="table">
            <Card className="border-0 shadow-sm">
              <CardHeader><CardTitle className="text-base">All Deals — Financial Summary</CardTitle></CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        {["Deal", "Stage", "Revenue", "Total Costs", "Profit", "Margin", "ROI", "Units"].map(h => (
                          <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {enriched.map(e => (
                        <tr key={e.deal.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 font-medium text-slate-900">{e.deal.name}</td>
                          <td className="px-4 py-3">
                            <Badge variant="outline" className="text-xs capitalize">{STAGE_LABELS[e.deal.stage] || e.deal.stage || "—"}</Badge>
                          </td>
                          <td className="px-4 py-3">{e.grossRevenue > 0 ? fmtM(e.grossRevenue) : "—"}</td>
                          <td className="px-4 py-3">{e.totalCosts > 0 ? fmtM(e.totalCosts) : "—"}</td>
                          <td className={cn("px-4 py-3 font-semibold", e.profit > 0 ? "text-emerald-700" : e.profit < 0 ? "text-red-700" : "text-slate-400")}>
                            {e.hasFinancials ? fmtM(e.profit) : "—"}
                          </td>
                          <td className={cn("px-4 py-3 font-semibold", e.margin !== null && e.margin >= 15 ? "text-emerald-700" : e.margin !== null && e.margin >= 8 ? "text-amber-700" : "text-red-700")}>
                            {e.margin !== null ? fmtPct(e.margin) : "—"}
                          </td>
                          <td className={cn("px-4 py-3 font-semibold", e.roi !== null && e.roi >= 20 ? "text-emerald-700" : e.roi !== null && e.roi >= 10 ? "text-amber-700" : "text-red-700")}>
                            {e.roi !== null ? fmtPct(e.roi) : "—"}
                          </td>
                          <td className="px-4 py-3 text-slate-600">{e.numUnits > 0 ? e.numUnits : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}