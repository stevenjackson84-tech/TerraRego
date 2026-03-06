import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, Scatter, ScatterChart, ZAxis
} from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

const CATEGORY_LABELS = {
  grading: "Grading", paving: "Paving", curb_gutter: "Curb & Gutter",
  storm_drain: "Storm Drain", sanitary_sewer: "Sanitary Sewer", water: "Water",
  dry_utilities: "Dry Utilities", street_lights: "Street Lights", landscaping: "Landscaping",
  walls_fencing: "Walls & Fencing", offsite_improvements: "Offsite Improvements",
  permits_fees: "Permits & Fees", engineering_survey: "Engineering / Survey",
  general_conditions: "General Conditions", other: "Other"
};

const UOM_LABELS = {
  per_lot: "/lot", per_lf: "/LF", per_sf: "/SF", lump_sum: "LS", per_unit: "/unit"
};

const LINE_COLORS = [
  "#2563eb","#16a34a","#dc2626","#d97706","#7c3aed","#0891b2","#db2777","#65a30d"
];

const fmt = (n) => n != null ? `$${Number(n).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : "—";
const fmtDec = (n) => n != null ? `$${Number(n).toFixed(2)}` : "—";

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-xs">
      <p className="font-semibold text-slate-700 mb-2">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
          <span className="text-slate-600">{p.name}:</span>
          <span className="font-semibold">${Number(p.value).toFixed(2)}</span>
        </div>
      ))}
    </div>
  );
}

export default function CostTrendsTab() {
  const [selectedCategory, setSelectedCategory] = useState("grading");
  const [groupBy, setGroupBy] = useState("month");

  const { data: dataPoints = [], isLoading } = useQuery({
    queryKey: ["bid-data-points"],
    queryFn: () => base44.entities.BidDataPoint.list("-bid_date", 2000)
  });

  const { data: libraryEntries = [] } = useQuery({
    queryKey: ["unit-cost-library"],
    queryFn: () => base44.entities.UnitCostLibrary.list("-updated_date", 500)
  });

  // Categories that have data
  const activeCategories = useMemo(() =>
    [...new Set(dataPoints.map(d => d.category))].filter(Boolean),
    [dataPoints]
  );

  // Filter points for selected category
  const categoryPoints = useMemo(() =>
    dataPoints.filter(d => d.category === selectedCategory && d.unit_cost && d.bid_date),
    [dataPoints, selectedCategory]
  );

  // Compute trend line data grouped by period
  const trendData = useMemo(() => {
    const grouped = {};
    categoryPoints.forEach(pt => {
      const date = new Date(pt.bid_date);
      let key;
      if (groupBy === "month") {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      } else if (groupBy === "quarter") {
        key = `${date.getFullYear()} Q${Math.ceil((date.getMonth() + 1) / 3)}`;
      } else {
        key = `${date.getFullYear()}`;
      }
      if (!grouped[key]) grouped[key] = { period: key, costs: [], contractors: new Set(), projects: new Set() };
      grouped[key].costs.push(pt.unit_cost);
      if (pt.contractor_name) grouped[key].contractors.add(pt.contractor_name);
      if (pt.takeoff_name) grouped[key].projects.add(pt.takeoff_name);
    });

    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, val]) => ({
        period: val.period,
        avg: val.costs.reduce((s, c) => s + c, 0) / val.costs.length,
        min: Math.min(...val.costs),
        max: Math.max(...val.costs),
        count: val.costs.length,
        contractors: [...val.contractors].join(", "),
        projects: [...val.projects].join(", "),
      }));
  }, [categoryPoints, groupBy]);

  // Per-project scatter data
  const projectScatter = useMemo(() => {
    const byProject = {};
    categoryPoints.forEach(pt => {
      const name = pt.takeoff_name || pt.takeoff_id || "Unknown";
      if (!byProject[name]) byProject[name] = [];
      byProject[name].push({ x: pt.bid_date, y: pt.unit_cost, contractor: pt.contractor_name });
    });
    return Object.entries(byProject).map(([name, points], i) => ({
      name,
      color: LINE_COLORS[i % LINE_COLORS.length],
      points: points.sort((a, b) => a.x.localeCompare(b.x))
    }));
  }, [categoryPoints]);

  // Trend direction
  const trendDirection = useMemo(() => {
    if (trendData.length < 2) return null;
    const first = trendData[0].avg;
    const last = trendData[trendData.length - 1].avg;
    const pct = ((last - first) / first) * 100;
    return { pct, up: pct > 1, down: pct < -1 };
  }, [trendData]);

  // Global avg for selected category from library
  const globalAvg = useMemo(() => {
    const entries = libraryEntries.filter(e => e.category === selectedCategory);
    if (!entries.length) return null;
    const total = entries.reduce((s, e) => s + (e.avg_unit_cost || 0), 0);
    return total / entries.length;
  }, [libraryEntries, selectedCategory]);

  const uomLabel = categoryPoints[0]?.unit_of_measure
    ? UOM_LABELS[categoryPoints[0].unit_of_measure] || categoryPoints[0].unit_of_measure
    : "";

  if (isLoading) return <div className="text-center py-20 text-slate-400">Loading trend data...</div>;

  if (dataPoints.length === 0) {
    return (
      <div className="text-center py-20 text-slate-400">
        <TrendingUp className="h-10 w-10 mx-auto mb-3 text-slate-300" />
        <p className="font-medium text-slate-600 mb-1">No trend data yet</p>
        <p className="text-sm">Upload bid PDFs in the Project Takeoff module to start tracking cost trends.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-center">
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {activeCategories.map(cat => (
              <SelectItem key={cat} value={cat}>{CATEGORY_LABELS[cat] || cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={groupBy} onValueChange={setGroupBy}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="month">By Month</SelectItem>
            <SelectItem value="quarter">By Quarter</SelectItem>
            <SelectItem value="year">By Year</SelectItem>
          </SelectContent>
        </Select>

        {trendDirection && (
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium ${
            trendDirection.up ? "bg-red-50 text-red-700" :
            trendDirection.down ? "bg-green-50 text-green-700" :
            "bg-slate-100 text-slate-600"
          }`}>
            {trendDirection.up ? <TrendingUp className="h-4 w-4" /> :
             trendDirection.down ? <TrendingDown className="h-4 w-4" /> :
             <Minus className="h-4 w-4" />}
            {Math.abs(trendDirection.pct).toFixed(1)}% {trendDirection.up ? "increase" : trendDirection.down ? "decrease" : "flat"} over period
          </div>
        )}

        <div className="ml-auto text-xs text-slate-400">{categoryPoints.length} data points</div>
      </div>

      {categoryPoints.length === 0 ? (
        <div className="text-center py-12 text-slate-400 border border-dashed border-slate-200 rounded-xl">
          No data for {CATEGORY_LABELS[selectedCategory]} yet.
        </div>
      ) : (
        <>
          {/* Average Cost Over Time */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-slate-900">{CATEGORY_LABELS[selectedCategory]} — Avg Unit Cost Over Time</h3>
                <p className="text-xs text-slate-500 mt-0.5">Grouped by {groupBy} · shown in {uomLabel}</p>
              </div>
              {globalAvg && (
                <div className="text-right">
                  <p className="text-xs text-slate-400">All-time avg</p>
                  <p className="font-bold text-slate-900">{fmtDec(globalAvg)}<span className="text-xs font-normal text-slate-400 ml-1">{uomLabel}</span></p>
                </div>
              )}
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={trendData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="period" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <YAxis
                  tickFormatter={v => `$${v.toLocaleString()}`}
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  width={70}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {globalAvg && (
                  <ReferenceLine y={globalAvg} stroke="#94a3b8" strokeDasharray="4 4"
                    label={{ value: "Avg", position: "right", fontSize: 10, fill: "#94a3b8" }} />
                )}
                <Line type="monotone" dataKey="min" name="Min" stroke="#16a34a" strokeWidth={1.5} dot={false} strokeDasharray="3 3" />
                <Line type="monotone" dataKey="avg" name="Avg" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 4, fill: "#2563eb" }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="max" name="Max" stroke="#dc2626" strokeWidth={1.5} dot={false} strokeDasharray="3 3" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Per-project lines */}
          {projectScatter.length > 1 && (
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h3 className="font-semibold text-slate-900 mb-1">Cost by Project</h3>
              <p className="text-xs text-slate-500 mb-4">Each line shows a project's individual bids over time</p>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="x" type="category" allowDuplicatedCategory={false} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                  <YAxis tickFormatter={v => `$${v.toLocaleString()}`} tick={{ fontSize: 11, fill: "#94a3b8" }} width={70} />
                  <Tooltip formatter={(v) => [`$${Number(v).toFixed(2)}`, ""]} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {projectScatter.map((proj) => (
                    <Line
                      key={proj.name}
                      data={proj.points}
                      dataKey="y"
                      name={proj.name}
                      stroke={proj.color}
                      strokeWidth={2}
                      dot={{ r: 4, fill: proj.color }}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Lowest Bid", value: fmtDec(Math.min(...categoryPoints.map(p => p.unit_cost))), sub: uomLabel, color: "text-green-700" },
              { label: "Highest Bid", value: fmtDec(Math.max(...categoryPoints.map(p => p.unit_cost))), sub: uomLabel, color: "text-red-600" },
              { label: "All-time Avg", value: fmtDec(categoryPoints.reduce((s, p) => s + p.unit_cost, 0) / categoryPoints.length), sub: uomLabel, color: "text-blue-700" },
              { label: "Data Points", value: categoryPoints.length, sub: "bids analyzed", color: "text-slate-700" },
            ].map(card => (
              <div key={card.label} className="bg-white border border-slate-200 rounded-xl p-4">
                <p className="text-xs text-slate-500 mb-1">{card.label}</p>
                <p className={`text-xl font-bold ${card.color}`}>{card.value}</p>
                <p className="text-xs text-slate-400">{card.sub}</p>
              </div>
            ))}
          </div>

          {/* Data table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900 text-sm">All Data Points — {CATEGORY_LABELS[selectedCategory]}</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-500 border-b border-slate-100 bg-slate-50">
                    <th className="text-left px-4 py-2">Date</th>
                    <th className="text-left px-4 py-2">Project</th>
                    <th className="text-left px-4 py-2">Contractor</th>
                    <th className="text-left px-4 py-2">Description</th>
                    <th className="text-center px-3 py-2">UOM</th>
                    <th className="text-right px-4 py-2">Unit Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {[...categoryPoints].sort((a, b) => (b.bid_date || "").localeCompare(a.bid_date || "")).map((pt, i) => (
                    <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50">
                      <td className="px-4 py-2 text-slate-500">{pt.bid_date}</td>
                      <td className="px-4 py-2 text-slate-700 font-medium">{pt.takeoff_name || "—"}</td>
                      <td className="px-4 py-2 text-slate-600">{pt.contractor_name || "—"}</td>
                      <td className="px-4 py-2 text-slate-500 max-w-xs truncate">{pt.description || "—"}</td>
                      <td className="px-3 py-2 text-center">
                        <span className="bg-slate-100 text-slate-600 rounded px-1.5 py-0.5 font-mono">
                          {UOM_LABELS[pt.unit_of_measure] || pt.unit_of_measure || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right font-semibold text-slate-900">{fmtDec(pt.unit_cost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}