import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

export default function ClusterMarkers({ deals, stageColors, stageLabels, showClusters }) {
  const map = useMap();

  useEffect(() => {
    if (!map || !deals || !showClusters) return;

    // Remove existing cluster group
    map.eachLayer((layer) => {
      if (layer._clusterGroup) {
        map.removeLayer(layer);
      }
    });

    // Create marker cluster group
    const markerClusterGroup = L.markerClusterGroup({
      maxClusterRadius: 80,
      iconCreateFunction: (cluster) => {
        const count = cluster.getChildCount();
        let size = 'small';
        let icon;
        if (count > 100) {
          size = 'large';
          icon = '●●●';
        } else if (count > 50) {
          size = 'medium';
          icon = '●●';
        }
        return L.divIcon({
          html: `<div class="cluster-icon cluster-${size}">${icon || count}</div>`,
          className: 'cluster-marker-wrapper',
          iconSize: [40, 40],
          iconAnchor: [20, 20],
        });
      },
    });

    // Add markers to cluster group
    deals
      .filter(d => d.latitude && d.longitude)
      .forEach(deal => {
        const color = stageColors[deal.stage] || '#6366f1';
        const svg = `
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="40" viewBox="0 0 28 40">
            <path d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 26 14 26S28 24.5 28 14C28 6.268 21.732 0 14 0z" fill="${color}" stroke="white" stroke-width="2"/>
            <circle cx="14" cy="14" r="6" fill="white" opacity="0.9"/>
          </svg>`;
        
        const icon = L.divIcon({
          html: svg,
          iconSize: [28, 40],
          iconAnchor: [14, 40],
          popupAnchor: [0, -42],
          className: '',
        });

        const marker = L.marker([deal.latitude, deal.longitude], { icon });
        marker.bindPopup(`
          <div class="min-w-[180px]">
            <div class="font-semibold text-sm text-slate-900 mb-1">${deal.name}</div>
            <div class="flex items-center gap-1 mb-2">
              <span class="inline-block w-2.5 h-2.5 rounded-full" style="background-color: ${color}"></span>
              <span class="text-xs font-medium" style="color: ${color}">${stageLabels[deal.stage] || deal.stage}</span>
            </div>
            ${deal.asking_price ? `<div class="text-xs text-slate-600">Ask: $${deal.asking_price?.toLocaleString()}</div>` : ''}
            ${deal.acreage ? `<div class="text-xs text-slate-600">${deal.acreage} acres</div>` : ''}
          </div>
        `);

        markerClusterGroup.addLayer(marker);
      });

    markerClusterGroup._clusterGroup = true;
    markerClusterGroup.addTo(map);

    return () => {
      if (map && markerClusterGroup) {
        map.removeLayer(markerClusterGroup);
      }
    };
  }, [map, deals, showClusters, stageColors, stageLabels]);

  return null;
}