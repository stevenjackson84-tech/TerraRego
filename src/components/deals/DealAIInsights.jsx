import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sparkles, AlertTriangle, TrendingUp, CheckCircle2, Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function DealAIInsights({ deal, tasks = [], entitlements = [], proforma, documents = [], activities = [] }) {
  const [insights, setInsights] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);

  const analyzeForInsights = async () => {
    setAnalyzing(true);
    try {
      // Prepare summary data for AI analysis
      const completedTasks = tasks.filter(t => t.status === 'completed').length;
      const pendingTasks = tasks.filter(t => t.status !== 'completed').length;
      const approvedEntitlements = entitlements.filter(e => e.status === 'approved').length;
      const entitlementProgress = `${approvedEntitlements}/${entitlements.length}`;
      
      const documentSummary = documents.map(d => d.category).reduce((acc, cat) => {
        acc[cat] = (acc[cat] || 0) + 1;
        return acc;
      }, {});

      const recentActivity = activities.slice(0, 5).map(a => a.description).join("; ");

      const prompt = `Analyze this real estate deal and provide strategic insights and recommendations.

DEAL INFORMATION:
- Name: ${deal?.name || "Unknown"}
- Stage: ${deal?.stage || "Unknown"}
- Property Type: ${deal?.property_type || "Unknown"}
- Location: ${deal?.city}, ${deal?.state}
- Acreage: ${deal?.acreage || "Unknown"}
- Current Zoning: ${deal?.zoning_current || "Unknown"}
- Target Zoning: ${deal?.zoning_target || "Unknown"}
- Asking Price: $${deal?.asking_price?.toLocaleString() || "Unknown"}
- Purchase Price: $${deal?.purchase_price?.toLocaleString() || "Unknown"}
- Estimated Value: $${deal?.estimated_value?.toLocaleString() || "Unknown"}

PROJECT STATUS:
- Tasks: ${completedTasks} completed, ${pendingTasks} pending
- Entitlements: ${entitlementProgress} approved
- Documents Collected: ${JSON.stringify(documentSummary)}
- Recent Activity: ${recentActivity || "No recent activity"}

PROFORMA DATA:
- Development Costs: $${proforma?.development_costs?.toLocaleString() || "Not set"}
- Soft Costs: $${proforma?.soft_costs?.toLocaleString() || "Not set"}
- Product Types: ${proforma?.product_types?.length || 0} defined

Provide analysis in 4 categories:

1. **RISK FLAGS** (3-4 items): Critical issues, delays, or concerns based on missing documents, overdue tasks, or deal progression
2. **OPPORTUNITIES** (3-4 items): Ways to optimize value, accelerate timeline, or improve profitability
3. **NEXT STEPS** (3-4 items): Recommended immediate actions to move the deal forward
4. **COST SAVINGS** (2-3 items): Specific strategies to reduce development costs or improve margins

For each item, be specific and actionable. Consider the deal stage, timeline, and gaps in documentation.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            risk_flags: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  severity: { type: "string", enum: ["critical", "high", "medium"] },
                  recommended_action: { type: "string" }
                }
              }
            },
            opportunities: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  potential_impact: { type: "string" },
                  implementation_effort: { type: "string", enum: ["low", "medium", "high"] }
                }
              }
            },
            next_steps: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  priority: { type: "string", enum: ["urgent", "high", "medium"] },
                  action: { type: "string" },
                  rationale: { type: "string" },
                  estimated_timeline: { type: "string" }
                }
              }
            },
            cost_savings: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  strategy: { type: "string" },
                  description: { type: "string" },
                  estimated_savings: { type: "string" },
                  implementation_notes: { type: "string" }
                }
              }
            }
          }
        }
      });

      setInsights(result);
      toast.success("Deal analysis complete");
    } catch (error) {
      console.error("Analysis failed:", error);
      toast.error("Failed to analyze deal");
    } finally {
      setAnalyzing(false);
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case "critical":
        return "border-red-200 bg-red-50 text-red-900";
      case "high":
        return "border-orange-200 bg-orange-50 text-orange-900";
      case "medium":
        return "border-yellow-200 bg-yellow-50 text-yellow-900";
      default:
        return "border-slate-200 bg-slate-50 text-slate-900";
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "urgent":
        return "bg-red-100 text-red-800";
      case "high":
        return "bg-orange-100 text-orange-800";
      case "medium":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-slate-100 text-slate-800";
    }
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            AI Deal Insights
          </CardTitle>
          <Button
            onClick={analyzeForInsights}
            disabled={analyzing}
            className="bg-purple-600 hover:bg-purple-700"
            size="sm"
          >
            {analyzing ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Analyzing...</>
            ) : (
              <><Sparkles className="h-4 w-4 mr-2" />Generate Insights</>
            )}
          </Button>
        </div>
      </CardHeader>

      {!insights && !analyzing && (
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Click "Generate Insights" to use AI to identify risks, opportunities, and recommended actions for this deal.
            </AlertDescription>
          </Alert>
        </CardContent>
      )}

      {insights && (
        <CardContent className="space-y-6">
          {/* Risk Flags */}
          {insights.risk_flags && insights.risk_flags.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-lg flex items-center gap-2 text-red-700">
                <AlertTriangle className="h-5 w-5" />
                Risk Flags
              </h3>
              <div className="space-y-2">
                {insights.risk_flags.map((risk, idx) => (
                  <div key={idx} className={cn("rounded-lg border p-4", getSeverityColor(risk.severity))}>
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold">{risk.title}</h4>
                      <Badge variant="outline" className="text-xs capitalize">{risk.severity}</Badge>
                    </div>
                    <p className="text-sm mb-2 opacity-90">{risk.description}</p>
                    <div className="flex items-start gap-2 text-sm">
                      <ArrowRight className="h-4 w-4 mt-0.5 flex-shrink-0 opacity-70" />
                      <p className="opacity-80">
                        <span className="font-medium">Action:</span> {risk.recommended_action}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Opportunities */}
          {insights.opportunities && insights.opportunities.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-lg flex items-center gap-2 text-green-700">
                <TrendingUp className="h-5 w-5" />
                Opportunities
              </h3>
              <div className="space-y-2">
                {insights.opportunities.map((opp, idx) => (
                  <div key={idx} className="border border-green-200 bg-green-50 text-green-900 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold">{opp.title}</h4>
                      <Badge className="bg-green-200 text-green-800 text-xs capitalize">
                        {opp.implementation_effort} effort
                      </Badge>
                    </div>
                    <p className="text-sm mb-2">{opp.description}</p>
                    <p className="text-sm opacity-80">
                      <span className="font-medium">Impact:</span> {opp.potential_impact}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Next Steps */}
          {insights.next_steps && insights.next_steps.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-lg flex items-center gap-2 text-blue-700">
                <CheckCircle2 className="h-5 w-5" />
                Recommended Next Steps
              </h3>
              <div className="space-y-2">
                {insights.next_steps.map((step, idx) => (
                  <div key={idx} className="border border-blue-200 bg-blue-50 text-blue-900 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold">{step.action}</h4>
                      <Badge className={getPriorityColor(step.priority)} className="text-xs capitalize">
                        {step.priority}
                      </Badge>
                    </div>
                    <p className="text-sm mb-2">{step.rationale}</p>
                    <p className="text-sm opacity-80">
                      <span className="font-medium">Timeline:</span> {step.estimated_timeline}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cost Savings */}
          {insights.cost_savings && insights.cost_savings.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-lg flex items-center gap-2 text-emerald-700">
                <TrendingUp className="h-5 w-5" />
                Cost Savings Opportunities
              </h3>
              <div className="space-y-2">
                {insights.cost_savings.map((saving, idx) => (
                  <div key={idx} className="border border-emerald-200 bg-emerald-50 text-emerald-900 rounded-lg p-4">
                    <h4 className="font-semibold mb-2">{saving.strategy}</h4>
                    <p className="text-sm mb-2">{saving.description}</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="font-medium opacity-80">Est. Savings</p>
                        <p className="font-semibold">{saving.estimated_savings}</p>
                      </div>
                      <div>
                        <p className="font-medium opacity-80">Implementation</p>
                        <p className="text-xs">{saving.implementation_notes}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}