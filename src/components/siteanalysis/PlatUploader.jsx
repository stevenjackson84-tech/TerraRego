import { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { FileText, Upload, Loader2, CheckCircle2, ChevronDown, ChevronUp, X } from "lucide-react";

export default function PlatUploader({ onExtracted }) {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | uploading | extracting | done | error
  const [extracted, setExtracted] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [expanded, setExpanded] = useState(true);
  const inputRef = useRef(null);

  const handleFile = (f) => {
    if (!f || f.type !== "application/pdf") {
      setErrorMsg("Please select a PDF file.");
      return;
    }
    setFile(f);
    setExtracted(null);
    setErrorMsg(null);
    setStatus("idle");
  };

  const handleDrop = (e) => {
    e.preventDefault();
    handleFile(e.dataTransfer.files[0]);
  };

  const process = async () => {
    if (!file) return;
    setStatus("uploading");
    setErrorMsg(null);

    // 1. Upload the PDF
    const { file_url } = await base44.integrations.Core.UploadFile({ file });

    setStatus("extracting");

    // 2. AI extraction
    const schema = {
      type: "object",
      properties: {
        address: { type: "string", description: "Full street address of the parcel or subdivision" },
        parcel_number: { type: "string", description: "APN or parcel identification number" },
        gross_area_acres: { type: "number", description: "Total gross site area in acres" },
        gross_area_sf: { type: "number", description: "Total gross site area in square feet" },
        lot_count: { type: "number", description: "Total number of lots on the plat" },
        zoning_code: { type: "string", description: "Zoning designation or code mentioned" },
        subdivision_name: { type: "string", description: "Name of the subdivision or development" },
        county: { type: "string", description: "County name" },
        state: { type: "string", description: "State abbreviation" },
        notes: { type: "string", description: "Any other relevant site notes (easements, setbacks, restrictions mentioned)" },
      },
    };

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a land development analyst. Extract key parcel and site data from this plat document. 
Look for: total acreage, square footage, lot count, APN/parcel numbers, address, zoning code, subdivision name, county, state, and any notable site constraints mentioned.
If a value is not present in the document, return null for that field.`,
      file_urls: [file_url],
      response_json_schema: schema,
    });

    setExtracted(result);
    setStatus("done");

    // Auto-apply to form
    const prefill = {};
    if (result.address) prefill.address = result.address;
    if (result.parcel_number) prefill.parcel_number = result.parcel_number;
    if (result.gross_area_acres) prefill.gross_site_area_acres = result.gross_area_acres;
    if (result.gross_area_sf) prefill.gross_site_area_sf = result.gross_area_sf;
    if (result.zoning_code) prefill.zoning_code = result.zoning_code;
    if (result.subdivision_name && !prefill.name) prefill.name = result.subdivision_name;
    if (result.lot_count) prefill.lot_count = result.lot_count;

    onExtracted(prefill, file_url);
  };

  const reset = () => {
    setFile(null);
    setExtracted(null);
    setStatus("idle");
    setErrorMsg(null);
  };

  const isProcessing = status === "uploading" || status === "extracting";

  return (
    <div className="border border-slate-200 rounded-xl bg-slate-50 overflow-hidden mb-4">
      {/* Header toggle */}
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-slate-500" />
          <span className="text-sm font-semibold text-slate-700">Upload Plat PDF</span>
          {status === "done" && <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />}
          <span className="text-xs text-slate-400">— AI auto-extracts parcel data</span>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          {/* Drop zone */}
          {!file ? (
            <div
              onDragOver={e => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center cursor-pointer hover:border-slate-400 hover:bg-white transition-colors"
            >
              <Upload className="h-6 w-6 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">Drop a plat PDF here or <span className="text-slate-700 font-medium underline">browse</span></p>
              <p className="text-xs text-slate-400 mt-1">PDF files only</p>
              <input ref={inputRef} type="file" accept="application/pdf" className="hidden" onChange={e => handleFile(e.target.files[0])} />
            </div>
          ) : (
            <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-lg px-3 py-2">
              <FileText className="h-5 w-5 text-slate-400 flex-shrink-0" />
              <span className="text-sm text-slate-700 truncate flex-1">{file.name}</span>
              <button type="button" onClick={reset} className="text-slate-300 hover:text-slate-500">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {errorMsg && (
            <p className="text-xs text-red-600">{errorMsg}</p>
          )}

          {/* Action */}
          {file && status !== "done" && (
            <Button
              type="button"
              size="sm"
              onClick={process}
              disabled={isProcessing}
              className="w-full bg-slate-900 hover:bg-slate-800 h-8 text-xs"
            >
              {isProcessing ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  {status === "uploading" ? "Uploading..." : "Extracting data..."}</>
              ) : (
                <><FileText className="h-3.5 w-3.5 mr-1.5" /> Extract Parcel Data</>
              )}
            </Button>
          )}

          {/* Extracted results */}
          {status === "done" && extracted && (
            <div className="bg-green-50 border border-green-100 rounded-lg p-3 space-y-1.5">
              <p className="text-xs font-semibold text-green-800 mb-2 flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> Extracted — applied to form below
              </p>
              {[
                ["Address", extracted.address],
                ["APN", extracted.parcel_number],
                ["Area", extracted.gross_area_acres ? `${extracted.gross_area_acres} acres` : extracted.gross_area_sf ? `${extracted.gross_area_sf?.toLocaleString()} SF` : null],
                ["Lots", extracted.lot_count],
                ["Zoning", extracted.zoning_code],
                ["Subdivision", extracted.subdivision_name],
                ["County", extracted.county ? `${extracted.county}${extracted.state ? ", " + extracted.state : ""}` : null],
              ].filter(([, v]) => v).map(([label, val]) => (
                <div key={label} className="flex gap-2 text-xs">
                  <span className="text-green-600 w-20 flex-shrink-0">{label}</span>
                  <span className="text-green-900 font-medium">{val}</span>
                </div>
              ))}
              {extracted.notes && (
                <div className="text-xs text-green-700 mt-1 pt-1 border-t border-green-100">
                  <span className="font-medium">Notes: </span>{extracted.notes}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}