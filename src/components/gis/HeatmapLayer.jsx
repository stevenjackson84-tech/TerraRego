import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

export default function HeatmapLayer({ deals, mode, opacity = 0.6 }) {
  const map = useMap();

  useEffect(() => {
    if (!map || !deals || deals.length === 0 || !mode) return;

    // Remove existing heatmap if present
    map.eachLayer((layer) => {
      if (layer._heatmapData) {
        map.removeLayer(layer);
      }
    });

    // Create heatmap data points
    const heatmapData = deals
      .filter(d => d.latitude && d.longitude)
      .map(d => {
        let intensity = 0.5;
        
        if (mode === 'value') {
          const price = d.asking_price || d.purchase_price || d.estimated_value || 0;
          intensity = Math.min(price / 10000000, 1); // Normalize by 10M
        } else if (mode === 'acreage') {
          intensity = Math.min((d.acreage || 0) / 500, 1); // Normalize by 500 acres
        }
        
        return [d.latitude, d.longitude, intensity];
      });

    // Create a custom gradient heatmap using canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const size = 256;
    canvas.width = canvas.height = size;

    // Gradient colors: blue -> cyan -> green -> yellow -> red
    const gradient = ctx.createLinearGradient(0, 0, size, 0);
    gradient.addColorStop(0, '#0000ff');    // Blue
    gradient.addColorStop(0.25, '#00ffff'); // Cyan
    gradient.addColorStop(0.5, '#00ff00'); // Green
    gradient.addColorStop(0.75, '#ffff00'); // Yellow
    gradient.addColorStop(1, '#ff0000');   // Red

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    const gradientUrl = canvas.toDataURL();

    // Create custom heatmap layer using CircleMarkers
    const heatmapGroup = L.featureGroup();

    heatmapData.forEach(([lat, lng, intensity]) => {
      const radius = 15 + intensity * 25;
      const color = getColorForIntensity(intensity);
      
      L.circleMarker([lat, lng], {
        radius,
        fillColor: color,
        color: 'white',
        weight: 1,
        opacity: opacity,
        fillOpacity: opacity * 0.7,
      }).addTo(heatmapGroup);
    });

    heatmapGroup._heatmapData = true;
    heatmapGroup.addTo(map);

    return () => {
      if (map && heatmapGroup) {
        map.removeLayer(heatmapGroup);
      }
    };
  }, [map, deals, mode, opacity]);

  return null;
}

function getColorForIntensity(intensity) {
  if (intensity < 0.2) return '#0000ff';    // Blue
  if (intensity < 0.4) return '#00ffff';   // Cyan
  if (intensity < 0.6) return '#00ff00';   // Green
  if (intensity < 0.8) return '#ffff00';   // Yellow
  return '#ff0000';                         // Red
}