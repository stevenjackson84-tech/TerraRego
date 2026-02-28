import { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, WMSTileLayer, Marker, Popup, useMapEvents, GeoJSON } from "react-leaflet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, MapPin, Layers, X, Info, Building2 } from "lucide-react";
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
  const [showWUI, setShowWUI] = useState(false);
  const [dealLocations, setDealLocations] = useState([]);

  const { data: deals = [] } = useQuery({
    queryKey: ["deals"],
    queryFn: () => base44.entities.Deal.list(),
  });

  // Geocode deals that have addresses
  useEffect(() => {
    if (!deals.length) return;
    const dealsWithAddress = deals.filter(d => d.address || d.city);

    let cancelled = false;
    const geocodeAll = async () => {
      const results = [];
      for (const deal of dealsWithAddress) {
        if (cancelled) break;
        const coords = await geocodeAddress(deal.address, deal.city, deal.state);
        if (coords) results.push({ deal, coords });
        // small delay to be polite to nominatim
        await new Promise(r => setTimeout(r, 300));
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
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a real estate GIS analyst. A user clicked on coordinates lat: ${latlng.lat.toFixed(5)}, lng: ${latlng.lng.toFixed(5)}.

Generate a realistic land parcel analysis for this location. Include:
- Estimated parcel size (acres)
- Estimated zoning type
- Land use category
- Estimated land value per acre
- Development potential rating (Low/Medium/High)
- Key observations about this location for land acquisition
- Nearby infrastructure notes
- Any notable risks or opportunities

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
            opportunities: { type: "string" }
          }
        }
      });
      setParcelInfo(result);
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
            onClick={() => setShowParcels(!showParcels)}
            className="text-xs flex items-center gap-1"
          >
            <Layers className="h-3 w-3" />
            Parcels
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
            🔥 WUI Zone
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

          {/* Utah High Risk WUI - Utah SGID via ESRI tile service */}
          {showWUI && (
            <TileLayer
              url="https://tiles.arcgis.com/tiles/ZzrwjTRez6FJiOq4/arcgis/rest/services/Utah_High_Risk_WUI_Properties/MapServer/tile/{z}/{y}/{x}"
              attribution='<a href="https://gis.utah.gov">Utah SGID - High Risk WUI</a>'
              opacity={0.55}
              zIndex={11}
            />
          )}

          {/* Utah AGRC Parcel WMS */}
          {showParcels && (
            <WMSTileLayer
              url="https://tiles.arcgis.com/tiles/ZzrwjTRez6FJlsby/arcgis/rest/services/UtahParcels/MapServer/WMSServer"
              layers="0"
              format="image/png"
              transparent={true}
              opacity={0.5}
              attribution="Utah AGRC Parcels"
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