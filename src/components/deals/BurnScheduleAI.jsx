import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Sparkles, AlertTriangle, TrendingUp, BarChart2,
  ChevronDown, ChevronUp, RefreshCw, ShieldAlert, Lightbulb, CheckCircle
} from "lucide-react";
import ReactMarkdown from "react-markdown";

const SEVERITY_STYLES = {
  high:   { bg: "bg-red-50",    border: "border-red-200",    icon: "text-red-500",    badge: "bg-red-100 text-red-700" },
  medium: { bg: "bg-amber-50",  border: "border-amber-200",  icon: "text-amber-500",  badge: "bg-amber-100 text-amber-700" },
  low:    { bg: "bg-blue-50",   border: "border-blue-200",   icon: "text-blue-500",   badge: "bg-blue-100 text-blue-700" },
};

function RiskCard({ risk }) {
  const [open, setOpen] = useState(false);
  const s = SEVERITY_STYLES[risk.severity] || SEVERITY_STYLES.low;
  return (
    <div className={cn("rounded-lg border p-3", s.bg, s.border)}>
      <button className="w-full flex items-start justify-between gap-2 text-left" onClick={() => setOpen(v => !v)}>
        <div className="flex items-start gap-2">
          <AlertTriangle className={cn("h-4 w-4 mt-0.5 shrink-0", s.icon)} />
          <div>
            <p className="text-xs font-semibold text-slate-800">{risk.title}</p>
            <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full mt-1 inline-block", s.badge)}>
              {risk.severity?.toUpperCase()} RISK
            </span>
          </div>
        </div>
        {open ? <ChevronUp className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" /> : <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />}
      </button>
      {open && (
        <div className="mt-2 ml-6 space-y-2">
          <p className="text-xs text-slate-600">{risk.description}</p>
          {risk.mitigation && (
            <div className="flex items-start gap-1.5 bg-white/70 rounded p-2">
              <Lightbulb className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
              <p className="text-xs text-slate-700"><span className="font-semibold">Mitigation:</span> {risk.mitigation}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function BenchmarkRow({ label, yours, benchmark, unit = "", higherIsBetter = true }) {
  const yoursNum = parseFloat(yours) || 0;
  const benchNum = parseFloat(benchmark) || 0;
  const diff = yoursNum - benchNum;
  const pct = benchNum ? Math.round((diff / benchNum) * 100) : 0;
  const isGood = higherIsBetter ? diff >= 0 : diff <= 0;
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
      <span className="text-xs text-slate-600">{label}</span>
      <div className="flex items-center gap-3">
        <span className="text-xs text-slate-400">Industry: <span className="font-medium text-slate-600">{benchmark}{unit}</span></span>
        <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full",
          isGood ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700")}>
          {yoursNum}{unit} {pct !== 0 ? `(${pct > 0 ? "+" : ""}${pct}%)` : ""}
        </span>
      </div>
    </div>
  );
}

export default function BurnScheduleAI({ schedule, deal, totalUnits, allMonths, monthlyTotals, peakMonth }) {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [section, setSection] = useState("risks"); // risks | forecast | benchmarks

  const runAnalysis = async () => {
    setLoading(true);
    setAnalysis(null);

    const rows = schedule?.rows || [];
    const avgPace = rows.length
      ? (rows.reduce((s, r) => s + (parseFloat(r.absorption_pace) || 0), 0) / rows.length).toFixed(1)
      : 0;
    const durationMonths = allMonths.length;
    const quarterlyTotals = {};
    allMonths.forEach(m => {
      const d = new Date(m + "-01");
      const q = `Q${Math.ceil((d.getMonth() + 1) / 3)} ${d.getFullYear()}`;
      quarterlyTotals[q] = (quarterlyTotals[q] || 0) + (monthlyTotals[m] || 0);
    });

    const prompt = `
You are an expert real estate land developer and financial analyst specializing in residential homebuilding.

Analyze this burn schedule for the deal "${deal.name}" (${deal.city || ""} ${deal.state || ""}) and provide a comprehensive AI-driven analysis.

BURN SCHEDULE DATA:
- Total units: ${totalUnits}
- Number of product/plat rows: ${rows.length}
- Schedule duration: ${durationMonths} months
- Average absorption pace: ${avgPace} units/month
- Peak month starts: ${peakMonth.count} units (${peakMonth.month || "N/A"})
- Deal stage: ${deal.stage || "unknown"}
- Product/plat breakdown: ${JSON.stringify(rows.map(r => ({
    village: r.village, plat: r.plat, product: r.product_type, lot_type: r.lot_type,
    units: r.total_units, pace: r.absorption_pace,
    dev_start: r.dev_start_date, dev_duration: r.dev_duration_months,
    plat_record: r.plat_record_date, hb_start: r.hb_start_date
  })))}
- Quarterly start totals: ${JSON.stringify(quarterlyTotals)}

Respond with a JSON object with these EXACT keys:

{
  "forecast": {
    "summary": "2-3 sentence narrative forecast of start rates over the schedule life",
    "trend": "accelerating | stable | decelerating | front_loaded | back_loaded",
    "confidence": "high | medium | low",
    "key_drivers": ["driver1", "driver2", "driver3"],
    "projected_completion": "narrative about timeline confidence"
  },
  "risks": [
    {
      "title": "Short risk title",
      "severity": "high | medium | low",
      "description": "1-2 sentence description of the specific risk in this schedule",
      "mitigation": "Specific actionable mitigation strategy"
    }
  ],
  "benchmarks": {
    "avg_monthly_absorption": { "yours": ${avgPace}, "industry": 4.5, "note": "Industry avg for master-planned communities" },
    "schedule_duration_months": { "yours": ${durationMonths}, "industry": 36, "note": "Typical for similar lot counts" },
    "peak_to_avg_ratio": { "yours": ${peakMonth.count && avgPace > 0 ? (peakMonth.count / avgPace).toFixed(1) : 1}, "industry": 1.8, "note": "Healthy schedules peak ~1.5-2x avg" },
    "product_diversity": { "yours": ${rows.length}, "industry": 3, "note": "Number of product/plat combinations" }
  },
  "top_insight": "One powerful, specific 1-sentence insight a developer should act on immediately"
}

Provide realistic, specific analysis for a real estate developer. Identify 3-5 risks. Be direct and actionable.
    `.trim();

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          forecast: { type: "object" },
          risks: { type: "array" },
          benchmarks: { type: "object" },
          top_insight: { type: "string" }
        }
      }
    });

    setAnalysis(result);
    setLoading(false);
  };

  const trendColors = {
    accelerating: "text-emerald-600 bg-emerald-50",
    stable: "text-blue-600 bg-blue-50",
    decelerating: "text-amber-600 bg-amber-50",
    front_loaded: "text-purple-600 bg-purple-50",
    back_loaded: "text-orange-600 bg-orange-50",
  };

  const confidenceColors = {
    high: "text-emerald-700 bg-emerald-100",
    medium: "text-amber-700 bg-amber-100",
    low: "text-red-700 bg-red-100",
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
              <Sparkles className="h-3.5 w-3.5 text-white" />
            </div>
            <CardTitle className="text-sm font-semibold text-slate-800">AI Analytics</CardTitle>
          </div>
          <Button
            size="sm"
            onClick={runAnalysis}
            disabled={loading}
            className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white text-xs h-8"
          >
            {loading ? (
              <><RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />Analyzing...</>
            ) : (
              <><Sparkles className="h-3.5 w-3.5 mr-1.5" />{analysis ? "Re-analyze" : "Run AI Analysis"}</>
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {!analysis && !loading && (
          <div className="text-center py-8">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-100 to-indigo-100 flex items-center justify-center mx-auto mb-3">
              <Sparkles className="h-6 w-6 text-violet-500" />
            </div>
            <p className="text-sm text-slate-600 font-medium mb-1">AI-Powered Schedule Analysis</p>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">Get forecasts, risk identification, and benchmark comparisons powered by AI</p>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center py-10 gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-100 to-indigo-100 flex items-center justify-center">
              <RefreshCw className="h-5 w-5 text-violet-500 animate-spin" />
            </div>
            <p className="text-sm text-slate-500">Analyzing your burn schedule...</p>
            <div className="flex gap-1">
              {["Evaluating risks", "Benchmarking", "Forecasting"].map((t, i) => (
                <span key={t} className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full animate-pulse" style={{ animationDelay: `${i * 0.3}s` }}>{t}</span>
              ))}
            </div>
          </div>
        )}

        {analysis && !loading && (
          <div className="space-y-4">
            {/* Top insight banner */}
            {analysis.top_insight && (
              <div className="flex items-start gap-2.5 bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-200 rounded-lg p-3">
                <CheckCircle className="h-4 w-4 text-violet-500 mt-0.5 shrink-0" />
                <p className="text-xs font-medium text-slate-700">{analysis.top_insight}</p>
              </div>
            )}

            {/* Section tabs */}
            <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
              {[
                { key: "risks", label: "Risks", icon: ShieldAlert },
                { key: "forecast", label: "Forecast", icon: TrendingUp },
                { key: "benchmarks", label: "Benchmarks", icon: BarChart2 },
              ].map(({ key, label, icon: Icon }) => (
                <button key={key} onClick={() => setSection(key)}
                  className={cn("flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-1.5 rounded-md transition-all",
                    section === key ? "bg-white shadow text-slate-800" : "text-slate-500 hover:text-slate-700")}>
                  <Icon className="h-3.5 w-3.5" />{label}
                </button>
              ))}
            </div>

            {/* Risks */}
            {section === "risks" && (
              <div className="space-y-2">
                {(analysis.risks || []).length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-4">No significant risks identified.</p>
                )}
                {(analysis.risks || []).map((risk, i) => <RiskCard key={i} risk={risk} />)}
              </div>
            )}

            {/* Forecast */}
            {section === "forecast" && analysis.forecast && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  {analysis.forecast.trend && (
                    <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full capitalize", trendColors[analysis.forecast.trend] || "bg-slate-100 text-slate-600")}>
                      {analysis.forecast.trend.replace("_", " ")}
                    </span>
                  )}
                  {analysis.forecast.confidence && (
                    <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full", confidenceColors[analysis.forecast.confidence] || "bg-slate-100 text-slate-600")}>
                      {analysis.forecast.confidence} confidence
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{analysis.forecast.summary}</p>
                {analysis.forecast.projected_completion && (
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-slate-700 mb-1">Timeline Outlook</p>
                    <p className="text-xs text-slate-600">{analysis.forecast.projected_completion}</p>
                  </div>
                )}
                {analysis.forecast.key_drivers?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-700 mb-2">Key Drivers</p>
                    <div className="space-y-1.5">
                      {analysis.forecast.key_drivers.map((d, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                          <span className="text-xs text-slate-600">{d}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Benchmarks */}
            {section === "benchmarks" && analysis.benchmarks && (
              <div className="space-y-1">
                <p className="text-xs text-slate-400 mb-3">Comparing your schedule against industry standards for master-planned residential communities.</p>
                {analysis.benchmarks.avg_monthly_absorption && (
                  <BenchmarkRow
                    label="Avg Monthly Absorption (units/mo)"
                    yours={analysis.benchmarks.avg_monthly_absorption.yours}
                    benchmark={analysis.benchmarks.avg_monthly_absorption.industry}
                    higherIsBetter={true}
                  />
                )}
                {analysis.benchmarks.schedule_duration_months && (
                  <BenchmarkRow
                    label="Schedule Duration (months)"
                    yours={analysis.benchmarks.schedule_duration_months.yours}
                    benchmark={analysis.benchmarks.schedule_duration_months.industry}
                    higherIsBetter={false}
                    unit=" mo"
                  />
                )}
                {analysis.benchmarks.peak_to_avg_ratio && (
                  <BenchmarkRow
                    label="Peak-to-Avg Starts Ratio"
                    yours={analysis.benchmarks.peak_to_avg_ratio.yours}
                    benchmark={analysis.benchmarks.peak_to_avg_ratio.industry}
                    higherIsBetter={false}
                    unit="x"
                  />
                )}
                {analysis.benchmarks.product_diversity && (
                  <BenchmarkRow
                    label="Product/Plat Combinations"
                    yours={analysis.benchmarks.product_diversity.yours}
                    benchmark={analysis.benchmarks.product_diversity.industry}
                    higherIsBetter={true}
                  />
                )}
                <p className="text-[10px] text-slate-400 pt-2">* Industry benchmarks based on U.S. residential master-planned community averages.</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}