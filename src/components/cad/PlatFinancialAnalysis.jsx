import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp, Loader2, RefreshCw, Home, Hammer,
  AlertCircle, ChevronDown, ChevronUp
} from "lucide-react";
import SensitivityTable from "@/components/cad/SensitivityTable";

function fmt(n, decimals = 0) {
  if (n == null || isNaN(n)) return "—";
  return n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}
function fmtMoney(n) {
  if (n == null || isNaN(n)) return "—";
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}
function fmtPct(n) {
  if (n == null || isNaN(n)) return "—";
  return `${n.toFixed(1)}%`;
}

const COST_PRESETS = {
  "single_family": { land_dev_per_lot: 45000, vertical_per_sf: 160, soft_cost_pct: 12, avg_home_sf: 2200 },
  "townhome":      { land_dev_per_lot: 30000, vertical_per_sf: 145, soft_cost_pct: 12, avg_home_sf: 1600 },
  "multifamily":   { land_dev_per_lot: 20000, vertical_per_sf: 180, soft_cost_pct: 14, avg_home_sf: 1000 },
};

export default function PlatFinancialAnalysis({ platMeta }) {
  const [inputs, setInputs] = useState({
    land_cost: "",
    product_type: "single_family",
    avg_home_sf: 2200,
    land_dev_per_lot: 45000,
    vertical_per_sf: 160,
    soft_cost_pct: 12,
    avg_sale_price: "",
    sales_commission_pct: 5,
    carry_months: 24,
    carry_rate_pct: 7,
  });
  const [marketData, setMarketData] = useState(null);
  const [marketLoading, setMarketLoading] = useState(false);
  const [marketError, setMarketError] = useState(null);
  const [showCostDetail, setShowCostDetail] = useState(false);

  const set = (k, v) => setInputs(i => ({ ...i, [k]: v }));

  const applyProductType = (type) => {
    const p = COST_PRESETS[type] || COST_PRESETS["single_family"];
    setInputs(i => ({ ...i, product_type: type, ...p }));
  };

  const fetchMarketData = async () => {
    setMarketLoading(true);
    setMarketError(null);
    const address = platMeta?.address || "";
    const zoning = platMeta?.zoning_label || "";
    const homeSF = inputs.avg_home_sf;
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a real estate market analyst. Provide local comparable home sale data for this location.

Address/Area: ${address || "Unknown area"}
Zoning: ${zoning}
Home size: ~${homeSF} SF
Product type: ${inputs.product_type.replace("_", " ")}

Return realistic current market data for this location based on your knowledge. If address is vague, use regional averages for a suburban area.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            avg_sale_price: { type: "number", description: "Average sale price for comparable homes" },
            price_per_sf: { type: "number", description: "Price per square foot" },
            avg_days_on_market: { type: "number" },
            market_trend: { type: "string", enum: ["appreciating", "stable", "declining"] },
            trend_pct_annual: { type: "number", description: "Annual appreciation % (negative if declining)" },
            comparable_projects: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  price: { type: "number" },
                  sf: { type: "number" },
                  distance_miles: { type: "number" },
                }
              }
            },
            market_notes: { type: "string" },
            data_confidence: { type: "string", enum: ["high", "medium", "low"] },
          }
        }
      });
      setMarketData(res);
      if (res.avg_sale_price && !inputs.avg_sale_price) {
        set("avg_sale_price", Math.round(res.avg_sale_price));
      }
    } catch (e) {
      setMarketError(e.message || "Market data fetch failed");
    }
    setMarketLoading(false);
  };

  // Core calculations
  const lotCount = platMeta?.lot_count || 0;
  const siteSF = (platMeta?.width_ft || 0) * (platMeta?.depth_ft || 0);
  const siteAcres = siteSF / 43560;

  const landCost = parseFloat(inputs.land_cost) || 0;
  const landCostPerLot = lotCount > 0 ? landCost / lotCount : 0;

  const avgHomeSF = parseFloat(inputs.avg_home_sf) || 0;
  const landDevPerLot = parseFloat(inputs.land_dev_per_lot) || 0;
  const verticalPerSF = parseFloat(inputs.vertical_per_sf) || 0;
  const softCostPct = parseFloat(inputs.soft_cost_pct) || 0;

  const landDevTotal = landDevPerLot * lotCount;
  const verticalTotal = verticalPerSF * avgHomeSF * lotCount;
  const hardCosts = landCost + landDevTotal + verticalTotal;
  const softCosts = hardCosts * (softCostPct / 100);
  const carryMonths = parseFloat(inputs.carry_months) || 0;
  const carryRate = parseFloat(inputs.carry_rate_pct) || 0;
  const carryCost = hardCosts * (carryRate / 100) * (carryMonths / 12);
  const totalCost = hardCosts + softCosts + carryCost;
  const totalCostPerLot = lotCount > 0 ? totalCost / lotCount : 0;

  const avgSalePrice = parseFloat(inputs.avg_sale_price) || 0;
  const commissionPct = parseFloat(inputs.sales_commission_pct) || 0;
  const grossRevenue = avgSalePrice * lotCount;
  const salesCommission = grossRevenue * (commissionPct / 100);
  const netRevenue = grossRevenue - salesCommission;
  const grossProfit = netRevenue - totalCost;
  const grossMarginPct = netRevenue > 0 ? (grossProfit / netRevenue) * 100 : 0;
  const roiPct = totalCost > 0 ? (grossProfit / totalCost) * 100 : 0;
  const profitPerLot = lotCount > 0 ? grossProfit / lotCount : 0;

  const isViable = grossMarginPct >= 15;
  const hasInputs = lotCount > 0 && landCost > 0 && avgSalePrice > 0;

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-emerald-600" />
        <span className="text-sm font-semibold text-slate-800">Financial Analysis</span>
        {platMeta && (
          <Badge variant="secondary" className="text-xs ml-auto">
            {lotCount} lots
          </Badge>
        )}
      </div>

      {!platMeta ? (
        <div className="text-xs text-slate-400 text-center py-6 border border-dashed border-slate-200 rounded-lg">
          <Home className="h-6 w-6 mx-auto mb-2 text-slate-300" />
          Generate a plat first to unlock financial analysis.
        </div>
      ) : (
        <>
          {/* Plat Summary */}
          <div className="bg-slate-50 rounded-lg p-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <span className="text-slate-500">Lots</span><span className="font-semibold text-slate-800">{lotCount}</span>
            <span className="text-slate-500">Site Area</span><span className="font-semibold text-slate-800">{fmt(siteAcres, 2)} ac</span>
            <span className="text-slate-500">Zoning</span><span className="font-semibold text-slate-800">{platMeta.zoning_label}</span>
            <span className="text-slate-500">Avg Lot SF</span><span className="font-semibold text-slate-800">{fmt(platMeta.avg_lot_sf)} SF</span>
          </div>

          {/* Land Cost Input */}
          <div>
            <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Land Acquisition</Label>
            <div className="mt-1.5 flex items-center gap-2">
              <span className="text-slate-400 text-sm">$</span>
              <Input
                type="number"
                value={inputs.land_cost}
                onChange={e => set("land_cost", e.target.value)}
                placeholder="e.g. 2500000"
                className="h-7 text-xs"
              />
            </div>
            {landCost > 0 && lotCount > 0 && (
              <p className="text-xs text-slate-400 mt-1">{fmtMoney(landCostPerLot)} / lot</p>
            )}
          </div>

          {/* Product Type */}
          <div>
            <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Product Type</Label>
            <div className="flex gap-1 mt-1.5 flex-wrap">
              {Object.keys(COST_PRESETS).map(t => (
                <button key={t} type="button"
                  onClick={() => applyProductType(t)}
                  className={`text-xs px-2 py-0.5 rounded border transition-colors capitalize ${inputs.product_type === t ? "bg-emerald-600 text-white border-emerald-600" : "border-slate-300 text-slate-600 hover:bg-slate-50"}`}>
                  {t.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          {/* Cost Inputs (collapsible detail) */}
          <div className="border border-slate-200 rounded-lg">
            <button
              type="button"
              onClick={() => setShowCostDetail(v => !v)}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-lg"
            >
              <span className="flex items-center gap-1.5"><Hammer className="h-3 w-3" /> Cost Assumptions</span>
              {showCostDetail ? <ChevronUp className="h-3 w-3 text-slate-400" /> : <ChevronDown className="h-3 w-3 text-slate-400" />}
            </button>
            {showCostDetail && (
              <div className="px-3 pb-3 space-y-2 border-t border-slate-100 pt-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Avg Home SF</Label>
                    <Input type="number" value={inputs.avg_home_sf} onChange={e => set("avg_home_sf", e.target.value)} className="h-7 text-xs mt-0.5" />
                  </div>
                  <div>
                    <Label className="text-xs">Land Dev / Lot ($)</Label>
                    <Input type="number" value={inputs.land_dev_per_lot} onChange={e => set("land_dev_per_lot", e.target.value)} className="h-7 text-xs mt-0.5" />
                  </div>
                  <div>
                    <Label className="text-xs">Vertical Cost / SF ($)</Label>
                    <Input type="number" value={inputs.vertical_per_sf} onChange={e => set("vertical_per_sf", e.target.value)} className="h-7 text-xs mt-0.5" />
                  </div>
                  <div>
                    <Label className="text-xs">Soft Costs (%)</Label>
                    <Input type="number" value={inputs.soft_cost_pct} onChange={e => set("soft_cost_pct", e.target.value)} className="h-7 text-xs mt-0.5" />
                  </div>
                  <div>
                    <Label className="text-xs">Carry Months</Label>
                    <Input type="number" value={inputs.carry_months} onChange={e => set("carry_months", e.target.value)} className="h-7 text-xs mt-0.5" />
                  </div>
                  <div>
                    <Label className="text-xs">Interest Rate (%)</Label>
                    <Input type="number" value={inputs.carry_rate_pct} onChange={e => set("carry_rate_pct", e.target.value)} className="h-7 text-xs mt-0.5" step="0.1" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Market Data */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Avg Sale Price / Unit ($)</Label>
              <Button size="sm" variant="outline" onClick={fetchMarketData} disabled={marketLoading}
                className="h-6 text-xs gap-1 border-slate-300">
                {marketLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                Fetch Comps
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-sm">$</span>
              <Input
                type="number"
                value={inputs.avg_sale_price}
                onChange={e => set("avg_sale_price", e.target.value)}
                placeholder="e.g. 450000"
                className="h-7 text-xs"
              />
            </div>
            <div className="mt-1">
              <Label className="text-xs">Sales Commission (%)</Label>
              <Input type="number" value={inputs.sales_commission_pct} onChange={e => set("sales_commission_pct", e.target.value)}
                className="h-7 text-xs mt-0.5" step="0.5" />
            </div>

            {marketError && (
              <div className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 px-2 py-1.5 rounded mt-2">
                <AlertCircle className="h-3 w-3 flex-shrink-0" /> {marketError}
              </div>
            )}

            {marketData && (
              <div className="mt-2 border border-blue-200 bg-blue-50 rounded-lg p-2.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-blue-800">Market Comps</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                    marketData.data_confidence === "high" ? "bg-green-200 text-green-800" :
                    marketData.data_confidence === "medium" ? "bg-yellow-100 text-yellow-800" :
                    "bg-slate-100 text-slate-600"
                  }`}>{marketData.data_confidence} confidence</span>
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs text-slate-700">
                  {marketData.avg_sale_price && <span>Avg Sale: {fmtMoney(marketData.avg_sale_price)}</span>}
                  {marketData.price_per_sf && <span>$/SF: ${fmt(marketData.price_per_sf)}</span>}
                  {marketData.avg_days_on_market && <span>DOM: {marketData.avg_days_on_market} days</span>}
                  {marketData.market_trend && (
                    <span className={marketData.market_trend === "appreciating" ? "text-green-600" : marketData.market_trend === "declining" ? "text-red-600" : "text-slate-600"}>
                      {marketData.market_trend} {marketData.trend_pct_annual != null ? `(${marketData.trend_pct_annual > 0 ? "+" : ""}${marketData.trend_pct_annual}%/yr)` : ""}
                    </span>
                  )}
                </div>
                {marketData.comparable_projects?.length > 0 && (
                  <div className="space-y-0.5">
                    {marketData.comparable_projects.slice(0, 3).map((c, i) => (
                      <div key={i} className="text-xs text-slate-600 flex justify-between">
                        <span className="truncate flex-1">{c.name}</span>
                        <span className="ml-2 text-slate-500">{fmtMoney(c.price)} · {fmt(c.sf)} SF</span>
                      </div>
                    ))}
                  </div>
                )}
                {marketData.market_notes && (
                  <p className="text-xs text-slate-500 italic">{marketData.market_notes}</p>
                )}
              </div>
            )}
          </div>

          {/* Results */}
          {hasInputs && (
            <div className="space-y-3 pt-2 border-t border-slate-200">
              {/* Viability badge */}
              <div className={`flex items-center gap-2 rounded-lg px-3 py-2 ${isViable ? "bg-emerald-50 border border-emerald-200" : "bg-red-50 border border-red-200"}`}>
                <span className={`text-sm font-bold ${isViable ? "text-emerald-700" : "text-red-600"}`}>
                  {isViable ? "✓ Viable Deal" : "✗ Below Threshold"}
                </span>
                <span className={`text-xs ml-auto font-semibold ${isViable ? "text-emerald-600" : "text-red-500"}`}>
                  {fmtPct(grossMarginPct)} margin
                </span>
              </div>

              {/* Key metrics */}
              <div className="grid grid-cols-2 gap-2">
                <MetricCard label="Total Revenue" value={fmtMoney(netRevenue)} sub="after commission" color="slate" />
                <MetricCard label="Total Cost" value={fmtMoney(totalCost)} sub={`${fmtMoney(totalCostPerLot)}/lot`} color="slate" />
                <MetricCard label="Gross Profit" value={fmtMoney(grossProfit)} sub={`${fmtMoney(profitPerLot)}/lot`} color={grossProfit >= 0 ? "emerald" : "red"} />
                <MetricCard label="ROI" value={fmtPct(roiPct)} sub="return on cost" color={roiPct >= 20 ? "emerald" : roiPct >= 10 ? "yellow" : "red"} />
              </div>

              {/* Cost breakdown */}
              <div className="bg-slate-50 rounded-lg p-3 space-y-1.5">
                <p className="text-xs font-semibold text-slate-600 mb-2">Cost Breakdown</p>
                <CostRow label="Land Acquisition" value={landCost} total={totalCost} />
                <CostRow label="Land Development" value={landDevTotal} total={totalCost} />
                <CostRow label="Vertical Construction" value={verticalTotal} total={totalCost} />
                <CostRow label="Soft Costs" value={softCosts} total={totalCost} />
                <CostRow label="Carry / Interest" value={carryCost} total={totalCost} />
                <div className="border-t border-slate-200 pt-1 mt-1 flex justify-between text-xs font-semibold text-slate-800">
                  <span>Total</span><span>{fmtMoney(totalCost)}</span>
                </div>
              </div>

              {/* Quick sensitivity */}
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1">
                  <Info className="h-3 w-3" /> Price Sensitivity
                </p>
                <div className="space-y-1">
                  {[-10, -5, 0, 5, 10].map(delta => {
                    const adjPrice = avgSalePrice * (1 + delta / 100);
                    const adjRev = adjPrice * lotCount * (1 - commissionPct / 100);
                    const adjProfit = adjRev - totalCost;
                    const adjMargin = adjRev > 0 ? (adjProfit / adjRev) * 100 : 0;
                    return (
                      <div key={delta} className={`flex justify-between text-xs px-2 py-0.5 rounded ${delta === 0 ? "bg-white border border-slate-200 font-semibold" : ""}`}>
                        <span className={delta < 0 ? "text-red-500" : delta > 0 ? "text-emerald-600" : "text-slate-700"}>
                          {delta > 0 ? "+" : ""}{delta}% price
                        </span>
                        <span className="text-slate-500">{fmtMoney(adjPrice)}/unit</span>
                        <span className={adjMargin >= 15 ? "text-emerald-600 font-medium" : "text-red-500 font-medium"}>
                          {fmtPct(adjMargin)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {!hasInputs && (
            <p className="text-xs text-slate-400 text-center py-2">
              Enter land cost + sale price to see ROI analysis.
            </p>
          )}
        </>
      )}
    </div>
  );
}

function MetricCard({ label, value, sub, color }) {
  const colors = {
    emerald: "text-emerald-700 bg-emerald-50 border-emerald-200",
    red: "text-red-600 bg-red-50 border-red-200",
    yellow: "text-yellow-700 bg-yellow-50 border-yellow-200",
    slate: "text-slate-800 bg-white border-slate-200",
  };
  return (
    <div className={`border rounded-lg p-2.5 ${colors[color] || colors.slate}`}>
      <p className="text-xs text-slate-500 mb-0.5">{label}</p>
      <p className="text-sm font-bold">{value}</p>
      {sub && <p className="text-xs opacity-70 mt-0.5">{sub}</p>}
    </div>
  );
}

function CostRow({ label, value, total }) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-slate-500 w-36 flex-shrink-0">{label}</span>
      <div className="flex-1 bg-slate-200 rounded-full h-1">
        <div className="bg-slate-600 h-1 rounded-full" style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
      <span className="text-slate-700 w-16 text-right">{fmtMoney(value)}</span>
    </div>
  );
}