import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sparkles, AlertTriangle, CheckCircle2, Loader2, MapPin, Zap } from "lucide-react";
import { toast } from "sonner";

const GEOTECH_FOCUS_AREAS = [
  {
    key: "collapsible_soils",
    label: "Collapsible Soils",
    icon: "🏜️",
    description: "Presence of collapsible or compressible soils that may settle upon saturation"
  },
  {
    key: "groundwater",
    label: "Groundwater Levels",
    icon: "💧",
    description: "Depth to groundwater table and seasonal fluctuations"
  },
  {
    key: "bedrock",
    label: "Bedrock",
    icon: "🪨",
    description: "Depth to bedrock and rock type characteristics"
  },
  {
    key: "overexcavation",
    label: "Over-Excavation Requirements",
    icon: "🏗️",
    description: "Special excavation, removal, or replacement requirements"
  }
];

export default function GeotechAnalysis({ dealId, deal }) {
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);

  const { data: documents = [] } = useQuery({
    queryKey: ["geotech-documents", dealId],
    queryFn: () =>
      base44.entities.Document.filter({
        entity_type: "deal",
        entity_id: dealId,
        category: "report"
      }),
    enabled: !!dealId
  });

  // Find soil/geotech reports
  const geotechDocs = documents.filter(doc =>
    /soil|geotech|foundation|geotechnical/i.test(doc.name + (doc.description || ""))
  );

  const analyzeGeotechReport = async () => {
    if (geotechDocs.length === 0) {
      toast.error("No geotech/soils reports found. Please upload a report first.");
      return;
    }

    setAnalyzing(true);
    try {
      const fileUrls = geotechDocs.map(doc => doc.file_url);

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze the provided geotechnical/soils report for this property and provide detailed findings on the following four critical areas:

1. **COLLAPSIBLE SOILS**: Identify any mention of collapsible, compressible, or loessial soils. Note if saturation could cause settlement. Describe mitigation measures if mentioned.

2. **GROUNDWATER LEVELS**: Extract depth to groundwater table (static level). Note seasonal variations if mentioned. Identify any high-water conditions or perched water.

3. **BEDROCK**: Report depth to bedrock (feet below surface) and rock type. Note if excavation into bedrock is anticipated.

4. **OVER-EXCAVATION REQUIREMENTS**: Identify any special requirements for excavation, removal of unsuitable materials, or replacement soil specifications. Include recommendations for fill material and compaction requirements.

For each area, provide:
- Current condition/findings
- Recommended mitigation or special considerations
- Impact on construction/development costs (if mentioned)
- Any warnings or red flags

Format as JSON with separate sections for each area.`,
        file_urls: fileUrls,
        response_json_schema: {
          type: "object",
          properties: {
            collapsible_soils: {
              type: "object",
              properties: {
                present: { type: "boolean" },
                findings: { type: "string" },
                mitigation: { type: "string" },
                cost_impact: { type: "string" },
                risk_level: { type: "string", enum: ["low", "medium", "high"] }
              }
            },
            groundwater: {
              type: "object",
              properties: {
                depth_feet: { type: "string" },
                findings: { type: "string" },
                seasonal_variation: { type: "string" },
                mitigation: { type: "string" },
                risk_level: { type: "string", enum: ["low", "medium", "high"] }
              }
            },
            bedrock: {
              type: "object",
              properties: {
                depth_feet: { type: "string" },
                rock_type: { type: "string" },
                findings: { type: "string" },
                excavation_impact: { type: "string" },
                cost_impact: { type: "string" },
                risk_level: { type: "string", enum: ["low", "medium", "high"] }
              }
            },
            overexcavation: {
              type: "object",
              properties: {
                required: { type: "boolean" },
                findings: { type: "string" },
                removal_depth: { type: "string" },
                fill_specifications: { type: "string" },
                mitigation: { type: "string" },
                cost_impact: { type: "string" },
                risk_level: { type: "string", enum: ["low", "medium", "high"] }
              }
            },
            overall_summary: { type: "string" }
          }
        }
      });

      setAnalysis(result);
      toast.success("Geotech analysis complete");
    } catch (error) {
      console.error("Analysis failed:", error);
      toast.error("Failed to analyze geotech report");
    } finally {
      setAnalyzing(false);
    }
  };

  const getRiskColor = (level) => {
    switch (level) {
      case "high":
        return "bg-red-100 text-red-800 border-red-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "low":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-slate-100 text-slate-800 border-slate-200";
    }
  };

  return (
    <div className="space-y-4">
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <span>🔬 Geotech Analysis</span>
              </CardTitle>
              <p className="text-sm text-slate-600 mt-1">
                {geotechDocs.length} geotech/soils report{geotechDocs.length !== 1 ? "s" : ""} available
              </p>
            </div>
            <Button
              onClick={analyzeGeotechReport}
              disabled={analyzing || geotechDocs.length === 0}
              className="bg-emerald-600 hover:bg-emerald-700"
              size="sm"
            >
              {analyzing ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Analyzing...</>
              ) : (
                <><Sparkles className="h-4 w-4 mr-2" />Analyze Report</>
              )}
            </Button>
          </div>
        </CardHeader>

        {!analysis && !analyzing && geotechDocs.length === 0 && (
          <CardContent>
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Upload a geotech or soils report to analyze for collapsible soils, groundwater, bedrock, and excavation requirements.
              </AlertDescription>
            </Alert>
          </CardContent>
        )}

        {analysis && (
          <CardContent className="space-y-6">
            {analysis.overall_summary && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">Summary</h4>
                <p className="text-sm text-blue-800">{analysis.overall_summary}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Collapsible Soils */}
              <div className={`border rounded-lg p-4 ${getRiskColor(analysis.collapsible_soils?.risk_level)}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🏜️</span>
                    <h4 className="font-semibold">Collapsible Soils</h4>
                  </div>
                  {analysis.collapsible_soils?.present && (
                    <Badge variant="destructive" className="text-xs">Present</Badge>
                  )}
                </div>
                <div className="text-sm space-y-2">
                  {analysis.collapsible_soils?.findings && (
                    <div>
                      <p className="font-medium opacity-80">Findings</p>
                      <p>{analysis.collapsible_soils.findings}</p>
                    </div>
                  )}
                  {analysis.collapsible_soils?.mitigation && (
                    <div>
                      <p className="font-medium opacity-80">Mitigation</p>
                      <p>{analysis.collapsible_soils.mitigation}</p>
                    </div>
                  )}
                  {analysis.collapsible_soils?.cost_impact && (
                    <div>
                      <p className="font-medium opacity-80">Cost Impact</p>
                      <p>{analysis.collapsible_soils.cost_impact}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Groundwater */}
              <div className={`border rounded-lg p-4 ${getRiskColor(analysis.groundwater?.risk_level)}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">💧</span>
                    <h4 className="font-semibold">Groundwater Levels</h4>
                  </div>
                </div>
                <div className="text-sm space-y-2">
                  {analysis.groundwater?.depth_feet && (
                    <div className="bg-white/30 rounded p-2">
                      <p className="font-mono font-semibold">{analysis.groundwater.depth_feet}</p>
                      <p className="text-xs opacity-70">Depth to water</p>
                    </div>
                  )}
                  {analysis.groundwater?.findings && (
                    <div>
                      <p className="font-medium opacity-80">Findings</p>
                      <p>{analysis.groundwater.findings}</p>
                    </div>
                  )}
                  {analysis.groundwater?.seasonal_variation && (
                    <div>
                      <p className="font-medium opacity-80">Seasonal Variation</p>
                      <p>{analysis.groundwater.seasonal_variation}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Bedrock */}
              <div className={`border rounded-lg p-4 ${getRiskColor(analysis.bedrock?.risk_level)}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🪨</span>
                    <h4 className="font-semibold">Bedrock</h4>
                  </div>
                </div>
                <div className="text-sm space-y-2">
                  {analysis.bedrock?.depth_feet && (
                    <div className="bg-white/30 rounded p-2">
                      <p className="font-mono font-semibold">{analysis.bedrock.depth_feet}</p>
                      <p className="text-xs opacity-70">Depth to bedrock</p>
                    </div>
                  )}
                  {analysis.bedrock?.rock_type && (
                    <div>
                      <p className="font-medium opacity-80">Rock Type</p>
                      <p>{analysis.bedrock.rock_type}</p>
                    </div>
                  )}
                  {analysis.bedrock?.excavation_impact && (
                    <div>
                      <p className="font-medium opacity-80">Excavation Impact</p>
                      <p>{analysis.bedrock.excavation_impact}</p>
                    </div>
                  )}
                  {analysis.bedrock?.cost_impact && (
                    <div>
                      <p className="font-medium opacity-80">Cost Impact</p>
                      <p>{analysis.bedrock.cost_impact}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Over-Excavation */}
              <div className={`border rounded-lg p-4 ${getRiskColor(analysis.overexcavation?.risk_level)}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🏗️</span>
                    <h4 className="font-semibold">Over-Excavation</h4>
                  </div>
                  {analysis.overexcavation?.required && (
                    <Badge variant="destructive" className="text-xs">Required</Badge>
                  )}
                </div>
                <div className="text-sm space-y-2">
                  {analysis.overexcavation?.removal_depth && (
                    <div className="bg-white/30 rounded p-2">
                      <p className="font-mono font-semibold">{analysis.overexcavation.removal_depth}</p>
                      <p className="text-xs opacity-70">Removal depth</p>
                    </div>
                  )}
                  {analysis.overexcavation?.fill_specifications && (
                    <div>
                      <p className="font-medium opacity-80">Fill Specs</p>
                      <p>{analysis.overexcavation.fill_specifications}</p>
                    </div>
                  )}
                  {analysis.overexcavation?.cost_impact && (
                    <div>
                      <p className="font-medium opacity-80">Cost Impact</p>
                      <p>{analysis.overexcavation.cost_impact}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}