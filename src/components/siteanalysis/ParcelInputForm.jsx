import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { MapPin, LayoutGrid, Trees, Waves, Mountain } from "lucide-react";

const ZONING_PRESETS = [
  { label: "R-1 Single Family (5,000 sf min lots)", code: "R-1", minLot: 5000, density: 8.7, front: 20, rear: 20, side: 5, coverage: 50, height: 35, far: 0.5 },
  { label: "R-2 Low Density (4,000 sf min lots)", code: "R-2", minLot: 4000, density: 10.9, front: 15, rear: 15, side: 4, coverage: 55, height: 35, far: 0.6 },
  { label: "R-3 Medium Density (2,500 sf min lots)", code: "R-3", minLot: 2500, density: 17.4, front: 15, rear: 10, side: 3, coverage: 60, height: 40, far: 0.75 },
  { label: "R-4 High Density / Townhome", code: "R-4", minLot: 1500, density: 29, front: 10, rear: 10, side: 3, coverage: 70, height: 45, far: 1.0 },
  { label: "RM Multifamily", code: "RM", minLot: 1000, density: 43, front: 10, rear: 10, side: 5, coverage: 75, height: 55, far: 1.5 },
  { label: "Custom (manual entry)", code: "CUSTOM", minLot: null, density: null, front: null, rear: null, side: null, coverage: null, height: null, far: null },
];

export default function ParcelInputForm({ onAnalyze, initialData = {} }) {
  const [form, setForm] = useState({
    name: initialData.name || "",
    address: initialData.address || "",
    parcel_number: initialData.parcel_number || "",
    gross_site_area_acres: initialData.gross_site_area_acres || "",
    development_type: initialData.development_type || "single_family",
    zoning_code: initialData.zoning_code || "",
    zoning_preset: "",
    min_lot_size_sf: initialData.min_lot_size_sf || "",
    max_density_du_per_acre: initialData.max_density_du_per_acre || "",
    front_setback_ft: initialData.front_setback_ft || "",
    rear_setback_ft: initialData.rear_setback_ft || "",
    side_setback_ft: initialData.side_setback_ft || "",
    max_lot_coverage_pct: initialData.max_lot_coverage_pct || "",
    max_building_height_ft: initialData.max_building_height_ft || "",
    max_far: initialData.max_far || "",
    street_dedication_pct: initialData.street_dedication_pct ?? 20,
    open_space_pct: initialData.open_space_pct ?? 10,
    utility_easement_pct: initialData.utility_easement_pct ?? 2,
    slope_constraint_pct: initialData.slope_constraint_pct ?? 0,
    wetland_constraint_pct: initialData.wetland_constraint_pct ?? 0,
    avg_unit_sf: initialData.avg_unit_sf || "",
    estimated_asp: initialData.estimated_asp || "",
    estimated_land_cost: initialData.estimated_land_cost || "",
  });

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const applyPreset = (presetCode) => {
    const preset = ZONING_PRESETS.find(p => p.code === presetCode);
    if (!preset || preset.code === "CUSTOM") return;
    setForm(f => ({
      ...f,
      zoning_preset: presetCode,
      zoning_code: preset.code,
      min_lot_size_sf: preset.minLot,
      max_density_du_per_acre: preset.density,
      front_setback_ft: preset.front,
      rear_setback_ft: preset.rear,
      side_setback_ft: preset.side,
      max_lot_coverage_pct: preset.coverage,
      max_building_height_ft: preset.height,
      max_far: preset.far,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const num = (v) => v === "" || v == null ? null : Number(v);
    onAnalyze({
      ...form,
      gross_site_area_acres: num(form.gross_site_area_acres),
      gross_site_area_sf: num(form.gross_site_area_acres) ? num(form.gross_site_area_acres) * 43560 : null,
      min_lot_size_sf: num(form.min_lot_size_sf),
      max_density_du_per_acre: num(form.max_density_du_per_acre),
      front_setback_ft: num(form.front_setback_ft),
      rear_setback_ft: num(form.rear_setback_ft),
      side_setback_ft: num(form.side_setback_ft),
      max_lot_coverage_pct: num(form.max_lot_coverage_pct),
      max_building_height_ft: num(form.max_building_height_ft),
      max_far: num(form.max_far),
      street_dedication_pct: num(form.street_dedication_pct),
      open_space_pct: num(form.open_space_pct),
      utility_easement_pct: num(form.utility_easement_pct),
      slope_constraint_pct: num(form.slope_constraint_pct),
      wetland_constraint_pct: num(form.wetland_constraint_pct),
      avg_unit_sf: num(form.avg_unit_sf),
      estimated_asp: num(form.estimated_asp),
      estimated_land_cost: num(form.estimated_land_cost),
    });
  };

  const Section = ({ icon: Icon, title, children }) => (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Icon className="h-4 w-4 text-slate-500" />
        <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
      </div>
      <div className="grid grid-cols-2 gap-3">{children}</div>
    </div>
  );

  const Field = ({ label, id, type = "text", value, onChange, placeholder, full }) => (
    <div className={full ? "col-span-2" : ""}>
      <Label htmlFor={id} className="text-xs text-slate-500 mb-1 block">{label}</Label>
      <Input id={id} type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="h-8 text-sm" />
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Parcel Info */}
      <Section icon={MapPin} title="Parcel Information">
        <Field label="Analysis Name *" id="name" value={form.name} onChange={v => set("name", v)} placeholder="e.g. Oak Creek Parcel" full />
        <Field label="Address" id="address" value={form.address} onChange={v => set("address", v)} placeholder="123 Main St" full />
        <Field label="APN / Parcel #" id="parcel_number" value={form.parcel_number} onChange={v => set("parcel_number", v)} placeholder="12-345-6789" />
        <Field label="Gross Site Area (acres) *" id="acres" type="number" value={form.gross_site_area_acres} onChange={v => set("gross_site_area_acres", v)} placeholder="e.g. 12.5" />
        <div className="col-span-2">
          <Label className="text-xs text-slate-500 mb-1 block">Development Type</Label>
          <Select value={form.development_type} onValueChange={v => set("development_type", v)}>
            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="single_family">Single Family</SelectItem>
              <SelectItem value="townhome">Townhome</SelectItem>
              <SelectItem value="multifamily">Multifamily</SelectItem>
              <SelectItem value="mixed_use">Mixed Use</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Section>

      <Separator />

      {/* Zoning */}
      <Section icon={LayoutGrid} title="Zoning & Development Standards">
        <div className="col-span-2">
          <Label className="text-xs text-slate-500 mb-1 block">Zoning Preset (auto-fill)</Label>
          <Select value={form.zoning_preset} onValueChange={applyPreset}>
            <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select a preset or enter manually..." /></SelectTrigger>
            <SelectContent>
              {ZONING_PRESETS.map(p => <SelectItem key={p.code} value={p.code}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Field label="Zoning Code" id="zoning_code" value={form.zoning_code} onChange={v => set("zoning_code", v)} placeholder="e.g. R-2" />
        <Field label="Min Lot Size (SF)" id="min_lot" type="number" value={form.min_lot_size_sf} onChange={v => set("min_lot_size_sf", v)} placeholder="4,000" />
        <Field label="Max Density (DU/acre)" id="density" type="number" value={form.max_density_du_per_acre} onChange={v => set("max_density_du_per_acre", v)} placeholder="10.9" />
        <Field label="Max Lot Coverage (%)" id="coverage" type="number" value={form.max_lot_coverage_pct} onChange={v => set("max_lot_coverage_pct", v)} placeholder="55" />
        <Field label="Front Setback (ft)" id="front" type="number" value={form.front_setback_ft} onChange={v => set("front_setback_ft", v)} placeholder="20" />
        <Field label="Rear Setback (ft)" id="rear" type="number" value={form.rear_setback_ft} onChange={v => set("rear_setback_ft", v)} placeholder="20" />
        <Field label="Side Setback (ft, each)" id="side" type="number" value={form.side_setback_ft} onChange={v => set("side_setback_ft", v)} placeholder="5" />
        <Field label="Max Height (ft)" id="height" type="number" value={form.max_building_height_ft} onChange={v => set("max_building_height_ft", v)} placeholder="35" />
        <Field label="Max FAR" id="far" type="number" value={form.max_far} onChange={v => set("max_far", v)} placeholder="0.5" />
      </Section>

      <Separator />

      {/* Area Deductions */}
      <Section icon={Trees} title="Area Deductions (% of Gross)">
        <Field label="Street / ROW Dedication (%)" id="streets" type="number" value={form.street_dedication_pct} onChange={v => set("street_dedication_pct", v)} placeholder="20" />
        <Field label="Open Space / Parks (%)" id="openspace" type="number" value={form.open_space_pct} onChange={v => set("open_space_pct", v)} placeholder="10" />
        <Field label="Utility Easements (%)" id="utilities" type="number" value={form.utility_easement_pct} onChange={v => set("utility_easement_pct", v)} placeholder="2" />
        <Field label="Slope Constraints (%)" id="slope" type="number" value={form.slope_constraint_pct} onChange={v => set("slope_constraint_pct", v)} placeholder="0" />
        <Field label="Wetlands / Floodplain (%)" id="wetlands" type="number" value={form.wetland_constraint_pct} onChange={v => set("wetland_constraint_pct", v)} placeholder="0" full />
      </Section>

      <Separator />

      {/* Financial */}
      <Section icon={Waves} title="Financial Inputs (Optional)">
        <Field label="Avg Unit Size (SF)" id="unit_sf" type="number" value={form.avg_unit_sf} onChange={v => set("avg_unit_sf", v)} placeholder="2,200" />
        <Field label="Est. Avg Sale Price ($)" id="asp" type="number" value={form.estimated_asp} onChange={v => set("estimated_asp", v)} placeholder="450,000" />
        <Field label="Est. Land Cost ($)" id="land_cost" type="number" value={form.estimated_land_cost} onChange={v => set("estimated_land_cost", v)} placeholder="2,500,000" full />
      </Section>

      <Button type="submit" disabled={!form.name || !form.gross_site_area_acres} className="w-full bg-slate-900 hover:bg-slate-800">
        Run Site Analysis
      </Button>
    </form>
  );
}