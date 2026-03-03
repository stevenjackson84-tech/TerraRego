import { useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, AlertTriangle, CheckCircle2, Info, ChevronDown, ChevronUp, X } from "lucide-react";
import { cn } from "@/lib/utils";

const n = (v) => parseFloat(v) || 0;
const fmt = (v) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v || 0);

const SEVERITY_CONFIG = {
  error: { icon: AlertTriangle, bg: "bg-red-50", border: "border-red-200", text: "text-red-700", iconColor: "text-red-500", label: "Issue" },
  warning: { icon: AlertTriangle, bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", iconColor: "text-amber-500", label: "Warning" },
  suggestion: { icon: Info, bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", iconColor: "text-blue-500", label: "Suggestion" },
  benchmark: { icon: Info, bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-700", iconColor: "text-purple-500", label: "Benchmark" },
};

export default function ProformaAIValidator({ formData, deal }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [dismissed, setDismissed] = useState(new Set());

  const validate = useCallback(async () => {
    setLoading(true);
    setResult(null);
    setDismissed(new Set());

    const pts = formData.product_types || [];
    const numUnits = pts.reduce((s, pt) => s + n(pt.number_of_units), 0);
    const grossRevenue = pts.reduce((s, pt) => s + n(pt.number_of_units) * n(pt.sales_price_per_unit), 0);
    const totalDirectCosts = pts.reduce((s, pt) => s + n(pt.number_of_units) * n(pt.direct_cost_per_unit), 0);
    const totalLotCosts = pts.reduce((s, pt) => s + n(pt.number_of_units) * n(pt.lot_cost), 0);
    const purchasePrice = n(formData.purchase_price);
    const devCosts = n(formData.development_costs);
    const softCosts = n(formData.soft_costs);
    const contingencyPct = n(formData.contingency_percentage) || 5;
    const totalCosts = purchasePrice + devCosts + softCosts + totalDirectCosts + totalLotCosts;
    const roughMargin = grossRevenue > 0 ? ((grossRevenue - totalCosts) / grossRevenue) * 100 : null;
    const totalAbsorption = pts.reduce((s, pt) => s + n(pt.absorption_pace), 0);

    const prompt = `You are a senior real estate financial analyst reviewing a proforma during data entry. Your job is to:
1. Identify errors, missing fields, and inconsistencies (severity: "error")
2. Flag values that deviate significantly from industry norms (severity: "warning")
3. Suggest improvements and enrichment opportunities (severity: "suggestion")
4. Provide industry benchmark context (severity: "benchmark")

CURRENT FORM DATA:
Deal: ${deal?.name || "N/A"}, ${deal?.city || ""} ${deal?.state || ""}, ${deal?.property_type || "residential"}, ${deal?.acreage || "?"} acres
Purchase Price: ${purchasePrice > 0 ? fmt(purchasePrice) : "NOT SET"}
Horizontal Dev Costs: ${devCosts > 0 ? fmt(devCosts) : "NOT SET"}
Soft Costs: ${softCosts > 0 ? fmt(softCosts) : "NOT SET"}
Contingency: ${contingencyPct}%
Interest Rate: ${formData.loan_interest_rate || "NOT SET"}%
Total Units: ${numUnits || "NOT SET"}
Gross Revenue (estimated): ${grossRevenue > 0 ? fmt(grossRevenue) : "NOT SET"}
Rough Margin: ${roughMargin != null ? roughMargin.toFixed(1) + "%" : "cannot calculate"}
Combined Absorption: ${totalAbsorption > 0 ? totalAbsorption.toFixed(1) + " units/month" : "NOT SET"}
Dev Start: ${formData.development_start_date || "NOT SET"}
Dev Completion: ${formData.development_completion_date || "NOT SET"}
First Closing: ${formData.first_home_closing || "NOT SET"}

PRODUCT TYPES:
${pts.length === 0 ? "NONE DEFINED" : pts.map((pt, i) =>
  `  ${i + 1}. ${pt.name || "Unnamed"}: ${n(pt.number_of_units)} units, ASP ${n(pt.sales_price_per_unit) > 0 ? fmt(n(pt.sales_price_per_unit)) : "NOT SET"}, Direct cost ${n(pt.direct_cost_per_unit) > 0 ? fmt(n(pt.direct_cost_per_unit)) : "NOT SET"}/unit, Lot cost ${n(pt.lot_cost) > 0 ? fmt(n(pt.lot_cost)) : "NOT SET"}/unit, Absorption ${n(pt.absorption_pace) > 0 ? n(pt.absorption_pace) + "/mo" : "NOT SET"}`
).join("\n")}

OFFSITE IMPROVEMENTS: ${(formData.offsite_improvements || []).length} items, total ${fmt((formData.offsite_improvements || []).reduce((s, i) => s + n(i.amount), 0))}
MASTER INFRASTRUCTURE: ${(formData.master_infrastructure || []).length} items

Rules:
- Missing required fields (purchase price, dev costs, product types with ASP and units) → error
- Gross margin outside 10-25% range → warning
- Dev costs < 15% or > 40% of revenue → warning
- Soft costs typically 5-15% of dev costs
- Contingency below 5% → warning (especially for early-stage deals)
- No interest rate or loan term with no financing costs → suggestion
- ASP per sqft outside $150-$500 range for residential → warning
- Absorption > 5 units/month per product type is aggressive → warning
- Timeline gaps (e.g., dev completion after first closing) → error
- Missing offsite improvements for large acreage (>10 acres) → suggestion
- Lot cost > 20% of ASP is typically high → warning
- Direct costs per sqft < $80 or > $250 → warning

Industry benchmarks (include as "benchmark" items):
- Typical residential gross margin: 15-22%
- Typical unlevered IRR target: 18-25%
- Standard contingency: 5-10%
- Soft costs typically 8-15% of hard costs
- Outside sales commission: 2.5-3.5%

Return up to 10 most important items. Be specific with numbers. Each message should be one clear, actionable sentence.`;

    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  severity: { type: "string", enum: ["error", "warning", "suggestion", "benchmark"] },
                  field: { type: "string" },
                  message: { type: "string" },
                  suggested_value: { type: "string" }
                }
              }
            },
            overall_completeness: { type: "number" },
            ready_to_analyze: { type: "boolean" }
          }
        }
      });
      setResult(res);
    } finally {
      setLoading(false);
    }
  }, [formData, deal]);

  const visibleItems = (result?.items || []).filter(item => !dismissed.has(item.message));
  const errorCount = visibleItems.filter(i => i.severity === "error").length;
  const warningCount = visibleItems.filter(i => i.severity === "warning").length;

  return (
    <div className="rounded-xl border border-purple-200 bg-purple-50/60 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-purple-100/70">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-purple-600" />
          <span className="text-sm font-semibold text-purple-800">AI Validation</span>
          {result && (
            <div className="flex items-center gap-1.5 ml-1">
              {errorCount > 0 && (
                <span className="text-xs bg-red-500 text-white px-1.5 py-0.5 rounded-full font-medium">{errorCount} issue{errorCount > 1 ? "s" : ""}</span>
              )}
              {warningCount > 0 && (
                <span className="text-xs bg-amber-400 text-white px-1.5 py-0.5 rounded-full font-medium">{warningCount} warning{warningCount > 1 ? "s" : ""}</span>
              )}
              {errorCount === 0 && warningCount === 0 && (
                <span className="text-xs bg-emerald-500 text-white px-1.5 py-0.5 rounded-full font-medium flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Looks good
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {result && (
            <button onClick={() => setExpanded(e => !e)} className="text-purple-500 hover:text-purple-700">
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          )}
          <Button
            size="sm"
            onClick={validate}
            disabled={loading}
            className="h-7 text-xs bg-purple-700 hover:bg-purple-800"
          >
            {loading ? (
              <><Loader2 className="h-3 w-3 animate-spin mr-1" />Checking…</>
            ) : result ? (
              "Re-check"
            ) : (
              <><Sparkles className="h-3 w-3 mr-1" />Validate</>
            )}
          </Button>
        </div>
      </div>

      {/* Completeness bar */}
      {result && expanded && (
        <div className="px-4 pt-3 pb-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-purple-700 font-medium">Data Completeness</span>
            <span className="text-xs font-bold text-purple-800">{result.overall_completeness ?? 0}%</span>
          </div>
          <div className="h-1.5 bg-purple-200 rounded-full overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all", result.overall_completeness >= 80 ? "bg-emerald-500" : result.overall_completeness >= 50 ? "bg-amber-400" : "bg-red-400")}
              style={{ width: `${result.overall_completeness ?? 0}%` }}
            />
          </div>
          {result.ready_to_analyze === false && (
            <p className="text-xs text-amber-600 mt-1">Fill in required fields before running the full AI analysis.</p>
          )}
          {result.ready_to_analyze === true && (
            <p className="text-xs text-emerald-600 mt-1">Proforma has enough data for full AI analysis.</p>
          )}
        </div>
      )}

      {/* Items */}
      {result && expanded && visibleItems.length > 0 && (
        <div className="p-3 space-y-2">
          {visibleItems.map((item, i) => {
            const cfg = SEVERITY_CONFIG[item.severity] || SEVERITY_CONFIG.suggestion;
            const Icon = cfg.icon;
            return (
              <div key={i} className={cn("flex gap-2.5 items-start rounded-lg border p-2.5 pr-2", cfg.bg, cfg.border)}>
                <Icon className={cn("h-3.5 w-3.5 shrink-0 mt-0.5", cfg.iconColor)} />
                <div className="flex-1 min-w-0">
                  {item.field && (
                    <span className={cn("text-xs font-semibold uppercase tracking-wide mr-1", cfg.text)}>{item.field}:</span>
                  )}
                  <span className={cn("text-xs", cfg.text)}>{item.message}</span>
                  {item.suggested_value && (
                    <p className={cn("text-xs font-medium mt-0.5 italic", cfg.text)}>→ {item.suggested_value}</p>
                  )}
                </div>
                <button onClick={() => setDismissed(d => new Set([...d, item.message]))} className="text-slate-300 hover:text-slate-500 shrink-0">
                  <X className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {result && expanded && visibleItems.length === 0 && (
        <div className="px-4 pb-4 pt-3 text-center">
          <CheckCircle2 className="h-6 w-6 text-emerald-500 mx-auto mb-1" />
          <p className="text-xs text-emerald-700 font-medium">No issues found — proforma looks complete and consistent.</p>
        </div>
      )}

      {!result && !loading && (
        <div className="px-4 py-4 text-center">
          <p className="text-xs text-purple-600">Click Validate to check your inputs for issues, missing fields, and industry benchmark comparisons.</p>
        </div>
      )}
    </div>
  );
}