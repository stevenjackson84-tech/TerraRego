import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin, Search, Pencil, Square, RotateCcw, CheckCircle2, Loader2 } from "lucide-react";

// Dynamically import Leaflet to avoid SSR issues
let L;
let leafletLoaded = false;

async function ensureLeaflet() {
  if (leafletLoaded) return;
  L = (await import("leaflet")).default;
  await import("leaflet/dist/leaflet.css");
  // Fix default icon paths
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  });
  leafletLoaded = true;
}

// Calculate polygon area in sq ft from latlng array
function calcAreaSF(latlngs) {
  if (!latlngs || latlngs.length < 3) return 0;
  // Shoelace formula on projected coords (approx meters, then convert)
  let area = 0;
  const pts = latlngs.map(ll => {
    const lat = (ll.lat || ll[0]) * Math.PI / 180;
    const lng = (ll.lng || ll[1]) * Math.PI / 180;
    return { x: lng * 6378137 * Math.cos(lat), y: lat * 6378137 };
  });
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    area += pts[i].x * pts[j].y;
    area -= pts[j].x * pts[i].y;
  }
  const sqMeters = Math.abs(area / 2);
  return sqMeters * 10.7639; // sq meters → sq ft
}

async function reverseGeocode(lat, lng) {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`;
  const res = await fetch(url, { headers: { "Accept-Language": "en" } });
  const data = await res.json();
  const addr = data.address || {};
  const parts = [
    addr.house_number, addr.road,
    addr.city || addr.town || addr.village || addr.county,
    addr.state, addr.postcode
  ].filter(Boolean);
  return { address: parts.join(", "), raw: data };
}

async function searchAddress(query) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&countrycodes=us`;
  const res = await fetch(url, { headers: { "Accept-Language": "en" } });
  return await res.json();
}

// Try to get zoning info from a public ArcGIS endpoint (best-effort)
async function lookupZoning(lat, lng) {
  // We'll use Nominatim tags as best-effort zoning hint
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=16`;
  const res = await fetch(url, { headers: { "Accept-Language": "en" } });
  const data = await res.json();
  const tags = data.extratags || {};
  return tags.zoning || tags["landuse"] || tags["building"] || null;
}

export default function ParcelMapPicker({ onParcelSelected }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const drawnLayersRef = useRef(null);
  const markerRef = useRef(null);
  const polyRef = useRef(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [mode, setMode] = useState("idle"); // idle | draw | searching | loading
  const [status, setStatus] = useState(null); // { type: 'info'|'success'|'error', msg }
  const [drawnAreaSF, setDrawnAreaSF] = useState(null);
  const [drawingActive, setDrawingActive] = useState(false);
  const drawHandlerRef = useRef(null);

  useEffect(() => {
    let mounted = true;

    ensureLeaflet().then(() => {
      if (!mounted || !mapRef.current || mapInstanceRef.current) return;

      const map = L.map(mapRef.current, {
        center: [40.2338, -111.6585], // Utah Valley default
        zoom: 13,
        zoomControl: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);

      // Also add satellite layer option
      const satellite = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        { attribution: "© Esri", maxZoom: 19 }
      );

      const baseMaps = {
        "Street": L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap", maxZoom: 19 }),
        "Satellite": satellite,
      };
      L.control.layers(baseMaps).addTo(map);

      drawnLayersRef.current = L.featureGroup().addTo(map);

      // Click on map = single point reverse geocode
      map.on("click", async (e) => {
        if (drawingActive) return;
        const { lat, lng } = e.latlng;
        setMode("loading");
        setStatus({ type: "info", msg: "Looking up parcel data..." });

        // Place marker
        if (markerRef.current) markerRef.current.remove();
        markerRef.current = L.marker([lat, lng]).addTo(map);

        const geo = await reverseGeocode(lat, lng);
        const zoning = await lookupZoning(lat, lng);
        setMode("idle");
        setStatus({ type: "success", msg: "Address found — review and continue" });

        onParcelSelected({
          address: geo.address,
          latitude: lat,
          longitude: lng,
          zoning_hint: zoning,
          gross_site_area_acres: null, // no area from single click
          gross_site_area_sf: null,
        });
      });

      mapInstanceRef.current = map;
    });

    return () => {
      mounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Polygon drawing with Leaflet's built-in tools
  const startDrawPolygon = () => {
    if (!mapInstanceRef.current || !L) return;
    const map = mapInstanceRef.current;

    // Clear previous
    if (polyRef.current) { polyRef.current.remove(); polyRef.current = null; }
    if (markerRef.current) { markerRef.current.remove(); markerRef.current = null; }

    setDrawingActive(true);
    setMode("draw");
    setStatus({ type: "info", msg: "Click points on the map to draw your parcel. Double-click to finish." });

    let points = [];
    let tempLines = [];
    let tempMarkers = [];
    let tempPoly = null;

    const onClick = (e) => {
      points.push(e.latlng);
      const m = L.circleMarker([e.latlng.lat, e.latlng.lng], { radius: 5, color: "#1e40af", fillColor: "#3b82f6", fillOpacity: 1 }).addTo(map);
      tempMarkers.push(m);

      if (points.length > 1) {
        if (tempPoly) tempPoly.remove();
        tempPoly = L.polygon(points, { color: "#1e40af", fillColor: "#3b82f6", fillOpacity: 0.2, weight: 2 }).addTo(map);
      }
    };

    const onDblClick = async (e) => {
      // Remove last point added by click (dblclick fires click+dblclick)
      map.off("click", onClick);
      map.off("dblclick", onDblClick);
      setDrawingActive(false);
      map.doubleClickZoom.enable();

      tempMarkers.forEach(m => m.remove());
      if (tempPoly) tempPoly.remove();

      if (points.length < 3) {
        setMode("idle");
        setStatus({ type: "error", msg: "Need at least 3 points to form a polygon." });
        return;
      }

      // Draw final polygon
      const finalPoly = L.polygon(points, { color: "#16a34a", fillColor: "#22c55e", fillOpacity: 0.25, weight: 2 });
      drawnLayersRef.current.clearLayers();
      finalPoly.addTo(drawnLayersRef.current);
      polyRef.current = finalPoly;
      map.fitBounds(finalPoly.getBounds(), { padding: [30, 30] });

      const areaSF = calcAreaSF(points);
      const acreage = areaSF / 43560;
      setDrawnAreaSF(areaSF);

      // Centroid for reverse geocode
      const bounds = finalPoly.getBounds();
      const center = bounds.getCenter();

      setMode("loading");
      setStatus({ type: "info", msg: "Calculating area & looking up address..." });

      const geo = await reverseGeocode(center.lat, center.lng);
      const zoning = await lookupZoning(center.lat, center.lng);

      setMode("idle");
      setStatus({ type: "success", msg: `Parcel drawn: ${acreage.toFixed(2)} acres (${Math.round(areaSF).toLocaleString()} SF)` });

      onParcelSelected({
        address: geo.address,
        latitude: center.lat,
        longitude: center.lng,
        gross_site_area_sf: Math.round(areaSF),
        gross_site_area_acres: parseFloat(acreage.toFixed(4)),
        zoning_hint: zoning,
        geometry: points.map(p => [p.lat, p.lng]),
      });
    };

    map.doubleClickZoom.disable();
    map.on("click", onClick);
    map.on("dblclick", onDblClick);
  };

  const cancelDraw = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.off("click");
    map.off("dblclick");
    map.doubleClickZoom.enable();
    drawnLayersRef.current?.clearLayers();
    setDrawingActive(false);
    setMode("idle");
    setStatus(null);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setMode("searching");
    setStatus({ type: "info", msg: "Searching..." });
    const results = await searchAddress(searchQuery);
    setSearchResults(results);
    setMode("idle");
    if (results.length === 0) setStatus({ type: "error", msg: "No results found." });
    else setStatus(null);
  };

  const selectSearchResult = async (result) => {
    setSearchResults([]);
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    const map = mapInstanceRef.current;
    if (map) {
      map.setView([lat, lng], 17);
      if (markerRef.current) markerRef.current.remove();
      markerRef.current = L.marker([lat, lng]).addTo(map);
    }

    setMode("loading");
    setStatus({ type: "info", msg: "Fetching parcel data..." });

    const zoning = await lookupZoning(lat, lng);
    setMode("idle");
    setStatus({ type: "success", msg: "Location found — draw a polygon or click to confirm" });

    // Try to get bounding box area if available
    let areaSF = null, acreage = null;
    if (result.boundingbox) {
      const [s, n, w, e] = result.boundingbox.map(Number);
      const corners = [[s, w], [n, w], [n, e], [s, e]];
      areaSF = calcAreaSF(corners.map(([lat, lng]) => ({ lat, lng })));
      acreage = parseFloat((areaSF / 43560).toFixed(4));
      if (areaSF > 0 && map) {
        drawnLayersRef.current?.clearLayers();
        const poly = L.rectangle([[s, w], [n, e]], { color: "#16a34a", fillColor: "#22c55e", fillOpacity: 0.2, weight: 2 });
        poly.addTo(drawnLayersRef.current);
        polyRef.current = poly;
        map.fitBounds([[s, w], [n, e]], { padding: [20, 20] });
      }
    }

    onParcelSelected({
      address: result.display_name,
      latitude: lat,
      longitude: lng,
      gross_site_area_sf: areaSF ? Math.round(areaSF) : null,
      gross_site_area_acres: acreage,
      zoning_hint: zoning,
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search bar */}
      <div className="p-3 border-b border-slate-200 bg-white space-y-2">
        <div className="flex gap-2">
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSearch()}
            placeholder="Search address or parcel..."
            className="h-8 text-sm flex-1"
          />
          <Button size="sm" variant="outline" onClick={handleSearch} disabled={mode === "searching"} className="h-8 px-3">
            {mode === "searching" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
          </Button>
        </div>

        {/* Search results dropdown */}
        {searchResults.length > 0 && (
          <div className="border border-slate-200 rounded-lg overflow-hidden shadow-md bg-white z-50 relative">
            {searchResults.map((r, i) => (
              <button
                key={i}
                onClick={() => selectSearchResult(r)}
                className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 border-b border-slate-100 last:border-0 truncate"
              >
                {r.display_name}
              </button>
            ))}
          </div>
        )}

        {/* Draw controls */}
        <div className="flex items-center gap-2">
          {!drawingActive ? (
            <Button size="sm" variant="outline" onClick={startDrawPolygon} className="h-7 text-xs gap-1.5">
              <Pencil className="h-3 w-3" /> Draw Parcel Boundary
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={cancelDraw} className="h-7 text-xs gap-1.5 border-red-200 text-red-600 hover:bg-red-50">
              <RotateCcw className="h-3 w-3" /> Cancel Drawing
            </Button>
          )}
          <span className="text-xs text-slate-400">or click map to pin location</span>
        </div>

        {/* Status */}
        {status && (
          <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded ${
            status.type === "success" ? "text-green-700 bg-green-50" :
            status.type === "error" ? "text-red-600 bg-red-50" :
            "text-blue-700 bg-blue-50"
          }`}>
            {mode === "loading" ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
            {status.msg}
          </div>
        )}
      </div>

      {/* Map */}
      <div ref={mapRef} className="flex-1 min-h-0" style={{ cursor: drawingActive ? "crosshair" : "default" }} />
    </div>
  );
}