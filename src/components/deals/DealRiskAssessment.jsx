import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Sparkles, AlertTriangle, ShieldCheck, ShieldAlert, Shield, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";

const SEVERITY_CONFIG = {
  high:   { label: "High Risk",   icon: ShieldAlert,  bg: "bg-red-50",    border: "border-red-200",    text: "text-red-700",    dot: "bg-red-500"    },
  medium: { label: "Medium Risk", icon: Shield,       bg: "bg-amber-50",  border: "border-amber-200",  text: "text-amber-700",  dot: "bg-amber-500"  },
  low:    { label: "Low Risk",    icon: ShieldCheck,  bg: "bg-emerald-50",border: "border-emerald-200",text: "text-emerald-700",dot: "bg-emerald-500"},
};

export default function DealRiskAssessment({ deal, tasks = [], entitlements = [], proforma = null }) {
  const [risks, setRisks] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState({});
  const [lastRun, setLastRun] = useState(null);

  const analyze = async () => {
    setLoading(true);

    const completedTasks = tasks.filter(t => t.status === "completed").length;
    const blockedTasks   = tasks.filter(t => t.status === "blocked").length;
    const overdueTasks   = tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== "completed").length;

    const pendingEntitlements = entitlements.filter(e => !["approved","expired"].includes(e.status));
    const deniedEntitlements  = entitlements.filter(e => e.status === "denied");

    const prompt = `You are an expert real estate investment risk analyst specializing in residential land development.

Analyze this deal and identify risks across 5 categories. Use real-world knowledge about market conditions, zoning complexity, entitlement processes, and team capacity.

DEAL DATA:
- Name: ${deal.name}
- Location: ${deal.city || "unknown"}, ${deal.state || "unknown"}
- Stage: ${deal.stage}
- Property Type: ${deal.property_type}
- Acreage: ${deal.acreage || "unknown"}
- Lots: ${deal.number_of_lots || "unknown"}
- Current Zoning: ${deal.zoning_current || "unknown"}
- Target Zoning: ${deal.zoning_target || "unknown"}
- Asking Price: ${deal.asking_price ? "$" + deal.asking_price.toLocaleString() : "unknown"}
- Estimated Value: ${deal.estimated_value ? "$" + deal.estimated_value.toLocaleString() : "unknown"}
- Assigned To: ${deal.assigned_to || "UNASSIGNED"}
- Priority: ${deal.priority}
- Contract Date: ${deal.contract_date || "none"}
- Due Diligence Deadline: ${deal.due_diligence_deadline || "none"}
- Close Date Target: ${deal.close_date || "none"}

ENTITLEMENTS:
- Total: ${entitlements.length}, Pending: ${pendingEntitlements.length}, Denied: ${deniedEntitlements.length}
- Types: ${entitlements.map(e => e.type + " (" + e.status + ")").join(", ") || "none"}

TASKS:
- Total: ${tasks.length}, Completed: ${completedTasks}, Blocked: ${blockedTasks}, Overdue: ${overdueTasks}

PROFORMA:
- Has financial model: ${proforma ? "Yes" : "No"}
- Development costs: ${proforma?.development_costs ? "$" + proforma.development_costs.toLocaleString() : "unknown"}
- Dev start: ${proforma?.development_start_date || "unknown"}
- Dev completion: ${proforma?.development_completion_date || "unknown"}

Search the web for current real estate market conditions, construction cost trends, and interest rate environment for ${deal.city || "US"} ${deal.state || ""} to inform your market risk assessment.

Return a JSON with exactly these 5 risk categories. Each risk must have a severity (high/medium/low), a concise title, a 1-2 sentence description of the risk, and 1-2 actionable mitigation steps.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          overall_risk_level: { type: "string", enum: ["high", "medium", "low"] },
          summary: { type: "string" },
          risks: {
            type: "array",
            items: {
              type: "object",
              properties: {
                category: { type: "string" },
                severity: { type: "string", enum: ["high", "medium", "low"] },
                title: { type: "string" },
                description: { type: "string" },
                mitigations: { type: "array", items: { type: "string" } }
              }
            }
          }
        }
      }
    });

    setRisks(result);
    setLastRun(new Date());
    setLoading(false);
  };

  const riskCounts = risks ? {
    high:   risks.risks.filter(r => r.severity === "high").length,
    medium: risks.risks.filter(r => r.severity === "medium").length,
    low:    risks.risks.filter(r => r.severity === "low").length,
  } : null;

  const overallConfig = risks ? SEVERITY_CONFIG[risks.overall_risk_level] : null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          <span className="font-semibold text-slate-800">AI Risk Assessment</span>
          {lastRun && (
            <span className="text-xs text-slate-400 ml-1">
              · updated {lastRun.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={analyze}
          disabled={loading}
          className="border-purple-200 text-purple-700 hover:bg-purple-50"
        >
          {loading ? (
            <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4 mr-1.5" />
          )}
          {loading ? "Analyzing…" : risks ? "Re-analyze" : "Run AI Analysis"}
        </Button>
      </div>

      {/* Body */}
      {!risks && !loading && (
        <div className="flex flex-col items-center justify-center py-12 text-center px-6">
          <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center mb-3">
            <AlertTriangle className="h-6 w-6 text-amber-400" />
          </div>
          <p className="text-sm font-medium text-slate-700 mb-1">No risk analysis yet</p>
          <p className="text-xs text-slate-400 max-w-xs">
            Click "Run AI Analysis" to assess zoning, market, entitlement, team, and financial risks using live market data.
          </p>
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <div className="flex gap-1.5">
            {[0,1,2].map(i => (
              <div key={i} className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
          <p className="text-sm text-slate-500">Scanning market data & deal attributes…</p>
        </div>
      )}

      {risks && !loading && (
        <div className="p-5 space-y-4">
          {/* Overall banner */}
          <div className={cn("rounded-lg border p-4 flex items-start gap-3", overallConfig.bg, overallConfig.border)}>
            <overallConfig.icon className={cn("h-5 w-5 mt-0.5 shrink-0", overallConfig.text)} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={cn("text-sm font-bold", overallConfig.text)}>
                  Overall: {overallConfig.label}
                </span>
                <div className="flex items-center gap-1.5 ml-auto">
                  {riskCounts.high > 0 && (
                    <span className="text-xs font-semibold bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">
                      {riskCounts.high} High
                    </span>
                  )}
                  {riskCounts.medium > 0 && (
                    <span className="text-xs font-semibold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
                      {riskCounts.medium} Med
                    </span>
                  )}
                  {riskCounts.low > 0 && (
                    <span className="text-xs font-semibold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">
                      {riskCounts.low} Low
                    </span>
                  )}
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">{risks.summary}</p>
            </div>
          </div>

          {/* Risk cards sorted by severity */}
          <div className="space-y-2">
            {[...risks.risks]
              .sort((a, b) => ({ high: 0, medium: 1, low: 2 }[a.severity] - { high: 0, medium: 1, low: 2 }[b.severity]))
              .map((risk, i) => {
                const cfg = SEVERITY_CONFIG[risk.severity];
                const isOpen = expanded[i];
                return (
                  <div key={i} className={cn("rounded-lg border overflow-hidden", cfg.border)}>
                    <button
                      className={cn("w-full flex items-center gap-3 px-4 py-3 text-left", cfg.bg, "hover:opacity-90 transition-opacity")}
                      onClick={() => setExpanded(prev => ({ ...prev, [i]: !prev[i] }))}
                    >
                      <div className={cn("w-2 h-2 rounded-full shrink-0", cfg.dot)} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={cn("text-xs font-bold uppercase tracking-wide", cfg.text)}>
                            {risk.category}
                          </span>
                          <span className="text-xs text-slate-400">·</span>
                          <span className="text-xs font-semibold text-slate-700 truncate">{risk.title}</span>
                        </div>
                      </div>
                      {isOpen
                        ? <ChevronUp className="h-4 w-4 text-slate-400 shrink-0" />
                        : <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                      }
                    </button>

                    {isOpen && (
                      <div className="px-4 pb-4 pt-3 bg-white border-t border-slate-100 space-y-3">
                        <p className="text-sm text-slate-600 leading-relaxed">{risk.description}</p>
                        {risk.mitigations?.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                              Mitigation Steps
                            </p>
                            <ul className="space-y-1">
                              {risk.mitigations.map((m, j) => (
                                <li key={j} className="flex items-start gap-2 text-xs text-slate-600">
                                  <span className="mt-1 w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                                  {m}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}