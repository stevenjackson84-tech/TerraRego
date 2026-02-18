import { useState } from "react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { Sparkles, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AIMarketSuggestion({ deal, productType, onApply }) {
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState(null);

  const getSuggestion = async () => {
    setLoading(true);
    setSuggestion(null);
    const location = [deal?.city, deal?.state].filter(Boolean).join(", ") || "unknown location";
    const sqft = productType.average_sqft ? `${productType.average_sqft} sqft` : "unknown size";
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a real estate market analyst specializing in residential land development. 
Based on current market conditions for ${location}, provide realistic estimates for:
- Product type: ${productType.name || "residential homes"} (${sqft})
- Number of units: ${productType.number_of_units || "unknown"}

Return ONLY a JSON object with these fields:
- sales_price_per_unit: estimated sales price per unit in dollars (integer, no commas)
- absorption_pace: estimated units sold per month (decimal, e.g. 2.5)
- price_per_sqft: estimated price per sqft (integer)
- rationale: one short sentence explaining the basis for these estimates`,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          sales_price_per_unit: { type: "number" },
          absorption_pace: { type: "number" },
          price_per_sqft: { type: "number" },
          rationale: { type: "string" }
        }
      }
    });
    setSuggestion(result);
    setLoading(false);
  };

  const formatCurrency = (v) => v ? `$${Number(v).toLocaleString()}` : "—";

  return (
    <div className="col-span-2 mt-1">
      {!suggestion && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={getSuggestion}
          disabled={loading}
          className="h-7 text-xs border-purple-200 text-purple-700 hover:bg-purple-50"
        >
          <Sparkles className={cn("h-3 w-3 mr-1", loading && "animate-spin")} />
          {loading ? "Fetching market data..." : "AI Market Suggest"}
        </Button>
      )}

      {suggestion && (
        <div className="flex flex-col gap-2 p-3 bg-purple-50 border border-purple-200 rounded-lg text-xs">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-1 font-semibold text-purple-800">
              <Sparkles className="h-3.5 w-3.5" />
              AI Suggestion
            </div>
            <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => setSuggestion(null)}>
              <X className="h-3 w-3" />
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-white rounded p-1.5">
              <div className="text-slate-500">Sales Price</div>
              <div className="font-bold text-slate-800">{formatCurrency(suggestion.sales_price_per_unit)}</div>
            </div>
            <div className="bg-white rounded p-1.5">
              <div className="text-slate-500">$/sqft</div>
              <div className="font-bold text-slate-800">{formatCurrency(suggestion.price_per_sqft)}</div>
            </div>
            <div className="bg-white rounded p-1.5">
              <div className="text-slate-500">Absorption</div>
              <div className="font-bold text-slate-800">{suggestion.absorption_pace} u/mo</div>
            </div>
          </div>
          {suggestion.rationale && (
            <p className="text-purple-700 italic">{suggestion.rationale}</p>
          )}
          <Button
            type="button"
            size="sm"
            className="h-7 bg-purple-700 hover:bg-purple-800 text-white text-xs w-full"
            onClick={() => {
              onApply({
                sales_price_per_unit: suggestion.sales_price_per_unit,
                absorption_pace: suggestion.absorption_pace,
              });
              setSuggestion(null);
            }}
          >
            <Check className="h-3 w-3 mr-1" />
            Apply Suggestions
          </Button>
        </div>
      )}
    </div>
  );
}