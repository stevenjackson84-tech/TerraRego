import { GeoJSON } from "react-leaflet";

const LEHI_ZONE_COLORS = {
  "TH-5": "#6b6b47", "RA-1": "#98e600", "PF": "#00a9e6",
  "A-1": "#d1ff73", "R-1-8": "#ebd9c6", "R-1-15": "#d3ffbe",
  "R-1-12": "#e9ffbe", "R-1-22": "#77b300", "C": "#ff0000",
  "R-2": "#ffaa00", "R-3": "#734c00", "A-5": "#00e6a9",
  "R-1-10": "#ffff00", "R-1-Flex": "#a8a800", "LI": "#ebebeb",
  "PC": "#bed2ff", "MU": "#c500ff", "NC": "#ff7f7f",
  "BP": "#ffbee8", "C-H": "#732600", "R-2.5": "#e69800",
  "C-I": "#e600a9", "CR": "#a80000", "H/I": "#4c7300",
  "RC": "#a3297a", "T-M": "#002266",
};

const GENERAL_PLAN_COLORS = {
  "Low Density Residential": "#d4edda",
  "Medium Density Residential": "#a8d5b5",
  "High Density Residential": "#72bb8e",
  "Commercial": "#ffc107",
  "Mixed Use": "#fd7e14",
  "Industrial": "#dc3545",
  "Public Facilities": "#17a2b8",
  "Open Space": "#28a745",
  "Agriculture": "#6f9e3f",
};

export default function LehiCityLayers({
  showLehiZoning, lehiZoningData,
  showLehiGeneralPlan, lehiGeneralPlanData,
  showLehiSubdivisions, lehiSubdivisionsData,
  showLehiBoundary, lehiBoundaryData,
}) {
  return (
    <>
      {/* Lehi City Boundary */}
      {showLehiBoundary && lehiBoundaryData?.features?.length > 0 && (
        <GeoJSON
          key="lehi-boundary"
          data={lehiBoundaryData}
          style={() => ({ color: "#1e40af", weight: 3, opacity: 1, fillColor: "#3b82f6", fillOpacity: 0.05, dashArray: "6 4" })}
          onEachFeature={(_, layer) => layer.bindTooltip("Lehi City Boundary", { sticky: true })}
        />
      )}

      {/* Lehi General Plan */}
      {showLehiGeneralPlan && lehiGeneralPlanData?.features?.length > 0 && (
        <GeoJSON
          key="lehi-general-plan"
          data={lehiGeneralPlanData}
          style={(feature) => {
            const label = feature.properties?.Land_Use || feature.properties?.LAND_USE || feature.properties?.LandUse || "";
            return { color: "#374151", weight: 1, fillColor: GENERAL_PLAN_COLORS[label] || "#9ca3af", fillOpacity: 0.4 };
          }}
          onEachFeature={(feature, layer) => {
            const label = feature.properties?.Land_Use || feature.properties?.LAND_USE || feature.properties?.LandUse || "General Plan";
            layer.bindTooltip(label, { sticky: true });
            layer.bindPopup(`<div style="font-size:11px"><b>Lehi General Plan</b><br/>${label}</div>`);
          }}
        />
      )}

      {/* Lehi Subdivisions */}
      {showLehiSubdivisions && lehiSubdivisionsData?.features?.length > 0 && (
        <GeoJSON
          key="lehi-subdivisions"
          data={lehiSubdivisionsData}
          style={() => ({ color: "#7c3aed", weight: 1.5, fillColor: "#ddd6fe", fillOpacity: 0.25 })}
          onEachFeature={(feature, layer) => {
            const props = feature.properties;
            const name = props?.SubdivName || props?.SUBDIVNAME || props?.Name || props?.NAME || "Subdivision";
            layer.bindTooltip(name, { sticky: true });
            layer.bindPopup(`<div style="font-size:11px"><b>${name}</b>${props?.PLAT_DATE ? `<br/>Platted: ${props.PLAT_DATE}` : ""}</div>`);
          }}
        />
      )}

      {/* Lehi Zoning - official color scheme */}
      {showLehiZoning && lehiZoningData?.features?.length > 0 && (
        <GeoJSON
          key="lehi-zoning"
          data={lehiZoningData}
          style={(feature) => {
            const zone = feature.properties?.Zone || "";
            return { color: "rgba(153,153,153,0.4)", weight: 0.75, fillColor: LEHI_ZONE_COLORS[zone] || "#9ca3af", fillOpacity: 0.7 };
          }}
          onEachFeature={(feature, layer) => {
            const zone = feature.properties?.Zone || "Unknown";
            const acres = feature.properties?.Acres ? ` — ${parseFloat(feature.properties.Acres).toFixed(1)} ac` : "";
            layer.bindTooltip(`${zone}${acres}`, { sticky: true });
            layer.bindPopup(`<div style="font-size:11px"><b>Zone: ${zone}</b>${acres}</div>`);
          }}
        />
      )}
    </>
  );
}