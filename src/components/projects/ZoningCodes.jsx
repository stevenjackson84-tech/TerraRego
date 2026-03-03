import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, RefreshCw, ExternalLink, AlertCircle } from "lucide-react";

export default function ZoningCodes({ project, deal }) {
  const [zoningData, setZoningData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Use deal city/state if linked, otherwise project-level if available
  const city = deal?.city || project?.city || null;
  const state = deal?.state || project?.state || null;
  const address = deal?.address || null;

  const fetchZoningCodes = async () => {
    if (!city && !state) return;
    setLoading(true);
    setError(null);

    const locationStr = [address, city, state].filter(Boolean).join(", ");

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a real estate zoning expert. For the location: "${locationStr}", provide the relevant residential and mixed-use zoning codes and their descriptions. Include:
1. Common residential zoning classifications (single family, multi-family, etc.)
2. Key permitted uses for each zone
3. Typical density/lot size requirements if known
4. Any notable overlay zones or special districts relevant to development
5. A link to the city's official zoning code page if you know it

Focus on zoning codes most relevant to a land developer building homes.`,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          city: { type: "string" },
          state: { type: "string" },
          summary: { type: "string", description: "Brief overview of the zoning landscape" },
          zoning_codes: {
            type: "array",
            items: {
              type: "object",
              properties: {
                code: { type: "string" },
                name: { type: "string" },
                category: { type: "string", enum: ["single_family", "multi_family", "mixed_use", "commercial", "overlay", "other"] },
                permitted_uses: { type: "array", items: { type: "string" } },
                min_lot_size: { type: "string" },
                max_density: { type: "string" },
                notes: { type: "string" }
              }
            }
          },
          official_link: { type: "string" },
          last_updated_note: { type: "string" }
        }
      }
    });

    setZoningData(result);
    setLoading(false);
  };

  const categoryColors = {
    single_family: "bg-blue-100 text-blue-800",
    multi_family: "bg-purple-100 text-purple-800",
    mixed_use: "bg-amber-100 text-amber-800",
    commercial: "bg-orange-100 text-orange-800",
    overlay: "bg-emerald-100 text-emerald-800",
    other: "bg-slate-100 text-slate-700"
  };

  const categoryLabels = {
    single_family: "Single Family",
    multi_family: "Multi-Family",
    mixed_use: "Mixed Use",
    commercial: "Commercial",
    overlay: "Overlay",
    other: "Other"
  };

  if (!city && !state) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="py-12 text-center">
          <AlertCircle className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No location data available</p>
          <p className="text-sm text-slate-400 mt-1">Link this project to a deal with a city/state to look up zoning codes.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Zoning Codes</h2>
          <p className="text-sm text-slate-500">
            {[city, state].filter(Boolean).join(", ")}
          </p>
        </div>
        <Button
          onClick={fetchZoningCodes}
          disabled={loading}
          className="bg-slate-900 hover:bg-slate-800"
        >
          {loading ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Building2 className="h-4 w-4 mr-2" />
          )}
          {loading ? "Fetching..." : zoningData ? "Refresh" : "Pull Zoning Codes"}
        </Button>
      </div>

      {!zoningData && !loading && (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No zoning data loaded</p>
            <p className="text-sm text-slate-400 mt-1">Click "Pull Zoning Codes" to fetch relevant zoning information for {[city, state].filter(Boolean).join(", ")}.</p>
          </CardContent>
        </Card>
      )}

      {loading && (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12 text-center">
            <RefreshCw className="h-8 w-8 text-slate-400 mx-auto mb-3 animate-spin" />
            <p className="text-slate-500">Fetching zoning codes for {[city, state].filter(Boolean).join(", ")}...</p>
          </CardContent>
        </Card>
      )}

      {zoningData && !loading && (
        <>
          {zoningData.summary && (
            <Card className="border-0 shadow-sm bg-blue-50">
              <CardContent className="p-4">
                <p className="text-sm text-blue-900">{zoningData.summary}</p>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(zoningData.zoning_codes || []).map((zone, i) => (
              <Card key={i} className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg font-bold text-slate-900">{zone.code}</span>
                        <Badge className={categoryColors[zone.category] || categoryColors.other}>
                          {categoryLabels[zone.category] || "Other"}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-600">{zone.name}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  {(zone.permitted_uses?.length > 0) && (
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Permitted Uses</p>
                      <ul className="text-sm text-slate-700 space-y-0.5">
                        {zone.permitted_uses.map((use, j) => (
                          <li key={j} className="flex items-start gap-1.5">
                            <span className="text-slate-400 mt-0.5">•</span>
                            {use}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {zone.min_lot_size && (
                      <div className="bg-slate-50 rounded p-2">
                        <p className="text-xs text-slate-500">Min Lot Size</p>
                        <p className="font-medium text-slate-900">{zone.min_lot_size}</p>
                      </div>
                    )}
                    {zone.max_density && (
                      <div className="bg-slate-50 rounded p-2">
                        <p className="text-xs text-slate-500">Max Density</p>
                        <p className="font-medium text-slate-900">{zone.max_density}</p>
                      </div>
                    )}
                  </div>
                  {zone.notes && (
                    <p className="text-xs text-slate-500 italic">{zone.notes}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400 pt-2">
            {zoningData.last_updated_note && (
              <span>{zoningData.last_updated_note}</span>
            )}
            {zoningData.official_link && (
              <a
                href={zoningData.official_link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-blue-600 hover:underline"
              >
                Official Zoning Code
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </>
      )}
    </div>
  );
}