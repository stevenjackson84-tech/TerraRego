import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Upload, FileText, Sparkles, Loader2, Trash2, Eye } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const DD_CATEGORIES = [
  "survey",
  "environmental_report",
  "title_policy",
  "soils_report",
  "traffic_study",
  "phase1_esa",
  "phase2_esa",
  "flood_map",
  "engineering_plans",
  "permits",
  "legal",
  "financial",
  "other"
];

const categoryColors = {
  survey: "bg-blue-100 text-blue-700",
  environmental_report: "bg-green-100 text-green-700",
  title_policy: "bg-purple-100 text-purple-700",
  soils_report: "bg-amber-100 text-amber-700",
  traffic_study: "bg-orange-100 text-orange-700",
  phase1_esa: "bg-teal-100 text-teal-700",
  phase2_esa: "bg-cyan-100 text-cyan-700",
  flood_map: "bg-sky-100 text-sky-700",
  engineering_plans: "bg-indigo-100 text-indigo-700",
  permits: "bg-lime-100 text-lime-700",
  legal: "bg-red-100 text-red-700",
  financial: "bg-emerald-100 text-emerald-700",
  other: "bg-slate-100 text-slate-700"
};

export default function DDDocumentPanel({ dealId }) {
  const [uploading, setUploading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("other");
  const [summarizing, setSummarizing] = useState(null);
  const [previewDoc, setPreviewDoc] = useState(null);
  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: documents = [] } = useQuery({
    queryKey: ["dd_documents", dealId],
    queryFn: () => base44.entities.Document.filter({ entity_type: "deal", entity_id: dealId }, "-created_date"),
    enabled: !!dealId
  });

  const deleteDoc = useMutation({
    mutationFn: (id) => base44.entities.Document.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dd_documents", dealId] });
      toast.success("Document deleted");
    }
  });

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.Document.create({
        name: file.name,
        file_url,
        file_size: file.size,
        file_type: file.type,
        category: selectedCategory === "survey" || selectedCategory === "title_policy" || selectedCategory === "legal" ? "legal" : selectedCategory === "financial" ? "financial" : selectedCategory.includes("environ") || selectedCategory.includes("esa") ? "report" : "other",
        description: selectedCategory.replace(/_/g, " "),
        entity_type: "deal",
        entity_id: dealId,
        tags: [selectedCategory],
        is_latest_version: true,
        version: 1
      });
      queryClient.invalidateQueries({ queryKey: ["dd_documents", dealId] });
      toast.success("Document uploaded");
    } finally {
      setUploading(false);
    }
  };

  const handleSummarize = async (doc) => {
    setSummarizing(doc.id);
    try {
      // Verify document still exists before running LLM
      let freshDoc;
      try {
        freshDoc = await base44.entities.Document.get(doc.id);
      } catch {
        toast.error("Document no longer exists. Refreshing list…");
        queryClient.invalidateQueries({ queryKey: ["dd_documents", dealId] });
        return;
      }

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a real estate due diligence expert. Analyze this document and provide a concise summary of key findings.

Document name: ${doc.name}
Category: ${doc.description || doc.category}

Please provide:
1. A brief summary of what this document covers
2. Key findings or data points
3. Any red flags or concerns
4. Recommended action items

Keep the response concise and focused on what matters for a real estate acquisition decision.`,
        file_urls: [doc.file_url],
        response_json_schema: {
          type: "object",
          properties: {
            summary: { type: "string" },
            key_findings: { type: "array", items: { type: "string" } },
            red_flags: { type: "array", items: { type: "string" } },
            action_items: { type: "array", items: { type: "string" } }
          }
        }
      });

      await base44.entities.Document.update(doc.id, {
        ai_extracted_info: {
          dates: [],
          parties: [],
          values: result.key_findings || [],
          deadlines: result.action_items || [],
          other: result.red_flags || [],
          summary: [result.summary || ""]
        }
      });

      queryClient.invalidateQueries({ queryKey: ["dd_documents", dealId] });
      toast.success("AI summary complete");
    } finally {
      setSummarizing(null);
    }
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Due Diligence Documents
          </CardTitle>
          <div className="flex gap-2">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-44 h-8 text-xs">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {DD_CATEGORIES.map(c => (
                  <SelectItem key={c} value={c} className="text-xs capitalize">
                    {c.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.xlsx,.xls,.png,.jpg,.jpeg" className="hidden" onChange={handleUpload} />
            <Button size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="bg-slate-900 hover:bg-slate-800 h-8 text-xs">
              {uploading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Upload className="h-3 w-3 mr-1" />}
              Upload
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {documents.length === 0 ? (
          <p className="text-center py-6 text-sm text-slate-400">No documents uploaded yet</p>
        ) : (
          <div className="space-y-2">
            {documents.map(doc => {
              const docCategory = doc.tags?.[0] || doc.category || "other";
              const aiInfo = doc.ai_extracted_info;
              return (
                <div key={doc.id} className="border border-slate-200 rounded-lg p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-slate-900 truncate">{doc.name}</p>
                        <Badge className={`text-xs ${categoryColors[docCategory] || "bg-slate-100 text-slate-700"}`}>
                          {docCategory.replace(/_/g, " ")}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{format(new Date(doc.created_date), "MMM d, yyyy")}</p>

                      {/* AI Summary */}
                      {aiInfo?.summary?.[0] && (
                        <div className="mt-2 bg-purple-50 rounded p-2 border border-purple-100">
                          <div className="flex items-center gap-1 mb-1">
                            <Sparkles className="h-3 w-3 text-purple-600" />
                            <span className="text-xs font-medium text-purple-700">AI Summary</span>
                          </div>
                          <p className="text-xs text-slate-700">{aiInfo.summary[0]}</p>
                          {aiInfo.other?.length > 0 && (
                            <div className="mt-1.5">
                              <p className="text-xs font-medium text-red-600">⚠ Red Flags:</p>
                              {aiInfo.other.map((flag, i) => (
                                <p key={i} className="text-xs text-red-700">• {flag}</p>
                              ))}
                            </div>
                          )}
                          {aiInfo.values?.length > 0 && (
                            <div className="mt-1">
                              <p className="text-xs font-medium text-slate-600">Key Findings:</p>
                              {aiInfo.values.slice(0, 3).map((f, i) => (
                                <p key={i} className="text-xs text-slate-600">• {f}</p>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7" title="Preview" onClick={() => setPreviewDoc(doc)}>
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7 text-purple-600 hover:text-purple-700"
                        title="AI Summarize" onClick={() => handleSummarize(doc)}
                        disabled={summarizing === doc.id}
                      >
                        {summarizing === doc.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => deleteDoc.mutate(doc.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Preview Dialog */}
      <Dialog open={!!previewDoc} onOpenChange={(open) => !open && setPreviewDoc(null)}>
        <DialogContent className="max-w-4xl h-[85vh]">
          <DialogHeader>
            <DialogTitle>{previewDoc?.name}</DialogTitle>
          </DialogHeader>
          {previewDoc && <iframe src={previewDoc.file_url} className="w-full h-full border-0 rounded" title={previewDoc.name} />}
        </DialogContent>
      </Dialog>
    </Card>
  );
}