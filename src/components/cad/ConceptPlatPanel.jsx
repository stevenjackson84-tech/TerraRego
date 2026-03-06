import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Map, Loader2, ChevronDown, ChevronUp, Wand2, RefreshCw, MapPin, X, Search, CheckCircle2, AlertCircle } from "lucide-react";
import ParcelMapPicker from "@/components/siteanalysis/ParcelMapPicker";
import { base44 as b44 } from "@/api/base44Client";

const ZONING_PRESETS = {
  "R-1": { min_lot_sf: 7200, setback_front: 20, setback_rear: 20, setback_side: 5, max_height: 35, density: 6 },
  "R-2": { min_lot_sf: 5000, setback_front: 15, setback_rear: 15, setback_side: 5, max_height: 35, density: 8 },
  "R-4": { min_lot_sf: 3500, setback_front: 10, setback_rear: 10, setback_side: 3, max_height: 40, density: 12 },
  "R-MF": { min_lot_sf: 2500, setback_front: 10, setback_rear: 10, setback_side: 5, max_height: 50, density: 20 },
  "MU": { min_lot_sf: 2000, setback_front: 5, setback_rear: 5, setback_side: 0, max_height: 60, density: 30 },
};

function generatePlatShapes(platData) {
  const shapes = [];
  let id = Date.now();

  const {
    width_ft, depth_ft, lot_rows, lot_cols,
    street_width, setback_front, setback_rear, setback_side,
    min_lot_sf, zoning_label, mode
  } = platData;

  const SCALE = 1; // 1 unit = 1 foot
  const W = width_ft * SCALE;
  const D = depth_ft * SCALE;
  const SW = street_width * SCALE;

  // Parcel boundary
  shapes.push({
    id: id++, type: "rect",
    x1: 0, y1: 0, x2: W, y2: D,
    strokeColor: "#1e293b", strokeWidth: 2,
    fillColor: "transparent",
    label: "Parcel Boundary"
  });

  // Perimeter road / right-of-way
  shapes.push({
    id: id++, type: "rect",
    x1: SW, y1: SW, x2: W - SW, y2: D - SW,
    strokeColor: "#94a3b8", strokeWidth: 1,
    fillColor: "#f1f5f9",
    label: "ROW"
  });

  // Net developable area
  const devX1 = SW;
  const devY1 = SW;
  const devW = W - 2 * SW;
  const devD = D - 2 * SW;

  const lotW = devW / lot_cols;
  const lotD = devD / lot_rows;

  // Color: current = blue-ish, proposed = green-ish
  const lotFill = mode === "proposed" ? "#dcfce7" : "#dbeafe";
  const lotStroke = mode === "proposed" ? "#16a34a" : "#2563eb";

  let lotNum = 1;
  for (let row = 0; row < lot_rows; row++) {
    for (let col = 0; col < lot_cols; col++) {
      const lx1 = devX1 + col * lotW;
      const ly1 = devY1 + row * lotD;
      const lx2 = lx1 + lotW;
      const ly2 = ly1 + lotD;

      // Lot rectangle
      shapes.push({
        id: id++, type: "rect",
        x1: lx1, y1: ly1, x2: lx2, y2: ly2,
        strokeColor: lotStroke, strokeWidth: 1,
        fillColor: lotFill,
      });

      // Setback lines (inner dashed)
      shapes.push({
        id: id++, type: "rect",
        x1: lx1 + setback_side * SCALE,
        y1: ly1 + setback_front * SCALE,
        x2: lx2 - setback_side * SCALE,
        y2: ly2 - setback_rear * SCALE,
        strokeColor: "#f59e0b",
        strokeWidth: 0.5,
        fillColor: "transparent",
        dashed: true,
      });

      // Lot number text
      shapes.push({
        id: id++, type: "text",
        x: (lx1 + lx2) / 2 - 6,
        y: (ly1 + ly2) / 2 + 4,
        text: `${lotNum}`,
        strokeColor: lotStroke,
        fontSize: Math.min(lotW, lotD) * 0.18,
      });

      lotNum++;
    }
  }

  // Street centerline (horizontal)
  shapes.push({
    id: id++, type: "line",
    x1: 0, y1: SW / 2, x2: W, y2: SW / 2,
    strokeColor: "#cbd5e1", strokeWidth: 1,
  });
  shapes.push({
    id: id++, type: "line",
    x1: 0, y1: D - SW / 2, x2: W, y2: D - SW / 2,
    strokeColor: "#cbd5e1", strokeWidth: 1,
  });

  // Title block
  const totalLots = lot_rows * lot_cols;
  const actualLotSF = Math.round((devW * devD / totalLots));
  shapes.push({
    id: id++, type: "text",
    x: W + 10, y: 20,
    text: `CONCEPT PLAT MAP`,
    strokeColor: "#0f172a", fontSize: 12,
  });
  shapes.push({
    id: id++, type: "text",
    x: W + 10, y: 36,
    text: `Zoning: ${zoning_label} (${mode === "proposed" ? "PROPOSED" : "CURRENT"})`,
    strokeColor: mode === "proposed" ? "#16a34a" : "#2563eb", fontSize: 9,
  });
  shapes.push({
    id: id++, type: "text",
    x: W + 10, y: 50,
    text: `Lots: ${totalLots} | Avg Lot: ${actualLotSF.toLocaleString()} SF`,
    strokeColor: "#475569", fontSize: 8,
  });
  shapes.push({
    id: id++, type: "text",
    x: W + 10, y: 64,
    text: `Site: ${width_ft}' × ${depth_ft}' (${((width_ft * depth_ft) / 43560).toFixed(2)} ac)`,
    strokeColor: "#475569", fontSize: 8,
  });
  shapes.push({
    id: id++, type: "text",
    x: W + 10, y: 78,
    text: `Street ROW: ${street_width}'`,
    strokeColor: "#475569", fontSize: 8,
  });
  shapes.push({
    id: id++, type: "text",
    x: W + 10, y: 92,
    text: `Setbacks: F${setback_front}' R${setback_rear}' S${setback_side}'`,
    strokeColor: "#475569", fontSize: 8,
  });

  // Legend
  shapes.push({
    id: id++, type: "rect",
    x1: W + 10, y1: 110, x2: W + 22, y2: 122,
    strokeColor: lotStroke, strokeWidth: 1, fillColor: lotFill,
  });
  shapes.push({
    id: id++, type: "text",
    x: W + 26, y: 121,
    text: mode === "proposed" ? "Proposed Lots" : "Current Lots",
    strokeColor: "#475569", fontSize: 8,
  });
  shapes.push({
    id: id++, type: "rect",
    x1: W + 10, y1: 128, x2: W + 22, y2: 140,
    strokeColor: "#f59e0b", strokeWidth: 0.5, fillColor: "transparent", dashed: true,
  });
  shapes.push({
    id: id++, type: "text",
    x: W + 26, y: 139,
    text: "Setback Lines",
    strokeColor: "#475569", fontSize: 8,
  });

  return shapes;
}

// Estimate width/depth from polygon geometry using bounding box in feet
function estimateDimsFromGeometry(geometry) {
  if (!geometry || geometry.length < 3) return null;
  const lats = geometry.map(p => p[0]);
  const lngs = geometry.map(p => p[1]);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const avgLat = (minLat + maxLat) / 2;
  const heightFt = (maxLat - minLat) * 364000; // degrees lat → feet
  const widthFt = (maxLng - minLng) * 364000 * Math.cos(avgLat * Math.PI / 180);
  return { width_ft: Math.round(widthFt), depth_ft: Math.round(heightFt) };
}

export default function ConceptPlatPanel({ onGenerate }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [zoningLookupLoading, setZoningLookupLoading] = useState(false);
  const [zoningResult, setZoningResult] = useState(null); // { standards, zoningKey }
  const [zoningError, setZoningError] = useState(null);

  const [form, setForm] = useState({
    address: "",
    width_ft: 300,
    depth_ft: 400,
    current_zoning: "R-2",
    proposed_zoning: "R-4",
    street_width: 30,
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const lookupZoning = async (zoningKey, isProposed = false) => {
    setZoningLookupLoading(true);
    setZoningError(null);
    setZoningResult(null);
    // Parse city/state from address
    const parts = (form.address || "").split(",").map(s => s.trim());
    const city = parts.length >= 3 ? parts[parts.length - 3] : parts[0] || "";
    const state = parts.length >= 2 ? parts[parts.length - 2] : "";
    try {
      const res = await b44.functions.invoke("lookupZoningCode", {
        zoning_code: zoningKey,
        city,
        state,
        address: form.address,
      });
      const standards = res.data?.standards;
      if (standards) {
        setZoningResult({ standards, zoningKey });
      } else {
        setZoningError("No standards found.");
      }
    } catch (e) {
      setZoningError(e.message || "Lookup failed");
    }
    setZoningLookupLoading(false);
  };

  const applyZoningResult = () => {
    if (!zoningResult) return;
    const s = zoningResult.standards;
    // Update the ZONING_PRESETS entry in memory (can't mutate const, so we store override in form)
    setForm(f => ({
      ...f,
      _zoning_override: {
        min_lot_sf: s.min_lot_sf || f._zoning_override?.min_lot_sf,
        setback_front: s.setback_front,
        setback_rear: s.setback_rear,
        setback_side: s.setback_side,
        max_height: s.max_height_ft,
        density: s.max_density_du_per_acre,
      }
    }));
    setZoningResult(null);
  };

  const handleParcelSelected = (parcel) => {
    let dims = null;
    if (parcel.geometry) {
      dims = estimateDimsFromGeometry(parcel.geometry);
    } else if (parcel.gross_site_area_sf) {
      // fallback: assume square-ish parcel
      const side = Math.round(Math.sqrt(parcel.gross_site_area_sf));
      dims = { width_ft: side, depth_ft: side };
    }
    setForm(f => ({
      ...f,
      address: parcel.address || f.address,
      ...(dims || {}),
      ...(parcel.zoning_hint ? { current_zoning: parcel.zoning_hint } : {}),
    }));
    setShowMapPicker(false);
  };

  const applyZoningPreset = (zoningKey, isProposed = false) => {
    const preset = ZONING_PRESETS[zoningKey];
    if (!preset) return;
    if (!isProposed) {
      setForm(f => ({ ...f, current_zoning: zoningKey }));
    } else {
      setForm(f => ({ ...f, proposed_zoning: zoningKey }));
    }
  };

  const generate = async (genMode) => {
    setLoading(true);
    const zoningKey = genMode === "proposed" ? form.proposed_zoning : form.current_zoning;
    const preset = {
      ...(ZONING_PRESETS[zoningKey] || ZONING_PRESETS["R-2"]),
      ...(form._zoning_override || {}),
    };

    // Use AI to calculate optimal lot layout
    const aiResult = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a land planner. Given this parcel and zoning, calculate the optimal lot grid layout.

Parcel: ${form.width_ft}ft wide × ${form.depth_ft}ft deep
Zoning: ${zoningKey}
Min lot size: ${preset.min_lot_sf} SF
Street ROW on all sides: ${form.street_width}ft
Setbacks: Front ${preset.setback_front}ft, Rear ${preset.setback_rear}ft, Side ${preset.setback_side}ft

Net developable area: ${form.width_ft - 2 * form.street_width}ft wide × ${form.depth_ft - 2 * form.street_width}ft deep
Each lot must be at least ${preset.min_lot_sf} SF.

Return the optimal number of lot rows and columns that maximizes yield while meeting minimum lot size.
Return integers only.`,
      response_json_schema: {
        type: "object",
        properties: {
          lot_rows: { type: "integer" },
          lot_cols: { type: "integer" },
          reasoning: { type: "string" },
        },
      },
    });

    const lot_rows = aiResult.lot_rows || Math.floor((form.depth_ft - 2 * form.street_width) / Math.sqrt(preset.min_lot_sf));
    const lot_cols = aiResult.lot_cols || Math.floor((form.width_ft - 2 * form.street_width) / Math.sqrt(preset.min_lot_sf));

    const platData = {
      width_ft: Number(form.width_ft),
      depth_ft: Number(form.depth_ft),
      lot_rows: Math.max(1, lot_rows),
      lot_cols: Math.max(1, lot_cols),
      street_width: Number(form.street_width),
      setback_front: preset.setback_front,
      setback_rear: preset.setback_rear,
      setback_side: preset.setback_side,
      min_lot_sf: preset.min_lot_sf,
      zoning_label: zoningKey,
      mode: genMode,
    };

    const shapes = generatePlatShapes(platData);
    onGenerate(shapes, genMode);
    setLoading(false);
    setOpen(false);
  };

  return (
    <div className="border-b border-slate-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-slate-50 transition-colors text-left"
      >
        <Map className="h-4 w-4 text-indigo-600 flex-shrink-0" />
        <span className="text-sm font-semibold text-slate-800">Concept Plat Generator</span>
        <Badge variant="secondary" className="text-xs ml-1">AI</Badge>
        <div className="ml-auto">
          {open ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
        </div>
      </button>

      {/* Map Picker Modal */}
      {showMapPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-[700px] max-w-[95vw] h-[560px] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-indigo-600" />
                <span className="font-semibold text-sm text-slate-800">Select Parcel from Map</span>
                <span className="text-xs text-slate-400">Draw a polygon to auto-populate dimensions</span>
              </div>
              <button onClick={() => setShowMapPicker(false)} className="p-1 rounded hover:bg-slate-100 text-slate-400">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 min-h-0">
              <ParcelMapPicker onParcelSelected={handleParcelSelected} />
            </div>
          </div>
        </div>
      )}

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-slate-100 pt-3">
          {/* Import from Map */}
          <Button size="sm" variant="outline" onClick={() => setShowMapPicker(true)}
            className="w-full h-7 text-xs gap-1.5 border-indigo-200 text-indigo-700 hover:bg-indigo-50">
            <MapPin className="h-3 w-3" /> Import Dimensions from Map
          </Button>
          {form.address && (
            <p className="text-xs text-slate-500 truncate">📍 {form.address}</p>
          )}

          {/* Parcel Dimensions */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Parcel Dimensions</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Width (ft)</Label>
                <Input type="number" value={form.width_ft} onChange={e => set("width_ft", e.target.value)}
                  className="h-7 text-xs mt-0.5" min={50} />
              </div>
              <div>
                <Label className="text-xs">Depth (ft)</Label>
                <Input type="number" value={form.depth_ft} onChange={e => set("depth_ft", e.target.value)}
                  className="h-7 text-xs mt-0.5" min={50} />
              </div>
            </div>
            <div className="mt-2">
              <Label className="text-xs">Street ROW Width (ft)</Label>
              <Input type="number" value={form.street_width} onChange={e => set("street_width", e.target.value)}
                className="h-7 text-xs mt-0.5" min={10} />
            </div>
          </div>

          {/* Current Zoning */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Current Zoning</p>
            <div className="flex flex-wrap gap-1 mb-2">
              {Object.keys(ZONING_PRESETS).map(z => (
                <button key={z} type="button"
                  onClick={() => applyZoningPreset(z, false)}
                  className={`text-xs px-2 py-0.5 rounded border transition-colors ${form.current_zoning === z ? "bg-blue-600 text-white border-blue-600" : "border-slate-300 text-slate-600 hover:bg-slate-50"}`}>
                  {z}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Input value={form.current_zoning} onChange={e => set("current_zoning", e.target.value)}
                placeholder="e.g. R-2" className="h-7 text-xs flex-1" />
              <Button size="sm" onClick={() => generate("current")} disabled={loading}
                className="h-7 text-xs bg-blue-600 hover:bg-blue-700 gap-1">
                {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
                Generate
              </Button>
            </div>
          </div>

          {/* Proposed Zoning */}
          <div className="pt-2 border-t border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Proposed Zoning Change
              <span className="ml-1 text-green-600 font-normal normal-case">(generates comparison plat)</span>
            </p>
            <div className="flex flex-wrap gap-1 mb-2">
              {Object.keys(ZONING_PRESETS).map(z => (
                <button key={z} type="button"
                  onClick={() => applyZoningPreset(z, true)}
                  className={`text-xs px-2 py-0.5 rounded border transition-colors ${form.proposed_zoning === z ? "bg-green-600 text-white border-green-600" : "border-slate-300 text-slate-600 hover:bg-slate-50"}`}>
                  {z}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Input value={form.proposed_zoning} onChange={e => set("proposed_zoning", e.target.value)}
                placeholder="e.g. R-4" className="h-7 text-xs flex-1" />
              <Button size="sm" onClick={() => generate("proposed")} disabled={loading}
                className="h-7 text-xs bg-green-600 hover:bg-green-700 gap-1">
                {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                Generate
              </Button>
            </div>
          </div>

          <p className="text-xs text-slate-400">AI calculates optimal lot grid. Drawing is placed on the canvas at 1 unit = 1 ft scale.</p>
        </div>
      )}
    </div>
  );
}