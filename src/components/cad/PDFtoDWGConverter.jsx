import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, Loader2, Download, FileCode2, CheckCircle2, AlertCircle, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

function buildDXF(entities) {
  const lines = [];

  // DXF Header
  lines.push("0\nSECTION\n2\nHEADER");
  lines.push("9\n$ACADVER\n1\nAC1015");
  lines.push("0\nENDSEC");

  // TABLES (minimal)
  lines.push("0\nSECTION\n2\nTABLES");
  lines.push("0\nTABLE\n2\nLAYER\n70\n1");
  lines.push("0\nLAYER\n2\n0\n70\n0\n62\n7\n6\nCONTINUOUS");
  lines.push("0\nENDTAB\n0\nENDSEC");

  // ENTITIES
  lines.push("0\nSECTION\n2\nENTITIES");

  for (const ent of entities) {
    if (ent.type === "LINE") {
      lines.push(`0\nLINE\n8\n0\n10\n${ent.x1}\n20\n${ent.y1}\n30\n0\n11\n${ent.x2}\n21\n${ent.y2}\n31\n0`);
    } else if (ent.type === "CIRCLE") {
      lines.push(`0\nCIRCLE\n8\n0\n10\n${ent.cx}\n20\n${ent.cy}\n30\n0\n40\n${ent.radius}`);
    } else if (ent.type === "ARC") {
      lines.push(`0\nARC\n8\n0\n10\n${ent.cx}\n20\n${ent.cy}\n30\n0\n40\n${ent.radius}\n50\n${ent.startAngle}\n51\n${ent.endAngle}`);
    } else if (ent.type === "TEXT") {
      lines.push(`0\nTEXT\n8\n0\n10\n${ent.x}\n20\n${ent.y}\n30\n0\n40\n${ent.height || 2.5}\n1\n${ent.text}`);
    } else if (ent.type === "LWPOLYLINE" && ent.points?.length >= 2) {
      lines.push(`0\nLWPOLYLINE\n8\n0\n90\n${ent.points.length}\n70\n${ent.closed ? 1 : 0}`);
      for (const pt of ent.points) {
        lines.push(`10\n${pt.x}\n20\n${pt.y}`);
      }
    }
  }

  lines.push("0\nENDSEC\n0\nEOF");
  return lines.join("\n");
}

export default function PDFtoDWGConverter({ open, onClose }) {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | uploading | analyzing | done | error
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const fileInputRef = useRef(null);

  const reset = () => {
    setFile(null);
    setStatus("idle");
    setResult(null);
    setErrorMsg("");
  };

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    e.target.value = "";
    setFile(f);
    setStatus("idle");
    setResult(null);
    setErrorMsg("");
  };

  const handleConvert = async () => {
    if (!file) return;
    setStatus("uploading");
    setErrorMsg("");

    const { file_url } = await base44.integrations.Core.UploadFile({ file });

    setStatus("analyzing");

    const aiResult = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a CAD geometry extraction expert. Analyze this PDF drawing and extract all visible vector geometry elements. 

For each geometric element found, output a JSON object with the following structure:
- Lines: { "type": "LINE", "x1": number, "y1": number, "x2": number, "y2": number }
- Circles: { "type": "CIRCLE", "cx": number, "cy": number, "radius": number }
- Arcs: { "type": "ARC", "cx": number, "cy": number, "radius": number, "startAngle": number, "endAngle": number }
- Polylines/Rectangles: { "type": "LWPOLYLINE", "closed": true/false, "points": [{"x": number, "y": number}, ...] }
- Text labels: { "type": "TEXT", "x": number, "y": number, "text": string, "height": number }

Use a coordinate system where the drawing origin is bottom-left. Scale coordinates to real-world units if dimensions are visible (e.g., feet or meters), otherwise use pixel-like units from the page.

Extract ALL geometry you can see: property boundaries, walls, roads, lot lines, dimensions, labels, etc.
Return ONLY the JSON — no explanation, no markdown.`,
      file_urls: [file_url],
      response_json_schema: {
        type: "object",
        properties: {
          entities: {
            type: "array",
            items: { type: "object" }
          },
          unit: { type: "string" },
          summary: { type: "string" }
        }
      }
    });

    const entities = aiResult?.entities || [];
    if (entities.length === 0) {
      setStatus("error");
      setErrorMsg("No geometry could be extracted from this PDF. Make sure it contains vector drawings (not just raster images).");
      return;
    }

    const dxfContent = buildDXF(entities);
    setResult({ dxfContent, entities, unit: aiResult.unit, summary: aiResult.summary });
    setStatus("done");
    toast.success(`Extracted ${entities.length} geometry elements`);
  };

  const downloadDXF = () => {
    if (!result) return;
    const blob = new Blob([result.dxfContent], { type: "application/dxf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = (file?.name?.replace(/\.pdf$/i, "") || "converted") + ".dxf";
    a.click();
    URL.revokeObjectURL(url);
  };

  const isLoading = status === "uploading" || status === "analyzing";

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileCode2 className="h-5 w-5 text-indigo-600" />
            PDF → DXF / DWG Converter
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Upload a PDF drawing. The AI will extract vector geometry and convert it to a <strong>.dxf</strong> file — the universal CAD exchange format compatible with AutoCAD, BricsCAD, Civil 3D, and more.
          </p>

          {/* File drop zone */}
          <div
            onClick={() => !isLoading && fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
              file ? "border-indigo-300 bg-indigo-50" : "border-slate-200 hover:border-slate-300 bg-slate-50"
            } ${isLoading ? "pointer-events-none opacity-60" : ""}`}
          >
            <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handleFile} />
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <FileCode2 className="h-8 w-8 text-indigo-500" />
                <div className="text-left">
                  <p className="text-sm font-medium text-slate-800">{file.name}</p>
                  <p className="text-xs text-slate-400">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
                {!isLoading && (
                  <button onClick={(e) => { e.stopPropagation(); reset(); }} className="ml-auto text-slate-400 hover:text-red-500">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ) : (
              <>
                <Upload className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500 font-medium">Click to upload PDF</p>
                <p className="text-xs text-slate-400 mt-1">Site plans, plats, floor plans, engineering drawings</p>
              </>
            )}
          </div>

          {/* Status messages */}
          {status === "uploading" && (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
              Uploading PDF…
            </div>
          )}
          {status === "analyzing" && (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin text-purple-500" />
              AI is extracting vector geometry from the drawing…
            </div>
          )}
          {status === "error" && (
            <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              {errorMsg}
            </div>
          )}
          {status === "done" && result && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span className="text-sm font-semibold text-emerald-700">Conversion complete</span>
                <Badge className="bg-emerald-100 text-emerald-700 text-xs ml-auto">
                  {result.entities.length} elements
                </Badge>
              </div>
              {result.summary && (
                <p className="text-xs text-slate-600">{result.summary}</p>
              )}
              {result.unit && (
                <p className="text-xs text-slate-400">Detected units: <strong>{result.unit}</strong></p>
              )}
              <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                {["LINE", "LWPOLYLINE", "CIRCLE", "ARC", "TEXT"].map(type => {
                  const count = result.entities.filter(e => e.type === type).length;
                  return count > 0 ? (
                    <span key={type} className="bg-white border border-slate-200 rounded px-2 py-0.5">
                      {type}: {count}
                    </span>
                  ) : null;
                })}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-1">
            <Button variant="outline" size="sm" onClick={() => { reset(); onClose(); }} disabled={isLoading}>
              Cancel
            </Button>
            {status !== "done" ? (
              <Button
                size="sm"
                onClick={handleConvert}
                disabled={!file || isLoading}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <FileCode2 className="h-3.5 w-3.5 mr-1" />}
                Convert to DXF
              </Button>
            ) : (
              <Button size="sm" onClick={downloadDXF} className="bg-emerald-600 hover:bg-emerald-700">
                <Download className="h-3.5 w-3.5 mr-1" />
                Download .dxf
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}