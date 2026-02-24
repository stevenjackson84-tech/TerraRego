import { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Plus, Trash2, Edit, Save, X, TrendingUp, Home, Calendar, BarChart2, ChevronDown, ChevronUp } from "lucide-react";
import { format, addMonths, parseISO, startOfMonth } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import BurnScheduleAI from "./BurnScheduleAI";

const PRODUCT_COLORS = [
  "bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-purple-500",
  "bg-rose-500", "bg-cyan-500", "bg-orange-500", "bg-indigo-500"
];
const CHART_COLORS = ["#3b82f6","#10b981","#f59e0b","#8b5cf6","#f43f5e","#06b6d4","#f97316","#6366f1"];

function generateMonths(startDate, endDate) {
  if (!startDate || !endDate) return [];
  const months = [];
  let cur = startOfMonth(parseISO(startDate));
  const end = startOfMonth(parseISO(endDate));
  while (cur <= end) {
    months.push(format(cur, "yyyy-MM"));
    cur = addMonths(cur, 1);
  }
  return months;
}

function computeScheduleMonths(rows) {
  let minDate = null, maxDate = null;
  rows.forEach(row => {
    if (!row.hb_start_date || !row.total_units || !row.absorption_pace) return;
    const start = parseISO(row.hb_start_date);
    const months = Math.ceil((parseFloat(row.total_units) || 0) / (parseFloat(row.absorption_pace) || 1));
    const end = addMonths(start, months);
    if (!minDate || start < minDate) minDate = start;
    if (!maxDate || end > maxDate) maxDate = end;
  });
  if (!minDate) return [];
  return generateMonths(format(minDate, "yyyy-MM-dd"), format(maxDate, "yyyy-MM-dd"));
}

function computeRowStarts(row) {
  if (!row.hb_start_date || !row.total_units || !row.absorption_pace) return {};
  const pace = parseFloat(row.absorption_pace) || 0;
  const total = parseFloat(row.total_units) || 0;
  if (!pace || !total) return {};
  const starts = {};
  let remaining = total;
  let curDate = startOfMonth(parseISO(row.hb_start_date));
  while (remaining > 0) {
    const key = format(curDate, "yyyy-MM");
    const thisMonth = Math.min(pace, remaining);
    starts[key] = thisMonth;
    remaining -= thisMonth;
    curDate = addMonths(curDate, 1);
  }
  return starts;
}

function monthToQuarter(m) {
  const d = parseISO(m + "-01");
  return `Q${Math.ceil((d.getMonth() + 1) / 3)} '${String(d.getFullYear()).slice(2)}`;
}

// ─── Custom Chart Tooltip ────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label, schedule, rowStartsMap, groupBy, allMonths }) {
  if (!active || !payload?.length) return null;

  // Gather months in this quarter
  const qMonths = allMonths.filter(m => monthToQuarter(m) === label);

  // Build per-row detail for this quarter
  const rows = schedule?.rows || [];
  const details = rows.map((row, i) => {
    const key = groupBy === "village" ? (row.village || "Unknown") : (row.product_type || "Unknown");
    const starts = rowStartsMap[i] || {};
    const quarterCount = qMonths.reduce((s, m) => s + (starts[m] || 0), 0);
    if (!quarterCount) return null;
    const monthBreakdown = qMonths
      .map(m => ({ label: format(parseISO(m + "-01"), "MMM"), count: starts[m] || 0 }))
      .filter(x => x.count > 0);
    return { key, row, quarterCount, monthBreakdown, colorIdx: i % CHART_COLORS.length };
  }).filter(Boolean);

  const total = details.reduce((s, d) => s + d.quarterCount, 0);

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-xl p-4 min-w-[220px] max-w-[300px]">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
        <span className="font-bold text-slate-800 text-sm">{label}</span>
        <span className="text-xs font-semibold bg-slate-900 text-white px-2 py-0.5 rounded-full">{total} starts</span>
      </div>
      <div className="space-y-2.5">
        {details.map(({ key, row, quarterCount, monthBreakdown, colorIdx }) => (
          <div key={key}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: CHART_COLORS[colorIdx] }} />
                <span className="text-xs font-medium text-slate-700 truncate max-w-[130px]">{key}</span>
                {groupBy === "product_type" && row.village && (
                  <span className="text-xs text-slate-400">({row.village})</span>
                )}
              </div>
              <span className="text-xs font-bold text-slate-800">{quarterCount}</span>
            </div>
            <div className="flex gap-1.5 mt-1 ml-4">
              {monthBreakdown.map(({ label: ml, count }) => (
                <div key={ml} className="flex flex-col items-center">
                  <span className="text-[10px] text-slate-400">{ml}</span>
                  <span className="text-[10px] font-semibold text-slate-600">{count}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {qMonths.length > 0 && (
        <div className="mt-2.5 pt-2 border-t border-slate-100 text-[10px] text-slate-400">
          {qMonths.map(m => format(parseISO(m + "-01"), "MMM yyyy")).join(" · ")}
        </div>
      )}
    </div>
  );
}

// ─── Quarterly grid columns ──────────────────────────────────────────────────
function computeAllQuarters(allMonths) {
  const seen = [];
  const set = new Set();
  allMonths.forEach(m => {
    const q = monthToQuarter(m);
    if (!set.has(q)) { set.add(q); seen.push({ key: q, months: [] }); }
    seen[seen.length - 1].months.push(m);
  });
  // rebuild properly - months may not be sequential in the loop above
  const map = {};
  allMonths.forEach(m => {
    const q = monthToQuarter(m);
    if (!map[q]) map[q] = { key: q, months: [] };
    map[q].months.push(m);
  });
  return Object.values(map);
}

// ─── Empty / form sub-components ─────────────────────────────────────────────
function EmptyState({ onAdd }) {
  return (
    <div className="text-center py-16">
      <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
        <BarChart2 className="h-7 w-7 text-slate-400" />
      </div>
      <h3 className="text-lg font-semibold text-slate-800 mb-1">No Burn Schedule Yet</h3>
      <p className="text-sm text-slate-500 mb-5">Track home starts by product type and plat over time</p>
      <Button onClick={onAdd} className="bg-slate-900 hover:bg-slate-800">
        <Plus className="h-4 w-4 mr-2" /> Create Burn Schedule
      </Button>
    </div>
  );
}

function RowForm({ row, onChange, onRemove, index }) {
  return (
    <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-700">Row {index + 1}</span>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600" onClick={onRemove}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Village/Phase", field: "village", placeholder: "e.g. V7" },
          { label: "Plat", field: "plat", placeholder: "e.g. N1" },
          { label: "Product Type", field: "product_type", placeholder: "e.g. Townhome" },
          { label: "Lot Type", field: "lot_type", placeholder: "e.g. 30x80" },
        ].map(({ label, field, placeholder }) => (
          <div key={field}>
            <Label className="text-xs">{label}</Label>
            <Input value={row[field] || ""} onChange={e => onChange(field, e.target.value)} placeholder={placeholder} className="h-8 text-sm" />
          </div>
        ))}
        <div>
          <Label className="text-xs">Total Units</Label>
          <Input type="number" value={row.total_units || ""} onChange={e => onChange("total_units", parseFloat(e.target.value) || "")} placeholder="0" className="h-8 text-sm" />
        </div>
        <div>
          <Label className="text-xs">Absorption (units/mo)</Label>
          <Input type="number" step="0.1" value={row.absorption_pace || ""} onChange={e => onChange("absorption_pace", parseFloat(e.target.value) || "")} placeholder="5" className="h-8 text-sm" />
        </div>
        <div>
          <Label className="text-xs">Dev Start Date</Label>
          <Input type="date" value={row.dev_start_date || ""} onChange={e => onChange("dev_start_date", e.target.value)} className="h-8 text-sm" />
        </div>
        <div>
          <Label className="text-xs">Dev Duration (mo)</Label>
          <Input type="number" value={row.dev_duration_months || ""} onChange={e => onChange("dev_duration_months", parseFloat(e.target.value) || "")} placeholder="8" className="h-8 text-sm" />
        </div>
        <div>
          <Label className="text-xs">Plat Record Date</Label>
          <Input type="date" value={row.plat_record_date || ""} onChange={e => onChange("plat_record_date", e.target.value)} className="h-8 text-sm" />
        </div>
        <div>
          <Label className="text-xs">HB Start Date</Label>
          <Input type="date" value={row.hb_start_date || ""} onChange={e => onChange("hb_start_date", e.target.value)} className="h-8 text-sm" />
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function BurnScheduleTab({ deal }) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [formRows, setFormRows] = useState([]);
  const [formName, setFormName] = useState("");
  const [showChart, setShowChart] = useState(true);
  const [groupBy, setGroupBy] = useState("product_type");
  const [gridView, setGridView] = useState("monthly"); // "monthly" | "quarterly"

  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ["burnSchedule", deal.id],
    queryFn: () => base44.entities.BurnSchedule.filter({ deal_id: deal.id }),
  });

  const schedule = schedules[0] || null;

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.BurnSchedule.create(data),
    onSuccess: () => { queryClient.invalidateQueries(["burnSchedule", deal.id]); setIsEditing(false); }
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.BurnSchedule.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries(["burnSchedule", deal.id]); setIsEditing(false); }
  });

  const startEdit = () => {
    setFormRows(schedule ? JSON.parse(JSON.stringify(schedule.rows || [])) : []);
    setFormName(schedule?.name || `${deal.name} Burn Schedule`);
    setIsEditing(true);
  };

  const addRow = () => setFormRows(prev => [...prev, {
    village: "", plat: "", product_type: "", lot_type: "",
    total_units: "", absorption_pace: 5,
    dev_start_date: "", dev_duration_months: 8,
    plat_record_date: "", hb_start_date: ""
  }]);

  const updateRow = (i, field, value) => setFormRows(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: value } : r));
  const removeRow = (i) => setFormRows(prev => prev.filter((_, idx) => idx !== i));

  const handleSave = () => {
    const payload = { deal_id: deal.id, name: formName, rows: formRows };
    if (schedule) updateMutation.mutate({ id: schedule.id, data: payload });
    else createMutation.mutate(payload);
  };

  const allMonths = useMemo(() => schedule ? computeScheduleMonths(schedule.rows || []) : [], [schedule]);

  const rowStartsMap = useMemo(() => {
    if (!schedule) return {};
    const map = {};
    (schedule.rows || []).forEach((row, i) => { map[i] = computeRowStarts(row); });
    return map;
  }, [schedule]);

  const totalUnits = useMemo(() => (schedule?.rows || []).reduce((s, r) => s + (parseFloat(r.total_units) || 0), 0), [schedule]);

  const monthlyTotals = useMemo(() => {
    const totals = {};
    allMonths.forEach(m => { totals[m] = 0; });
    Object.values(rowStartsMap).forEach(starts => {
      Object.entries(starts).forEach(([m, c]) => { totals[m] = (totals[m] || 0) + c; });
    });
    return totals;
  }, [rowStartsMap, allMonths]);

  const peakMonth = useMemo(() => {
    let peak = { month: null, count: 0 };
    Object.entries(monthlyTotals).forEach(([m, c]) => { if (c > peak.count) peak = { month: m, count: c }; });
    return peak;
  }, [monthlyTotals]);

  // Quarterly columns for quarterly grid view
  const allQuarters = useMemo(() => computeAllQuarters(allMonths), [allMonths]);

  // Quarterly totals per row
  const rowQuarterTotals = useMemo(() => {
    const map = {};
    (schedule?.rows || []).forEach((row, i) => {
      map[i] = {};
      const starts = rowStartsMap[i] || {};
      allQuarters.forEach(({ key, months }) => {
        map[i][key] = months.reduce((s, m) => s + (starts[m] || 0), 0);
      });
    });
    return map;
  }, [schedule, rowStartsMap, allQuarters]);

  const quarterTotals = useMemo(() => {
    const totals = {};
    allQuarters.forEach(({ key, months }) => {
      totals[key] = months.reduce((s, m) => s + (monthlyTotals[m] || 0), 0);
    });
    return totals;
  }, [allQuarters, monthlyTotals]);

  // Chart data
  const groupKeys = useMemo(() => {
    if (!schedule) return [];
    const keys = new Set();
    (schedule.rows || []).forEach(r => keys.add(groupBy === "village" ? (r.village || "Unknown") : (r.product_type || "Unknown")));
    return [...keys];
  }, [schedule, groupBy]);

  const chartData = useMemo(() => {
    if (!allMonths.length) return [];
    const map = {};
    allMonths.forEach(m => {
      const q = monthToQuarter(m);
      if (!map[q]) map[q] = { quarter: q };
    });
    (schedule?.rows || []).forEach((row, i) => {
      const key = groupBy === "village" ? (row.village || "Unknown") : (row.product_type || "Unknown");
      const starts = rowStartsMap[i] || {};
      Object.entries(starts).forEach(([m, c]) => {
        const q = monthToQuarter(m);
        if (map[q]) map[q][key] = (map[q][key] || 0) + c;
      });
    });
    return Object.values(map).filter(q => Object.keys(q).length > 1);
  }, [schedule, allMonths, rowStartsMap, groupBy]);

  if (isLoading) return <div className="py-12 text-center text-slate-400">Loading...</div>;

  // ── Edit Mode ──
  if (isEditing) {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Edit Burn Schedule</h2>
            <p className="text-xs text-slate-500 mt-0.5">Track home starts by product type and plat across time</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsEditing(false)}><X className="h-4 w-4 mr-1" />Cancel</Button>
            <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending} className="bg-slate-900 hover:bg-slate-800">
              <Save className="h-4 w-4 mr-1" />{createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
        <div>
          <Label>Schedule Name</Label>
          <Input value={formName} onChange={e => setFormName(e.target.value)} className="max-w-sm mt-1" />
        </div>
        <div className="space-y-3">
          {formRows.map((row, i) => (
            <RowForm key={i} row={row} index={i} onChange={(f, v) => updateRow(i, f, v)} onRemove={() => removeRow(i)} />
          ))}
        </div>
        <Button variant="outline" onClick={addRow} className="w-full border-dashed">
          <Plus className="h-4 w-4 mr-2" /> Add Row
        </Button>
      </div>
    );
  }

  if (!schedule) return <EmptyState onAdd={startEdit} />;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{schedule.name || "Burn Schedule"}</h2>
          <p className="text-xs text-slate-500 mt-0.5">{(schedule.rows || []).length} product/plat rows · {allMonths.length} months</p>
        </div>
        <Button variant="outline" size="sm" onClick={startEdit}><Edit className="h-4 w-4 mr-1.5" />Edit</Button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Units", value: totalUnits, icon: Home, color: "text-slate-700" },
          { label: "Active Products", value: groupKeys.length, icon: BarChart2, color: "text-blue-700" },
          { label: "Peak Month", value: peakMonth.month ? format(parseISO(peakMonth.month + "-01"), "MMM yy") : "—", icon: TrendingUp, color: "text-emerald-700" },
          { label: "Peak Units/Mo", value: peakMonth.count || "—", icon: Calendar, color: "text-amber-700" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-slate-500 text-xs mb-1"><Icon className="h-3.5 w-3.5" />{label}</div>
              <p className={cn("text-2xl font-bold", color)}>{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <button className="flex items-center gap-1.5 text-sm font-semibold text-slate-800" onClick={() => setShowChart(v => !v)}>
              <BarChart2 className="h-4 w-4" />
              Quarterly Starts Chart
              {showChart ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            <div className="flex gap-1">
              {["product_type", "village"].map(g => (
                <button key={g} onClick={() => setGroupBy(g)}
                  className={cn("text-xs px-2.5 py-1 rounded-md border font-medium transition-colors",
                    groupBy === g ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50")}>
                  By {g === "product_type" ? "Product" : "Village"}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        {showChart && (
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} margin={{ top: 4, right: 10, left: -10, bottom: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="quarter" tick={{ fontSize: 10 }} angle={-40} textAnchor="end" interval={0} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip
                  content={(props) => (
                    <CustomTooltip
                      {...props}
                      schedule={schedule}
                      rowStartsMap={rowStartsMap}
                      groupBy={groupBy}
                      allMonths={allMonths}
                    />
                  )}
                />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 14 }} />
                {groupKeys.map((k, i) => (
                  <Bar key={k} dataKey={k} stackId="a" fill={CHART_COLORS[i % CHART_COLORS.length]} radius={i === groupKeys.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        )}
      </Card>

      {/* AI Analytics */}
      <BurnScheduleAI
        schedule={schedule}
        deal={deal}
        totalUnits={totalUnits}
        allMonths={allMonths}
        monthlyTotals={monthlyTotals}
        peakMonth={peakMonth}
      />

      {/* Grid: monthly / quarterly toggle */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-slate-800">Start Schedule Grid</CardTitle>
            <div className="flex gap-1">
              {["monthly", "quarterly"].map(v => (
                <button key={v} onClick={() => setGridView(v)}
                  className={cn("text-xs px-2.5 py-1 rounded-md border font-medium transition-colors capitalize",
                    gridView === v ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50")}>
                  {v}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            {gridView === "monthly" ? (
              <MonthlyGrid
                schedule={schedule}
                allMonths={allMonths}
                rowStartsMap={rowStartsMap}
                monthlyTotals={monthlyTotals}
                totalUnits={totalUnits}
              />
            ) : (
              <QuarterlyGrid
                schedule={schedule}
                allQuarters={allQuarters}
                rowQuarterTotals={rowQuarterTotals}
                quarterTotals={quarterTotals}
                totalUnits={totalUnits}
              />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Monthly Grid ─────────────────────────────────────────────────────────────
function MonthlyGrid({ schedule, allMonths, rowStartsMap, monthlyTotals, totalUnits }) {
  return (
    <table className="w-full text-xs border-collapse">
      <thead>
        <tr className="bg-slate-50 border-b border-slate-200">
          <th className="sticky left-0 z-10 bg-slate-50 text-left px-3 py-2 font-semibold text-slate-600 min-w-[90px]">Village</th>
          <th className="sticky left-[90px] z-10 bg-slate-50 text-left px-2 py-2 font-semibold text-slate-600 min-w-[70px]">Plat</th>
          <th className="sticky left-[160px] z-10 bg-slate-50 text-left px-2 py-2 font-semibold text-slate-600 min-w-[100px]">Product</th>
          <th className="text-center px-2 py-2 font-semibold text-slate-600 min-w-[50px]">Units</th>
          <th className="text-center px-2 py-2 font-semibold text-slate-600 min-w-[46px]">Pace</th>
          {allMonths.map(m => (
            <th key={m} className="text-center px-1 py-2 font-medium text-slate-500 min-w-[42px] whitespace-nowrap">
              {format(parseISO(m + "-01"), "MMM yy")}
            </th>
          ))}
          <th className="text-center px-2 py-2 font-semibold text-slate-600 min-w-[50px]">Total</th>
        </tr>
      </thead>
      <tbody>
        {(schedule.rows || []).map((row, i) => {
          const starts = rowStartsMap[i] || {};
          const rowTotal = Object.values(starts).reduce((s, c) => s + c, 0);
          const colorIdx = i % PRODUCT_COLORS.length;
          return (
            <tr key={i} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
              <td className="sticky left-0 z-10 bg-white px-3 py-2 font-medium text-slate-700">{row.village || "—"}</td>
              <td className="sticky left-[90px] z-10 bg-white px-2 py-2 text-slate-600">{row.plat || "—"}</td>
              <td className="sticky left-[160px] z-10 bg-white px-2 py-2">
                <div className="flex items-center gap-1.5">
                  <div className={cn("w-2 h-2 rounded-full shrink-0", PRODUCT_COLORS[colorIdx])} />
                  <span className="text-slate-700 truncate max-w-[80px]">{row.product_type || "—"}</span>
                </div>
              </td>
              <td className="text-center px-2 py-2 text-slate-600 font-medium">{row.total_units || "—"}</td>
              <td className="text-center px-2 py-2 text-slate-500">{row.absorption_pace || "—"}</td>
              {allMonths.map(m => {
                const count = starts[m];
                return (
                  <td key={m} className="text-center px-1 py-2">
                    {count ? (
                      <span className={cn("inline-flex items-center justify-center w-7 h-5 rounded font-semibold text-white text-xs", PRODUCT_COLORS[colorIdx])}>
                        {count % 1 === 0 ? count : count.toFixed(1)}
                      </span>
                    ) : <span className="text-slate-200">·</span>}
                  </td>
                );
              })}
              <td className="text-center px-2 py-2 font-bold text-slate-700">{rowTotal || 0}</td>
            </tr>
          );
        })}
        <tr className="bg-slate-100 border-t-2 border-slate-300 font-semibold">
          <td className="sticky left-0 z-10 bg-slate-100 px-3 py-2 text-slate-800" colSpan={3}>TOTAL</td>
          <td className="text-center px-2 py-2 text-slate-800">{totalUnits}</td>
          <td></td>
          {allMonths.map(m => (
            <td key={m} className="text-center px-1 py-2 text-slate-700">
              {monthlyTotals[m] ? (
                <span className="inline-flex items-center justify-center w-7 h-5 rounded bg-slate-700 text-white text-xs font-bold">
                  {monthlyTotals[m]}
                </span>
              ) : <span className="text-slate-300">·</span>}
            </td>
          ))}
          <td className="text-center px-2 py-2 text-slate-800">{totalUnits}</td>
        </tr>
      </tbody>
    </table>
  );
}

// ─── Quarterly Grid ───────────────────────────────────────────────────────────
function QuarterlyGrid({ schedule, allQuarters, rowQuarterTotals, quarterTotals, totalUnits }) {
  return (
    <table className="w-full text-xs border-collapse">
      <thead>
        <tr className="bg-slate-50 border-b border-slate-200">
          <th className="sticky left-0 z-10 bg-slate-50 text-left px-3 py-2 font-semibold text-slate-600 min-w-[90px]">Village</th>
          <th className="sticky left-[90px] z-10 bg-slate-50 text-left px-2 py-2 font-semibold text-slate-600 min-w-[70px]">Plat</th>
          <th className="sticky left-[160px] z-10 bg-slate-50 text-left px-2 py-2 font-semibold text-slate-600 min-w-[100px]">Product</th>
          <th className="text-center px-2 py-2 font-semibold text-slate-600 min-w-[50px]">Units</th>
          <th className="text-center px-2 py-2 font-semibold text-slate-600 min-w-[46px]">Pace</th>
          {allQuarters.map(({ key }) => (
            <th key={key} className="text-center px-2 py-2 font-medium text-slate-500 min-w-[60px] whitespace-nowrap">
              {key}
            </th>
          ))}
          <th className="text-center px-2 py-2 font-semibold text-slate-600 min-w-[50px]">Total</th>
        </tr>
      </thead>
      <tbody>
        {(schedule.rows || []).map((row, i) => {
          const qTotals = rowQuarterTotals[i] || {};
          const rowTotal = Object.values(qTotals).reduce((s, c) => s + c, 0);
          const colorIdx = i % PRODUCT_COLORS.length;
          return (
            <tr key={i} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
              <td className="sticky left-0 z-10 bg-white px-3 py-2 font-medium text-slate-700">{row.village || "—"}</td>
              <td className="sticky left-[90px] z-10 bg-white px-2 py-2 text-slate-600">{row.plat || "—"}</td>
              <td className="sticky left-[160px] z-10 bg-white px-2 py-2">
                <div className="flex items-center gap-1.5">
                  <div className={cn("w-2 h-2 rounded-full shrink-0", PRODUCT_COLORS[colorIdx])} />
                  <span className="text-slate-700 truncate max-w-[80px]">{row.product_type || "—"}</span>
                </div>
              </td>
              <td className="text-center px-2 py-2 text-slate-600 font-medium">{row.total_units || "—"}</td>
              <td className="text-center px-2 py-2 text-slate-500">{row.absorption_pace || "—"}</td>
              {allQuarters.map(({ key }) => {
                const count = qTotals[key];
                return (
                  <td key={key} className="text-center px-2 py-2">
                    {count ? (
                      <span className={cn("inline-flex items-center justify-center px-2 h-6 rounded font-semibold text-white text-xs", PRODUCT_COLORS[colorIdx])}>
                        {count % 1 === 0 ? count : count.toFixed(1)}
                      </span>
                    ) : <span className="text-slate-200">·</span>}
                  </td>
                );
              })}
              <td className="text-center px-2 py-2 font-bold text-slate-700">{rowTotal || 0}</td>
            </tr>
          );
        })}
        <tr className="bg-slate-100 border-t-2 border-slate-300 font-semibold">
          <td className="sticky left-0 z-10 bg-slate-100 px-3 py-2 text-slate-800" colSpan={3}>TOTAL</td>
          <td className="text-center px-2 py-2 text-slate-800">{totalUnits}</td>
          <td></td>
          {allQuarters.map(({ key }) => (
            <td key={key} className="text-center px-2 py-2 text-slate-700">
              {quarterTotals[key] ? (
                <span className="inline-flex items-center justify-center px-2 h-6 rounded bg-slate-700 text-white text-xs font-bold">
                  {quarterTotals[key]}
                </span>
              ) : <span className="text-slate-300">·</span>}
            </td>
          ))}
          <td className="text-center px-2 py-2 text-slate-800">{totalUnits}</td>
        </tr>
      </tbody>
    </table>
  );
}