import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, AlertTriangle, TrendingUp, TrendingDown, RefreshCw, ChevronDown, ChevronUp, Lightbulb, BarChart2 } from "lucide-react";
import { cn } from "@/lib/utils";

const fmt = (v) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v || 0);

const n = (v) => parseFloat(v) || 0;

export default function ProformaAIAnalysis({ proforma, deal, metrics }) {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const runAnalysis = async () => {
    setLoading(true);
    setAnalysis(null);

    const { grossRevenue, totalCosts, profit, grossMarginPct, unleveredIRR, numUnits, totalAbsorption } = metrics;

    const prompt = `You are a senior real estate development financial analyst. Analyze this residential land development proforma and provide a comprehensive financial review.

DEAL CONTEXT:
- Property: ${deal?.name || "N/A"}, ${deal?.address || ""}
- Property Type: ${deal?.property_type || "N/A"}
- Stage: ${deal?.stage || "N/A"}
- Number of Lots: ${deal?.number_of_lots || numUnits}
- Acreage: ${deal?.acreage || "N/A"}

FINANCIAL SUMMARY:
- Purchase Price: ${fmt(n(proforma.purchase_price))}
- Horizontal Dev Costs: ${fmt(n(proforma.development_costs))}
- Soft Costs: ${fmt(n(proforma.soft_costs))}
- Gross Revenue: ${fmt(grossRevenue)}
- Total Costs: ${fmt(totalCosts)}
- Net Profit: ${fmt(profit)}
- Gross Margin: ${grossMarginPct?.toFixed(1)}%
- Unlevered IRR: ${unleveredIRR ? unleveredIRR.toFixed(1) + "%" : "N/A"}
- Total Units: ${numUnits}
- Combined Absorption: ${totalAbsorption?.toFixed(1)} units/month
- Contingency: ${proforma.contingency_percentage || 5}%
- Interest Rate: ${proforma.loan_interest_rate || "N/A"}%

PRODUCT TYPES:
${(proforma.product_types || []).map(pt =>
  `  - ${pt.name || "Unnamed"}: ${pt.number_of_units} units, ASP ${fmt(n(pt.sales_price_per_unit))}, Direct cost ${fmt(n(pt.direct_cost_per_unit))}, Lot cost ${fmt(n(pt.lot_cost))}, ${pt.absorption_pace} units/mo`
).join("\n") || "  None defined"}

TIMELINE:
- Development Start: ${proforma.development_start_date || "N/A"}
- Development Completion: ${proforma.development_completion_date || "N/A"}
- First Closing: ${proforma.first_home_closing || "N/A"}

Provide a thorough analysis including:
1. Overall financial health assessment (risk rating: low/moderate/high/critical)
2. Key strengths and positives
3. Risks, inconsistencies, and red flags (be specific with numbers)
4. Improvement suggestions for revenue optimization
5. Cost reduction opportunities
6. Alternative scenario: optimistic case with specific changes
7. Alternative scenario: stress test / downside case
8. Benchmark comparison (typical residential development: 15-20% gross margin, 15-25% IRR, 1-3 units/month absorption)`;

    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            overall_rating: { type: "string", enum: ["strong", "acceptable", "concerning", "critical"] },
            headline_summary: { type: "string" },
            strengths: { type: "array", items: { type: "string" } },
            risks: { type: "array", items: { type: "string" } },
            inconsistencies: { type: "array", items: { type: "string" } },
            revenue_improvements: { type: "array", items: { type: "string" } },
            cost_reductions: { type: "array", items: { type: "string" } },
            scenario_optimistic: {
              type: "object",
              properties: {
                description: { type: "string" },
                changes: { type: "array", items: { type: "string" } },
                projected_margin: { type: "string" },
                projected_irr: { type: "string" }
              }
            },
            scenario_downside: {
              type: "object",
              properties: {
                description: { type: "string" },
                changes: { type: "array", items: { type: "string" } },
                projected_margin: { type: "string" },
                projected_irr: { type: "string" }
              }
            },
            benchmark_notes: { type: "string" },
            recommended_actions: { type: "array", items: { type: "string" } }
          }
        }
      });
      setAnalysis(result);
    } finally {
      setLoading(false);
    }
  };

  const ratingConfig = {
    strong: { color: "bg-emerald-100 text-emerald-700 border-emerald-200", label: "Strong" },
    acceptable: { color: "bg-blue-100 text-blue-700 border-blue-200", label: "Acceptable" },
    concerning: { color: "bg-amber-100 text-amber-700 border-amber-200", label: "Concerning" },
    critical: { color: "bg-red-100 text-red-700 border-red-200", label: "Critical" }
  };

  const rc = analysis ? (ratingConfig[analysis.overall_rating] || ratingConfig.acceptable) : null;

  return (
    <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50/50 to-slate-50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-600" />
            AI Proforma Analysis
          </CardTitle>
          <div className="flex items-center gap-2">
            {analysis && (
              <button onClick={() => setExpanded(e => !e)} className="text-slate-400 hover:text-slate-600">
                {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            )}
            <Button
              size="sm"
              onClick={runAnalysis}
              disabled={loading}
              className="bg-purple-700 hover:bg-purple-800 h-8 text-xs"
            >
              {loading ? (
                <><Loader2 className="h-3 w-3 animate-spin mr-1" />Analyzing…</>
              ) : analysis ? (
                <><RefreshCw className="h-3 w-3 mr-1" />Re-analyze</>
              ) : (
                <><Sparkles className="h-3 w-3 mr-1" />Run AI Analysis</>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      {loading && (
        <CardContent>
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-purple-600 mx-auto mb-3" />
            <p className="text-sm text-slate-500">AI is reviewing your proforma data…</p>
            <p className="text-xs text-slate-400 mt-1">Checking margins, IRR, risks, and generating scenarios</p>
          </div>
        </CardContent>
      )}

      {!loading && !analysis && (
        <CardContent>
          <div className="text-center py-6">
            <BarChart2 className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">Run AI analysis to get financial insights, risk assessment, and scenario forecasts</p>
          </div>
        </CardContent>
      )}

      {!loading && analysis && expanded && (
        <CardContent className="space-y-5">
          {/* Header Rating + Summary */}
          <div className={cn("rounded-xl border p-4", rc.color)}>
            <div className="flex items-center gap-2 mb-2">
              <Badge className={cn("text-xs capitalize", rc.color)}>{rc.label}</Badge>
              <span className="text-xs font-semibold uppercase tracking-wide">Overall Assessment</span>
            </div>
            <p className="text-sm font-medium">{analysis.headline_summary}</p>
          </div>

          {/* Benchmark */}
          {analysis.benchmark_notes && (
            <div className="bg-slate-100 rounded-lg p-3 flex gap-2">
              <BarChart2 className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
              <p className="text-xs text-slate-600">{analysis.benchmark_notes}</p>
            </div>
          )}

          {/* Strengths + Risks in 2 cols */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {analysis.strengths?.length > 0 && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="text-xs font-semibold text-emerald-700">Strengths</span>
                </div>
                <ul className="space-y-1">
                  {analysis.strengths.map((s, i) => <li key={i} className="text-xs text-emerald-800">• {s}</li>)}
                </ul>
              </div>
            )}

            {(analysis.risks?.length > 0 || analysis.inconsistencies?.length > 0) && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
                  <span className="text-xs font-semibold text-red-700">Risks & Red Flags</span>
                </div>
                <ul className="space-y-1">
                  {[...(analysis.risks || []), ...(analysis.inconsistencies || [])].map((r, i) => (
                    <li key={i} className="text-xs text-red-800">• {r}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Improvements */}
          {(analysis.revenue_improvements?.length > 0 || analysis.cost_reductions?.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {analysis.revenue_improvements?.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <TrendingUp className="h-3.5 w-3.5 text-blue-600" />
                    <span className="text-xs font-semibold text-blue-700">Revenue Opportunities</span>
                  </div>
                  <ul className="space-y-1">
                    {analysis.revenue_improvements.map((r, i) => <li key={i} className="text-xs text-blue-800">• {r}</li>)}
                  </ul>
                </div>
              )}
              {analysis.cost_reductions?.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <TrendingDown className="h-3.5 w-3.5 text-amber-600" />
                    <span className="text-xs font-semibold text-amber-700">Cost Reduction Ideas</span>
                  </div>
                  <ul className="space-y-1">
                    {analysis.cost_reductions.map((c, i) => <li key={i} className="text-xs text-amber-800">• {c}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Scenarios */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {analysis.scenario_optimistic && (
              <div className="border border-emerald-200 rounded-xl overflow-hidden">
                <div className="bg-emerald-600 text-white px-4 py-2 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-sm font-semibold">Optimistic Scenario</span>
                  {analysis.scenario_optimistic.projected_margin && (
                    <Badge className="ml-auto bg-white/20 text-white border-0 text-xs">{analysis.scenario_optimistic.projected_margin} margin</Badge>
                  )}
                </div>
                <div className="p-3 bg-emerald-50">
                  <p className="text-xs text-emerald-800 mb-2">{analysis.scenario_optimistic.description}</p>
                  {analysis.scenario_optimistic.changes?.map((c, i) => (
                    <p key={i} className="text-xs text-emerald-700">+ {c}</p>
                  ))}
                  {analysis.scenario_optimistic.projected_irr && (
                    <p className="text-xs font-semibold text-emerald-700 mt-2">Projected IRR: {analysis.scenario_optimistic.projected_irr}</p>
                  )}
                </div>
              </div>
            )}

            {analysis.scenario_downside && (
              <div className="border border-red-200 rounded-xl overflow-hidden">
                <div className="bg-red-600 text-white px-4 py-2 flex items-center gap-2">
                  <TrendingDown className="h-4 w-4" />
                  <span className="text-sm font-semibold">Downside / Stress Test</span>
                  {analysis.scenario_downside.projected_margin && (
                    <Badge className="ml-auto bg-white/20 text-white border-0 text-xs">{analysis.scenario_downside.projected_margin} margin</Badge>
                  )}
                </div>
                <div className="p-3 bg-red-50">
                  <p className="text-xs text-red-800 mb-2">{analysis.scenario_downside.description}</p>
                  {analysis.scenario_downside.changes?.map((c, i) => (
                    <p key={i} className="text-xs text-red-700">▼ {c}</p>
                  ))}
                  {analysis.scenario_downside.projected_irr && (
                    <p className="text-xs font-semibold text-red-700 mt-2">Projected IRR: {analysis.scenario_downside.projected_irr}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Recommended Actions */}
          {analysis.recommended_actions?.length > 0 && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-center gap-1.5 mb-3">
                <Lightbulb className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-semibold text-purple-700">Recommended Next Steps</span>
              </div>
              <ol className="space-y-1.5">
                {analysis.recommended_actions.map((a, i) => (
                  <li key={i} className="text-xs text-purple-800 flex gap-2">
                    <span className="font-bold shrink-0">{i + 1}.</span>
                    <span>{a}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}