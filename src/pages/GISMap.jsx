import { useState, useEffect, useRef, useCallback } from "react";
import { MapContainer, TileLayer, WMSTileLayer, Marker, Popup, useMapEvents, GeoJSON, useMap, Tooltip, ImageOverlay } from "react-leaflet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, MapPin, Layers, X, Info, Building2, FileText, Upload, Trash2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import JSZip from "jszip";
import { kml } from "@tmcw/togeojson";
import SendToClickUp from "@/components/clickup/SendToClickUp";

// Fix default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Stage colors (hex for SVG icons)
const stageColors = {
  prospecting:         "#6366f1", // indigo
  loi:                 "#f59e0b", // amber
  controlled_not_approved: "#f97316", // orange
  controlled_approved: "#10b981", // emerald
  owned:               "#059669", // green
  entitlements:        "#3b82f6", // blue
  development:         "#8b5cf6", // violet
  closed:              "#64748b", // slate
  dead:                "#ef4444", // red
};

const stageLabels = {
  prospecting: "Prospecting",
  loi: "LOI",
  controlled_not_approved: "Controlled (Not Approved)",
  controlled_approved: "Controlled (Approved)",
  owned: "Owned",
  entitlements: "Entitlements",
  development: "Development",
  closed: "Closed",
  dead: "Dead",
};

function createPDFIcon() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="36" viewBox="0 0 32 36">
      <rect x="2" y="0" width="28" height="34" rx="4" fill="#ef4444" stroke="white" stroke-width="1.5"/>
      <rect x="2" y="0" width="28" height="14" rx="4" fill="#dc2626"/>
      <text x="16" y="10" font-family="Arial,sans-serif" font-size="7" font-weight="bold" fill="white" text-anchor="middle">PDF</text>
      <text x="16" y="24" font-family="Arial,sans-serif" font-size="6" fill="white" text-anchor="middle">PLAN</text>
    </svg>`;
  return L.divIcon({
    html: svg,
    iconSize: [32, 36],
    iconAnchor: [16, 36],
    popupAnchor: [0, -38],
    className: "",
  });
}

function createColoredIcon(color) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="40" viewBox="0 0 28 40">
      <path d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 26 14 26S28 24.5 28 14C28 6.268 21.732 0 14 0z" fill="${color}" stroke="white" stroke-width="2"/>
      <circle cx="14" cy="14" r="6" fill="white" opacity="0.9"/>
    </svg>`;
  return L.divIcon({
    html: svg,
    iconSize: [28, 40],
    iconAnchor: [14, 40],
    popupAnchor: [0, -42],
    className: "",
  });
}

function ClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng);
    },
  });
  return null;
}

// Fetches a grid of USGS elevation points and computes slopes >30%
async function computeSteepSlopes(bounds) {
  const { _southWest: sw, _northEast: ne } = bounds;
  const GRID = 30; // 30x30 grid of elevation samples
  const latStep = (ne.lat - sw.lat) / GRID;
  const lngStep = (ne.lng - sw.lng) / GRID;

  // Build batch request to USGS Elevation Point Query Service
  const points = [];
  for (let i = 0; i <= GRID; i++) {
    for (let j = 0; j <= GRID; j++) {
      points.push({ lat: sw.lat + i * latStep, lng: sw.lng + j * lngStep });
    }
  }

  // Fetch elevation for all points using USGS 3DEP
  const elevGrid = Array.from({ length: GRID + 1 }, () => new Array(GRID + 1).fill(null));
  const batchSize = 50;
  for (let b = 0; b < points.length; b += batchSize) {
    const batch = points.slice(b, b + batchSize);
    const fetches = batch.map(({ lat, lng }) =>
      fetch(`https://epqs.nationalmap.gov/v1/json?x=${lng}&y=${lat}&wkid=4326&includeDate=false`)
        .then(r => r.json())
        .then(d => d?.value ?? null)
        .catch(() => null)
    );
    const results = await Promise.all(fetches);
    results.forEach((elev, idx) => {
      const ptIdx = b + idx;
      const row = Math.floor(ptIdx / (GRID + 1));
      const col = ptIdx % (GRID + 1);
      elevGrid[row][col] = elev;
    });
  }

  // Compute slope for each cell (degrees to %)
  // Horizontal distance between grid points in meters
  const latMeters = latStep * 111320;
  const lngMeters = lngStep * 111320 * Math.cos(((sw.lat + ne.lat) / 2) * Math.PI / 180);

  const steepPolygons = [];
  for (let i = 0; i < GRID; i++) {
    for (let j = 0; j < GRID; j++) {
      const e00 = elevGrid[i][j];
      const e10 = elevGrid[i + 1][j];
      const e01 = elevGrid[i][j + 1];
      const e11 = elevGrid[i + 1][j + 1];
      if (e00 === null || e10 === null || e01 === null || e11 === null) continue;

      const dLat = ((e10 - e00) + (e11 - e01)) / (2 * latMeters);
      const dLng = ((e01 - e00) + (e11 - e10)) / (2 * lngMeters);
      const slopePct = Math.sqrt(dLat * dLat + dLng * dLng) * 100;

      if (slopePct > 30) {
        const cellSw = { lat: sw.lat + i * latStep, lng: sw.lng + j * lngStep };
        steepPolygons.push({
          type: "Feature",
          properties: { slope: slopePct.toFixed(1) },
          geometry: {
            type: "Polygon",
            coordinates: [[
              [cellSw.lng,            cellSw.lat],
              [cellSw.lng + lngStep,  cellSw.lat],
              [cellSw.lng + lngStep,  cellSw.lat + latStep],
              [cellSw.lng,            cellSw.lat + latStep],
              [cellSw.lng,            cellSw.lat],
            ]],
          },
        });
      }
    }
  }

  return { type: "FeatureCollection", features: steepPolygons };
}

function SlopeBoundsLoader({ showSteepSlopes, onBoundsChange }) {
  const map = useMap();
  useMapEvents({
    moveend() { if (showSteepSlopes) onBoundsChange(map.getBounds()); },
    zoomend() { if (showSteepSlopes) onBoundsChange(map.getBounds()); },
  });
  useEffect(() => {
    if (showSteepSlopes) onBoundsChange(map.getBounds());
  }, [showSteepSlopes]);
  return null;
}

function ParcelBoundsLoader({ showParcels, onBoundsChange }) {
  const map = useMap();
  useMapEvents({
    moveend() {
      if (showParcels && map.getZoom() >= 13) {
        onBoundsChange(map.getBounds());
      }
    },
    zoomend() {
      if (showParcels && map.getZoom() >= 13) {
        onBoundsChange(map.getBounds());
      }
    },
  });

  useEffect(() => {
    if (showParcels) {
      onBoundsChange(map.getBounds());
    }
  }, [showParcels]);

  return null;
}

async function geocodeAddress(address, city, state) {
  const query = [address, city, state].filter(Boolean).join(", ");
  if (!query.trim()) return null;
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
      { headers: { "Accept": "application/json" } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data && data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
  } catch (e) {
    console.warn("Geocoding failed for:", query, e.message);
  }
  return null;
}

export default function GISMap() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [parcelInfo, setParcelInfo] = useState(null);
  const [mapCenter] = useState([40.3916, -111.8507]);
  const [clickedLocation, setClickedLocation] = useState(null);
  const [tileLayer, setTileLayer] = useState("street");
  const [showParcels, setShowParcels] = useState(true);
  const [showDeals, setShowDeals] = useState(true);
  const [showSensitiveLands, setShowSensitiveLands] = useState(false);
  const [showFloodZones, setShowFloodZones] = useState(false);
  const [showFaultLines, setShowFaultLines] = useState(false);
  const [showPlanDocs, setShowPlanDocs] = useState(true);
  const [showWUI, setShowWUI] = useState(false);
  const [wuiData, setWuiData] = useState(null);
  const [wuiLoading, setWuiLoading] = useState(false);
  const [parcelData, setParcelData] = useState(null);
  const [parcelLoading, setParcelLoading] = useState(false);
  const [dealLocations, setDealLocations] = useState([]);
  const [activePdfDoc, setActivePdfDoc] = useState(null);
  const [showSteepSlopes, setShowSteepSlopes] = useState(false);
  const [slopeData, setSlopeData] = useState(null);
  const [slopeLoading, setSlopeLoading] = useState(false);
  const [kmzLayers, setKmzLayers] = useState([]);
  const [showImageOverlays, setShowImageOverlays] = useState(() => {
    const stored = localStorage.getItem("gis_show_image_overlays");
    return stored ? JSON.parse(stored) : true;
  });
  const [pendingKmzFile, setPendingKmzFile] = useState(null);
  const [kmzCategoryDialog, setKmzCategoryDialog] = useState(false);
  const [selectedKmzCategory, setSelectedKmzCategory] = useState("custom");
  const [kmzGroupVisibility, setKmzGroupVisibility] = useState({});
  const kmzInputRef = useRef(null);

  const kmzCategories = [
    { value: "custom", label: "Custom Layer" },
    { value: "parcels", label: "Parcels" },
    { value: "deals", label: "Deals" },
    { value: "sensitive_lands", label: "Sensitive Lands" },
    { value: "flood_zones", label: "Flood Zones" },
    { value: "fault_lines", label: "Fault Lines" },
    { value: "steep_slopes", label: "Slopes >30%" },
    { value: "wui", label: "WUI Zone" },
  ];

  const { data: deals = [] } = useQuery({
    queryKey: ["deals"],
    queryFn: () => base44.entities.Deal.list(),
  });

  // Fetch plan PDFs linked to deals
  const { data: planDocs = [] } = useQuery({
    queryKey: ["plan-documents"],
    queryFn: () => base44.entities.Document.filter({ category: "plan", entity_type: "deal" }),
  });

  // Map of Utah county name → UGRC AGRC FeatureServer service name
  const UTAH_COUNTY_SERVICES = {
    "Beaver": "Parcels_Beaver_LIR",
    "Box Elder": "Parcels_BoxElder_LIR",
    "Cache": "Parcels_Cache_LIR",
    "Carbon": "Parcels_Carbon_LIR",
    "Daggett": "Parcels_Daggett_LIR",
    "Davis": "Parcels_Davis_LIR",
    "Duchesne": "Parcels_Duchesne_LIR",
    "Emery": "Parcels_Emery_LIR",
    "Garfield": "Parcels_Garfield_LIR",
    "Grand": "Parcels_Grand_LIR",
    "Iron": "Parcels_Iron_LIR",
    "Juab": "Parcels_Juab_LIR",
    "Kane": "Parcels_Kane_LIR",
    "Millard": "Parcels_Millard_LIR",
    "Morgan": "Parcels_Morgan_LIR",
    "Piute": "Parcels_Piute_LIR",
    "Rich": "Parcels_Rich_LIR",
    "Salt Lake": "Parcels_SaltLake_LIR",
    "San Juan": "Parcels_SanJuan_LIR",
    "Sanpete": "Parcels_Sanpete_LIR",
    "Sevier": "Parcels_Sevier_LIR",
    "Summit": "Parcels_Summit_LIR",
    "Tooele": "Parcels_Tooele_LIR",
    "Uintah": "Parcels_Uintah_LIR",
    "Utah": "Parcels_Utah_LIR",
    "Wasatch": "Parcels_Wasatch_LIR",
    "Washington": "Parcels_Washington_LIR",
    "Wayne": "Parcels_Wayne_LIR",
    "Weber": "Parcels_Weber_LIR",
  };

  // Reverse-geocode center lat/lng to find which Utah county we're in, then fetch that county's parcels
  const fetchParcelsForBounds = async (bounds) => {
    if (!bounds) return;
    setParcelLoading(true);
    const { _southWest: sw, _northEast: ne } = bounds;
    const centerLat = (sw.lat + ne.lat) / 2;
    const centerLng = (sw.lng + ne.lng) / 2;
    const bbox = `${sw.lng},${sw.lat},${ne.lng},${ne.lat}`;

    try {
      // Detect which Utah county the center falls in via Nominatim reverse geocode
      let serviceName = "Parcels_SaltLake_LIR"; // fallback
      try {
        const revRes = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${centerLat}&lon=${centerLng}`,
          { headers: { "Accept": "application/json" } }
        );
        const revData = await revRes.json();
        const county = revData?.address?.county?.replace(" County", "");
        if (county && UTAH_COUNTY_SERVICES[county]) {
          serviceName = UTAH_COUNTY_SERVICES[county];
        }
      } catch (e) {
        // use fallback
      }

      const url = `https://services1.arcgis.com/99lidPhWCzftIe9K/arcgis/rest/services/${serviceName}/FeatureServer/0/query?where=1%3D1&outFields=PARCEL_ID,PARCEL_ADD,COUNTY_NAME,TOTAL_MKT_VALUE,PROP_CLASS,PARCEL_ACRES&outSR=4326&f=geojson&resultRecordCount=300&geometry=${bbox}&geometryType=esriGeometryEnvelope&spatialRel=esriSpatialRelIntersects&inSR=4326`;
      const res = await fetch(url);
      const data = await res.json();
      if (data && data.features) {
        setParcelData(data);
      }
    } finally {
      setParcelLoading(false);
    }
  };

  // Parse a KMZ (or KML) file and add it as a GeoJSON layer + image overlays
  const handleKmzUpload = useCallback(async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = "";
    setPendingKmzFile(file);
    setKmzCategoryDialog(true);
  }, []);

  const confirmKmzUpload = useCallback(async () => {
    if (!pendingKmzFile) return;
    
    const file = pendingKmzFile;
    const name = file.name.replace(/\.(kmz|kml)$/i, "");
    let kmlText;
    let zip = null;

    if (file.name.toLowerCase().endsWith(".kmz")) {
      zip = await JSZip.loadAsync(file);
      const kmlFile = Object.values(zip.files).find(f => f.name.toLowerCase().endsWith(".kml"));
      if (!kmlFile) return alert("No KML found inside KMZ.");
      kmlText = await kmlFile.async("text");
    } else {
      kmlText = await file.text();
    }

    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(kmlText, "text/xml");
    const geojson = kml(xmlDoc);

    // Extract GroundOverlay image overlays
    const imageOverlays = [];
    const groundOverlays = xmlDoc.getElementsByTagName("GroundOverlay");
    for (let i = 0; i < groundOverlays.length; i++) {
      const overlay = groundOverlays[i];
      const overlayName = overlay.getElementsByTagName("name")[0]?.textContent || `Overlay ${i + 1}`;
      const href = overlay.getElementsByTagName("href")[0]?.textContent?.trim();
      const latLonBox = overlay.getElementsByTagName("LatLonBox")[0];
      if (!href || !latLonBox) continue;

      const north = parseFloat(latLonBox.getElementsByTagName("north")[0]?.textContent);
      const south = parseFloat(latLonBox.getElementsByTagName("south")[0]?.textContent);
      const east = parseFloat(latLonBox.getElementsByTagName("east")[0]?.textContent);
      const west = parseFloat(latLonBox.getElementsByTagName("west")[0]?.textContent);
      const rotation = parseFloat(latLonBox.getElementsByTagName("rotation")[0]?.textContent || "0");

      if (isNaN(north) || isNaN(south) || isNaN(east) || isNaN(west)) continue;

      // Get image URL: either from zip or external
      let imageUrl = href;
      if (zip) {
        // href may be a relative path inside the KMZ
        const imgEntry = zip.files[href] || Object.values(zip.files).find(f => f.name.endsWith(href) || f.name === href);
        if (imgEntry) {
          const blob = await imgEntry.async("blob");
          imageUrl = URL.createObjectURL(blob);
        }
      }

      imageOverlays.push({
        imageUrl,
        bounds: [[south, west], [north, east]],
        overlayName,
        rotation,
      });
    }

    const newLayer = { name, geojson, imageOverlays, id: Date.now(), category: selectedKmzCategory, opacity: 0.8 };
    setKmzLayers(prev => [...prev, newLayer]);
    setShowImageOverlays(true);
    setKmzCategoryDialog(false);
    setPendingKmzFile(null);
    setSelectedKmzCategory("custom");
    // Auto-show category group
    setKmzGroupVisibility(prev => ({ ...prev, [selectedKmzCategory]: true }));
  }, [pendingKmzFile, selectedKmzCategory]);

  // Slope analysis: fetch elevation grid and compute >30% slopes
  const fetchSlopeData = async (bounds) => {
    if (!bounds) return;
    setSlopeLoading(true);
    setSlopeData(null);
    const data = await computeSteepSlopes(bounds);
    setSlopeData(data);
    setSlopeLoading(false);
  };

  // Load WUI GeoJSON data when toggled on
  useEffect(() => {
    if (!showWUI || wuiData) return;
    setWuiLoading(true);
    // Fetch Utah High Risk WUI from the SGID FeatureServer as GeoJSON
    const url = "https://services.arcgis.com/ZzrwjTRez6FJiOq4/arcgis/rest/services/Utah_High_Risk_WUI_Properties/FeatureServer/1/query?where=1%3D1&outFields=*&outSR=4326&f=geojson&resultRecordCount=2000";
    fetch(url)
      .then(r => r.json())
      .then(data => { setWuiData(data); setWuiLoading(false); })
      .catch(() => setWuiLoading(false));
  }, [showWUI, wuiData]);

  // Geocode deals that have addresses (use stored lat/lng if available)
  useEffect(() => {
    if (!deals.length) return;

    let cancelled = false;
    const geocodeAll = async () => {
      const results = [];
      for (const deal of deals) {
        if (cancelled) break;
        // Use stored coordinates first
        if (deal.latitude && deal.longitude) {
          results.push({ deal, coords: { lat: deal.latitude, lng: deal.longitude } });
        } else if (deal.address || deal.city) {
          const coords = await geocodeAddress(deal.address, deal.city, deal.state);
          if (coords) results.push({ deal, coords });
          await new Promise(r => setTimeout(r, 300));
        }
      }
      if (!cancelled) setDealLocations(results);
    };
    geocodeAll();
    return () => { cancelled = true; };
  }, [deals]);

  const tileLayers = {
    street: {
      url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
      label: "Light"
    },
    satellite: {
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      attribution: "Tiles &copy; Esri",
      label: "Satellite"
    },
    topo: {
      url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
      attribution: '&copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
      label: "Topo"
    }
  };

  const handleMapClick = async (latlng) => {
    setClickedLocation(latlng);
    setParcelInfo(null);
    setIsAnalyzing(true);
    try {
      // If parcels layer is on, try to get real ownership data from Utah County GIS first
      let parcelOwnerData = null;
      if (showParcels) {
        try {
          // Convert lat/lng to Web Mercator (EPSG:3857) for the identify request
          const x = latlng.lng * 20037508.34 / 180;
          const yRad = latlng.lat * Math.PI / 180;
          const y = Math.log(Math.tan(yRad / 2 + Math.PI / 4)) * (20037508.34 / Math.PI);
          const tolerance = 20;
          const identifyUrl = `https://maps.utahcounty.gov/arcgis/rest/services/Parcels/Parcel_Serial_Name_Address/MapServer/identify?geometry=${x},${y}&geometryType=esriGeometryPoint&sr=3857&layers=all&tolerance=${tolerance}&mapExtent=${x-500},${y-500},${x+500},${y+500}&imageDisplay=800,600,96&returnGeometry=false&f=json`;
          const res = await fetch(identifyUrl);
          const data = await res.json();
          if (data.results && data.results.length > 0) {
            const attrs = data.results[0].attributes;
            parcelOwnerData = attrs;
          }
        } catch (e) {
          console.warn("Utah County parcel identify failed:", e);
        }
      }

      const ownerContext = parcelOwnerData
        ? `Real parcel data from Utah County GIS: ${JSON.stringify(parcelOwnerData)}. Use this real data where available.`
        : "";

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a real estate GIS analyst. A user clicked on coordinates lat: ${latlng.lat.toFixed(5)}, lng: ${latlng.lng.toFixed(5)}.

${ownerContext}

Generate a land parcel analysis for this location. Include:
- Estimated parcel size (acres)
- Estimated zoning type
- Land use category
- Estimated land value per acre
- Development potential rating (Low/Medium/High)
- Key observations about this location for land acquisition
- Nearby infrastructure notes
- Any notable risks or opportunities
- Owner name if available from real data

Be specific and realistic based on the geographic coordinates provided.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            parcel_size_acres: { type: "number" },
            zoning: { type: "string" },
            land_use: { type: "string" },
            estimated_value_per_acre: { type: "number" },
            development_potential: { type: "string" },
            observations: { type: "string" },
            infrastructure: { type: "string" },
            risks: { type: "string" },
            opportunities: { type: "string" },
            owner_name: { type: "string" },
            parcel_id: { type: "string" }
          }
        }
        });
        setParcelInfo({ ...result, _rawParcel: parcelOwnerData });
        } finally {
        setIsAnalyzing(false);
        }
        };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsAnalyzing(true);
    setParcelInfo(null);
    setClickedLocation(null);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`,
        { headers: { "Accept": "application/json" } }
      );
      const data = await response.json();
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        const latlng = { lat: parseFloat(lat), lng: parseFloat(lon) };
        setClickedLocation(latlng);
        const result = await base44.integrations.Core.InvokeLLM({
          prompt: `You are a real estate GIS analyst. Analyze this land parcel location: "${searchQuery}" at coordinates lat: ${lat}, lng: ${lon}.

Generate a realistic land parcel analysis. Include:
- Estimated parcel size (acres)
- Estimated zoning type
- Land use category
- Estimated land value per acre
- Development potential rating (Low/Medium/High)
- Key observations about this location for land acquisition
- Nearby infrastructure notes
- Any notable risks or opportunities`,
          add_context_from_internet: true,
          response_json_schema: {
            type: "object",
            properties: {
              parcel_size_acres: { type: "number" },
              zoning: { type: "string" },
              land_use: { type: "string" },
              estimated_value_per_acre: { type: "number" },
              development_potential: { type: "string" },
              observations: { type: "string" },
              infrastructure: { type: "string" },
              risks: { type: "string" },
              opportunities: { type: "string" }
            }
          }
        });
        setParcelInfo(result);
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const potentialColor = {
    High: "bg-green-100 text-green-800",
    Medium: "bg-yellow-100 text-yellow-800",
    Low: "bg-red-100 text-red-800",
  };

  return (
    <div className="flex flex-col h-screen relative">
      {/* Top Bar */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 z-10 flex-wrap">
        <h1 className="text-lg font-semibold text-slate-900 whitespace-nowrap">GIS Map</h1>
        <div className="flex-1 flex gap-2 max-w-xl">
          <Input
            placeholder="Search address or parcel..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="h-9"
          />
          <Button onClick={handleSearch} size="sm" className="bg-slate-900 hover:bg-slate-700">
            <Search className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex gap-1 ml-auto items-center flex-wrap">
          {Object.entries(tileLayers).map(([key, val]) => (
            <Button
              key={key}
              size="sm"
              variant={tileLayer === key ? "default" : "outline"}
              onClick={() => setTileLayer(key)}
              className="text-xs"
            >
              {val.label}
            </Button>
          ))}
          <div className="w-px h-5 bg-slate-200 mx-1" />
          <Button
            size="sm"
            variant={showParcels ? "default" : "outline"}
            onClick={() => { setShowParcels(!showParcels); setParcelData(null); }}
            className="text-xs flex items-center gap-1"
          >
            <Layers className="h-3 w-3" />
            {parcelLoading ? "Loading..." : "Parcels"}
          </Button>
          <Button
            size="sm"
            variant={showDeals ? "default" : "outline"}
            onClick={() => setShowDeals(!showDeals)}
            className="text-xs flex items-center gap-1"
          >
            <Building2 className="h-3 w-3" />
            Deals
          </Button>
          <Button
            size="sm"
            variant={showSensitiveLands ? "default" : "outline"}
            onClick={() => setShowSensitiveLands(!showSensitiveLands)}
            className="text-xs flex items-center gap-1"
          >
            🌿 Sensitive Lands
          </Button>
          <Button
            size="sm"
            variant={showFloodZones ? "default" : "outline"}
            onClick={() => setShowFloodZones(!showFloodZones)}
            className="text-xs flex items-center gap-1"
          >
            💧 Flood Zones
          </Button>
          <Button
            size="sm"
            variant={showWUI ? "default" : "outline"}
            onClick={() => setShowWUI(!showWUI)}
            className="text-xs flex items-center gap-1"
          >
            🔥 {wuiLoading ? "Loading WUI..." : "WUI Zone"}
          </Button>
          <Button
            size="sm"
            variant={showFaultLines ? "default" : "outline"}
            onClick={() => setShowFaultLines(!showFaultLines)}
            className="text-xs flex items-center gap-1"
          >
            ⚡ Fault Lines
          </Button>

          <Button
            size="sm"
            variant={showSteepSlopes ? "default" : "outline"}
            onClick={() => setShowSteepSlopes(!showSteepSlopes)}
            className="text-xs flex items-center gap-1"
          >
            ⛰️ {slopeLoading ? "Loading Slopes..." : "Slopes >30%"}
          </Button>
          <input ref={kmzInputRef} type="file" accept=".kmz,.kml" className="hidden" onChange={handleKmzUpload} />
          <Button
            size="sm"
            variant="outline"
            onClick={() => kmzInputRef.current?.click()}
            className="text-xs flex items-center gap-1"
          >
            <Upload className="h-3 w-3" />
            KMZ/KML
          </Button>
          <Button
            size="sm"
            variant={showImageOverlays ? "default" : "outline"}
            onClick={() => { const next = !showImageOverlays; setShowImageOverlays(next); localStorage.setItem("gis_show_image_overlays", JSON.stringify(next)); }}
            className="text-xs flex items-center gap-1"
          >
            🖼️ Image Overlay
          </Button>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <MapContainer
          center={mapCenter}
          zoom={12}
          style={{ height: "100%", width: "100%" }}
          className="z-0"
        >
          <TileLayer
            key={tileLayer}
            url={tileLayers[tileLayer].url}
            attribution={tileLayers[tileLayer].attribution}
          />
          <ClickHandler onMapClick={handleMapClick} />
          <ParcelBoundsLoader showParcels={showParcels} onBoundsChange={fetchParcelsForBounds} />
          <SlopeBoundsLoader showSteepSlopes={showSteepSlopes} onBoundsChange={fetchSlopeData} />

          {/* FEMA Flood Zones - official FEMA WMS service */}
          {showFloodZones && (
            <WMSTileLayer
              url="https://hazards.fema.gov/arcgis/services/public/NFHLWMS/MapServer/WMSServer"
              layers="28"
              format="image/png"
              transparent={true}
              opacity={0.6}
              version="1.3.0"
              attribution='<a href="https://msc.fema.gov">FEMA NFHL</a>'
              zIndex={10}
            />
          )}

          {/* Sensitive Lands - USFWS NWI via official ArcGIS REST tile service */}
          {showSensitiveLands && (
            <TileLayer
              url="https://fwspublicservices.wim.usgs.gov/wetlandsmapservice/rest/services/Wetlands/MapServer/tile/{z}/{y}/{x}"
              attribution='<a href="https://www.fws.gov/wetlands/">USFWS NWI</a>'
              opacity={0.6}
              zIndex={9}
            />
          )}

          {/* USGS Quaternary Fault Lines - WMS from earthquake.usgs.gov, layer 21 = National Database */}
          {showFaultLines && (
            <WMSTileLayer
              url="https://earthquake.usgs.gov/arcgis/services/haz/Qfaults/MapServer/WMSServer"
              layers="21,22"
              styles=""
              format="image/png"
              transparent={true}
              opacity={0.9}
              version="1.1.1"
              attribution='<a href="https://earthquake.usgs.gov/hazards/qfaults/">USGS Quaternary Faults</a>'
              zIndex={11}
            />
          )}

          {/* Steep Slopes >30% - computed from USGS 3DEP elevation */}
          {showSteepSlopes && slopeData && slopeData.features && slopeData.features.length > 0 && (
            <GeoJSON
              key={slopeData.features.length + "-slopes"}
              data={slopeData}
              style={(feature) => {
                const s = parseFloat(feature.properties.slope);
                const intensity = Math.min((s - 30) / 40, 1); // 30–70%+ maps to 0–1
                return {
                  color: "#dc2626",
                  weight: 0,
                  fillColor: `rgba(220, ${Math.round(38 - intensity * 38)}, ${Math.round(38 - intensity * 38)}, 1)`,
                  fillOpacity: 0.5 + intensity * 0.25,
                };
              }}
              onEachFeature={(feature, layer) => {
                layer.bindTooltip(`Slope: ${feature.properties.slope}%`, { sticky: true });
              }}
            />
          )}

          {/* Utah High Risk WUI - loaded as GeoJSON from SGID FeatureServer */}
          {showWUI && wuiData && wuiData.features && wuiData.features.length > 0 && (
            <GeoJSON
              key="wui-layer"
              data={wuiData}
              style={() => ({
                color: "#ff4500",
                weight: 1,
                opacity: 0.8,
                fillColor: "#ff6600",
                fillOpacity: 0.35,
              })}
            />
          )}

          {/* Salt Lake County Parcels - GeoJSON from UGRC SGID (zoom 14+) */}
          {showParcels && parcelData && parcelData.features && parcelData.features.length > 0 && (
            <GeoJSON
              key={JSON.stringify(parcelData?.features?.length)}
              data={parcelData}
              style={() => ({
                color: "#b45309",
                weight: 1,
                opacity: 0.9,
                fillColor: "#fef3c7",
                fillOpacity: 0.2,
              })}
              onEachFeature={(feature, layer) => {
                const p = feature.properties;
                const lines = [
                p?.PARCEL_ID && `<b>Parcel:</b> ${p.PARCEL_ID}`,
                p?.PARCEL_ADD && `<b>Address:</b> ${p.PARCEL_ADD}`,
                p?.COUNTY_NAME && `<b>County:</b> ${p.COUNTY_NAME}`,
                p?.PROP_CLASS && `<b>Class:</b> ${p.PROP_CLASS}`,
                  p?.PARCEL_ACRES && `<b>Acres:</b> ${parseFloat(p.PARCEL_ACRES).toFixed(2)}`,
                  p?.TOTAL_MKT_VALUE && `<b>Market Value:</b> $${parseInt(p.TOTAL_MKT_VALUE).toLocaleString()}`,
                ].filter(Boolean).join("<br/>");
                if (lines) {
                  layer.bindTooltip(`<div style="font-size:11px;line-height:1.5">${lines}</div>`, { sticky: true });
                }
              }}
            />
          )}

          {/* Deal pins */}
          {showDeals && dealLocations.map(({ deal, coords }) => (
            <Marker
              key={deal.id}
              position={[coords.lat, coords.lng]}
              icon={createColoredIcon(stageColors[deal.stage] || "#6366f1")}
            >
              <Popup>
                <div className="min-w-[180px]">
                  <div className="font-semibold text-sm text-slate-900 mb-1">{deal.name}</div>
                  {deal.address && <div className="text-xs text-slate-500 mb-1">{deal.address}{deal.city ? `, ${deal.city}` : ""}</div>}
                  <div className="flex items-center gap-1 mb-2">
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: stageColors[deal.stage] || "#6366f1" }}
                    />
                    <span className="text-xs font-medium" style={{ color: stageColors[deal.stage] }}>
                      {stageLabels[deal.stage] || deal.stage}
                    </span>
                  </div>
                  {deal.asking_price && (
                    <div className="text-xs text-slate-600">Ask: ${deal.asking_price?.toLocaleString()}</div>
                  )}
                  {deal.acreage && (
                    <div className="text-xs text-slate-600">{deal.acreage} acres</div>
                  )}
                  <Link
                    to={createPageUrl(`DealDetails?id=${deal.id}`)}
                    className="mt-2 inline-block text-xs text-indigo-600 hover:underline"
                  >
                    View Deal →
                  </Link>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Plan PDF markers - pinned at deal coordinates */}
          {showPlanDocs && planDocs.map((doc) => {
            const dealLoc = dealLocations.find(d => d.deal.id === doc.entity_id);
            if (!dealLoc) return null;
            const lat = dealLoc.coords.lat + 0.0003;
            const lng = dealLoc.coords.lng + 0.0003;
            return (
              <Marker
                key={doc.id}
                position={[lat, lng]}
                icon={createPDFIcon()}
                eventHandlers={{ click: () => setActivePdfDoc({ doc, dealLoc }) }}
              >
                <Tooltip direction="top" offset={[0, -38]} permanent={false}>
                  <span className="text-xs font-medium">{doc.name}</span>
                </Tooltip>
              </Marker>
            );
          })}

          {/* KMZ/KML layers */}
          {kmzLayers.map((layer) => (
            <>
              {/* Image overlays (GroundOverlay) */}
              {showImageOverlays && layer.imageOverlays?.map((ov, i) => (
                <ImageOverlay
                  key={`${layer.id}-img-${i}`}
                  url={ov.imageUrl}
                  bounds={ov.bounds}
                  opacity={0.6}
                  zIndex={20}
                />
              ))}
              {/* Vector features (only if there are actual features) */}
              {layer.geojson?.features?.length > 0 && (
                <GeoJSON
                    key={layer.id}
                    data={layer.geojson}
                    style={() => ({
                      color: "#7c3aed",
                      weight: 2,
                      opacity: layer.opacity || 0.8,
                      fillColor: "#7c3aed",
                      fillOpacity: (layer.opacity || 0.8) * 0.15,
                    })}
                  pointToLayer={(feature, latlng) => L.circleMarker(latlng, {
                    radius: 6,
                    color: "#7c3aed",
                    weight: 2,
                    fillColor: "#7c3aed",
                    fillOpacity: 0.7,
                  })}
                  onEachFeature={(feature, leafletLayer) => {
                    const fname = feature.properties?.name || feature.properties?.Name;
                    if (fname) leafletLayer.bindTooltip(fname, { sticky: true });
                  }}
                />
              )}
            </>
          ))}

          {/* Clicked location pin */}
          {clickedLocation && (
            <Marker position={[clickedLocation.lat, clickedLocation.lng]}>
              <Popup>
                <div className="text-sm font-medium">Selected Parcel</div>
                <div className="text-xs text-gray-500">
                  {clickedLocation.lat.toFixed(5)}, {clickedLocation.lng.toFixed(5)}
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>

        {/* KMZ Layer List */}
        {kmzLayers.length > 0 && (
          <div className="absolute bottom-6 right-4 z-10 bg-white/95 border border-slate-200 rounded-lg p-3 shadow text-xs max-w-[260px]">
            <div className="font-semibold text-slate-700 mb-2 flex items-center gap-1">
              <Upload className="h-3 w-3 text-violet-600" /> Local Uploads
            </div>
            <div className="space-y-2">
              {Object.entries(
                kmzLayers.reduce((acc, layer) => {
                  if (!acc[layer.category]) acc[layer.category] = [];
                  acc[layer.category].push(layer);
                  return acc;
                }, {})
              ).map(([category, categoryLayers]) => (
                <div key={category} className="border border-slate-200 rounded bg-white">
                  <button
                    onClick={() => setKmzGroupVisibility(prev => ({ ...prev, [category]: !prev[category] }))}
                    className="w-full flex items-center justify-between gap-2 p-2 hover:bg-slate-50 font-medium text-slate-700"
                  >
                    <span>{kmzCategories.find(c => c.value === category)?.label || category}</span>
                    <span className="text-slate-400 text-lg leading-none">{kmzGroupVisibility[category] !== false ? '▼' : '▶'}</span>
                  </button>
                  {kmzGroupVisibility[category] !== false && (
                    <div className="space-y-2 p-2 border-t border-slate-100 bg-slate-50">
                      {categoryLayers.map((layer, idx) => (
                        <div key={layer.id} className="space-y-1.5 p-2 bg-white rounded border border-slate-100">
                          <div className="flex items-center justify-between">
                            <div className="font-medium text-slate-700 text-xs truncate flex-1">{layer.name}</div>
                            <div className="flex gap-1 ml-2 flex-shrink-0">
                              {idx > 0 && (
                                <button
                                  onClick={() => setKmzLayers(prev => {
                                    const arr = [...prev];
                                    const currentIdx = arr.findIndex(l => l.id === layer.id);
                                    [arr[currentIdx - 1], arr[currentIdx]] = [arr[currentIdx], arr[currentIdx - 1]];
                                    return arr;
                                  })}
                                  className="text-slate-400 hover:text-slate-600 text-xs leading-none"
                                >
                                  ▲
                                </button>
                              )}
                              {idx < categoryLayers.length - 1 && (
                                <button
                                  onClick={() => setKmzLayers(prev => {
                                    const arr = [...prev];
                                    const currentIdx = arr.findIndex(l => l.id === layer.id);
                                    [arr[currentIdx], arr[currentIdx + 1]] = [arr[currentIdx + 1], arr[currentIdx]];
                                    return arr;
                                  })}
                                  className="text-slate-400 hover:text-slate-600 text-xs leading-none"
                                >
                                  ▼
                                </button>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={(layer.opacity || 0.8) * 100}
                              onChange={(e) => setKmzLayers(prev => prev.map(l => l.id === layer.id ? { ...l, opacity: parseFloat(e.target.value) / 100 } : l))}
                              className="flex-1 h-1.5 cursor-pointer"
                            />
                            <span className="text-slate-500 text-xs w-6 text-right">{Math.round((layer.opacity || 0.8) * 100)}%</span>
                          </div>
                          <button
                            onClick={() => setKmzLayers(prev => prev.filter(l => l.id !== layer.id))}
                            className="w-full text-xs text-slate-400 hover:text-red-500 py-1 text-center flex items-center justify-center gap-1"
                          >
                            <Trash2 className="h-3 w-3" /> Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Legend */}
        {showDeals && dealLocations.length > 0 && (
          <div className="absolute bottom-6 left-4 z-10 bg-white/95 border border-slate-200 rounded-lg p-3 shadow text-xs max-w-[200px]">
            <div className="font-semibold text-slate-700 mb-2">Deal Stages</div>
            <div className="space-y-1">
              {Object.entries(stageColors)
                .filter(([stage]) => dealLocations.some(d => d.deal.stage === stage))
                .map(([stage, color]) => (
                  <div key={stage} className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                    <span className="text-slate-600">{stageLabels[stage]}</span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Hint overlay */}
        {!clickedLocation && !isAnalyzing && dealLocations.length === 0 && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 bg-white/90 backdrop-blur-sm border border-slate-200 rounded-lg px-4 py-2 text-sm text-slate-600 flex items-center gap-2 shadow">
            <MapPin className="h-4 w-4 text-slate-400" />
            Click anywhere on the map to analyze a parcel
          </div>
        )}

        {/* KMZ Category Selection Dialog */}
        {kmzCategoryDialog && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
            <Card className="w-96 shadow-xl">
              <CardHeader>
                <CardTitle className="text-base">Assign KMZ/KML Layer</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-slate-600 mb-3">{pendingKmzFile?.name}</p>
                  <Label className="text-sm font-medium mb-2 block">Assign to GIS Category</Label>
                  <Select value={selectedKmzCategory} onValueChange={setSelectedKmzCategory}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {kmzCategories.map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => { setKmzCategoryDialog(false); setPendingKmzFile(null); }}>
                    Cancel
                  </Button>
                  <Button onClick={confirmKmzUpload} className="bg-slate-900 hover:bg-slate-700">
                    Upload
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* PDF Viewer Panel */}
        {activePdfDoc && (
          <div className="absolute top-4 left-4 z-10 w-[560px] h-[75vh] flex flex-col bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 text-white flex-shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="h-4 w-4 text-red-400 flex-shrink-0" />
                <span className="font-semibold text-sm truncate">{activePdfDoc.doc.name}</span>
                <span className="text-xs text-slate-400 flex-shrink-0">— {activePdfDoc.dealLoc.deal.name}</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                <a
                  href={activePdfDoc.doc.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-slate-300 hover:text-white underline"
                >
                  Open full ↗
                </a>
                <button onClick={() => setActivePdfDoc(null)} className="text-slate-400 hover:text-white ml-1">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <iframe
              src={`${activePdfDoc.doc.file_url}#toolbar=0`}
              className="flex-1 w-full border-0"
              title={activePdfDoc.doc.name}
            />
          </div>
        )}

        {/* Parcel Info Panel */}
        {(isAnalyzing || parcelInfo) && (
          <div className="absolute top-4 right-4 z-10 w-80">
            <Card className="shadow-lg border-slate-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Info className="h-4 w-4 text-slate-500" />
                    <span className="font-semibold text-sm text-slate-900">Parcel Analysis</span>
                  </div>
                  <button
                    onClick={() => { setParcelInfo(null); setClickedLocation(null); }}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {isAnalyzing ? (
                  <div className="space-y-2">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="h-3 bg-slate-100 rounded animate-pulse" style={{ width: `${70 + (i % 3) * 10}%` }} />
                    ))}
                    <p className="text-xs text-slate-400 mt-3">Analyzing parcel...</p>
                  </div>
                ) : parcelInfo && (
                  <div className="space-y-3 text-sm">
                    {(parcelInfo.owner_name || parcelInfo.parcel_id) && (
                      <div className="bg-indigo-50 rounded-lg p-2 border border-indigo-100">
                        {parcelInfo.owner_name && (
                          <div className="text-xs text-indigo-600 font-semibold mb-0.5">Owner: {parcelInfo.owner_name}</div>
                        )}
                        {parcelInfo.parcel_id && (
                          <div className="text-xs text-indigo-500">Parcel ID: {parcelInfo.parcel_id}</div>
                        )}
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-slate-50 rounded-lg p-2">
                        <div className="text-xs text-slate-500">Size</div>
                        <div className="font-semibold">{parcelInfo.parcel_size_acres?.toFixed(1)} ac</div>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-2">
                        <div className="text-xs text-slate-500">Value/Acre</div>
                        <div className="font-semibold">${parcelInfo.estimated_value_per_acre?.toLocaleString()}</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs text-slate-500">Zoning</div>
                        <div className="font-medium">{parcelInfo.zoning}</div>
                      </div>
                      <Badge className={potentialColor[parcelInfo.development_potential] || "bg-slate-100 text-slate-700"}>
                        {parcelInfo.development_potential} Potential
                      </Badge>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 mb-1">Land Use</div>
                      <div className="text-slate-700">{parcelInfo.land_use}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 mb-1">Observations</div>
                      <div className="text-slate-700 text-xs leading-relaxed">{parcelInfo.observations}</div>
                    </div>
                    {parcelInfo.opportunities && (
                      <div className="bg-green-50 rounded-lg p-2">
                        <div className="text-xs font-medium text-green-800 mb-1">Opportunities</div>
                        <div className="text-xs text-green-700">{parcelInfo.opportunities}</div>
                      </div>
                    )}
                    {parcelInfo.risks && (
                      <div className="bg-red-50 rounded-lg p-2">
                        <div className="text-xs font-medium text-red-800 mb-1">Risks</div>
                        <div className="text-xs text-red-700">{parcelInfo.risks}</div>
                      </div>
                    )}
                    {parcelInfo.infrastructure && (
                      <div className="bg-blue-50 rounded-lg p-2">
                        <div className="text-xs font-medium text-blue-800 mb-1">Infrastructure</div>
                        <div className="text-xs text-blue-700">{parcelInfo.infrastructure}</div>
                      </div>
                    )}
                    <SendToClickUp parcelInfo={parcelInfo} location={clickedLocation} />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}