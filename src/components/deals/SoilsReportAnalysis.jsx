import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, Loader2, Sparkles, AlertTriangle, CheckCircle2, Layers, Trash2, Eye, FlaskConical } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";
import { toast } from "sonner";

export default function SoilsReportAnalysis({ dealId }) {
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(null);
  const [previewDoc, setPreviewDoc] = useState(null);
  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: soilsDocs = [] } = useQuery({
    queryKey: ["soils_docs", dealId],
    queryFn: () => base44.entities.Document.filter({ entity_type: "deal", entity_id: dealId }, "-created_date").then(
      docs => docs.filter(d => d.tags?.includes("soils_report"))
    ),
    enabled: !!dealId
  });

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const doc = await base44.entities.Document.create({
        name: file.name,
        file_url,
        file_size: file.size,
        file_type: file.type,
        category: "report",
        description: "Soils Report",
        entity_type: "deal",
        entity_id: dealId,
        tags: ["soils_report"],
        is_latest_version: true,
        version: 1
      });
      queryClient.invalidateQueries({ queryKey: ["soils_docs", dealId] });
      queryClient.invalidateQueries({ queryKey: ["dd_documents", dealId] });
      toast.success("Soils report uploaded — run AI analysis to extract findings");
      // Auto-trigger analysis
      await runAnalysis(doc);
    } finally {
      setUploading(false);
    }
  };

  const runAnalysis = async (doc) => {
    setAnalyzing(doc.id);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a geotechnical engineering expert reviewing a soils report for a real estate development project.

Document: ${doc.name}

Analyze this soils report and provide a structured assessment covering:
1. Soil bearing capacity and foundation recommendations
2. Expansive soil risk (shrink/swell potential)
3. Contamination or hazardous materials findings
4. Groundwater depth and drainage issues
5. Seismic/liquefaction risk
6. Grading and earthwork considerations
7. Special construction requirements or restrictions
8. Overall risk rating for development

Be specific, use technical data from the document where available, and flag any concerns that would affect development cost or feasibility.`,
        file_urls: [doc.file_url],
        response_json_schema: {
          type: "object",
          properties: {
            overall_risk: { type: "string", enum: ["low", "moderate", "high", "critical"] },
            executive_summary: { type: "string" },
            bearing_capacity: { type: "string" },
            expansive_soil_risk: { type: "string" },
            contamination: { type: "string" },
            groundwater: { type: "string" },
            seismic_risk: { type: "string" },
            grading_notes: { type: "string" },
            special_requirements: { type: "array", items: { type: "string" } },
            red_flags: { type: "array", items: { type: "string" } },
            cost_impacts: { type: "array", items: { type: "string" } },
            recommendations: { type: "array", items: { type: "string" } }
          }
        }
      });

      await base44.entities.Document.update(doc.id, {
        ai_extracted_info: {
          summary: [result.executive_summary || ""],
          other: result.red_flags || [],
          values: result.cost_impacts || [],
          deadlines: result.recommendations || [],
          parties: [],
          dates: [],
          soils_analysis: result
        }
      });

      queryClient.invalidateQueries({ queryKey: ["soils_docs", dealId] });
      toast.success("AI soils analysis complete");
    } catch (err) {
      toast.error("Analysis failed: " + err.message);
    } finally {
      setAnalyzing(null);
    }
  };

  const handleDelete = async (id) => {
    await base44.entities.Document.delete(id);
    queryClient.invalidateQueries({ queryKey: ["soils_docs", dealId] });
    queryClient.invalidateQueries({ queryKey: ["dd_documents", dealId] });
    toast.success("Report deleted");
  };

  const riskColors = {
    low: "bg-emerald-100 text-emerald-700",
    moderate: "bg-amber-100 text-amber-700",
    high: "bg-orange-100 text-orange-700",
    critical: "bg-red-100 text-red-700"
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Layers className="h-4 w-4 text-amber-600" />
            Soils Report & AI Analysis
          </CardTitle>
          <div className="flex gap-2">
            <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={handleUpload} />
            <Button size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="bg-amber-700 hover:bg-amber-800 h-8 text-xs">
              {uploading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Upload className="h-3 w-3 mr-1" />}
              Upload Soils Report
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {soilsDocs.length === 0 ? (
          <div className="text-center py-8">
            <FlaskConical className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500 font-medium">No soils reports uploaded</p>
            <p className="text-xs text-slate-400 mt-1">Upload a soils report for instant AI geotechnical analysis</p>
          </div>
        ) : (
          <div className="space-y-4">
            {soilsDocs.map(doc => {
              const analysis = doc.ai_extracted_info?.soils_analysis;
              const isAnalyzing = analyzing === doc.id;

              return (
                <div key={doc.id} className="border border-slate-200 rounded-xl overflow-hidden">
                  {/* Doc Header */}
                  <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
                    <div className="flex items-center gap-3">
                      <FlaskConical className="h-4 w-4 text-amber-600 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-slate-900">{doc.name}</p>
                        <p className="text-xs text-slate-400">{format(new Date(doc.created_date), "MMM d, yyyy")}</p>
                      </div>
                      {analysis?.overall_risk && (
                        <Badge className={`text-xs capitalize ${riskColors[analysis.overall_risk]}`}>
                          {analysis.overall_risk} risk
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPreviewDoc(doc)}>
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7 text-purple-600"
                        onClick={() => runAnalysis(doc)} disabled={isAnalyzing}
                        title="Re-run AI analysis"
                      >
                        {isAnalyzing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => handleDelete(doc.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Analysis Results */}
                  {isAnalyzing && (
                    <div className="p-6 text-center">
                      <Loader2 className="h-6 w-6 animate-spin text-purple-600 mx-auto mb-2" />
                      <p className="text-sm text-slate-500">AI is analyzing the soils report…</p>
                    </div>
                  )}

                  {!isAnalyzing && analysis && (
                    <div className="p-4 space-y-4">
                      {/* Executive Summary */}
                      {analysis.executive_summary && (
                        <div className="bg-purple-50 rounded-lg p-3 border border-purple-100">
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <Sparkles className="h-3.5 w-3.5 text-purple-600" />
                            <span className="text-xs font-semibold text-purple-700">Executive Summary</span>
                          </div>
                          <p className="text-sm text-slate-700">{analysis.executive_summary}</p>
                        </div>
                      )}

                      {/* Key Metrics Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {[
                          { label: "Bearing Capacity", value: analysis.bearing_capacity },
                          { label: "Expansive Soil Risk", value: analysis.expansive_soil_risk },
                          { label: "Contamination", value: analysis.contamination },
                          { label: "Groundwater", value: analysis.groundwater },
                          { label: "Seismic Risk", value: analysis.seismic_risk },
                          { label: "Grading Notes", value: analysis.grading_notes }
                        ].filter(item => item.value).map(item => (
                          <div key={item.label} className="bg-slate-50 rounded-lg p-3">
                            <p className="text-xs font-semibold text-slate-500 mb-1">{item.label}</p>
                            <p className="text-xs text-slate-700">{item.value}</p>
                          </div>
                        ))}
                      </div>

                      {/* Red Flags */}
                      {analysis.red_flags?.length > 0 && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                          <div className="flex items-center gap-1.5 mb-2">
                            <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
                            <span className="text-xs font-semibold text-red-700">Red Flags</span>
                          </div>
                          <ul className="space-y-1">
                            {analysis.red_flags.map((flag, i) => (
                              <li key={i} className="text-xs text-red-700">• {flag}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Cost Impacts */}
                      {analysis.cost_impacts?.length > 0 && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                          <p className="text-xs font-semibold text-amber-700 mb-2">Potential Cost Impacts</p>
                          <ul className="space-y-1">
                            {analysis.cost_impacts.map((item, i) => (
                              <li key={i} className="text-xs text-amber-800">• {item}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Recommendations */}
                      {analysis.recommendations?.length > 0 && (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                          <div className="flex items-center gap-1.5 mb-2">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            <span className="text-xs font-semibold text-emerald-700">Recommendations</span>
                          </div>
                          <ul className="space-y-1">
                            {analysis.recommendations.map((rec, i) => (
                              <li key={i} className="text-xs text-emerald-800">• {rec}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {!isAnalyzing && !analysis && (
                    <div className="p-4 text-center">
                      <p className="text-xs text-slate-400 mb-2">No AI analysis yet</p>
                      <Button size="sm" variant="outline" className="text-xs h-7 border-purple-200 text-purple-700 hover:bg-purple-50" onClick={() => runAnalysis(doc)}>
                        <Sparkles className="h-3 w-3 mr-1" />
                        Run AI Analysis
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

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