import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  MousePointer2, Minus, Square, Circle, Type, Move,
  Trash2, Download, RotateCcw, RotateCw, ZoomIn, ZoomOut,
  Grid3x3, CopyPlus, Spline, Eraser, PanelRight
} from "lucide-react";
import ConceptPlatPanel from "@/components/cad/ConceptPlatPanel";
import PlatFinancialAnalysis from "@/components/cad/PlatFinancialAnalysis";

const TOOLS = {
  SELECT: "select",
  LINE: "line",
  RECT: "rect",
  CIRCLE: "circle",
  TEXT: "text",
  PAN: "pan",
  OFFSET: "offset",
  FILLET: "fillet",
  ERASE: "erase",
};

const SNAP_THRESHOLD = 8; // pixels

function snapToGrid(val, gridSize) {
  return Math.round(val / gridSize) * gridSize;
}

export default function CADDrafter() {
  const canvasRef = useRef(null);
  const [tool, setTool] = useState(TOOLS.SELECT);
  const [shapes, setShapes] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [drawing, setDrawing] = useState(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState(null);
  const [snapToGridEnabled, setSnapToGridEnabled] = useState(true);
  const [gridSize, setGridSize] = useState(20);
  const [showGrid, setShowGrid] = useState(true);
  const [strokeColor, setStrokeColor] = useState("#1e293b");
  const [fillColor, setFillColor] = useState("transparent");
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [textInput, setTextInput] = useState(null);
  const [history, setHistory] = useState([[]]);
  const [historyIdx, setHistoryIdx] = useState(0);
  const [dragging, setDragging] = useState(null);
  const [orthoEnabled, setOrthoEnabled] = useState(false);
  const [offsetDistance, setOffsetDistance] = useState(20);
  const [filletRadius, setFilletRadius] = useState(10);
  const [filletFirst, setFilletFirst] = useState(null); // id of first line for fillet
  const [showPlatPanel, setShowPlatPanel] = useState(false);
  const svgRef = useRef(null);

  const pushHistory = useCallback((newShapes) => {
    setHistory(prev => {
      const truncated = prev.slice(0, historyIdx + 1);
      return [...truncated, newShapes];
    });
    setHistoryIdx(prev => prev + 1);
    setShapes(newShapes);
  }, [historyIdx]);

  const undo = () => {
    if (historyIdx <= 0) return;
    const idx = historyIdx - 1;
    setHistoryIdx(idx);
    setShapes(history[idx]);
    setSelectedIds([]);
  };

  const redo = () => {
    if (historyIdx >= history.length - 1) return;
    const idx = historyIdx + 1;
    setHistoryIdx(idx);
    setShapes(history[idx]);
    setSelectedIds([]);
  };

  // Convert screen coords to world coords
  const toWorld = (sx, sy) => ({
    x: (sx - pan.x) / zoom,
    y: (sy - pan.y) / zoom,
  });

  const snapPt = (x, y, anchorX, anchorY) => {
    let sx = x, sy = y;
    if (snapToGridEnabled) { sx = snapToGrid(sx, gridSize); sy = snapToGrid(sy, gridSize); }
    // Ortho: lock to horizontal or vertical from anchor
    if (orthoEnabled && anchorX !== undefined && anchorY !== undefined) {
      const dx = Math.abs(sx - anchorX);
      const dy = Math.abs(sy - anchorY);
      if (dx >= dy) sy = anchorY;
      else sx = anchorX;
    }
    return { x: sx, y: sy };
  };

  const getSVGPoint = (e) => {
    const rect = svgRef.current.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    return toWorld(sx, sy);
  };

  const handleMouseDown = (e) => {
    if (e.button === 1 || (e.button === 0 && tool === TOOLS.PAN)) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }

    const raw = getSVGPoint(e);
    const pt = snapPt(raw.x, raw.y);

    if (tool === TOOLS.SELECT) {
      setSelectedIds([]);
      return;
    }

    if (tool === TOOLS.OFFSET) {
      // handled via shape click
      return;
    }

    if (tool === TOOLS.FILLET) {
      // handled via shape click
      return;
    }

    if (tool === TOOLS.TEXT) {
      setTextInput({ x: pt.x, y: pt.y, value: "" });
      return;
    }

    if (tool === TOOLS.LINE || tool === TOOLS.RECT || tool === TOOLS.CIRCLE) {
      setDrawing({ type: tool, x1: pt.x, y1: pt.y, x2: pt.x, y2: pt.y });
    }
  };

  // Offset a line or rect by offsetDistance
  const applyOffset = (shapeId) => {
    const s = shapes.find(sh => sh.id === shapeId);
    if (!s) return;
    let newShape;
    const id = Date.now();
    if (s.type === TOOLS.LINE) {
      const dx = s.x2 - s.x1, dy = s.y2 - s.y1;
      const len = Math.hypot(dx, dy);
      if (len === 0) return;
      const nx = (-dy / len) * offsetDistance;
      const ny = (dx / len) * offsetDistance;
      newShape = { ...s, id, x1: s.x1 + nx, y1: s.y1 + ny, x2: s.x2 + nx, y2: s.y2 + ny };
    } else if (s.type === TOOLS.RECT) {
      const d = offsetDistance;
      newShape = { ...s, id, x1: s.x1 - d, y1: s.y1 - d, x2: s.x2 + d, y2: s.y2 + d };
    } else return;
    pushHistory([...shapes, newShape]);
  };

  // Fillet: round the corner between two lines
  const applyFillet = (id1, id2) => {
    const l1 = shapes.find(s => s.id === id1);
    const l2 = shapes.find(s => s.id === id2);
    if (!l1 || !l2 || l1.type !== TOOLS.LINE || l2.type !== TOOLS.LINE) return;
    const r = filletRadius;
    // Find shared/closest endpoint
    const pts1 = [{ x: l1.x1, y: l1.y1 }, { x: l1.x2, y: l1.y2 }];
    const pts2 = [{ x: l2.x1, y: l2.y1 }, { x: l2.x2, y: l2.y2 }];
    let minDist = Infinity, ep1i = 0, ep2i = 0;
    pts1.forEach((p, i) => pts2.forEach((q, j) => {
      const d = Math.hypot(p.x - q.x, p.y - q.y);
      if (d < minDist) { minDist = d; ep1i = i; ep2i = j; }
    }));
    // Shorten each line by r from the shared corner
    const corner = pts1[ep1i];
    const vec1 = ep1i === 0 ? { x: l1.x2 - l1.x1, y: l1.y2 - l1.y1 } : { x: l1.x1 - l1.x2, y: l1.y1 - l1.y2 };
    const vec2 = ep2i === 0 ? { x: l2.x2 - l2.x1, y: l2.y2 - l2.y1 } : { x: l2.x1 - l2.x2, y: l2.y1 - l2.y2 };
    const len1 = Math.hypot(vec1.x, vec1.y), len2 = Math.hypot(vec2.x, vec2.y);
    if (len1 === 0 || len2 === 0) return;
    const t = Math.min(r, len1 * 0.4, len2 * 0.4);
    const p1 = { x: corner.x + (vec1.x / len1) * t, y: corner.y + (vec1.y / len1) * t };
    const p2 = { x: corner.x + (vec2.x / len2) * t, y: corner.y + (vec2.y / len2) * t };
    // Trim lines
    let nl1, nl2;
    if (ep1i === 0) nl1 = { ...l1, x1: p1.x, y1: p1.y };
    else nl1 = { ...l1, x2: p1.x, y2: p1.y };
    if (ep2i === 0) nl2 = { ...l2, x1: p2.x, y1: p2.y };
    else nl2 = { ...l2, x2: p2.x, y2: p2.y };
    // Arc from p1 to p2
    const arcId = Date.now();
    const arcShape = {
      id: arcId, type: 'arc', strokeColor: l1.strokeColor, strokeWidth: l1.strokeWidth,
      x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, corner,
    };
    pushHistory(shapes.map(s => s.id === id1 ? nl1 : s.id === id2 ? nl2 : s).concat(arcShape));
  };

  const handleMouseMove = (e) => {
    if (isPanning && panStart) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
      return;
    }

    if (dragging) {
      const raw = getSVGPoint(e);
      const pt = snapPt(raw.x, raw.y);
      const dx = pt.x - dragging.startWorld.x;
      const dy = pt.y - dragging.startWorld.y;
      setShapes(prev => prev.map(s => {
        if (!selectedIds.includes(s.id)) return s;
        return { ...s, ...translateShape(s, dragging.origShapes.find(o => o.id === s.id), dx, dy) };
      }));
      return;
    }

    if (!drawing) return;
    const raw = getSVGPoint(e);
    const pt = snapPt(raw.x, raw.y, drawing.x1, drawing.y1);
    setDrawing(prev => ({ ...prev, x2: pt.x, y2: pt.y }));
  };

  const translateShape = (shape, orig, dx, dy) => {
    if (orig.type === TOOLS.LINE) {
      return { x1: orig.x1 + dx, y1: orig.y1 + dy, x2: orig.x2 + dx, y2: orig.y2 + dy };
    }
    if (orig.type === TOOLS.RECT) {
      return { x1: orig.x1 + dx, y1: orig.y1 + dy, x2: orig.x2 + dx, y2: orig.y2 + dy };
    }
    if (orig.type === TOOLS.CIRCLE) {
      return { cx: orig.cx + dx, cy: orig.cy + dy };
    }
    if (orig.type === TOOLS.TEXT) {
      return { x: orig.x + dx, y: orig.y + dy };
    }
    return {};
  };

  const handleMouseUp = (e) => {
    if (isPanning) {
      setIsPanning(false);
      setPanStart(null);
      return;
    }

    if (dragging) {
      pushHistory([...shapes]);
      setDragging(null);
      return;
    }

    if (!drawing) return;

    const raw = getSVGPoint(e);
    const pt = snapPt(raw.x, raw.y);
    const { type, x1, y1 } = drawing;
    const x2 = pt.x, y2 = pt.y;

    // Don't add degenerate shapes
    if (Math.abs(x2 - x1) < 2 && Math.abs(y2 - y1) < 2) {
      setDrawing(null);
      return;
    }

    let newShape;
    const id = Date.now();
    const base = { id, strokeColor, strokeWidth };

    if (type === TOOLS.LINE) {
      newShape = { ...base, type, x1, y1, x2, y2 };
    } else if (type === TOOLS.RECT) {
      newShape = { ...base, type, x1: Math.min(x1, x2), y1: Math.min(y1, y2), x2: Math.max(x1, x2), y2: Math.max(y1, y2), fillColor };
    } else if (type === TOOLS.CIRCLE) {
      const cx = (x1 + x2) / 2;
      const cy = (y1 + y2) / 2;
      const rx = Math.abs(x2 - x1) / 2;
      const ry = Math.abs(y2 - y1) / 2;
      newShape = { ...base, type, cx, cy, rx, ry, fillColor };
    }

    pushHistory([...shapes, newShape]);
    setDrawing(null);
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const rect = svgRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    setZoom(prev => {
      const newZoom = Math.min(10, Math.max(0.1, prev * delta));
      setPan(p => ({
        x: mx - (mx - p.x) * (newZoom / prev),
        y: my - (my - p.y) * (newZoom / prev),
      }));
      return newZoom;
    });
  };

  const handleShapeClick = (e, id) => {
    e.stopPropagation();
    if (tool === TOOLS.SELECT) {
      setSelectedIds(prev =>
        e.shiftKey ? (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]) : [id]
      );
    } else if (tool === TOOLS.ERASE) {
      pushHistory(shapes.filter(s => s.id !== id));
    } else if (tool === TOOLS.OFFSET) {
      applyOffset(id);
    } else if (tool === TOOLS.FILLET) {
      if (!filletFirst) {
        setFilletFirst(id);
      } else {
        if (filletFirst !== id) applyFillet(filletFirst, id);
        setFilletFirst(null);
      }
    }
  };

  const handleShapeMouseDown = (e, id) => {
    if (tool !== TOOLS.SELECT) return;
    e.stopPropagation();
    if (!selectedIds.includes(id)) {
      setSelectedIds([id]);
    }
    const raw = getSVGPoint(e);
    setDragging({
      startWorld: raw,
      origShapes: shapes.map(s => ({ ...s })),
    });
  };

  const deleteSelected = () => {
    pushHistory(shapes.filter(s => !selectedIds.includes(s.id)));
    setSelectedIds([]);
  };

  const handleTextSubmit = () => {
    if (!textInput || !textInput.value.trim()) {
      setTextInput(null);
      return;
    }
    const newShape = {
      id: Date.now(),
      type: TOOLS.TEXT,
      x: textInput.x,
      y: textInput.y,
      text: textInput.value,
      strokeColor,
      fontSize: 14,
    };
    pushHistory([...shapes, newShape]);
    setTextInput(null);
  };

  const handlePlatGenerate = (platShapes, mode) => {
    // Clear canvas and load plat shapes, reset view
    pushHistory(platShapes);
    setSelectedIds([]);
    setPan({ x: 40, y: 40 });
    setZoom(0.8);
    setShowPlatPanel(false);
  };

  const exportSVG = () => {
    const svg = svgRef.current;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svg);
    const blob = new Blob([source], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "drawing.svg";
    a.click();
  };

  const exportPNG = () => {
    const svg = svgRef.current;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svg);
    const img = new Image();
    const blob = new Blob([source], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = svg.clientWidth * 2;
      canvas.height = svg.clientHeight * 2;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      const a = document.createElement("a");
      a.download = "drawing.png";
      a.href = canvas.toDataURL("image/png");
      a.click();
    };
    img.src = url;
  };

  // Draw preview shape
  const renderDrawing = () => {
    if (!drawing) return null;
    const { type, x1, y1, x2, y2 } = drawing;
    const style = { stroke: strokeColor, strokeWidth: strokeWidth / zoom, fill: fillColor === "transparent" ? "none" : fillColor, strokeDasharray: `${4 / zoom} ${4 / zoom}` };
    if (type === TOOLS.LINE) {
      return <line x1={x1} y1={y1} x2={x2} y2={y2} style={style} />;
    }
    if (type === TOOLS.RECT) {
      return <rect x={Math.min(x1, x2)} y={Math.min(y1, y2)} width={Math.abs(x2 - x1)} height={Math.abs(y2 - y1)} style={style} />;
    }
    if (type === TOOLS.CIRCLE) {
      return <ellipse cx={(x1 + x2) / 2} cy={(y1 + y2) / 2} rx={Math.abs(x2 - x1) / 2} ry={Math.abs(y2 - y1) / 2} style={style} />;
    }
    return null;
  };

  // Dimension label for drawing
  const renderDimLabel = () => {
    if (!drawing) return null;
    const { x1, y1, x2, y2 } = drawing;
    const w = Math.abs(x2 - x1).toFixed(0);
    const h = Math.abs(y2 - y1).toFixed(0);
    const label = drawing.type === TOOLS.LINE
      ? `${Math.hypot(x2 - x1, y2 - y1).toFixed(0)}`
      : `${w} × ${h}`;
    return (
      <text x={(x1 + x2) / 2} y={Math.min(y1, y2) - 6 / zoom} textAnchor="middle"
        fontSize={11 / zoom} fill="#6366f1" fontFamily="monospace"
        style={{ pointerEvents: "none", userSelect: "none" }}>
        {label}
      </text>
    );
  };

  const renderShape = (s) => {
    const isSelected = selectedIds.includes(s.id);
    const selStyle = isSelected ? { outline: "2px solid #6366f1" } : {};
    const sw = s.strokeWidth / zoom;
    const selStroke = isSelected ? "#6366f1" : s.strokeColor;
    const events = {
      onClick: (e) => handleShapeClick(e, s.id),
      onMouseDown: (e) => handleShapeMouseDown(e, s.id),
      style: { cursor: tool === TOOLS.SELECT ? "move" : "default" },
    };

    if (s.type === TOOLS.LINE) {
      return (
        <g key={s.id}>
          <line x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2}
            stroke={selStroke} strokeWidth={sw} strokeLinecap="round" {...events} />
          {isSelected && <>
            <circle cx={s.x1} cy={s.y1} r={4 / zoom} fill="#6366f1" style={{ pointerEvents: "none" }} />
            <circle cx={s.x2} cy={s.y2} r={4 / zoom} fill="#6366f1" style={{ pointerEvents: "none" }} />
          </>}
        </g>
      );
    }
    if (s.type === TOOLS.RECT) {
      return (
        <rect key={s.id} x={s.x1} y={s.y1} width={s.x2 - s.x1} height={s.y2 - s.y1}
          stroke={selStroke} strokeWidth={sw}
          fill={s.fillColor === "transparent" ? "none" : s.fillColor}
          strokeDasharray={s.dashed ? `${3 / zoom} ${3 / zoom}` : undefined}
          {...events} />
      );
    }
    if (s.type === TOOLS.CIRCLE) {
      return (
        <ellipse key={s.id} cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry}
          stroke={selStroke} strokeWidth={sw}
          fill={s.fillColor === "transparent" ? "none" : s.fillColor}
          {...events} />
      );
    }
    if (s.type === TOOLS.TEXT) {
      return (
        <text key={s.id} x={s.x} y={s.y} fill={selStroke}
          fontSize={s.fontSize / zoom} fontFamily="monospace"
          {...events}>
          {s.text}
        </text>
      );
    }
    if (s.type === 'arc') {
      // Quadratic bezier arc for fillet
      const { x1, y1, x2, y2, corner } = s;
      const d = `M ${x1} ${y1} Q ${corner.x} ${corner.y} ${x2} ${y2}`;
      return (
        <path key={s.id} d={d} stroke={selStroke} strokeWidth={s.strokeWidth / zoom} fill="none"
          strokeLinecap="round" {...events} />
      );
    }
    return null;
  };

  // Grid lines
  const renderGrid = () => {
    if (!showGrid) return null;
    const svgEl = svgRef.current;
    if (!svgEl) return null;
    const W = svgEl.clientWidth;
    const H = svgEl.clientHeight;
    const worldLeft = -pan.x / zoom;
    const worldTop = -pan.y / zoom;
    const worldRight = (W - pan.x) / zoom;
    const worldBottom = (H - pan.y) / zoom;
    const startX = Math.floor(worldLeft / gridSize) * gridSize;
    const startY = Math.floor(worldTop / gridSize) * gridSize;
    const lines = [];
    for (let x = startX; x <= worldRight; x += gridSize) {
      lines.push(<line key={`vx${x}`} x1={x} y1={worldTop} x2={x} y2={worldBottom} stroke="#e2e8f0" strokeWidth={0.5 / zoom} />);
    }
    for (let y = startY; y <= worldBottom; y += gridSize) {
      lines.push(<line key={`hy${y}`} x1={worldLeft} y1={y} x2={worldRight} y2={y} stroke="#e2e8f0" strokeWidth={0.5 / zoom} />);
    }
    return <g>{lines}</g>;
  };

  const toolButtons = [
    { id: TOOLS.SELECT, icon: MousePointer2, label: "Select (V)" },
    { id: TOOLS.PAN, icon: Move, label: "Pan (H)" },
    { id: TOOLS.LINE, icon: Minus, label: "Line (L)" },
    { id: TOOLS.RECT, icon: Square, label: "Rectangle (R)" },
    { id: TOOLS.CIRCLE, icon: Circle, label: "Ellipse (E)" },
    { id: TOOLS.TEXT, icon: Type, label: "Text (T)" },
    { id: TOOLS.OFFSET, icon: CopyPlus, label: "Offset – click a line/rect to offset it" },
    { id: TOOLS.FILLET, icon: Spline, label: "Fillet – click two lines to round their corner" },
    { id: TOOLS.ERASE, icon: Eraser, label: "Erase – click objects to delete them" },
  ];

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      if (e.key === "v") setTool(TOOLS.SELECT);
      if (e.key === "h") setTool(TOOLS.PAN);
      if (e.key === "l") setTool(TOOLS.LINE);
      if (e.key === "r") setTool(TOOLS.RECT);
      if (e.key === "e") setTool(TOOLS.CIRCLE);
      if (e.key === "t") setTool(TOOLS.TEXT);
      if ((e.key === "Delete" || e.key === "Backspace") && selectedIds.length > 0) deleteSelected();
      if (e.ctrlKey && e.key === "z") { e.preventDefault(); undo(); }
      if (e.ctrlKey && e.key === "y") { e.preventDefault(); redo(); }
      if (e.key === "F8") { e.preventDefault(); setOrthoEnabled(o => !o); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedIds, shapes, historyIdx]);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Left Toolbar */}
      <div className="w-14 bg-white border-r border-slate-200 flex flex-col items-center py-4 gap-2 z-10">
        {toolButtons.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            title={label}
            onClick={() => setTool(id)}
            className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
              tool === id
                ? "bg-slate-900 text-white shadow"
                : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <Icon className="h-4 w-4" />
          </button>
        ))}
        <div className="flex-1" />
        <button
          title="Undo (Ctrl+Z)"
          onClick={undo}
          disabled={historyIdx <= 0}
          className="w-10 h-10 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 disabled:opacity-30"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
        <button
          title="Redo (Ctrl+Y)"
          onClick={redo}
          disabled={historyIdx >= history.length - 1}
          className="w-10 h-10 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 disabled:opacity-30"
        >
          <RotateCw className="h-4 w-4" />
        </button>
        {shapes.length > 0 && (
          <button
            title="Clear all"
            onClick={() => { if (window.confirm("Erase everything on the canvas?")) { pushHistory([]); setSelectedIds([]); } }}
            className="w-10 h-10 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
        {selectedIds.length > 0 && (
          <button
            title="Delete selected (Del)"
            onClick={deleteSelected}
            className="w-10 h-10 rounded-lg flex items-center justify-center text-red-500 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Canvas + optional right panel */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="h-12 bg-white border-b border-slate-200 flex items-center px-4 gap-4">
          <span className="font-semibold text-slate-900 text-sm">CAD Drafter</span>
          <div className="flex items-center gap-1 ml-2">
            <div className="flex items-center gap-1 bg-slate-100 rounded px-2 py-1">
              <span className="text-xs text-slate-500">Stroke</span>
              <input type="color" value={strokeColor} onChange={e => setStrokeColor(e.target.value)}
                className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent" />
            </div>
            <div className="flex items-center gap-1 bg-slate-100 rounded px-2 py-1">
              <span className="text-xs text-slate-500">Fill</span>
              <input type="color"
                value={fillColor === "transparent" ? "#ffffff" : fillColor}
                onChange={e => setFillColor(e.target.value)}
                className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent" />
              <button
                onClick={() => setFillColor(fillColor === "transparent" ? "#ffffff" : "transparent")}
                className={`text-xs px-1 rounded ${fillColor === "transparent" ? "bg-slate-300 text-slate-600" : "bg-white text-slate-900 border"}`}
              >
                {fillColor === "transparent" ? "None" : "On"}
              </button>
            </div>
            <div className="flex items-center gap-1 bg-slate-100 rounded px-2 py-1">
              <span className="text-xs text-slate-500">W</span>
              <select value={strokeWidth} onChange={e => setStrokeWidth(Number(e.target.value))}
                className="text-xs bg-transparent border-0 outline-none">
                {[1, 2, 3, 4, 6, 8].map(w => <option key={w} value={w}>{w}px</option>)}
              </select>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setShowGrid(!showGrid)}
              className={`p-1.5 rounded ${showGrid ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500"}`}
              title="Toggle grid"
            >
              <Grid3x3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setSnapToGridEnabled(!snapToGridEnabled)}
              className={`text-xs px-2 py-1 rounded ${snapToGridEnabled ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500"}`}
              title="Toggle snap to grid"
            >
              Snap
            </button>
            <button
              onClick={() => setOrthoEnabled(o => !o)}
              className={`text-xs px-2 py-1 rounded font-semibold ${orthoEnabled ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"}`}
              title="Ortho mode – constrains lines to H/V (F8)"
            >
              Ortho
            </button>
            {tool === TOOLS.OFFSET && (
              <div className="flex items-center gap-1 bg-slate-100 rounded px-2 py-1">
                <span className="text-xs text-slate-500">Offset dist</span>
                <input type="number" value={offsetDistance} onChange={e => setOffsetDistance(Number(e.target.value))}
                  className="w-12 text-xs bg-transparent border-0 outline-none" min={1} />
              </div>
            )}
            {tool === TOOLS.FILLET && (
              <div className="flex items-center gap-1 bg-slate-100 rounded px-2 py-1">
                <span className="text-xs text-slate-500">Fillet R</span>
                <input type="number" value={filletRadius} onChange={e => setFilletRadius(Number(e.target.value))}
                  className="w-12 text-xs bg-transparent border-0 outline-none" min={1} />
                {filletFirst && <span className="text-xs text-indigo-600 ml-1">Select 2nd line…</span>}
              </div>
            )}
            <div className="flex items-center gap-1">
              <button onClick={() => setZoom(z => Math.max(0.1, z / 1.2))} className="p-1.5 rounded bg-slate-100 text-slate-600 hover:bg-slate-200">
                <ZoomOut className="h-3 w-3" />
              </button>
              <span className="text-xs w-10 text-center text-slate-600">{Math.round(zoom * 100)}%</span>
              <button onClick={() => setZoom(z => Math.min(10, z * 1.2))} className="p-1.5 rounded bg-slate-100 text-slate-600 hover:bg-slate-200">
                <ZoomIn className="h-3 w-3" />
              </button>
              <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
                className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-600 hover:bg-slate-200">
                Reset
              </button>
            </div>
            <div className="w-px h-5 bg-slate-200" />
            <Button size="sm" variant="outline" onClick={() => setShowPlatPanel(p => !p)}
              className={`text-xs gap-1 ${showPlatPanel ? "bg-indigo-600 text-white border-indigo-600" : ""}`}>
              <PanelRight className="h-3 w-3" /> Concept Plat
            </Button>
            <div className="w-px h-5 bg-slate-200" />
            <Button size="sm" variant="outline" onClick={exportSVG} className="text-xs gap-1">
              <Download className="h-3 w-3" /> SVG
            </Button>
            <Button size="sm" variant="outline" onClick={exportPNG} className="text-xs gap-1">
              <Download className="h-3 w-3" /> PNG
            </Button>
          </div>
        </div>

        {/* SVG Canvas */}
        <div className="flex-1 overflow-hidden relative"
          style={{ cursor: tool === TOOLS.PAN || isPanning ? "grab" : tool === TOOLS.SELECT ? "default" : "crosshair" }}>
          <svg
            ref={svgRef}
            width="100%" height="100%"
            style={{ display: "block", background: "#f8fafc" }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={() => { setIsPanning(false); if (drawing) setDrawing(null); }}
            onWheel={handleWheel}
          >
            <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
              {renderGrid()}
              {shapes.map(renderShape)}
              {renderDrawing()}
              {renderDimLabel()}
            </g>
          </svg>

          {/* Text input overlay */}
          {textInput && (() => {
            const sx = textInput.x * zoom + pan.x;
            const sy = textInput.y * zoom + pan.y;
            return (
              <input
                autoFocus
                value={textInput.value}
                onChange={e => setTextInput(t => ({ ...t, value: e.target.value }))}
                onKeyDown={e => { if (e.key === "Enter") handleTextSubmit(); if (e.key === "Escape") setTextInput(null); }}
                onBlur={handleTextSubmit}
                style={{
                  position: "absolute", left: sx, top: sy,
                  fontSize: 14 * zoom, fontFamily: "monospace",
                  color: strokeColor, background: "rgba(255,255,255,0.85)",
                  border: "1px dashed #6366f1", outline: "none", padding: "2px 4px",
                  minWidth: 80, zIndex: 20,
                }}
              />
            );
          })()}

          {/* Status bar */}
          <div className="absolute bottom-2 left-2 flex items-center gap-3 text-xs text-slate-400 bg-white/80 px-2 py-1 rounded border border-slate-200">
            <span>{shapes.length} object{shapes.length !== 1 ? "s" : ""}</span>
            {selectedIds.length > 0 && <span className="text-indigo-600">{selectedIds.length} selected</span>}
            <span className="capitalize">{tool}</span>
          </div>
        </div>
      </div>
      {/* Right panel – Concept Plat */}
      {showPlatPanel && (
        <div className="w-72 flex-shrink-0 border-l border-slate-200 bg-white overflow-y-auto">
          <ConceptPlatPanel onGenerate={handlePlatGenerate} />
        </div>
      )}
    </div>
  );
}