import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, TrendingUp, Ruler, Home, DollarSign, BarChart3, ArrowRight } from "lucide-react";
import { createPageUrl } from "@/utils";
import { useNavigate } from "react-router-dom";

const fmt = (n, decimals = 0) => n != null ? Number(n).toLocaleString(undefined, { maximumFractionDigits: decimals }) : "—";
const fmtCurrency = (n) => n != null ? `$${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "—";
const fmtAcres = (sf) => sf ? `${(sf / 43560).toFixed(2)} ac` : "—";

function calculateAnalysis(data) {
  const grossSF = data.gross_site_area_sf || (data.gross_site_area_acres * 43560);
  const grossAcres = data.gross_site_area_acres || (grossSF / 43560);

  const totalDeductionPct = (
    (data.street_dedication_pct || 0) +
    (data.open_space_pct || 0) +
    (data.utility_easement_pct || 0) +
    (data.slope_constraint_pct || 0) +
    (data.wetland_constraint_pct || 0)
  );

  const netSF = grossSF * (1 - totalDeductionPct / 100);
  const netAcres = netSF / 43560;

  // Max units by density
  let maxByDensity = data.max_density_du_per_acre ? Math.floor(netAcres * data.max_density_du_per_acre) : null;

  // Max units by min lot size
  let maxByLotSize = data.min_lot_size_sf ? Math.floor(netSF / data.min_lot_size_sf) : null;

  // Take the more constraining of the two
  const maxUnits = maxByDensity != null && maxByLotSize != null
    ? Math.min(maxByDensity, maxByLotSize)
    : (maxByDensity ?? maxByLotSize);

  const probableUnits = maxUnits ? Math.floor(maxUnits * 0.85) : null;
  const conservativeUnits = maxUnits ? Math.floor(maxUnits * 0.70) : null;

  // Land cost per unit
  const landCostPerUnit = data.estimated_land_cost && probableUnits
    ? data.estimated_land_cost / probableUnits
    : null;

  // Revenue estimates
  const grossRevenue = data.estimated_asp && probableUnits
    ? data.estimated_asp * probableUnits
    : null;

  // Lot size breakdown
  const avgLotSF = probableUnits && netSF ? Math.floor(netSF / probableUnits) : null;

  // Building envelope per lot
  const buildableWidth = avgLotSF && data.side_setback_ft
    ? Math.sqrt(avgLotSF) - (data.side_setback_ft * 2)
    : null;
  const buildableDepth = avgLotSF && data.front_setback_ft && data.rear_setback_ft
    ? Math.sqrt(avgLotSF) - data.front_setback_ft - data.rear_setback_ft
    : null;
  const maxCoverableSF = avgLotSF && data.max_lot_coverage_pct
    ? Math.floor(avgLotSF * data.max_lot_coverage_pct / 100)
    : null;
  const maxFARSF = avgLotSF && data.max_far
    ? Math.floor(avgLotSF * data.max_far)
    : null;

  // Density achieved
  const achievedDensity = probableUnits && grossAcres ? (probableUnits / grossAcres).toFixed(1) : null;

  return {
    grossSF, grossAcres, netSF, netAcres, totalDeductionPct,
    maxByDensity, maxByLotSize, maxUnits, probableUnits, conservativeUnits,
    landCostPerUnit, grossRevenue, avgLotSF,
    buildableWidth, buildableDepth, maxCoverableSF, maxFARSF, achievedDensity,
  };
}

export default function AnalysisResults({ data, onSave, onCreateTakeoff, isSaving }) {
  const navigate = useNavigate();
  const r = useMemo(() => calculateAnalysis(data), [data]);

  const deductions = [
    { label: "Streets / ROW", pct: data.street_dedication_pct },
    { label: "Open Space", pct: data.open_space_pct },
    { label: "Utility Easements", pct: data.utility_easement_pct },
    { label: "Slope Constraints", pct: data.slope_constraint_pct },
    { label: "Wetlands / Floodplain", pct: data.wetland_constraint_pct },
  ].filter(d => d.pct > 0);

  const StatCard = ({ icon: Icon, label, value, sub, color = "slate" }) => (
    <div className={`bg-${color}-50 border border-${color}-100 rounded-xl p-4`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`h-4 w-4 text-${color}-500`} />
        <span className="text-xs text-slate-500">{label}</span>
      </div>
      <p className={`text-2xl font-bold text-${color}-900`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{data.name}</h2>
          {data.address && <p className="text-sm text-slate-500">{data.address}</p>}
          <div className="flex items-center gap-2 mt-1">
            {data.zoning_code && <Badge variant="secondary">{data.zoning_code}</Badge>}
            {data.parcel_number && <span className="text-xs text-slate-400">APN: {data.parcel_number}</span>}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Analysis"}
          </Button>
          <Button size="sm" className="bg-slate-900 hover:bg-slate-800" onClick={onCreateTakeoff}>
            <ArrowRight className="h-4 w-4 mr-1" /> Create Takeoff
          </Button>
        </div>
      </div>

      {/* Yield Summary */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-1.5">
          <Home className="h-4 w-4" /> Unit Yield
        </h3>
        <div className="grid grid-cols-3 gap-3">
          <StatCard icon={TrendingUp} label="Maximum Units" value={fmt(r.maxUnits)} sub="Zoning maximum" color="blue" />
          <StatCard icon={Home} label="Probable Units" value={fmt(r.probableUnits)} sub="~85% of max" color="green" />
          <StatCard icon={Home} label="Conservative" value={fmt(r.conservativeUnits)} sub="~70% of max" color="slate" />
        </div>
        {r.maxByDensity != null && r.maxByLotSize != null && r.maxByDensity !== r.maxByLotSize && (
          <div className="mt-2 flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
            <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
            Density limit ({fmt(r.maxByDensity)} units) and min lot size limit ({fmt(r.maxByLotSize)} units) differ — using the more constraining figure.
          </div>
        )}
      </div>

      {/* Area Breakdown */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-1.5">
          <Ruler className="h-4 w-4" /> Area Breakdown
        </h3>
        <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200">
            <span className="text-sm text-slate-600">Gross Site Area</span>
            <span className="font-semibold text-sm">{fmt(r.grossSF)} SF ({r.grossAcres?.toFixed(2)} ac)</span>
          </div>
          {deductions.map((d, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-2 border-b border-slate-100 bg-red-50/40">
              <span className="text-sm text-slate-500">− {d.label} ({d.pct}%)</span>
              <span className="text-sm text-red-600">−{fmt(r.grossSF * d.pct / 100)} SF</span>
            </div>
          ))}
          <div className="flex items-center justify-between px-4 py-2.5 bg-green-50">
            <span className="text-sm font-semibold text-green-800">Net Developable Area</span>
            <span className="font-bold text-green-800">{fmt(r.netSF)} SF ({r.netAcres?.toFixed(2)} ac)</span>
          </div>
          <div className="flex items-center justify-between px-4 py-2 text-xs text-slate-400">
            <span>Total deductions: {r.totalDeductionPct.toFixed(1)}% of gross</span>
            <span>Achieved density: {r.achievedDensity} DU/acre (gross)</span>
          </div>
        </div>
      </div>

      {/* Setbacks & Building Envelope */}
      {(data.front_setback_ft || data.rear_setback_ft || data.side_setback_ft) && (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-1.5">
            <BarChart3 className="h-4 w-4" /> Setbacks & Building Envelope
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Setback Requirements</p>
              {data.front_setback_ft && <div className="flex justify-between text-sm"><span className="text-slate-500">Front</span><span className="font-medium">{data.front_setback_ft} ft</span></div>}
              {data.rear_setback_ft && <div className="flex justify-between text-sm"><span className="text-slate-500">Rear</span><span className="font-medium">{data.rear_setback_ft} ft</span></div>}
              {data.side_setback_ft && <div className="flex justify-between text-sm"><span className="text-slate-500">Side (each)</span><span className="font-medium">{data.side_setback_ft} ft</span></div>}
              {data.max_building_height_ft && <div className="flex justify-between text-sm"><span className="text-slate-500">Max Height</span><span className="font-medium">{data.max_building_height_ft} ft</span></div>}
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Typical Lot Envelope</p>
              {r.avgLotSF && <div className="flex justify-between text-sm"><span className="text-slate-500">Avg Lot Size</span><span className="font-medium">{fmt(r.avgLotSF)} SF</span></div>}
              {r.maxCoverableSF && <div className="flex justify-between text-sm"><span className="text-slate-500">Max Footprint ({data.max_lot_coverage_pct}%)</span><span className="font-medium">{fmt(r.maxCoverableSF)} SF</span></div>}
              {r.maxFARSF && <div className="flex justify-between text-sm"><span className="text-slate-500">Max Floor Area (FAR {data.max_far})</span><span className="font-medium">{fmt(r.maxFARSF)} SF</span></div>}
              {r.buildableWidth && r.buildableDepth && <div className="flex justify-between text-sm"><span className="text-slate-500">Est. Build Zone</span><span className="font-medium">{r.buildableWidth.toFixed(0)}' × {r.buildableDepth.toFixed(0)}'</span></div>}
            </div>
          </div>
        </div>
      )}

      {/* Financial Summary */}
      {(data.estimated_asp || data.estimated_land_cost) && (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-1.5">
            <DollarSign className="h-4 w-4" /> Financial Yield Estimate
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {r.grossRevenue && <StatCard icon={TrendingUp} label="Gross Revenue Potential" value={fmtCurrency(r.grossRevenue)} sub={`${fmt(r.probableUnits)} units × ${fmtCurrency(data.estimated_asp)}`} color="green" />}
            {r.landCostPerUnit && <StatCard icon={DollarSign} label="Land Cost per Unit" value={fmtCurrency(r.landCostPerUnit)} sub={`${fmtCurrency(data.estimated_land_cost)} ÷ ${fmt(r.probableUnits)} units`} color="blue" />}
          </div>
          {data.estimated_land_cost && r.grossRevenue && (
            <div className="mt-2 flex items-center gap-2 text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-600">
              <CheckCircle2 className="h-3.5 w-3.5 text-slate-400" />
              Land cost as % of gross revenue: <strong>{((data.estimated_land_cost / r.grossRevenue) * 100).toFixed(1)}%</strong>
              {data.estimated_land_cost / r.grossRevenue < 0.25
                ? " — looks favorable"
                : data.estimated_land_cost / r.grossRevenue < 0.35
                ? " — within typical range"
                : " — may be high, review pricing"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}