import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit, DollarSign, TrendingUp, Calculator, Plus, Trash2, RefreshCw, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import AIMarketSuggestion from "./AIMarketSuggestion";
import ProformaAIAnalysis from "./ProformaAIAnalysis";
import ProformaAIValidator from "./ProformaAIValidator";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
const fmt = (v) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(v || 0);

const fmtPct = (v) => (v != null ? `${parseFloat(v).toFixed(1)}%` : "—");

const n = (v) => parseFloat(v) || 0;

// ─────────────────────────────────────────────
// Default form state (mirrors Harmony proforma structure)
// ─────────────────────────────────────────────
const DEFAULT_FORM = {
  // Land
  purchase_price: "",
  purchase_takedowns: [],

  // Horizontal / Development costs (these feed into the "Dev Spend" cash flow)
  offsite_improvements: [],      // offsite road/utility improvements
  master_infrastructure: [],     // master plan/backbone infrastructure
  development_cost_phases: [],   // plat-level horizontal dev costs (Grading, Utilities, etc.)
  development_costs: "",         // Total horizontal dev cost (auto-summed or manual)

  // Soft / Financing
  soft_costs: "",
  loan_interest_rate: "",
  loan_term_months: "",
  financing_costs: "",

  // Construction draws schedule
  construction_draws: [],

  // Product types (vertical build)
  product_types: [],

  // Assumptions
  contingency_percentage: 5,
  outside_sales_commission_pct: 3,  // broker commission
  inside_sales_commission_pct: 1,   // in-house sales
  warranty_pct: 0.5,
  loan_fees_pct: 1,
  closing_misc: "",

  // Timeline
  entitlement_start_date: "",
  entitlement_approval_date: "",
  development_start_date: "",
  development_completion_date: "",
  first_home_start: "",
  first_home_sale: "",
  first_home_closing: "",

  notes: "",
  override_dev_completion: false,
};

const DEFAULT_PRODUCT = {
  name: "",
  number_of_units: "",
  average_sqft: "",
  // Revenue
  base_price: "",
  options: "",
  incentives: "",
  sales_price_per_unit: "",   // = base + options + incentives (ASP)
  // Costs
  lot_cost: "",                 // finished lot transfer price from DevCo
  building_permit_cost: "",     // permit fee per unit
  direct_cost_per_unit: "",     // vertical directs ($/sqft × sqft or total)
  directs_per_sqft: "",
  option_cost: "",              // cost of options
  // Selling / closing costs (% of revenue, computed)
  // Absorption
  absorption_pace: "",          // units/month
};

// ─────────────────────────────────────────────
// AI Draw Generator button
// ─────────────────────────────────────────────
function AIDrawsButton({ formData, onApply }) {
  const [loading, setLoading] = useState(false);
  const generate = async () => {
    if (!formData.development_costs || !formData.development_start_date) return;
    setLoading(true);
    const devCost = n(formData.development_costs);
    const startDate = new Date(formData.development_start_date);
    const endDate = formData.development_completion_date
      ? new Date(formData.development_completion_date)
      : new Date(new Date(startDate).setMonth(startDate.getMonth() + 6));
    const months = Math.max(2,
      (endDate.getFullYear() - startDate.getFullYear()) * 12 +
      (endDate.getMonth() - startDate.getMonth())
    );
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a construction finance expert. Generate a realistic construction loan draw schedule for a residential land development.
- Total development cost: $${devCost.toLocaleString()}
- Duration: ${months} months starting ${formData.development_start_date}
- Product types: ${(formData.product_types || []).map(p => p.name).filter(Boolean).join(", ") || "residential"}
Use a realistic S-curve (slow start, fast middle, tapering end). Return exactly ${months} draws summing to 100%.`,
      response_json_schema: {
        type: "object",
        properties: {
          draws: {
            type: "array",
            items: {
              type: "object",
              properties: {
                month_index: { type: "number" },
                percentage: { type: "number" },
                description: { type: "string" }
              }
            }
          }
        }
      }
    });
    if (result?.draws) {
      const draws = result.draws.map(d => {
        const drawDate = new Date(startDate);
        drawDate.setMonth(drawDate.getMonth() + (d.month_index || 0));
        return {
          date: drawDate.toISOString().split('T')[0],
          amount: ((d.percentage / 100) * devCost).toFixed(2),
          description: d.description || `Month ${(d.month_index || 0) + 1}`
        };
      });
      onApply(draws);
    }
    setLoading(false);
  };
  return (
    <Button onClick={generate} variant="outline" size="sm"
      disabled={loading || !formData.development_costs || !formData.development_start_date}
      className="border-purple-200 text-purple-700 hover:bg-purple-50">
      <Sparkles className={cn("h-4 w-4 mr-1", loading && "animate-spin")} />
      {loading ? "Generating…" : "AI Generate"}
    </Button>
  );
}

// ─────────────────────────────────────────────
// Collapsible section helper
// ─────────────────────────────────────────────
function Section({ title, children, defaultOpen = true, accent }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card className={cn("border-0 shadow-sm", accent)}>
      <CardHeader
        className="cursor-pointer select-none"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{title}</CardTitle>
          {open ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
        </div>
      </CardHeader>
      {open && <CardContent className="space-y-4">{children}</CardContent>}
    </Card>
  );
}

// ─────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────
export default function ProformaTab({ proforma, onSave, isLoading, deal }) {
  const [isEditing, setIsEditing] = useState(!proforma);

  const { data: floorPlans = [] } = useQuery({
    queryKey: ["floorPlans"],
    queryFn: () => base44.entities.FloorPlan.list(),
  });

  const [formData, setFormData] = useState(proforma || DEFAULT_FORM);

  // ── field helpers ──
  const handleChange = (field, value) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      if (field === "development_start_date" && !prev.override_dev_completion && value) {
        const s = new Date(value);
        s.setMonth(s.getMonth() + 6);
        updated.development_completion_date = s.toISOString().split("T")[0];
      }
      // Auto-generate draws when dev costs or start date change
      if ((field === "development_costs" || field === "development_start_date") &&
        updated.development_costs && updated.development_start_date) {
        const devCost = n(updated.development_costs);
        const start = new Date(updated.development_start_date);
        if (devCost > 0) {
          const pattern = [0.05, 0.10, 0.15, 0.20, 0.25, 0.20, 0.05];
          updated.construction_draws = pattern.map((pct, i) => {
            const d = new Date(start);
            d.setMonth(d.getMonth() + i);
            return { date: d.toISOString().split("T")[0], amount: (devCost * pct).toFixed(2), description: `Month ${i + 1} — ${(pct * 100).toFixed(0)}%` };
          });
        }
      }
      // Auto-compute ASP from base+options+incentives
      if (["base_price","options","incentives"].some(k => field.startsWith(k) && field.includes("product_types"))) {
        // handled in updateProductType
      }
      return updated;
    });
  };

  // ── list helpers ──
  const listHelper = (key) => ({
    add: (blank) => setFormData(p => ({ ...p, [key]: [...(p[key] || []), blank] })),
    remove: (i) => setFormData(p => ({ ...p, [key]: (p[key] || []).filter((_, idx) => idx !== i) })),
    update: (i, field, val) => setFormData(p => ({ ...p, [key]: (p[key] || []).map((row, idx) => idx === i ? { ...row, [field]: val } : row) })),
  });

  const devPhases = listHelper("development_cost_phases");
  const offsites = listHelper("offsite_improvements");
  const masterInfra = listHelper("master_infrastructure");
  const draws = listHelper("construction_draws");

  const addProductType = () =>
    setFormData(p => ({ ...p, product_types: [...(p.product_types || []), { ...DEFAULT_PRODUCT }] }));
  const removeProductType = (i) =>
    setFormData(p => ({ ...p, product_types: p.product_types.filter((_, idx) => idx !== i) }));
  const updateProductType = (i, field, val) => {
    setFormData(p => {
      const pts = p.product_types.map((pt, idx) => {
        if (idx !== i) return pt;
        const updated = { ...pt, [field]: val };
        // Auto-compute ASP
        if (["base_price","options","incentives"].includes(field)) {
          const asp = n(updated.base_price) + n(updated.options) + n(updated.incentives);
          updated.sales_price_per_unit = asp || updated.sales_price_per_unit;
        }
        // Auto-compute directs total from $/sqft
        if (["directs_per_sqft","average_sqft"].includes(field)) {
          if (updated.directs_per_sqft && updated.average_sqft) {
            updated.direct_cost_per_unit = (n(updated.directs_per_sqft) * n(updated.average_sqft)).toFixed(0);
          }
        }
        return updated;
      });
      return { ...p, product_types: pts };
    });
  };

  const selectFloorPlan = (i, fpId) => {
    const fp = floorPlans.find(f => f.id === fpId);
    if (!fp) return;
    setFormData(p => ({
      ...p,
      product_types: p.product_types.map((pt, idx) => idx !== i ? pt : {
        ...pt,
        average_sqft: fp.square_footage || pt.average_sqft,
        base_price: fp.base_price || pt.base_price,
        options: fp.options || pt.options,
        incentives: fp.incentives || pt.incentives,
        sales_price_per_unit: fp.asp || pt.sales_price_per_unit,
        directs_per_sqft: fp.directs_per_sqft || pt.directs_per_sqft,
        direct_cost_per_unit: fp.directs_total || pt.direct_cost_per_unit,
        building_permit_cost: fp.permit_cost || pt.building_permit_cost,
        lot_cost: fp.lot_cost || pt.lot_cost,
        floor_plan_id: fp.id,
        floor_plan_name: fp.name,
      })
    }));
  };

  // ── save ──
  const handleSave = () => {
    const data = {
      ...formData,
      purchase_price: formData.purchase_price ? n(formData.purchase_price) : null,
      development_costs: formData.development_costs ? n(formData.development_costs) : null,
      soft_costs: formData.soft_costs ? n(formData.soft_costs) : null,
      financing_costs: formData.financing_costs ? n(formData.financing_costs) : null,
      loan_interest_rate: formData.loan_interest_rate ? n(formData.loan_interest_rate) : null,
      loan_term_months: formData.loan_term_months ? n(formData.loan_term_months) : null,
      contingency_percentage: n(formData.contingency_percentage) || 5,
      outside_sales_commission_pct: n(formData.outside_sales_commission_pct) || 3,
      inside_sales_commission_pct: n(formData.inside_sales_commission_pct) || 1,
      warranty_pct: n(formData.warranty_pct) || 0.5,
      loan_fees_pct: n(formData.loan_fees_pct) || 1,
      purchase_takedowns: (formData.purchase_takedowns || []).map(td => ({ ...td, amount: n(td.amount) })),
      construction_draws: (formData.construction_draws || []).map(dr => ({ ...dr, amount: n(dr.amount) })),
      development_cost_phases: (formData.development_cost_phases || []).map(p => ({ ...p, amount: n(p.amount) })),
      offsite_improvements: (formData.offsite_improvements || []).map(p => ({ ...p, amount: n(p.amount) })),
      master_infrastructure: (formData.master_infrastructure || []).map(p => ({ ...p, amount: n(p.amount) })),
      product_types: (formData.product_types || []).map(pt => ({
        ...pt,
        number_of_units: n(pt.number_of_units),
        average_sqft: n(pt.average_sqft) || null,
        base_price: n(pt.base_price) || null,
        options: n(pt.options) || null,
        incentives: n(pt.incentives) || null,
        sales_price_per_unit: n(pt.sales_price_per_unit),
        lot_cost: n(pt.lot_cost) || null,
        direct_cost_per_unit: n(pt.direct_cost_per_unit),
        building_permit_cost: n(pt.building_permit_cost),
        directs_per_sqft: n(pt.directs_per_sqft) || null,
        option_cost: n(pt.option_cost) || null,
        absorption_pace: n(pt.absorption_pace),
      })),
    };
    onSave(data);
    setIsEditing(false);
  };

  // ─────────────────────────────────────────────
  // Derived calculations (mirrors Harmony proforma)
  // ─────────────────────────────────────────────
  const purchasePrice = n(formData.purchase_price);
  const devCosts = n(formData.development_costs);
  const softCosts = n(formData.soft_costs);
  const loanRate = n(formData.loan_interest_rate);
  const loanMonths = n(formData.loan_term_months);
  const contingencyPct = n(formData.contingency_percentage) || 5;
  const outsideCommPct = n(formData.outside_sales_commission_pct) || 3;
  const insideCommPct = n(formData.inside_sales_commission_pct) || 1;
  const warrantyPct = n(formData.warranty_pct) || 0.5;
  const loanFeesPct = n(formData.loan_fees_pct) || 1;

  const productTypes = formData.product_types || [];
  const numUnits = productTypes.reduce((s, pt) => s + n(pt.number_of_units), 0);
  const grossRevenue = productTypes.reduce((s, pt) => s + n(pt.number_of_units) * n(pt.sales_price_per_unit), 0);
  const totalLotCosts = productTypes.reduce((s, pt) => s + n(pt.number_of_units) * n(pt.lot_cost), 0);
  const totalDirectCosts = productTypes.reduce((s, pt) => s + n(pt.number_of_units) * n(pt.direct_cost_per_unit), 0);
  const totalPermitCosts = productTypes.reduce((s, pt) => s + n(pt.number_of_units) * n(pt.building_permit_cost), 0);
  const totalOptionCosts = productTypes.reduce((s, pt) => s + n(pt.number_of_units) * n(pt.option_cost), 0);
  const totalAbsorption = productTypes.reduce((s, pt) => s + n(pt.absorption_pace), 0);

  const calcFinancing = () => {
    const cDraws = formData.construction_draws || [];
    if (cDraws.length > 0 && formData.development_completion_date && loanRate > 0) {
      const comp = new Date(formData.development_completion_date);
      return cDraws.reduce((sum, dr) => {
        if (!dr.date || !dr.amount) return sum;
        const months = Math.max(0,
          (comp.getFullYear() - new Date(dr.date).getFullYear()) * 12 +
          (comp.getMonth() - new Date(dr.date).getMonth())
        );
        return sum + n(dr.amount) * (loanRate / 100) * (months / 12);
      }, 0);
    }
    if (loanRate > 0 && loanMonths > 0 && devCosts > 0) return devCosts * (loanRate / 100) * (loanMonths / 12);
    return n(formData.financing_costs);
  };
  const financingCosts = calcFinancing();

  // Total vertical / selling costs per product type
  const outsideCommission = grossRevenue * (outsideCommPct / 100);
  const insideCommission = grossRevenue * (insideCommPct / 100);
  const warranty = grossRevenue * (warrantyPct / 100);
  const loanFees = grossRevenue * (loanFeesPct / 100);
  const closingMisc = n(formData.closing_misc);

  const contingency = (purchasePrice + devCosts + softCosts + totalDirectCosts + totalPermitCosts) * (contingencyPct / 100);
  const totalVerticalCosts = totalLotCosts + totalDirectCosts + totalPermitCosts + totalOptionCosts;
  const totalSellingCosts = outsideCommission + insideCommission + warranty + loanFees + closingMisc;

  const totalCosts = purchasePrice + devCosts + softCosts + financingCosts + totalVerticalCosts + totalSellingCosts + contingency;
  const profit = grossRevenue - totalCosts;
  const grossMarginPct = grossRevenue > 0 ? (profit / grossRevenue) * 100 : 0;
  const netAssets = purchasePrice + devCosts + softCosts + totalVerticalCosts + contingency;
  const rona = netAssets > 0 ? (profit / netAssets) * 100 : 0;

  const purchasePricePerUnit = numUnits > 0 ? purchasePrice / numUnits : 0;
  const devCostPerUnit = numUnits > 0 ? devCosts / numUnits : 0;
  const totalCostPerUnit = numUnits > 0 ? totalCosts / numUnits : 0;
  const revenuePerUnit = numUnits > 0 ? grossRevenue / numUnits : 0;

  const calcFinalClosing = () => {
    if (!formData.first_home_closing || totalAbsorption === 0 || numUnits === 0) return null;
    const d = new Date(formData.first_home_closing);
    d.setMonth(d.getMonth() + Math.ceil(numUnits / totalAbsorption) - 1);
    return d.toISOString().split("T")[0];
  };

  // Unlevered IRR
  const calcIRR = () => {
    if (!formData.development_start_date || !formData.first_home_closing || totalAbsorption === 0 || numUnits === 0) return null;
    const devStart = new Date(formData.development_start_date);
    const firstClose = new Date(formData.first_home_closing);
    const cfs = new Map();

    (formData.purchase_takedowns || []).forEach(td => {
      if (!td.date || !td.amount) return;
      const m = (new Date(td.date).getFullYear() - devStart.getFullYear()) * 12 + (new Date(td.date).getMonth() - devStart.getMonth());
      cfs.set(m, (cfs.get(m) || 0) - n(td.amount));
    });

    let totalTD = (formData.purchase_takedowns || []).reduce((s, td) => s + n(td.amount), 0);
    const upfront = (totalTD > 0 ? 0 : purchasePrice) + softCosts + totalVerticalCosts + contingency;
    cfs.set(0, (cfs.get(0) || 0) - upfront);

    (formData.construction_draws || []).forEach(dr => {
      if (!dr.date || !dr.amount) return;
      const m = (new Date(dr.date).getFullYear() - devStart.getFullYear()) * 12 + (new Date(dr.date).getMonth() - devStart.getMonth());
      cfs.set(m, (cfs.get(m) || 0) - n(dr.amount));
    });

    const pfs = productTypes.map(pt => ({ units: n(pt.number_of_units), price: n(pt.sales_price_per_unit), pace: n(pt.absorption_pace), sold: 0 }));
    const m0 = (firstClose.getFullYear() - devStart.getFullYear()) * 12 + (firstClose.getMonth() - devStart.getMonth());
    let cur = m0;
    while (cur <= 240 && pfs.some(p => p.sold < p.units)) {
      let rev = 0;
      for (const pf of pfs) {
        if (pf.sold < pf.units) {
          const sell = Math.min(pf.pace, pf.units - pf.sold);
          rev += sell * pf.price * (1 - (outsideCommPct + insideCommPct + warrantyPct + loanFeesPct) / 100);
          pf.sold += sell;
        }
      }
      if (rev > 0) cfs.set(cur, (cfs.get(cur) || 0) + rev);
      cur++;
    }

    const maxM = Math.max(...cfs.keys());
    const flows = Array.from({ length: maxM + 1 }, (_, i) => cfs.get(i) || 0);
    if (flows.length <= 1) return null;

    const npv = (r) => flows.reduce((s, f, t) => s + f / Math.pow(1 + r, t), 0);
    let rate = 0.01;
    for (let i = 0; i < 100; i++) {
      const v = npv(rate);
      const dv = flows.reduce((s, f, t) => s - (t * f) / Math.pow(1 + rate, t + 1), 0);
      if (Math.abs(dv) < 1e-8) break;
      const nr = rate - v / dv;
      if (Math.abs(nr - rate) < 0.0001) return (Math.pow(1 + nr, 12) - 1) * 100;
      rate = nr;
    }
    return null;
  };
  const unleveredIRR = calcIRR();

  // Peak Capital
  const peakCapital = (() => {
    if (!formData.development_start_date) return { amount: 0, date: null };
    const devStart = new Date(formData.development_start_date);
    const cfs = new Map();
    let totalTD = (formData.purchase_takedowns || []).reduce((s, td) => s + n(td.amount), 0);
    (formData.purchase_takedowns || []).forEach(td => {
      if (!td.date || !td.amount) return;
      const m = (new Date(td.date).getFullYear() - devStart.getFullYear()) * 12 + (new Date(td.date).getMonth() - devStart.getMonth());
      cfs.set(m, (cfs.get(m) || 0) - n(td.amount));
    });
    const upfront = (totalTD > 0 ? 0 : purchasePrice) + softCosts + totalVerticalCosts + contingency;
    cfs.set(0, (cfs.get(0) || 0) - upfront);
    (formData.construction_draws || []).forEach(dr => {
      if (!dr.date || !dr.amount) return;
      const m = (new Date(dr.date).getFullYear() - devStart.getFullYear()) * 12 + (new Date(dr.date).getMonth() - devStart.getMonth());
      cfs.set(m, (cfs.get(m) || 0) - n(dr.amount));
    });
    const maxM = Math.max(...cfs.keys(), 0);
    let cum = 0, peak = 0, peakM = 0;
    for (let i = 0; i <= maxM; i++) {
      cum += (cfs.get(i) || 0);
      if (cum < peak) { peak = cum; peakM = i; }
    }
    const d = new Date(devStart);
    d.setMonth(d.getMonth() + peakM);
    return { amount: Math.abs(peak), date: peak < 0 ? d.toISOString().split("T")[0] : null };
  })();

  // ─────────────────────────────────────────────
  // EDIT FORM
  // ─────────────────────────────────────────────
  if (isEditing) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-slate-900">Edit Proforma</h2>
          <div className="flex gap-2">
            {proforma && (
              <Button variant="outline" onClick={() => { setFormData(proforma); setIsEditing(false); }}>Cancel</Button>
            )}
            <Button onClick={handleSave} disabled={isLoading} className="bg-slate-900 hover:bg-slate-800">
              {isLoading ? "Saving…" : "Save Proforma"}
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          {/* ── 1. LAND ACQUISITION ── */}
          <Section title="1. Land Acquisition">
            <div>
              <Label>Total Purchase Price</Label>
              <Input type="number" value={formData.purchase_price} onChange={e => handleChange("purchase_price", e.target.value)} placeholder="$0" />
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-2">
                <Label>Purchase Takedowns (optional)</Label>
                <Button type="button" size="sm" variant="outline" onClick={() => handleChange("purchase_takedowns", [...(formData.purchase_takedowns || []), { date: "", amount: "", description: "" }])}>
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
              </div>
              <div className="space-y-2">
                {(formData.purchase_takedowns || []).map((td, i) => (
                  <div key={i} className="flex gap-2 items-center bg-slate-50 rounded-lg p-2">
                    <Input type="date" value={td.date} onChange={e => { const t = [...formData.purchase_takedowns]; t[i] = { ...t[i], date: e.target.value }; handleChange("purchase_takedowns", t); }} className="flex-1" />
                    <Input type="number" value={td.amount} onChange={e => { const t = [...formData.purchase_takedowns]; t[i] = { ...t[i], amount: e.target.value }; handleChange("purchase_takedowns", t); }} placeholder="Amount" className="w-36" />
                    <Input value={td.description} onChange={e => { const t = [...formData.purchase_takedowns]; t[i] = { ...t[i], description: e.target.value }; handleChange("purchase_takedowns", t); }} placeholder="Description" className="flex-1" />
                    <Button type="button" size="icon" variant="ghost" onClick={() => handleChange("purchase_takedowns", formData.purchase_takedowns.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                ))}
                {!(formData.purchase_takedowns || []).length && <p className="text-xs text-slate-400 text-center py-2">Full purchase price paid at development start</p>}
              </div>
            </div>
          </Section>

          {/* ── 2. HORIZONTAL / DEVELOPMENT COSTS ── */}
          <Section title="2. Horizontal Development Costs">
            <p className="text-xs text-slate-500">Enter the total horizontal dev cost, then optionally break it down by category. The total drives the construction draw schedule.</p>
            <div>
              <Label>Total Horizontal Dev Cost</Label>
              <Input type="number" value={formData.development_costs} onChange={e => handleChange("development_costs", e.target.value)} placeholder="$0" />
              {(formData.development_cost_phases || []).length > 0 && (
                <p className="text-xs text-emerald-600 mt-1">Phases sum: {fmt((formData.development_cost_phases || []).reduce((s, p) => s + n(p.amount), 0))}</p>
              )}
            </div>

            {/* Offsite */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-orange-700">Offsite Improvements</Label>
                <Button type="button" size="sm" variant="outline" className="border-orange-200 text-orange-700" onClick={() => offsites.add({ name: "", amount: "", description: "" })}>
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
              </div>
              <div className="space-y-2">
                {(formData.offsite_improvements || []).map((p, i) => (
                  <div key={i} className="flex gap-2 items-center bg-orange-50 rounded-lg p-2">
                    <Input value={p.name} onChange={e => offsites.update(i, "name", e.target.value)} placeholder="e.g. Road widening" className="flex-1 h-8 text-sm" />
                    <Input type="number" value={p.amount} onChange={e => offsites.update(i, "amount", e.target.value)} placeholder="Amount" className="w-32 h-8 text-sm" />
                    <Input value={p.description} onChange={e => offsites.update(i, "description", e.target.value)} placeholder="Notes" className="flex-1 h-8 text-sm" />
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-red-400" onClick={() => offsites.remove(i)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                ))}
                {!(formData.offsite_improvements || []).length && <p className="text-xs text-slate-400 text-center py-2">None</p>}
              </div>
            </div>

            {/* Master */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-blue-700">Master Infrastructure</Label>
                <Button type="button" size="sm" variant="outline" className="border-blue-200 text-blue-700" onClick={() => masterInfra.add({ name: "", amount: "", description: "" })}>
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
              </div>
              <div className="space-y-2">
                {(formData.master_infrastructure || []).map((p, i) => (
                  <div key={i} className="flex gap-2 items-center bg-blue-50 rounded-lg p-2">
                    <Input value={p.name} onChange={e => masterInfra.update(i, "name", e.target.value)} placeholder="e.g. Water main" className="flex-1 h-8 text-sm" />
                    <Input type="number" value={p.amount} onChange={e => masterInfra.update(i, "amount", e.target.value)} placeholder="Amount" className="w-32 h-8 text-sm" />
                    <Input value={p.description} onChange={e => masterInfra.update(i, "description", e.target.value)} placeholder="Notes" className="flex-1 h-8 text-sm" />
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-red-400" onClick={() => masterInfra.remove(i)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                ))}
                {!(formData.master_infrastructure || []).length && <p className="text-xs text-slate-400 text-center py-2">None</p>}
              </div>
            </div>

            {/* Plat/Phase breakdown */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-2">
                <Label>Plat / Phase Breakdown</Label>
                <Button type="button" size="sm" variant="outline" onClick={() => devPhases.add({ phase_name: "", amount: "", description: "" })}>
                  <Plus className="h-4 w-4 mr-1" /> Add Plat
                </Button>
              </div>
              <div className="space-y-2">
                {(formData.development_cost_phases || []).map((p, i) => (
                  <div key={i} className="flex gap-2 items-center bg-slate-50 rounded-lg p-2">
                    <Input value={p.phase_name} onChange={e => devPhases.update(i, "phase_name", e.target.value)} placeholder="e.g. A-7, Grading" className="flex-1 h-8 text-sm" />
                    <Input type="number" value={p.amount} onChange={e => devPhases.update(i, "amount", e.target.value)} placeholder="Amount" className="w-32 h-8 text-sm" />
                    <Input value={p.description} onChange={e => devPhases.update(i, "description", e.target.value)} placeholder="Notes" className="flex-1 h-8 text-sm" />
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-red-400" onClick={() => devPhases.remove(i)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                ))}
                {!(formData.development_cost_phases || []).length && <p className="text-xs text-slate-400 text-center py-2">None</p>}
              </div>
            </div>
          </Section>

          {/* ── 3. PRODUCT TYPES / VERTICAL BUILD ── */}
          <Section title="3. Product Types — Vertical Build & Revenue">
            <p className="text-xs text-slate-500">For each product type enter revenue (base price, options, incentives) and direct build costs. ASP is auto-calculated from Base + Options + Incentives.</p>
            <div className="space-y-4">
              {(formData.product_types || []).map((pt, i) => (
                <div key={i} className="border border-slate-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-slate-800 text-sm">Product Type {i + 1}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={() => removeProductType(i)}><Trash2 className="h-4 w-4" /></Button>
                  </div>

                  {/* Name + Floor Plan */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Name (e.g. 50' SF, THs)</Label>
                      <Input value={pt.name} onChange={e => updateProductType(i, "name", e.target.value)} placeholder="50 SF" className="h-9" />
                    </div>
                    <div>
                      <Label className="text-xs">Link Floor Plan</Label>
                      <Select onValueChange={v => selectFloorPlan(i, v)} value={pt.floor_plan_id || ""}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Select…" /></SelectTrigger>
                        <SelectContent>
                          {floorPlans.map(fp => (
                            <SelectItem key={fp.id} value={fp.id}>{fp.name} {fp.community ? `(${fp.community})` : ""}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Count + Sqft */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Number of Units</Label>
                      <Input type="number" value={pt.number_of_units} onChange={e => updateProductType(i, "number_of_units", e.target.value)} placeholder="0" className="h-9" />
                    </div>
                    <div>
                      <Label className="text-xs">Avg Sq Ft</Label>
                      <Input type="number" value={pt.average_sqft} onChange={e => updateProductType(i, "average_sqft", e.target.value)} placeholder="0" className="h-9" />
                    </div>
                  </div>

                  {/* Revenue */}
                  <div className="bg-emerald-50 rounded-lg p-3 space-y-2">
                    <p className="text-xs font-semibold text-emerald-800">Revenue / Unit</p>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <Label className="text-xs">Base Price</Label>
                        <Input type="number" value={pt.base_price} onChange={e => updateProductType(i, "base_price", e.target.value)} placeholder="$0" className="h-8 text-sm" />
                      </div>
                      <div>
                        <Label className="text-xs">Avg Options</Label>
                        <Input type="number" value={pt.options} onChange={e => updateProductType(i, "options", e.target.value)} placeholder="$0" className="h-8 text-sm" />
                      </div>
                      <div>
                        <Label className="text-xs">Incentives</Label>
                        <Input type="number" value={pt.incentives} onChange={e => updateProductType(i, "incentives", e.target.value)} placeholder="$0 (negative)" className="h-8 text-sm" />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">ASP / Unit (auto-calculated or override)</Label>
                      <Input type="number" value={pt.sales_price_per_unit} onChange={e => updateProductType(i, "sales_price_per_unit", e.target.value)} placeholder="$0" className="h-8 text-sm font-medium" />
                    </div>
                  </div>

                  {/* Costs */}
                  <div className="bg-red-50 rounded-lg p-3 space-y-2">
                    <p className="text-xs font-semibold text-red-800">Costs / Unit</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Finished Lot Cost</Label>
                        <Input type="number" value={pt.lot_cost} onChange={e => updateProductType(i, "lot_cost", e.target.value)} placeholder="$0" className="h-8 text-sm" />
                      </div>
                      <div>
                        <Label className="text-xs">Building Permit</Label>
                        <Input type="number" value={pt.building_permit_cost} onChange={e => updateProductType(i, "building_permit_cost", e.target.value)} placeholder="$0" className="h-8 text-sm" />
                      </div>
                      <div>
                        <Label className="text-xs">Directs $/sqft</Label>
                        <Input type="number" value={pt.directs_per_sqft} onChange={e => updateProductType(i, "directs_per_sqft", e.target.value)} placeholder="$0" className="h-8 text-sm" />
                      </div>
                      <div>
                        <Label className="text-xs">Total Direct Build Cost</Label>
                        <Input type="number" value={pt.direct_cost_per_unit} onChange={e => updateProductType(i, "direct_cost_per_unit", e.target.value)} placeholder="Auto from $/sqft" className="h-8 text-sm" />
                      </div>
                      <div>
                        <Label className="text-xs">Option Build Cost</Label>
                        <Input type="number" value={pt.option_cost} onChange={e => updateProductType(i, "option_cost", e.target.value)} placeholder="$0" className="h-8 text-sm" />
                      </div>
                    </div>
                  </div>

                  {/* Absorption */}
                  <div className="grid grid-cols-1 gap-2">
                    <div>
                      <Label className="text-xs">Absorption Pace (units/month)</Label>
                      <Input type="number" step="0.1" value={pt.absorption_pace} onChange={e => updateProductType(i, "absorption_pace", e.target.value)} placeholder="0" className="h-9" />
                    </div>
                  </div>

                  {/* AI market suggestion */}
                  <AIMarketSuggestion
                    deal={deal}
                    productType={pt}
                    onApply={(vals) => {
                      if (vals.sales_price_per_unit) updateProductType(i, "sales_price_per_unit", vals.sales_price_per_unit);
                      if (vals.absorption_pace) updateProductType(i, "absorption_pace", vals.absorption_pace);
                    }}
                  />

                  {/* Per-unit summary */}
                  {(n(pt.sales_price_per_unit) > 0 || n(pt.direct_cost_per_unit) > 0) && (
                    <div className="grid grid-cols-3 gap-2 text-xs bg-slate-50 rounded p-2">
                      <div>
                        <span className="text-slate-500">Revenue</span>
                        <p className="font-semibold">{fmt(n(pt.number_of_units) * n(pt.sales_price_per_unit))}</p>
                      </div>
                      <div>
                        <span className="text-slate-500">Total Costs</span>
                        <p className="font-semibold">{fmt(n(pt.number_of_units) * (n(pt.lot_cost) + n(pt.direct_cost_per_unit) + n(pt.building_permit_cost) + n(pt.option_cost)))}</p>
                      </div>
                      <div>
                        <span className="text-slate-500">Gross Margin</span>
                        <p className="font-semibold">
                          {n(pt.sales_price_per_unit) > 0
                            ? fmtPct(((n(pt.sales_price_per_unit) - n(pt.lot_cost) - n(pt.direct_cost_per_unit) - n(pt.building_permit_cost) - n(pt.option_cost)) / n(pt.sales_price_per_unit)) * 100)
                            : "—"}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              <Button onClick={addProductType} variant="outline" className="w-full">
                <Plus className="h-4 w-4 mr-2" /> Add Product Type
              </Button>
            </div>

            {/* Assumptions */}
            <div className="border-t pt-4">
              <p className="text-xs font-semibold text-slate-700 mb-3">Selling / Closing Assumptions (% of gross revenue)</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <Label className="text-xs">Outside Sales Comm %</Label>
                  <Input type="number" step="0.1" value={formData.outside_sales_commission_pct} onChange={e => handleChange("outside_sales_commission_pct", e.target.value)} placeholder="3" className="h-9" />
                </div>
                <div>
                  <Label className="text-xs">Inside Sales Comm %</Label>
                  <Input type="number" step="0.1" value={formData.inside_sales_commission_pct} onChange={e => handleChange("inside_sales_commission_pct", e.target.value)} placeholder="1" className="h-9" />
                </div>
                <div>
                  <Label className="text-xs">Warranty %</Label>
                  <Input type="number" step="0.1" value={formData.warranty_pct} onChange={e => handleChange("warranty_pct", e.target.value)} placeholder="0.5" className="h-9" />
                </div>
                <div>
                  <Label className="text-xs">Loan Fees %</Label>
                  <Input type="number" step="0.1" value={formData.loan_fees_pct} onChange={e => handleChange("loan_fees_pct", e.target.value)} placeholder="1" className="h-9" />
                </div>
                <div>
                  <Label className="text-xs">Closing / Misc ($)</Label>
                  <Input type="number" value={formData.closing_misc} onChange={e => handleChange("closing_misc", e.target.value)} placeholder="0" className="h-9" />
                </div>
                <div>
                  <Label className="text-xs">Contingency %</Label>
                  <Input type="number" step="0.1" value={formData.contingency_percentage} onChange={e => handleChange("contingency_percentage", e.target.value)} placeholder="5" className="h-9" />
                </div>
              </div>
            </div>
          </Section>

          {/* ── 4. SOFT COSTS & FINANCING ── */}
          <Section title="4. Soft Costs & Financing" defaultOpen={false}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Soft Costs (total)</Label>
                <Input type="number" value={formData.soft_costs} onChange={e => handleChange("soft_costs", e.target.value)} placeholder="$0" />
              </div>
              <div>
                <Label>Financing Costs (manual override)</Label>
                <Input type="number" value={formData.financing_costs} onChange={e => handleChange("financing_costs", e.target.value)} placeholder="$0" />
                {financingCosts > 0 && !formData.financing_costs && (
                  <p className="text-xs text-slate-500 mt-1">Calculated: {fmt(financingCosts)}</p>
                )}
              </div>
              <div>
                <Label>Interest Rate (%)</Label>
                <Input type="number" step="0.01" value={formData.loan_interest_rate} onChange={e => handleChange("loan_interest_rate", e.target.value)} placeholder="0.00" />
              </div>
              <div>
                <Label>Loan Term (months)</Label>
                <Input type="number" value={formData.loan_term_months} onChange={e => handleChange("loan_term_months", e.target.value)} placeholder="0" />
              </div>
            </div>

            {/* Construction draws */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <Label>Construction Draw Schedule</Label>
                  <p className="text-xs text-slate-500">Auto-generated as S-curve when dev cost + start date are entered</p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => formData.development_costs && handleChange("development_costs", formData.development_costs)} variant="outline" size="sm" disabled={!formData.development_costs || !formData.development_start_date}>
                    <RefreshCw className="h-4 w-4 mr-1" /> Regenerate
                  </Button>
                  <AIDrawsButton formData={formData} onApply={d => setFormData(p => ({ ...p, construction_draws: d }))} />
                  <Button onClick={() => draws.add({ date: "", amount: "", description: "" })} variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-1" /> Add
                  </Button>
                </div>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {(formData.construction_draws || []).map((dr, i) => (
                  <div key={i} className="flex gap-2 items-center bg-slate-50 rounded p-2">
                    <Input type="date" value={dr.date} onChange={e => draws.update(i, "date", e.target.value)} className="flex-1 h-8 text-sm" />
                    <Input type="number" value={dr.amount} onChange={e => draws.update(i, "amount", e.target.value)} placeholder="Amount" className="w-36 h-8 text-sm" />
                    <Input value={dr.description} onChange={e => draws.update(i, "description", e.target.value)} placeholder="Desc" className="flex-1 h-8 text-sm" />
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-red-400" onClick={() => draws.remove(i)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                ))}
                {!(formData.construction_draws || []).length && <p className="text-xs text-slate-400 text-center py-4">No draws scheduled</p>}
              </div>
            </div>
          </Section>

          {/* ── 5. TIMELINE ── */}
          <Section title="5. Project Timeline" defaultOpen={false}>
            <div className="grid grid-cols-2 gap-4">
              {[
                ["entitlement_start_date", "Entitlement Start"],
                ["entitlement_approval_date", "Entitlement Approval"],
                ["development_start_date", "Development Start"],
                ["first_home_start", "First Home Start"],
                ["first_home_sale", "First Home Sale"],
                ["first_home_closing", "First Home Closing"],
              ].map(([field, label]) => (
                <div key={field}>
                  <Label>{label}</Label>
                  <Input type="date" value={formData[field]} onChange={e => handleChange(field, e.target.value)} />
                </div>
              ))}
              <div>
                <Label>Development Completion</Label>
                <Input type="date" value={formData.development_completion_date} onChange={e => handleChange("development_completion_date", e.target.value)} disabled={!formData.override_dev_completion} />
                <div className="flex items-center gap-2 mt-1">
                  <Checkbox id="ov" checked={!!formData.override_dev_completion} onCheckedChange={v => handleChange("override_dev_completion", v)} />
                  <Label htmlFor="ov" className="text-xs font-normal cursor-pointer">Manual override</Label>
                </div>
                {!formData.override_dev_completion && formData.development_start_date && (
                  <p className="text-xs text-emerald-600">Auto: 6 months after start</p>
                )}
              </div>
            </div>
          </Section>

          {/* ── Notes ── */}
          <Card className="border-0 shadow-sm">
            <CardHeader><CardTitle className="text-base">Notes</CardTitle></CardHeader>
            <CardContent>
              <Textarea value={formData.notes} onChange={e => handleChange("notes", e.target.value)} rows={3} placeholder="Assumptions, caveats, market notes…" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────
  // READ-ONLY VIEW
  // ─────────────────────────────────────────────
  if (!proforma) {
    return (
      <div className="text-center py-12">
        <Calculator className="h-12 w-12 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-slate-900 mb-2">No Proforma Yet</h3>
        <p className="text-slate-500 mb-4">Create a financial proforma to analyze this deal</p>
        <Button onClick={() => setIsEditing(true)} className="bg-slate-900 hover:bg-slate-800">Create Proforma</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-slate-900">Financial Proforma</h2>
        <Button onClick={() => setIsEditing(true)} variant="outline"><Edit className="h-4 w-4 mr-2" /> Edit</Button>
      </div>

      {/* KPI banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Gross Revenue", val: fmt(grossRevenue), sub: `${numUnits} units` },
          { label: "Total Costs", val: fmt(totalCosts), sub: `${fmt(totalCostPerUnit)} / unit` },
          { label: "Net Profit", val: fmt(profit), sub: fmtPct(grossMarginPct) + " margin", color: profit >= 0 ? "text-emerald-700" : "text-red-700" },
          { label: "Unlevered IRR", val: unleveredIRR ? fmtPct(unleveredIRR) : "—", sub: "annualized", color: unleveredIRR && unleveredIRR >= 0 ? "text-blue-700" : "text-slate-400" },
          { label: "Peak Capital", val: fmt(peakCapital.amount), sub: peakCapital.date ? `Peak: ${format(new Date(peakCapital.date), "MMM yyyy")}` : "Add timeline data", color: "text-amber-700" },
        ].map(k => (
          <Card key={k.label} className="border-0 shadow-sm">
            <CardContent className="p-5">
              <p className="text-xs text-slate-500 mb-1">{k.label}</p>
              <p className={cn("text-2xl font-bold", k.color || "text-slate-900")}>{k.val}</p>
              <p className="text-xs text-slate-400 mt-1">{k.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {[
          { label: "RONA", val: fmtPct(rona) },
          { label: "Gross Margin %", val: fmtPct(grossMarginPct) },
          { label: "Land / Unit", val: fmt(purchasePricePerUnit) },
          { label: "Dev / Unit", val: fmt(devCostPerUnit) },
          { label: "Revenue / Unit", val: fmt(revenuePerUnit) },
          { label: "Absorption", val: `${totalAbsorption.toFixed(1)}/mo` },
        ].map(k => (
          <div key={k.label} className="bg-slate-50 rounded-lg p-3 text-center">
            <p className="text-xs text-slate-500">{k.label}</p>
            <p className="text-base font-semibold text-slate-800">{k.val}</p>
          </div>
        ))}
      </div>

      {/* AI Analysis */}
      <ProformaAIAnalysis
        proforma={proforma}
        deal={deal}
        metrics={{ grossRevenue, totalCosts, profit, grossMarginPct, unleveredIRR, numUnits, totalAbsorption }}
      />

      {/* Cost & Revenue breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-0 shadow-sm">
          <CardHeader><CardTitle className="text-base">Cost Breakdown</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {[
              ["Land Purchase", purchasePrice],
              ["Horizontal Dev", devCosts],
              ["Soft Costs", softCosts],
              ["Financing", financingCosts],
              ["Finished Lot Costs", totalLotCosts],
              ["Direct Build Costs", totalDirectCosts],
              ["Permit Costs", totalPermitCosts],
              ["Option Build Costs", totalOptionCosts],
              ["Outside Commission", outsideCommission],
              ["Inside Commission", insideCommission],
              ["Warranty", warranty],
              ["Loan Fees", loanFees],
              ["Closing / Misc", closingMisc],
              ["Contingency", contingency],
            ].filter(([, v]) => v > 0).map(([label, val]) => (
              <div key={label} className="flex justify-between">
                <span className="text-slate-600">{label}</span>
                <span className="font-medium">{fmt(val)}</span>
              </div>
            ))}
            <div className="border-t pt-2 flex justify-between font-semibold">
              <span>Total</span><span>{fmt(totalCosts)}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader><CardTitle className="text-base">Revenue by Product Type</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {productTypes.map((pt, i) => {
              const rev = n(pt.number_of_units) * n(pt.sales_price_per_unit);
              const cost = n(pt.number_of_units) * (n(pt.lot_cost) + n(pt.direct_cost_per_unit) + n(pt.building_permit_cost) + n(pt.option_cost));
              const gm = rev > 0 ? ((rev - cost) / rev) * 100 : 0;
              return (
                <div key={i} className="pb-3 border-b border-slate-100 last:border-0">
                  <div className="flex justify-between font-medium mb-1">
                    <span>{pt.name || `Product ${i + 1}`}</span>
                    <span>{fmt(rev)}</span>
                  </div>
                  <div className="text-xs text-slate-500 pl-3 space-y-0.5">
                    <div className="flex justify-between"><span>{n(pt.number_of_units)} units × {fmt(n(pt.sales_price_per_unit))} ASP</span></div>
                    {n(pt.average_sqft) > 0 && <div>{n(pt.average_sqft).toLocaleString()} sqft avg</div>}
                    <div className="flex justify-between"><span>Gross margin</span><span className="font-medium">{fmtPct(gm)}</span></div>
                    <div className="flex justify-between"><span>Absorption</span><span>{n(pt.absorption_pace).toFixed(1)} / mo</span></div>
                  </div>
                </div>
              );
            })}
            <div className="border-t pt-2 flex justify-between font-semibold">
              <span>Gross Revenue</span><span>{fmt(grossRevenue)}</span>
            </div>
            <div className="flex justify-between font-bold text-base pt-1">
              <span className={profit >= 0 ? "text-emerald-700" : "text-red-700"}>Net Profit</span>
              <span className={profit >= 0 ? "text-emerald-700" : "text-red-700"}>{fmt(profit)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Timeline */}
      {(proforma.development_start_date || proforma.first_home_closing) && (
        <Card className="border-0 shadow-sm">
          <CardHeader><CardTitle className="text-base">Project Timeline</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              {[
                ["Entitlement Start", proforma.entitlement_start_date],
                ["Entitlement Approval", proforma.entitlement_approval_date],
                ["Development Start", proforma.development_start_date],
                ["Development Completion", proforma.development_completion_date],
                ["First Home Start", proforma.first_home_start],
                ["First Home Sale", proforma.first_home_sale],
                ["First Home Closing", proforma.first_home_closing],
                ["Final Home Closing", calcFinalClosing()],
              ].filter(([, v]) => v).map(([label, val]) => (
                <div key={label}>
                  <p className="text-xs text-slate-500 mb-0.5">{label}</p>
                  <p className="font-medium">{format(new Date(val), "MMM d, yyyy")}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {proforma.notes && (
        <Card className="border-0 shadow-sm">
          <CardHeader><CardTitle className="text-base">Notes</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-slate-600 whitespace-pre-wrap">{proforma.notes}</p></CardContent>
        </Card>
      )}
    </div>
  );
}