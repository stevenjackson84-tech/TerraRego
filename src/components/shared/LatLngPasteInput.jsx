import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, CheckCircle2 } from "lucide-react";

/**
 * Parses a Google Maps coordinate string like "40.1234, -111.5678"
 * or a full Google Maps URL containing @lat,lng
 */
function parseGoogleMapsCoords(text) {
  if (!text) return null;

  // Try to match "lat, lng" pattern (with optional spaces and optional negative)
  const coordPattern = /(-?\d{1,3}\.\d+)[,\s]+(-?\d{1,3}\.\d+)/;
  const match = text.match(coordPattern);
  if (match) {
    const lat = parseFloat(match[1]);
    const lng = parseFloat(match[2]);
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng };
    }
  }
  return null;
}

export default function LatLngPasteInput({ latitude, longitude, onChange }) {
  const [pasteValue, setPasteValue] = useState(
    latitude && longitude ? `${latitude}, ${longitude}` : ""
  );
  const [parsed, setParsed] = useState(!!(latitude && longitude));

  const handleChange = (e) => {
    const val = e.target.value;
    setPasteValue(val);
    const coords = parseGoogleMapsCoords(val);
    if (coords) {
      setParsed(true);
      onChange(coords.lat, coords.lng);
    } else {
      setParsed(false);
      onChange(null, null);
    }
  };

  return (
    <div className="col-span-2">
      <Label className="flex items-center gap-1.5">
        <MapPin className="h-3.5 w-3.5 text-slate-500" />
        Google Maps Coordinates
      </Label>
      <div className="relative mt-1">
        <Input
          value={pasteValue}
          onChange={handleChange}
          placeholder='Paste from Google Maps, e.g. "40.3916, -111.8507"'
          className={parsed ? "pr-8 border-green-400 focus-visible:ring-green-300" : "pr-8"}
        />
        {parsed && (
          <CheckCircle2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
        )}
      </div>
      {parsed && (
        <p className="text-xs text-green-600 mt-1">
          Lat: {latitude?.toFixed(5)}, Lng: {longitude?.toFixed(5)}
        </p>
      )}
      <p className="text-xs text-slate-400 mt-1">
        In Google Maps, right-click a location → copy the coordinates, then paste here.
      </p>
    </div>
  );
}