import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Link2, CheckCircle2, ChevronDown, ChevronUp, DollarSign, Calendar, Hash, Users, FileText, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Map extracted fields → deal/proforma fields with labels
const DEAL_FIELD_SUGGESTIONS = {
  values: [
    { label: "Purchase Price", field: "purchase_price", entity: "deal", parse: "currency" },
    { label: "Asking Price", field: "asking_price", entity: "deal", parse: "currency" },
    { label: "Offer Price", field: "offer_price", entity: "deal", parse: "currency" },
    { label: "Estimated Value", field: "estimated_value", entity: "deal", parse: "currency" },
  ],
  dates: [
    { label: "Contract Date", field: "contract_date", entity: "deal", parse: "date" },
    { label: "Close Date", field: "close_date", entity: "deal", parse: "date" },
    { label: "DD Deadline", field: "due_diligence_deadline", entity: "deal", parse: "date" },
  ],
  permit_numbers: [
    { label: "Parcel Number", field: "parcel_number", entity: "deal", parse: "string" },
  ],
  addresses: [
    { label: "Property Address", field: "address", entity: "deal", parse: "string" },
  ],
};

function parseCurrency(str) {
  const cleaned = str.replace(/[$,\s]/g, "").match(/[\d.]+/);
  return cleaned ? parseFloat(cleaned[0]) : null;
}

function parseDate(str) {
  // Try to find a date-like pattern
  const match = str.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (match) {
    const [, m, d, y] = match;
    const year = y.length === 2 ? `20${y}` : y;
    return `${year}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  // Try ISO-like
  const iso = str.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;
  return null;
}

function parseValue(raw, type) {
  if (type === "currency") return parseCurrency(raw);
  if (type === "date") return parseDate(raw);
  return raw;
}

export default function DocumentFieldLinker({ dealId, deal, proforma, onDealUpdate, onProformaUpdate }) {
  const [expanded, setExpanded] = useState(true);
  const queryClient = useQueryClient();

  const { data: documents = [] } = useQuery({
    queryKey: ["documents", "deal", dealId],
    queryFn: () => base44.entities.Document.filter({ entity_type: "deal", entity_id: dealId, is_latest_version: true }, "-created_date"),
    enabled: !!dealId,
  });

  // Collect all extracted fields from all docs
  const extractedData = documents
    .filter(d => d.ai_extracted_info)
    .flatMap(doc =>
      Object.entries(doc.ai_extracted_info)
        .filter(([key, vals]) => vals?.length > 0 && DEAL_FIELD_SUGGESTIONS[key])
        .flatMap(([key, vals]) =>
          vals.map(val => ({
            docId: doc.id,
            docName: doc.name,
            docCategory: doc.category,
            infoType: key,
            rawValue: val,
            suggestions: DEAL_FIELD_SUGGESTIONS[key] || [],
          }))
        )
    );

  const [applied, setApplied] = useState({});

  const applyField = async (suggestion, rawValue) => {
    const parsedValue = parseValue(rawValue, suggestion.parse);
    if (parsedValue === null || parsedValue === undefined) {
      toast.error("Could not parse value: " + rawValue);
      return;
    }

    if (suggestion.entity === "deal") {
      await onDealUpdate({ [suggestion.field]: parsedValue });
      setApplied(prev => ({ ...prev, [suggestion.field + rawValue]: true }));
      toast.success(`Applied "${rawValue}" → ${suggestion.label}`);
    } else if (suggestion.entity === "proforma") {
      await onProformaUpdate({ [suggestion.field]: parsedValue });
      setApplied(prev => ({ ...prev, [suggestion.field + rawValue]: true }));
      toast.success(`Applied "${rawValue}" → ${suggestion.label}`);
    }
  };

  if (extractedData.length === 0) return null;

  const categoryIcon = { contract: DollarSign, permit: Hash, plan: FileText, report: FileText, financial: DollarSign, legal: Users, other: FileText };

  return (
    <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50/60 to-blue-50/60 border border-purple-100">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-purple-800 flex items-center gap-2">
            <Link2 className="h-4 w-4 text-purple-600" />
            AI-Extracted Field Suggestions
            <Badge className="bg-purple-100 text-purple-700 text-xs">{extractedData.length} values found</Badge>
          </CardTitle>
          <button onClick={() => setExpanded(e => !e)} className="text-purple-400 hover:text-purple-700">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
        <p className="text-xs text-purple-600">Apply AI-extracted data from your documents directly to deal or proforma fields.</p>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-3 pt-0">
          {extractedData.map((item, i) => {
            const Icon = categoryIcon[item.docCategory] || FileText;
            return (
              <div key={i} className="bg-white rounded-lg border border-purple-100 p-3">
                <div className="flex items-start gap-2 mb-2">
                  <Icon className="h-3.5 w-3.5 text-purple-400 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs text-slate-500">From: <span className="font-medium text-slate-700">{item.docName}</span></span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Badge variant="outline" className="text-xs capitalize px-1.5 py-0">{item.infoType.replace("_", " ")}</Badge>
                      <span className="text-sm font-semibold text-slate-800 truncate">"{item.rawValue}"</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {item.suggestions.map((sug, j) => {
                    const key = sug.field + item.rawValue;
                    const isApplied = applied[key];
                    const currentVal = deal?.[sug.field] || proforma?.[sug.field];
                    return (
                      <button
                        key={j}
                        onClick={() => !isApplied && applyField(sug, item.rawValue)}
                        disabled={isApplied}
                        className={cn(
                          "flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-all",
                          isApplied
                            ? "bg-emerald-50 border-emerald-200 text-emerald-700 cursor-default"
                            : "bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100 cursor-pointer"
                        )}
                      >
                        {isApplied ? (
                          <><CheckCircle2 className="h-3 w-3" /> Applied to {sug.label}</>
                        ) : (
                          <><ArrowRight className="h-3 w-3" /> Apply as {sug.label}{currentVal ? ` (overwrite: ${currentVal})` : ""}</>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </CardContent>
      )}
    </Card>
  );
}