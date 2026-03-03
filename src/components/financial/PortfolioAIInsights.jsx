import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, TrendingUp, TrendingDown, AlertTriangle, Lightbulb, Target, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

const fmtPct = (v) => v != null && !isNaN(v) ? `${parseFloat(v).toFixed(1)}%` : "—";
const fmt = (v) => v >= 1e6 ? `$${(v / 1e6).toFixed(1)}M` : v >= 1000 ? `$${(v / 1000).toFixed(0)}K` : `$${Math.round(v || 0).toLocaleString()}`;

export default function PortfolioAIInsights({ enriched, portfolio, deals }) {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    setInsights(null);

    const dealSummaries = enriched
      .filter(e => e.hasFinancials)
      .map(e => ({
        name: e.deal.name,
        stage: e.deal.stage,
        property_type: e.deal.property_type,
        city: e.deal.city,
        units: e.numUnits,
        revenue: e.grossRevenue,
        profit: e.profit,
        margin: e.margin,
        roi: e.roi
      }));

    const prompt = `You are a senior real estate portfolio analyst. Analyze this residential land development portfolio and provide strategic insights.

PORTFOLIO SUMMARY:
- Total Projected Revenue: ${fmt(portfolio.totalRevenue)}
- Total Projected Profit: ${fmt(portfolio.totalProfit)}
- Average Gross Margin: ${fmtPct(portfolio.avgMargin)}
- Total Projected Units: ${portfolio.totalUnits}
- Deals with Proformas: ${enriched.filter(e => e.hasFinancials).length} of ${deals.length} total

DEAL-LEVEL DATA:
${JSON.stringify(dealSummaries, null, 2)}

Provide:
1. Portfolio health assessment (overall_rating: strong/moderate/weak/critical)
2. 2-3 key trends you observe across the portfolio
3. Top 2-3 strategic risks for the portfolio
4. Top 2-3 growth opportunities
5. Forecast outlook: what trajectory is this portfolio on and why
6. 3 specific recommended strategic actions
7. Concentration risks (e.g., too many deals in one stage/type)

Be specific, data-driven, and actionable. Reference specific deals and numbers.`;

    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            overall_rating: { type: "string", enum: ["strong", "moderate", "weak", "critical"] },
            portfolio_summary: { type: "string" },
            trends: { type: "array", items: { type: "string" } },
            risks: { type: "array", items: { type: "string" } },
            opportunities: { type: "array", items: { type: "string" } },
            forecast_outlook: { type: "string" },
            concentration_risks: { type: "array", items: { type: "string" } },
            recommended_actions: { type: "array", items: { type: "string" } }
          }
        }
      });
      setInsights(result);
    } finally {
      setLoading(false);
    }
  };

  const ratingConfig = {
    strong: { color: "bg-emerald-100 text-emerald-800 border-emerald-200", barColor: "bg-emerald-500", label: "Strong Portfolio" },
    moderate: { color: "bg-blue-100 text-blue-800 border-blue-200", barColor: "bg-blue-500", label: "Moderate Portfolio" },
    weak: { color: "bg-amber-100 text-amber-800 border-amber-200", barColor: "bg-amber-500", label: "Weak Portfolio" },
    critical: { color: "bg-red-100 text-red-800 border-red-200", barColor: "bg-red-500", label: "Critical Issues" },
  };
  const rc = insights ? (ratingConfig[insights.overall_rating] || ratingConfig.moderate) : null;

  return (
    <Card className="border-0 shadow-sm bg-gradient-to-r from-purple-50 to-indigo-50">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-600" />
            AI Portfolio Intelligence
          </CardTitle>
          <Button
            size="sm"
            onClick={run}
            disabled={loading || enriched.filter(e => e.hasFinancials).length === 0}
            className="bg-purple-700 hover:bg-purple-800 h-8 text-xs"
          >
            {loading ? (
              <><Loader2 className="h-3 w-3 animate-spin mr-1" />Analyzing portfolio…</>
            ) : insights ? (
              <><RefreshCw className="h-3 w-3 mr-1" />Re-analyze</>
            ) : (
              <><Sparkles className="h-3 w-3 mr-1" />Analyze Portfolio</>
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {loading && (
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-purple-600 mx-auto mb-3" />
            <p className="text-sm text-slate-500">Analyzing {enriched.filter(e => e.hasFinancials).length} deals…</p>
          </div>
        )}

        {!loading && !insights && (
          <div className="text-center py-6">
            <Sparkles className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">
              {enriched.filter(e => e.hasFinancials).length === 0
                ? "Add proforma data to deals to enable AI portfolio analysis"
                : "Run AI analysis to get portfolio trends, risks, forecasts, and strategic recommendations"}
            </p>
          </div>
        )}

        {!loading && insights && (
          <div className="space-y-5">
            {/* Rating + Summary */}
            <div className={cn("rounded-xl border p-4", rc.color)}>
              <div className="flex items-center gap-2 mb-2">
                <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full border", rc.color)}>{rc.label}</span>
              </div>
              <p className="text-sm font-medium">{insights.portfolio_summary}</p>
            </div>

            {/* Forecast */}
            {insights.forecast_outlook && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 flex gap-3">
                <Target className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-indigo-700 mb-1">Forecast Outlook</p>
                  <p className="text-sm text-indigo-900">{insights.forecast_outlook}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Trends */}
              {insights.trends?.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <TrendingUp className="h-3.5 w-3.5 text-blue-600" />
                    <span className="text-xs font-semibold text-blue-700">Key Trends</span>
                  </div>
                  <ul className="space-y-1.5">
                    {insights.trends.map((t, i) => <li key={i} className="text-xs text-blue-800">• {t}</li>)}
                  </ul>
                </div>
              )}

              {/* Risks */}
              {insights.risks?.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
                    <span className="text-xs font-semibold text-red-700">Portfolio Risks</span>
                  </div>
                  <ul className="space-y-1.5">
                    {insights.risks.map((r, i) => <li key={i} className="text-xs text-red-800">• {r}</li>)}
                  </ul>
                </div>
              )}

              {/* Opportunities */}
              {insights.opportunities?.length > 0 && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                    <span className="text-xs font-semibold text-emerald-700">Growth Opportunities</span>
                  </div>
                  <ul className="space-y-1.5">
                    {insights.opportunities.map((o, i) => <li key={i} className="text-xs text-emerald-800">• {o}</li>)}
                  </ul>
                </div>
              )}

              {/* Concentration */}
              {insights.concentration_risks?.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                    <span className="text-xs font-semibold text-amber-700">Concentration Risks</span>
                  </div>
                  <ul className="space-y-1.5">
                    {insights.concentration_risks.map((c, i) => <li key={i} className="text-xs text-amber-800">• {c}</li>)}
                  </ul>
                </div>
              )}
            </div>

            {/* Actions */}
            {insights.recommended_actions?.length > 0 && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center gap-1.5 mb-3">
                  <Lightbulb className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-semibold text-purple-700">Strategic Recommendations</span>
                </div>
                <ol className="space-y-2">
                  {insights.recommended_actions.map((a, i) => (
                    <li key={i} className="text-xs text-purple-900 flex gap-2">
                      <span className="font-bold shrink-0">{i + 1}.</span>
                      <span>{a}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}