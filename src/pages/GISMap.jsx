import { useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, MapPin, Layers, X, Info } from "lucide-react";
import { base44 } from "@/api/base44Client";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix default marker icons for leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function ClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng);
    },
  });
  return null;
}

export default function GISMap() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedParcel, setSelectedParcel] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [parcelInfo, setParcelInfo] = useState(null);
  const [mapCenter] = useState([33.749, -84.388]); // Default: Atlanta
  const [clickedLocation, setClickedLocation] = useState(null);
  const [tileLayer, setTileLayer] = useState("street");

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
      // Geocode the address using nominatim
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`
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
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 z-10">
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
        <div className="flex gap-1 ml-auto">
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

        {/* Hint overlay */}
        {!clickedLocation && !isAnalyzing && (
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
                      <div key={i} className={`h-3 bg-slate-100 rounded animate-pulse`} style={{ width: `${70 + (i % 3) * 10}%` }} />
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