import { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, WMSTileLayer, Marker, Popup, useMapEvents, GeoJSON, useMap, Tooltip } from "react-leaflet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, MapPin, Layers, X, Info, Building2, FileText } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

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

function ParcelBoundsLoader({ showParcels, onBoundsChange }) {
  const map = useMap();
  useMapEvents({
    moveend() {
      if (showParcels && map.getZoom() >= 14) {
        onBoundsChange(map.getBounds());
      }
    },
    zoomend() {
      if (showParcels && map.getZoom() >= 14) {
        onBoundsChange(map.getBounds());
      }
    },
  });

  useEffect(() => {
    if (showParcels && map.getZoom() >= 14) {
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

  const { data: deals = [] } = useQuery({
    queryKey: ["deals"],
    queryFn: () => base44.entities.Deal.list(),
  });

  // Fetch plan PDFs linked to deals
  const { data: planDocs = [] } = useQuery({
    queryKey: ["plan-documents"],
    queryFn: () => base44.entities.Document.filter({ category: "plan", entity_type: "deal" }),
  });

  // Fetch parcels as GeoJSON using the correct AGRC FeatureServer
  const fetchParcelsForBounds = async (bounds) => {
    if (!bounds) return;
    setParcelLoading(true);
    const { _southWest: sw, _northEast: ne } = bounds;
    const bbox = `${sw.lng},${sw.lat},${ne.lng},${ne.lat}`;
    const url = `https://services1.arcgis.com/99lidPhWCzftIe9K/arcgis/rest/services/Parcels_SaltLake_LIR/FeatureServer/0/query?where=1%3D1&outFields=PARCEL_ID,PARCEL_ADD,COUNTY_NAME,TOTAL_MKT_VALUE,PROP_CLASS,PARCEL_ACRES&outSR=4326&f=geojson&resultRecordCount=300&geometry=${bbox}&geometryType=esriGeometryEnvelope&spatialRel=esriSpatialRelIntersects&inSR=4326`;
    fetch(url)
      .then(r => r.json())
      .then(data => {
        if (data && data.features) {
          setParcelData(data);
        }
        setParcelLoading(false);
      })
      .catch(() => setParcelLoading(false));
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
            variant={showPlanDocs ? "default" : "outline"}
            onClick={() => setShowPlanDocs(!showPlanDocs)}
            className="text-xs flex items-center gap-1"
          >
            <FileText className="h-3 w-3" />
            Plan PDFs
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
                  p?.OWNER && `<b>Owner:</b> ${p.OWNER}`,
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