import { useState } from "react";
import { ChevronUp, ChevronDown, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

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

const STEPS = [-20, -15, -10, -5, 0, 5, 10, 15, 20];

// Given base inputs + variable deltas, compute ROI and net profit
function compute({ landCost, constructionCost, salePrice, lotCount, commissionPct, softCostPct, carryCost }) {
  const totalCost = landCost + constructionCost + (landCost + constructionCost) * (softCostPct / 100) + carryCost;
  const netRevenue = salePrice * lotCount * (1 - commissionPct / 100);
  const netProfit = netRevenue - totalCost;
  const roi = totalCost > 0 ? (netProfit / totalCost) * 100 : 0;
  const margin = netRevenue > 0 ? (netProfit / netRevenue) * 100 : 0;
  return { netProfit, roi, margin };
}

function StepButton({ onClick, icon: Icon }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-5 h-5 flex items-center justify-center rounded hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors"
    >
      <Icon className="h-3 w-3" />
    </button>
  );
}

export default function SensitivityTable({ baseInputs, lotCount }) {
  // Track independent delta steps for each variable (in units of 5%)
  const [deltas, setDeltas] = useState({ land: 0, construction: 0, salePrice: 0 });

  const landCost = parseFloat(baseInputs.land_cost) || 0;
  const avgHomeSF = parseFloat(baseInputs.avg_home_sf) || 0;
  const landDevPerLot = parseFloat(baseInputs.land_dev_per_lot) || 0;
  const verticalPerSF = parseFloat(baseInputs.vertical_per_sf) || 0;
  const softCostPct = parseFloat(baseInputs.soft_cost_pct) || 0;
  const commissionPct = parseFloat(baseInputs.sales_commission_pct) || 0;
  const carryMonths = parseFloat(baseInputs.carry_months) || 0;
  const carryRate = parseFloat(baseInputs.carry_rate_pct) || 0;
  const avgSalePrice = parseFloat(baseInputs.avg_sale_price) || 0;

  const baseConstructionCost = (landDevPerLot * lotCount) + (verticalPerSF * avgHomeSF * lotCount);
  const baseCarryCost = (landCost + baseConstructionCost) * (carryRate / 100) * (carryMonths / 12);

  const adjLand = landCost * (1 + deltas.land / 100);
  const adjConstruction = baseConstructionCost * (1 + deltas.construction / 100);
  const adjSalePrice = avgSalePrice * (1 + deltas.salePrice / 100);

  const result = compute({
    landCost: adjLand,
    constructionCost: adjConstruction,
    salePrice: adjSalePrice,
    lotCount,
    commissionPct,
    softCostPct,
    carryCost: baseCarryCost,
  });

  const baseResult = compute({
    landCost,
    constructionCost: baseConstructionCost,
    salePrice: avgSalePrice,
    lotCount,
    commissionPct,
    softCostPct,
    carryCost: baseCarryCost,
  });

  const roiDelta = result.roi - baseResult.roi;
  const profitDelta = result.netProfit - baseResult.netProfit;
  const isViable = result.margin >= 15;
  const anyAdjusted = deltas.land !== 0 || deltas.construction !== 0 || deltas.salePrice !== 0;

  const step = (key, dir) => setDeltas(d => ({ ...d, [key]: Math.max(-20, Math.min(20, d[key] + dir * 5)) }));
  const reset = () => setDeltas({ land: 0, construction: 0, salePrice: 0 });

  const variables = [
    { key: "land", label: "Land Cost", baseValue: landCost, delta: deltas.land },
    { key: "construction", label: "Construction", baseValue: baseConstructionCost, delta: deltas.construction },
    { key: "salePrice", label: "Sale Price", baseValue: avgSalePrice, delta: deltas.salePrice },
  ];

  // Build 2D grid: rows = land steps, cols = salePrice steps (for the heatmap)
  const heatRows = [-10, -5, 0, 5, 10];
  const heatCols = [-10, -5, 0, 5, 10];

  return (
    <div className="space-y-3">
      {/* Variable sliders */}
      <div className="space-y-2">
        {variables.map(({ key, label, baseValue, delta }) => {
          const adjValue = baseValue * (1 + delta / 100);
          return (
            <div key={key} className="bg-white border border-slate-200 rounded-lg p-2.5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-slate-700">{label}</span>
                <span className={`text-xs font-semibold ${delta < 0 ? "text-red-500" : delta > 0 ? "text-emerald-600" : "text-slate-400"}`}>
                  {delta > 0 ? "+" : ""}{delta}%
                </span>
              </div>
              <div className="flex items-center gap-2">
                <StepButton onClick={() => step(key, -1)} icon={ChevronDown} />
                {/* Track */}
                <div className="flex-1 relative">
                  <div className="h-1.5 bg-slate-100 rounded-full" />
                  <div
                    className={`absolute top-0 h-1.5 rounded-full transition-all ${delta < 0 ? "bg-red-400" : delta > 0 ? "bg-emerald-500" : "bg-slate-300"}`}
                    style={{
                      left: delta < 0 ? `${50 + (delta / 20) * 50}%` : "50%",
                      width: `${Math.abs(delta / 20) * 50}%`,
                    }}
                  />
                  <div className="absolute top-[-3px] left-1/2 w-0.5 h-3 bg-slate-400 rounded -translate-x-1/2" />
                  {/* Thumb */}
                  <div
                    className={`absolute top-[-4px] w-3.5 h-3.5 rounded-full border-2 shadow -translate-x-1/2 transition-all ${delta < 0 ? "border-red-400 bg-white" : delta > 0 ? "border-emerald-500 bg-white" : "border-slate-400 bg-white"}`}
                    style={{ left: `${50 + (delta / 20) * 50}%` }}
                  />
                </div>
                <StepButton onClick={() => step(key, 1)} icon={ChevronUp} />
                <span className="text-xs text-slate-500 w-16 text-right">{fmtMoney(adjValue)}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-300 mt-1 px-5">
                <span>-20%</span><span>Base</span><span>+20%</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Live result */}
      <div className={`rounded-lg px-3 py-2.5 border ${isViable ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
        <div className="flex items-center justify-between">
          <span className={`text-xs font-semibold ${isViable ? "text-emerald-700" : "text-red-600"}`}>
            {isViable ? "✓ Viable" : "✗ Not Viable"}
          </span>
          {anyAdjusted && (
            <Button size="sm" variant="ghost" onClick={reset} className="h-5 text-xs gap-1 text-slate-400 px-1">
              <RotateCcw className="h-2.5 w-2.5" /> Reset
            </Button>
          )}
        </div>
        <div className="grid grid-cols-3 gap-2 mt-2">
          <div>
            <p className="text-xs text-slate-500">Net Profit</p>
            <p className="text-sm font-bold text-slate-800">{fmtMoney(result.netProfit)}</p>
            {anyAdjusted && (
              <p className={`text-xs ${profitDelta >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                {profitDelta >= 0 ? "▲" : "▼"} {fmtMoney(Math.abs(profitDelta))}
              </p>
            )}
          </div>
          <div>
            <p className="text-xs text-slate-500">ROI</p>
            <p className="text-sm font-bold text-slate-800">{fmtPct(result.roi)}</p>
            {anyAdjusted && (
              <p className={`text-xs ${roiDelta >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                {roiDelta >= 0 ? "▲" : "▼"} {Math.abs(roiDelta).toFixed(1)}pp
              </p>
            )}
          </div>
          <div>
            <p className="text-xs text-slate-500">Margin</p>
            <p className="text-sm font-bold text-slate-800">{fmtPct(result.margin)}</p>
          </div>
        </div>
      </div>

      {/* 2D heatmap: Land Cost vs Sale Price */}
      <div>
        <p className="text-xs font-semibold text-slate-600 mb-2">ROI Heatmap — Land Cost vs. Sale Price</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr>
                <th className="text-slate-400 font-normal text-center pb-1 pr-1 text-xs">Land\Sale</th>
                {heatCols.map(c => (
                  <th key={c} className={`text-center pb-1 px-0.5 font-medium ${c < 0 ? "text-red-400" : c > 0 ? "text-emerald-600" : "text-slate-600"}`}>
                    {c > 0 ? "+" : ""}{c}%
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {heatRows.map(r => (
                <tr key={r}>
                  <td className={`text-center pr-1 py-0.5 font-medium ${r < 0 ? "text-emerald-600" : r > 0 ? "text-red-400" : "text-slate-600"}`}>
                    {r > 0 ? "+" : ""}{r}%
                  </td>
                  {heatCols.map(c => {
                    const adjL = landCost * (1 + r / 100);
                    const adjS = avgSalePrice * (1 + c / 100);
                    const { roi: cellRoi } = compute({
                      landCost: adjL,
                      constructionCost: baseConstructionCost,
                      salePrice: adjS,
                      lotCount,
                      commissionPct,
                      softCostPct,
                      carryCost: baseCarryCost,
                    });
                    const isBase = r === 0 && c === 0;
                    const bg =
                      cellRoi >= 30 ? "bg-emerald-600 text-white" :
                      cellRoi >= 20 ? "bg-emerald-400 text-white" :
                      cellRoi >= 15 ? "bg-emerald-200 text-emerald-900" :
                      cellRoi >= 10 ? "bg-yellow-100 text-yellow-800" :
                      cellRoi >= 0  ? "bg-orange-100 text-orange-800" :
                                      "bg-red-200 text-red-800";
                    return (
                      <td key={c} className={`text-center py-1 px-0.5 rounded font-medium ${bg} ${isBase ? "ring-2 ring-slate-700" : ""}`}>
                        {fmtPct(cellRoi)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {[
            { color: "bg-emerald-600", label: "≥30%" },
            { color: "bg-emerald-400", label: "20–30%" },
            { color: "bg-emerald-200", label: "15–20%" },
            { color: "bg-yellow-100 border border-yellow-200", label: "10–15%" },
            { color: "bg-orange-100 border border-orange-200", label: "0–10%" },
            { color: "bg-red-200", label: "<0%" },
          ].map(({ color, label }) => (
            <span key={label} className="flex items-center gap-1 text-xs text-slate-500">
              <span className={`w-2.5 h-2.5 rounded ${color}`} />{label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}