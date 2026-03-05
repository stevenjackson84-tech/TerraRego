import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, Sparkles, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

export default function PlatDocumentParser({ project, onApply }) {
  const [file, setFile] = useState(null);
  const [extracted, setExtracted] = useState(null);
  const [error, setError] = useState(null);

  const parseMutation = useMutation({
    mutationFn: async () => {
      setError(null);
      // Upload the file first
      const uploadRes = await base44.integrations.Core.UploadFile({ file });
      if (!uploadRes.file_url) throw new Error("Upload failed");

      // AI extraction
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a land development expert. Analyze this plat map or construction document PDF and extract the following metadata if present:
- lot_count: total number of lots (integer)
- acreage: total site acreage (decimal number)
- zoning_current: current zoning designation (string, e.g. "R-1", "A-1")
- zoning_target: target/proposed zoning designation if mentioned (string)
- number_of_units: number of dwelling units if mentioned (integer)
- subdivision_name: name of the subdivision or development (string)
- city: city name (string)
- state: state abbreviation (string)
- notes: any other important development-related metadata worth noting (string)

Return null for any field not found in the document. Be precise and only extract information clearly stated in the document.`,
        file_urls: [uploadRes.file_url],
        response_json_schema: {
          type: "object",
          properties: {
            lot_count: { type: "number" },
            acreage: { type: "number" },
            zoning_current: { type: "string" },
            zoning_target: { type: "string" },
            number_of_units: { type: "number" },
            subdivision_name: { type: "string" },
            city: { type: "string" },
            state: { type: "string" },
            notes: { type: "string" },
          }
        }
      });

      return { extracted: result, file_url: uploadRes.file_url };
    },
    onSuccess: ({ extracted }) => {
      setExtracted(extracted);
    },
    onError: (err) => {
      setError(err.message || "Failed to parse document");
    }
  });

  const applyMutation = useMutation({
    mutationFn: async () => {
      const updates = {};
      if (extracted.lot_count) updates.lot_count = extracted.lot_count;
      if (extracted.acreage) updates.acreage = extracted.acreage;
      if (extracted.zoning_current) updates.zoning_current = extracted.zoning_current;
      if (extracted.zoning_target) updates.zoning_target = extracted.zoning_target;
      if (extracted.city) updates.city = extracted.city;
      if (extracted.state) updates.state = extracted.state;
      await base44.entities.Project.update(project.id, updates);
      return updates;
    },
    onSuccess: (updates) => {
      onApply(updates);
      setExtracted(null);
      setFile(null);
    }
  });

  const fields = extracted ? [
    { key: "lot_count", label: "Lot Count", value: extracted.lot_count, format: v => v },
    { key: "acreage", label: "Acreage", value: extracted.acreage, format: v => `${v} ac` },
    { key: "zoning_current", label: "Current Zoning", value: extracted.zoning_current, format: v => v },
    { key: "zoning_target", label: "Target Zoning", value: extracted.zoning_target, format: v => v },
    { key: "city", label: "City", value: extracted.city, format: v => v },
    { key: "state", label: "State", value: extracted.state, format: v => v },
    { key: "subdivision_name", label: "Subdivision Name", value: extracted.subdivision_name, format: v => v },
    { key: "number_of_units", label: "Units", value: extracted.number_of_units, format: v => v },
  ].filter(f => f.value !== null && f.value !== undefined) : [];

  return (
    <Card className="border-dashed border-2 border-violet-200 bg-violet-50/40 shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-violet-800 flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          AI Plat & Construction Doc Parser
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!extracted ? (
          <>
            <p className="text-xs text-slate-500">
              Upload a plat map or construction PDF to automatically extract lot count, acreage, zoning, and other project metadata.
            </p>
            <div className="flex items-center gap-3">
              <label className="flex-1">
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
                <div className="border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-600 bg-white cursor-pointer hover:bg-slate-50 truncate">
                  {file ? file.name : "Choose PDF or image..."}
                </div>
              </label>
              <Button
                onClick={() => parseMutation.mutate()}
                disabled={!file || parseMutation.isPending}
                className="bg-violet-700 hover:bg-violet-800 text-white shrink-0"
                size="sm"
              >
                {parseMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Parsing...</>
                ) : (
                  <><Sparkles className="h-4 w-4 mr-1.5" />Parse</>
                )}
              </Button>
            </div>
            {error && (
              <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 p-2 rounded">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {error}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 text-xs text-emerald-700 mb-1">
              <CheckCircle2 className="h-4 w-4" />
              Extracted {fields.length} field{fields.length !== 1 ? 's' : ''} from document
            </div>
            {fields.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {fields.map(f => (
                  <div key={f.key} className="bg-white rounded-md border border-slate-200 px-3 py-2">
                    <p className="text-xs text-slate-400">{f.label}</p>
                    <p className="text-sm font-semibold text-slate-800">{f.format(f.value)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">No structured metadata found in this document.</p>
            )}
            {extracted.notes && (
              <p className="text-xs text-slate-500 italic border-t pt-2">{extracted.notes}</p>
            )}
            <div className="flex gap-2 pt-1">
              <Button
                size="sm"
                onClick={() => applyMutation.mutate()}
                disabled={applyMutation.isPending || fields.length === 0}
                className="bg-violet-700 hover:bg-violet-800 text-white"
              >
                {applyMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Applying...</>
                ) : (
                  <><CheckCircle2 className="h-4 w-4 mr-1.5" />Apply to Project</>
                )}
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setExtracted(null); setFile(null); }}>
                Discard
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}