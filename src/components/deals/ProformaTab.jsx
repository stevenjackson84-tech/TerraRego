import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit, DollarSign, TrendingUp, Calculator, Plus, Trash2, RefreshCw, Sparkles } from "lucide-react";
import AIMarketSuggestion from "./AIMarketSuggestion";
import { Checkbox } from "@/components/ui/checkbox";

function AIDrawsButton({ formData, onApply }) {
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    if (!formData.development_costs || !formData.development_start_date) return;
    setLoading(true);
    const devCost = parseFloat(formData.development_costs);
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
      {loading ? "Generating..." : "AI Generate"}
    </Button>
  );
}
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";

export default function ProformaTab({ proforma, onSave, isLoading, deal }) {
  const [isEditing, setIsEditing] = useState(!proforma);
  
  // Fetch floor plans
  const { data: floorPlans = [] } = useQuery({
    queryKey: ['floorPlans'],
    queryFn: () => base44.entities.FloorPlan.list(),
  });
  
  const [formData, setFormData] = useState(proforma || {
    purchase_price: "",
    development_costs: "",
    development_cost_phases: [],
    offsite_improvements: [],
    master_infrastructure: [],
    soft_costs: "",
    financing_costs: "",
    loan_interest_rate: "",
    loan_term_months: "",
    construction_draws: [],
    product_types: [],
    contingency_percentage: 5,
    sales_commission_percentage: 3,
    entitlement_start_date: "",
    entitlement_approval_date: "",
    development_start_date: "",
    development_completion_date: "",
    first_home_start: "",
    first_home_sale: "",
    first_home_closing: "",
    absorption_pace: "",
    notes: "",
    override_dev_completion: false
  });

  const handleChange = (field, value) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      
      // Auto-calculate development completion date (6 months after start)
      if (field === "development_start_date" && !prev.override_dev_completion && value) {
        const startDate = new Date(value);
        const completionDate = new Date(startDate);
        completionDate.setMonth(completionDate.getMonth() + 6);
        updated.development_completion_date = completionDate.toISOString().split('T')[0];
      }
      
      // Auto-generate construction draws when development costs or dates change
      if ((field === "development_costs" || field === "development_start_date") && 
          updated.development_costs && updated.development_start_date) {
        const devCost = parseFloat(updated.development_costs);
        const startDate = new Date(updated.development_start_date);
        
        if (devCost > 0 && startDate) {
          const pattern = [0.05, 0.10, 0.15, 0.20, 0.25, 0.20, 0.05];
          const draws = pattern.map((pct, index) => {
            const drawDate = new Date(startDate);
            drawDate.setMonth(drawDate.getMonth() + index);
            return {
              date: drawDate.toISOString().split('T')[0],
              amount: (devCost * pct).toFixed(2),
              description: `Month ${index + 1} - ${(pct * 100).toFixed(0)}%`
            };
          });
          updated.construction_draws = draws;
        }
      }
      
      return updated;
    });
  };

  const addProductType = () => {
    setFormData(prev => ({
      ...prev,
      product_types: [
        ...(prev.product_types || []),
        { name: "", number_of_units: "", sales_price_per_unit: "", direct_cost_per_unit: "", building_permit_cost: "", absorption_pace: "", average_sqft: "" }
      ]
    }));
  };

  // Dev cost phases helpers
  const addDevPhase = () => setFormData(prev => ({ ...prev, development_cost_phases: [...(prev.development_cost_phases || []), { phase_name: "", amount: "", description: "" }] }));
  const removeDevPhase = (i) => setFormData(prev => ({ ...prev, development_cost_phases: prev.development_cost_phases.filter((_, idx) => idx !== i) }));
  const updateDevPhase = (i, field, value) => setFormData(prev => ({ ...prev, development_cost_phases: prev.development_cost_phases.map((p, idx) => idx === i ? { ...p, [field]: value } : p) }));

  // Offsite helpers
  const addOffsite = () => setFormData(prev => ({ ...prev, offsite_improvements: [...(prev.offsite_improvements || []), { name: "", amount: "", description: "" }] }));
  const removeOffsite = (i) => setFormData(prev => ({ ...prev, offsite_improvements: prev.offsite_improvements.filter((_, idx) => idx !== i) }));
  const updateOffsite = (i, field, value) => setFormData(prev => ({ ...prev, offsite_improvements: prev.offsite_improvements.map((p, idx) => idx === i ? { ...p, [field]: value } : p) }));

  // Master infrastructure helpers
  const addMasterInfra = () => setFormData(prev => ({ ...prev, master_infrastructure: [...(prev.master_infrastructure || []), { name: "", amount: "", description: "" }] }));
  const removeMasterInfra = (i) => setFormData(prev => ({ ...prev, master_infrastructure: prev.master_infrastructure.filter((_, idx) => idx !== i) }));
  const updateMasterInfra = (i, field, value) => setFormData(prev => ({ ...prev, master_infrastructure: prev.master_infrastructure.map((p, idx) => idx === i ? { ...p, [field]: value } : p) }));

  const addConstructionDraw = () => {
    setFormData(prev => ({
      ...prev,
      construction_draws: [
        ...(prev.construction_draws || []),
        { date: "", amount: "", description: "" }
      ]
    }));
  };

  const removeConstructionDraw = (index) => {
    setFormData(prev => ({
      ...prev,
      construction_draws: prev.construction_draws.filter((_, i) => i !== index)
    }));
  };

  const updateConstructionDraw = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      construction_draws: prev.construction_draws.map((draw, i) => 
        i === index ? { ...draw, [field]: value } : draw
      )
    }));
  };

  const removeProductType = (index) => {
    setFormData(prev => ({
      ...prev,
      product_types: prev.product_types.filter((_, i) => i !== index)
    }));
  };

  const updateProductType = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      product_types: prev.product_types.map((pt, i) => 
        i === index ? { ...pt, [field]: value } : pt
      )
    }));
  };

  const selectFloorPlan = (index, floorPlanId) => {
    const floorPlan = floorPlans.find(fp => fp.id === floorPlanId);
    if (floorPlan) {
      setFormData(prev => ({
        ...prev,
        product_types: prev.product_types.map((pt, i) => 
          i === index ? {
            ...pt,
            average_sqft: floorPlan.square_footage || pt.average_sqft,
            floor_plan_id: floorPlan.id,
            floor_plan_name: floorPlan.name
          } : pt
        )
      }));
    }
  };

  const handleSave = () => {
    const data = {
      ...formData,
      purchase_price: formData.purchase_price ? parseFloat(formData.purchase_price) : null,
      development_costs: formData.development_costs ? parseFloat(formData.development_costs) : null,
      soft_costs: formData.soft_costs ? parseFloat(formData.soft_costs) : null,
      financing_costs: formData.financing_costs ? parseFloat(formData.financing_costs) : null,
      loan_interest_rate: formData.loan_interest_rate ? parseFloat(formData.loan_interest_rate) : null,
      loan_term_months: formData.loan_term_months ? parseFloat(formData.loan_term_months) : null,
      purchase_takedowns: (formData.purchase_takedowns || []).map(td => ({
        date: td.date,
        amount: td.amount ? parseFloat(td.amount) : 0,
        description: td.description
      })),
      construction_draws: (formData.construction_draws || []).map(draw => ({
        date: draw.date,
        amount: draw.amount ? parseFloat(draw.amount) : 0,
        description: draw.description
      })),
      development_cost_phases: (formData.development_cost_phases || []).map(p => ({
        phase_name: p.phase_name,
        amount: p.amount ? parseFloat(p.amount) : 0,
        description: p.description
      })),
      offsite_improvements: (formData.offsite_improvements || []).map(p => ({
        name: p.name,
        amount: p.amount ? parseFloat(p.amount) : 0,
        description: p.description
      })),
      master_infrastructure: (formData.master_infrastructure || []).map(p => ({
        name: p.name,
        amount: p.amount ? parseFloat(p.amount) : 0,
        description: p.description
      })),
      product_types: (formData.product_types || []).map(pt => ({
        name: pt.name,
        number_of_units: pt.number_of_units ? parseFloat(pt.number_of_units) : 0,
        sales_price_per_unit: pt.sales_price_per_unit ? parseFloat(pt.sales_price_per_unit) : 0,
        direct_cost_per_unit: pt.direct_cost_per_unit ? parseFloat(pt.direct_cost_per_unit) : 0,
        building_permit_cost: pt.building_permit_cost ? parseFloat(pt.building_permit_cost) : 0,
        absorption_pace: pt.absorption_pace ? parseFloat(pt.absorption_pace) : 0,
        average_sqft: pt.average_sqft ? parseFloat(pt.average_sqft) : null
      })),
      contingency_percentage: formData.contingency_percentage ? parseFloat(formData.contingency_percentage) : 5,
      sales_commission_percentage: formData.sales_commission_percentage ? parseFloat(formData.sales_commission_percentage) : 3,
    };
    onSave(data);
    setIsEditing(false);
  };

  // Calculations
  const purchasePrice = parseFloat(formData.purchase_price) || 0;
  const devCosts = parseFloat(formData.development_costs) || 0;
  const softCosts = parseFloat(formData.soft_costs) || 0;
  const loanInterestRate = parseFloat(formData.loan_interest_rate) || 0;
  const loanTermMonths = parseFloat(formData.loan_term_months) || 0;
  const contingencyPct = parseFloat(formData.contingency_percentage) || 5;
  const salesCommissionPct = parseFloat(formData.sales_commission_percentage) || 3;

  // Calculate financing costs based on construction draws or simple interest
  const calculateFinancingCosts = () => {
    const constructionDraws = formData.construction_draws || [];
    
    if (constructionDraws.length > 0 && formData.development_completion_date && loanInterestRate > 0) {
      // Calculate interest based on actual draws
      const completionDate = new Date(formData.development_completion_date);
      let totalInterest = 0;
      
      constructionDraws.forEach(draw => {
        if (draw.date && draw.amount) {
          const drawDate = new Date(draw.date);
          const monthsOutstanding = Math.max(0, 
            (completionDate.getFullYear() - drawDate.getFullYear()) * 12 + 
            (completionDate.getMonth() - drawDate.getMonth())
          );
          const drawAmount = parseFloat(draw.amount) || 0;
          const interest = drawAmount * (loanInterestRate / 100) * (monthsOutstanding / 12);
          totalInterest += interest;
        }
      });
      
      return totalInterest;
    } else if (loanInterestRate > 0 && loanTermMonths > 0 && devCosts > 0) {
      // Simple interest calculation on development costs
      return devCosts * (loanInterestRate / 100) * (loanTermMonths / 12);
    }
    
    return parseFloat(formData.financing_costs) || 0;
  };

  const financingCosts = calculateFinancingCosts();

  const productTypes = formData.product_types || [];
  
  const numUnits = productTypes.reduce((sum, pt) => sum + (parseFloat(pt.number_of_units) || 0), 0);
  const totalDirectCosts = productTypes.reduce((sum, pt) => 
    sum + ((parseFloat(pt.number_of_units) || 0) * (parseFloat(pt.direct_cost_per_unit) || 0)), 0
  );
  const totalPermitCosts = productTypes.reduce((sum, pt) => 
    sum + ((parseFloat(pt.number_of_units) || 0) * (parseFloat(pt.building_permit_cost) || 0)), 0
  );
  const grossRevenue = productTypes.reduce((sum, pt) => 
    sum + ((parseFloat(pt.number_of_units) || 0) * (parseFloat(pt.sales_price_per_unit) || 0)), 0
  );
  const totalAbsorptionPace = productTypes.reduce((sum, pt) => sum + (parseFloat(pt.absorption_pace) || 0), 0);

  // Calculate final home closing date
  const calculateFinalHomeClosing = () => {
    if (!formData.first_home_closing || totalAbsorptionPace === 0 || numUnits === 0) return null;
    const firstClosing = new Date(formData.first_home_closing);
    const monthsToSellOut = Math.ceil(numUnits / totalAbsorptionPace);
    const finalClosing = new Date(firstClosing);
    finalClosing.setMonth(finalClosing.getMonth() + monthsToSellOut - 1);
    return finalClosing.toISOString().split('T')[0];
  };

  const purchasePricePerUnit = numUnits > 0 ? purchasePrice / numUnits : 0;
  const devCostPerUnit = numUnits > 0 ? devCosts / numUnits : 0;
  const contingency = (purchasePrice + devCosts + softCosts + totalDirectCosts + totalPermitCosts) * (contingencyPct / 100);
  const totalCosts = purchasePrice + devCosts + softCosts + financingCosts + totalDirectCosts + totalPermitCosts + contingency;
  
  const salesCommission = grossRevenue * (salesCommissionPct / 100);
  const netRevenue = grossRevenue - salesCommission;
  
  const profit = netRevenue - totalCosts;
  const roi = totalCosts > 0 ? (profit / totalCosts) * 100 : 0;
  const profitMargin = grossRevenue > 0 ? (profit / grossRevenue) * 100 : 0;
  const grossMargin = grossRevenue > 0 ? ((grossRevenue - totalCosts) / grossRevenue) * 100 : 0;

  const netAssets = purchasePrice + devCosts + softCosts + totalDirectCosts + totalPermitCosts + contingency;
  const rona = netAssets > 0 ? (profit / netAssets) * 100 : 0;

  // Unlevered IRR calculation using construction draws and purchase takedowns
  const calculateUnleveredIRR = () => {
    if (!formData.development_start_date || !formData.first_home_closing || totalAbsorptionPace === 0 || numUnits === 0) return null;
    
    const devStartDate = new Date(formData.development_start_date);
    const firstClosingDate = new Date(formData.first_home_closing);
    
    // Build monthly cash flow array from development start
    const cashFlowsByMonth = new Map();
    
    // Add purchase takedowns (negative cash flows)
    const takedowns = formData.purchase_takedowns || [];
    let totalTakedowns = 0;
    takedowns.forEach(td => {
      if (td.date && td.amount) {
        const tdDate = new Date(td.date);
        const monthsSinceStart = (tdDate.getFullYear() - devStartDate.getFullYear()) * 12 + 
                                  (tdDate.getMonth() - devStartDate.getMonth());
        const currentFlow = cashFlowsByMonth.get(monthsSinceStart) || 0;
        cashFlowsByMonth.set(monthsSinceStart, currentFlow - parseFloat(td.amount));
        totalTakedowns += parseFloat(td.amount);
      }
    });
    
    // Add construction draws (negative cash flows)
    const draws = formData.construction_draws || [];
    draws.forEach(draw => {
      if (draw.date && draw.amount) {
        const drawDate = new Date(draw.date);
        const monthsSinceStart = (drawDate.getFullYear() - devStartDate.getFullYear()) * 12 + 
                                  (drawDate.getMonth() - devStartDate.getMonth());
        const currentFlow = cashFlowsByMonth.get(monthsSinceStart) || 0;
        cashFlowsByMonth.set(monthsSinceStart, currentFlow - parseFloat(draw.amount));
      }
    });
    
    // Add other upfront costs at month 0 (excluding purchase price if using takedowns)
    const purchaseCost = totalTakedowns > 0 ? 0 : purchasePrice;
    const upfrontCosts = purchaseCost + softCosts + totalDirectCosts + totalPermitCosts + contingency;
    const month0Flow = cashFlowsByMonth.get(0) || 0;
    cashFlowsByMonth.set(0, month0Flow - upfrontCosts);
    
    // Add sales revenue (positive cash flows)
    const productFlows = productTypes.map(pt => ({
      units: parseFloat(pt.number_of_units) || 0,
      salesPrice: parseFloat(pt.sales_price_per_unit) || 0,
      pace: parseFloat(pt.absorption_pace) || 0,
      unitsSold: 0
    }));
    
    const monthsSinceStartToFirstClosing = (firstClosingDate.getFullYear() - devStartDate.getFullYear()) * 12 + 
                                            (firstClosingDate.getMonth() - devStartDate.getMonth());
    
    let currentSalesMonth = monthsSinceStartToFirstClosing;
    const maxMonths = 240;
    
    while (currentSalesMonth <= maxMonths && productFlows.some(pf => pf.unitsSold < pf.units)) {
      let monthlyRevenue = 0;
      
      for (const pf of productFlows) {
        if (pf.unitsSold < pf.units) {
          const unitsToSell = Math.min(pf.pace, pf.units - pf.unitsSold);
          const revenue = unitsToSell * pf.salesPrice;
          const commission = revenue * (salesCommissionPct / 100);
          monthlyRevenue += (revenue - commission);
          pf.unitsSold += unitsToSell;
        }
      }
      
      if (monthlyRevenue > 0) {
        const currentFlow = cashFlowsByMonth.get(currentSalesMonth) || 0;
        cashFlowsByMonth.set(currentSalesMonth, currentFlow + monthlyRevenue);
      }
      currentSalesMonth++;
    }
    
    // Convert to array sorted by month
    const maxMonth = Math.max(...Array.from(cashFlowsByMonth.keys()));
    const cashFlows = [];
    for (let i = 0; i <= maxMonth; i++) {
      cashFlows.push(cashFlowsByMonth.get(i) || 0);
    }
    
    if (cashFlows.length <= 1) return null;
    
    // Newton's method for IRR
    const npv = (rate, flows) => {
      return flows.reduce((sum, flow, t) => sum + flow / Math.pow(1 + rate, t), 0);
    };
    
    let rate = 0.01; // Initial guess 1% monthly
    const maxIterations = 100;
    const tolerance = 0.0001;
    
    for (let i = 0; i < maxIterations; i++) {
      const npvValue = npv(rate, cashFlows);
      const npvDerivative = cashFlows.reduce((sum, flow, t) => 
        sum - (t * flow) / Math.pow(1 + rate, t + 1), 0);
      
      if (Math.abs(npvDerivative) < 0.0000001) break;
      
      const newRate = rate - npvValue / npvDerivative;
      
      if (Math.abs(newRate - rate) < tolerance) {
        // Annualize the monthly IRR
        return (Math.pow(1 + newRate, 12) - 1) * 100;
      }
      
      rate = newRate;
    }
    
    return null;
  };

  const unleveredIRR = calculateUnleveredIRR();

  // Calculate Peak Capital
  const calculatePeakCapital = () => {
    if (!formData.development_start_date) return { amount: 0, date: null };
    
    const devStartDate = new Date(formData.development_start_date);
    const cashFlowsByMonth = new Map();
    
    // Add purchase takedowns
    const takedowns = formData.purchase_takedowns || [];
    let totalTakedowns = 0;
    takedowns.forEach(td => {
      if (td.date && td.amount) {
        const tdDate = new Date(td.date);
        const monthsSinceStart = (tdDate.getFullYear() - devStartDate.getFullYear()) * 12 + 
                                  (tdDate.getMonth() - devStartDate.getMonth());
        const currentFlow = cashFlowsByMonth.get(monthsSinceStart) || 0;
        cashFlowsByMonth.set(monthsSinceStart, currentFlow - parseFloat(td.amount));
        totalTakedowns += parseFloat(td.amount);
      }
    });
    
    // Initial costs at month 0 (excluding purchase price if using takedowns)
    const purchaseCost = totalTakedowns > 0 ? 0 : purchasePrice;
    const upfrontCosts = purchaseCost + softCosts + totalDirectCosts + totalPermitCosts + contingency;
    cashFlowsByMonth.set(0, -upfrontCosts);
    
    // Add construction draws
    const draws = formData.construction_draws || [];
    draws.forEach(draw => {
      if (draw.date && draw.amount) {
        const drawDate = new Date(draw.date);
        const monthsSinceStart = (drawDate.getFullYear() - devStartDate.getFullYear()) * 12 + 
                                  (drawDate.getMonth() - devStartDate.getMonth());
        const currentFlow = cashFlowsByMonth.get(monthsSinceStart) || 0;
        cashFlowsByMonth.set(monthsSinceStart, currentFlow - parseFloat(draw.amount));
      }
    });
    
    // Calculate cumulative and find peak
    const maxMonth = Math.max(...Array.from(cashFlowsByMonth.keys()), 0);
    let cumulativeCash = 0;
    let peakCapital = 0;
    let peakMonth = 0;
    
    for (let i = 0; i <= maxMonth; i++) {
      const monthFlow = cashFlowsByMonth.get(i) || 0;
      cumulativeCash += monthFlow;
      
      if (cumulativeCash < peakCapital) {
        peakCapital = cumulativeCash;
        peakMonth = i;
      }
    }
    
    const peakDate = new Date(devStartDate);
    peakDate.setMonth(peakDate.getMonth() + peakMonth);
    
    return {
      amount: Math.abs(peakCapital),
      date: peakDate.toISOString().split('T')[0]
    };
  };

  const peakCapital = calculatePeakCapital();

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  if (isEditing) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-slate-900">Edit Proforma</h2>
          <div className="flex gap-2">
            {proforma && (
              <Button variant="outline" onClick={() => {
                setFormData(proforma);
                setIsEditing(false);
              }}>
                Cancel
              </Button>
            )}
            <Button onClick={handleSave} disabled={isLoading} className="bg-slate-900 hover:bg-slate-800">
              {isLoading ? "Saving..." : "Save Proforma"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Acquisition Costs */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Acquisition & Development</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="purchase_price">Purchase Price</Label>
                <Input
                  id="purchase_price"
                  type="number"
                  value={formData.purchase_price}
                  onChange={(e) => handleChange("purchase_price", e.target.value)}
                  placeholder="0"
                />
              </div>

              {/* Purchase Takedowns */}
              <div className="md:col-span-2 border-t pt-4 mt-2">
                <div className="flex items-center justify-between mb-2">
                  <Label>Purchase Takedowns (Optional)</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const takedowns = formData.purchase_takedowns || [];
                      handleChange('purchase_takedowns', [...takedowns, { date: '', amount: 0, description: '' }]);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Takedown
                  </Button>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {(formData.purchase_takedowns || []).map((td, index) => (
                    <div key={index} className="flex gap-2 items-center p-3 bg-slate-50 rounded-lg">
                      <Input
                        type="date"
                        value={td.date || ''}
                        onChange={(e) => {
                          const takedowns = [...(formData.purchase_takedowns || [])];
                          takedowns[index].date = e.target.value;
                          handleChange('purchase_takedowns', takedowns);
                        }}
                        className="flex-1"
                      />
                      <Input
                        type="number"
                        value={td.amount || ''}
                        onChange={(e) => {
                          const takedowns = [...(formData.purchase_takedowns || [])];
                          takedowns[index].amount = parseFloat(e.target.value) || 0;
                          handleChange('purchase_takedowns', takedowns);
                        }}
                        placeholder="Amount"
                        className="flex-1 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      />
                      <Input
                        type="text"
                        value={td.description || ''}
                        onChange={(e) => {
                          const takedowns = [...(formData.purchase_takedowns || [])];
                          takedowns[index].description = e.target.value;
                          handleChange('purchase_takedowns', takedowns);
                        }}
                        placeholder="Description"
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          const takedowns = [...(formData.purchase_takedowns || [])];
                          takedowns.splice(index, 1);
                          handleChange('purchase_takedowns', takedowns);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {(formData.purchase_takedowns || []).length === 0 && (
                    <p className="text-sm text-slate-500 text-center py-4">No takedowns scheduled. Purchase price will be paid at development start.</p>
                  )}
                </div>
              </div>
              <div>
                <Label htmlFor="development_costs">Development Costs (Total)</Label>
                <Input
                  id="development_costs"
                  type="number"
                  value={formData.development_costs}
                  onChange={(e) => handleChange("development_costs", e.target.value)}
                  placeholder="0"
                />
                {(formData.development_cost_phases || []).length > 0 && (
                  <p className="text-xs text-slate-500 mt-1">
                    Phases sum: {formatCurrency((formData.development_cost_phases || []).reduce((s,p) => s + (parseFloat(p.amount) || 0), 0))}
                  </p>
                )}
              </div>

              {/* Dev Cost Phases */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-2">
                  <Label>Development Costs by Phase</Label>
                  <Button type="button" size="sm" variant="outline" onClick={addDevPhase}>
                    <Plus className="h-4 w-4 mr-1" /> Add Phase
                  </Button>
                </div>
                <div className="space-y-2">
                  {(formData.development_cost_phases || []).map((p, i) => (
                    <div key={i} className="flex gap-2 items-center bg-slate-50 rounded-lg p-2">
                      <Input value={p.phase_name} onChange={e => updateDevPhase(i, "phase_name", e.target.value)} placeholder="Phase (e.g., Grading)" className="flex-1 h-8 text-sm" />
                      <Input type="number" value={p.amount} onChange={e => updateDevPhase(i, "amount", e.target.value)} placeholder="Amount" className="w-32 h-8 text-sm" />
                      <Input value={p.description} onChange={e => updateDevPhase(i, "description", e.target.value)} placeholder="Notes" className="flex-1 h-8 text-sm" />
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-red-400" onClick={() => removeDevPhase(i)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  ))}
                  {(formData.development_cost_phases || []).length === 0 && <p className="text-xs text-slate-400 text-center py-2">No phases added</p>}
                </div>
              </div>

              {/* Offsite Improvements */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-2">
                  <Label>Offsite Improvements</Label>
                  <Button type="button" size="sm" variant="outline" onClick={addOffsite}>
                    <Plus className="h-4 w-4 mr-1" /> Add Item
                  </Button>
                </div>
                <div className="space-y-2">
                  {(formData.offsite_improvements || []).map((p, i) => (
                    <div key={i} className="flex gap-2 items-center bg-orange-50 rounded-lg p-2">
                      <Input value={p.name} onChange={e => updateOffsite(i, "name", e.target.value)} placeholder="Item (e.g., Road widening)" className="flex-1 h-8 text-sm" />
                      <Input type="number" value={p.amount} onChange={e => updateOffsite(i, "amount", e.target.value)} placeholder="Amount" className="w-32 h-8 text-sm" />
                      <Input value={p.description} onChange={e => updateOffsite(i, "description", e.target.value)} placeholder="Notes" className="flex-1 h-8 text-sm" />
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-red-400" onClick={() => removeOffsite(i)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  ))}
                  {(formData.offsite_improvements || []).length === 0 && <p className="text-xs text-slate-400 text-center py-2">No offsite improvements added</p>}
                </div>
              </div>

              {/* Master Infrastructure */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-2">
                  <Label>Master Infrastructure Improvements</Label>
                  <Button type="button" size="sm" variant="outline" onClick={addMasterInfra}>
                    <Plus className="h-4 w-4 mr-1" /> Add Item
                  </Button>
                </div>
                <div className="space-y-2">
                  {(formData.master_infrastructure || []).map((p, i) => (
                    <div key={i} className="flex gap-2 items-center bg-blue-50 rounded-lg p-2">
                      <Input value={p.name} onChange={e => updateMasterInfra(i, "name", e.target.value)} placeholder="Item (e.g., Water main)" className="flex-1 h-8 text-sm" />
                      <Input type="number" value={p.amount} onChange={e => updateMasterInfra(i, "amount", e.target.value)} placeholder="Amount" className="w-32 h-8 text-sm" />
                      <Input value={p.description} onChange={e => updateMasterInfra(i, "description", e.target.value)} placeholder="Notes" className="flex-1 h-8 text-sm" />
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-red-400" onClick={() => removeMasterInfra(i)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  ))}
                  {(formData.master_infrastructure || []).length === 0 && <p className="text-xs text-slate-400 text-center py-2">No master infrastructure items added</p>}
                </div>
              </div>

              <div>
                <Label htmlFor="soft_costs">Soft Costs</Label>
                <Input
                  id="soft_costs"
                  type="number"
                  value={formData.soft_costs}
                  onChange={(e) => handleChange("soft_costs", e.target.value)}
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="financing_costs">Financing Costs (Manual Override)</Label>
                <Input
                  id="financing_costs"
                  type="number"
                  value={formData.financing_costs}
                  onChange={(e) => handleChange("financing_costs", e.target.value)}
                  placeholder="0"
                />
                <p className="text-xs text-slate-500 mt-1">
                  {financingCosts > 0 && !formData.financing_costs && (
                    <>Calculated: {formatCurrency(financingCosts)}</>
                  )}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Financing Terms */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Loan Terms</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="loan_interest_rate">Interest Rate (%)</Label>
                <Input
                  id="loan_interest_rate"
                  type="number"
                  step="0.01"
                  value={formData.loan_interest_rate}
                  onChange={(e) => handleChange("loan_interest_rate", e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="loan_term_months">Loan Term (Months)</Label>
                <Input
                  id="loan_term_months"
                  type="number"
                  value={formData.loan_term_months}
                  onChange={(e) => handleChange("loan_term_months", e.target.value)}
                  placeholder="0"
                />
              </div>
              {loanInterestRate > 0 && loanTermMonths > 0 && devCosts > 0 && (formData.construction_draws || []).length === 0 && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-xs text-blue-700">
                    Estimated Interest: {formatCurrency(devCosts * (loanInterestRate / 100) * (loanTermMonths / 12))}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Construction Draws */}
          <Card className="border-0 shadow-sm md:col-span-2">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-base">Construction Loan Draws</CardTitle>
                  <p className="text-xs text-slate-500 mt-1">
                    Auto-generated: 5%, 10%, 15%, 20%, 25%, 20%, 5% over 7 months
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={() => {
                      if (formData.development_costs && formData.development_start_date) {
                        handleChange("development_costs", formData.development_costs);
                      }
                    }} 
                    variant="outline" 
                    size="sm"
                    disabled={!formData.development_costs || !formData.development_start_date}
                  >
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Regenerate
                  </Button>
                  <AIDrawsButton formData={formData} onApply={(draws) => setFormData(prev => ({ ...prev, construction_draws: draws }))} />
                  <Button onClick={addConstructionDraw} variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Draw
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {(formData.construction_draws || []).map((draw, index) => (
                <div key={index} className="border border-slate-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <Label className="text-sm font-medium">Draw {index + 1}</Label>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={() => removeConstructionDraw(index)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs">Date</Label>
                      <Input
                        type="date"
                        value={draw.date}
                        onChange={(e) => updateConstructionDraw(index, "date", e.target.value)}
                        className="h-9"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Amount</Label>
                      <Input
                        type="number"
                        value={draw.amount}
                        onChange={(e) => updateConstructionDraw(index, "amount", e.target.value)}
                        placeholder="0"
                        className="h-9"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Description</Label>
                      <Input
                        value={draw.description}
                        onChange={(e) => updateConstructionDraw(index, "description", e.target.value)}
                        placeholder="e.g., Site prep"
                        className="h-9"
                      />
                    </div>
                  </div>
                </div>
              ))}
              {(formData.construction_draws || []).length === 0 && (
                <p className="text-sm text-slate-500 text-center py-4">No draws scheduled yet</p>
              )}
              {(formData.construction_draws || []).length > 0 && loanInterestRate > 0 && formData.development_completion_date && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-xs text-blue-700 font-medium">
                    Calculated Interest from Draws: {formatCurrency(calculateFinancingCosts())}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Product Types */}
          <Card className="border-0 shadow-sm md:col-span-2">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-base">Product Types</CardTitle>
                <Button onClick={addProductType} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Product Type
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {productTypes.map((pt, index) => (
                <div key={index} className="border border-slate-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <Label className="text-sm font-medium">Product Type {index + 1}</Label>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={() => removeProductType(index)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <Label className="text-xs">Product Type</Label>
                      <Input
                        value={pt.name}
                        onChange={(e) => updateProductType(index, "name", e.target.value)}
                        placeholder="e.g., 50s"
                        className="h-9"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">Floor Plan</Label>
                      <Select onValueChange={(value) => selectFloorPlan(index, value)}>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Select floor plan..." />
                        </SelectTrigger>
                        <SelectContent>
                          {floorPlans.map((fp) => (
                            <SelectItem key={fp.id} value={fp.id}>
                              {fp.name} {fp.square_footage ? `(${fp.square_footage.toLocaleString()} sqft)` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Units</Label>
                      <Input
                        type="number"
                        value={pt.number_of_units}
                        onChange={(e) => updateProductType(index, "number_of_units", e.target.value)}
                        placeholder="0"
                        className="h-9"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Sales Price/Unit</Label>
                      <Input
                        type="number"
                        value={pt.sales_price_per_unit}
                        onChange={(e) => updateProductType(index, "sales_price_per_unit", e.target.value)}
                        placeholder="0"
                        className="h-9"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Direct Cost/Unit</Label>
                      <Input
                        type="number"
                        value={pt.direct_cost_per_unit}
                        onChange={(e) => updateProductType(index, "direct_cost_per_unit", e.target.value)}
                        placeholder="0"
                        className="h-9"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Building Permit Cost/Unit</Label>
                      <Input
                        type="number"
                        value={pt.building_permit_cost}
                        onChange={(e) => updateProductType(index, "building_permit_cost", e.target.value)}
                        placeholder="0"
                        className="h-9"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Avg Sq Ft</Label>
                      <Input
                        type="number"
                        value={pt.average_sqft}
                        onChange={(e) => updateProductType(index, "average_sqft", e.target.value)}
                        placeholder="0"
                        className="h-9"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">Absorption (units/mo)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={pt.absorption_pace}
                        onChange={(e) => updateProductType(index, "absorption_pace", e.target.value)}
                        placeholder="0"
                        className="h-9"
                      />
                    </div>
                    <AIMarketSuggestion
                      deal={deal}
                      productType={pt}
                      onApply={(vals) => {
                        if (vals.sales_price_per_unit) updateProductType(index, "sales_price_per_unit", vals.sales_price_per_unit);
                        if (vals.absorption_pace) updateProductType(index, "absorption_pace", vals.absorption_pace);
                      }}
                    />
                  </div>
                </div>
              ))}
              {productTypes.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-4">No product types added yet</p>
              )}
              
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200">
                <div>
                  <Label htmlFor="contingency_percentage">Contingency %</Label>
                  <Input
                    id="contingency_percentage"
                    type="number"
                    step="0.1"
                    value={formData.contingency_percentage}
                    onChange={(e) => handleChange("contingency_percentage", e.target.value)}
                    placeholder="5"
                  />
                </div>
                <div>
                  <Label htmlFor="sales_commission_percentage">Sales Commission %</Label>
                  <Input
                    id="sales_commission_percentage"
                    type="number"
                    step="0.1"
                    value={formData.sales_commission_percentage}
                    onChange={(e) => handleChange("sales_commission_percentage", e.target.value)}
                    placeholder="3"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Entitlement Timeline */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Entitlement Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="entitlement_start_date">Entitlement Start Date</Label>
                <Input
                  id="entitlement_start_date"
                  type="date"
                  value={formData.entitlement_start_date}
                  onChange={(e) => handleChange("entitlement_start_date", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="entitlement_approval_date">Entitlement Approval Date</Label>
                <Input
                  id="entitlement_approval_date"
                  type="date"
                  value={formData.entitlement_approval_date}
                  onChange={(e) => handleChange("entitlement_approval_date", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Development Timeline */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Development Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="development_start_date">Development Start Date</Label>
                <Input
                  id="development_start_date"
                  type="date"
                  value={formData.development_start_date}
                  onChange={(e) => handleChange("development_start_date", e.target.value)}
                />
                <p className="text-xs text-slate-500 mt-1">
                  Triggers auto-calculation of completion date & cashflow
                </p>
              </div>
              <div>
                <Label htmlFor="development_completion_date">Development Completion Date</Label>
                <div className="space-y-2">
                  <Input
                    id="development_completion_date"
                    type="date"
                    value={formData.development_completion_date}
                    onChange={(e) => handleChange("development_completion_date", e.target.value)}
                    disabled={!formData.override_dev_completion}
                  />
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="override_completion"
                      checked={formData.override_dev_completion}
                      onCheckedChange={(checked) => handleChange("override_dev_completion", checked)}
                    />
                    <Label htmlFor="override_completion" className="text-xs font-normal cursor-pointer">
                      Manual override (for deal specifics/weather delays)
                    </Label>
                  </div>
                  {!formData.override_dev_completion && formData.development_start_date && (
                    <p className="text-xs text-emerald-600">
                      Auto: 6 months after start date
                    </p>
                  )}
                </div>
              </div>
              <div>
                <Label htmlFor="first_home_start">First Home Start</Label>
                <Input
                  id="first_home_start"
                  type="date"
                  value={formData.first_home_start}
                  onChange={(e) => handleChange("first_home_start", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Sales Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="first_home_sale">First Home Sale</Label>
                <Input
                  id="first_home_sale"
                  type="date"
                  value={formData.first_home_sale}
                  onChange={(e) => handleChange("first_home_sale", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="first_home_closing">First Home Closing</Label>
                <Input
                  id="first_home_closing"
                  type="date"
                  value={formData.first_home_closing}
                  onChange={(e) => handleChange("first_home_closing", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <div className="md:col-span-2">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => handleChange("notes", e.target.value)}
                  rows={3}
                  placeholder="Add any notes or assumptions..."
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (!proforma) {
    return (
      <div className="text-center py-12">
        <Calculator className="h-12 w-12 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-slate-900 mb-2">No Proforma Yet</h3>
        <p className="text-slate-500 mb-4">Create a financial proforma to analyze this deal</p>
        <Button onClick={() => setIsEditing(true)} className="bg-slate-900 hover:bg-slate-800">
          Create Proforma
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-slate-900">Financial Proforma</h2>
        <Button onClick={() => setIsEditing(true)} variant="outline">
          <Edit className="h-4 w-4 mr-2" />
          Edit
        </Button>
      </div>

      {/* Peak Capital */}
      {peakCapital.date && (
        <Card className="border-0 shadow-sm bg-amber-50 md:col-span-full">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 text-amber-700 text-sm mb-2">
                  <DollarSign className="h-5 w-5" />
                  <span className="font-semibold">Peak Capital Required</span>
                </div>
                <p className="text-3xl font-bold text-amber-900">{formatCurrency(peakCapital.amount)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-amber-700 mb-1">Peak Date</p>
                <p className="text-xl font-semibold text-amber-900">
                  {format(new Date(peakCapital.date), 'MMM d, yyyy')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
              <DollarSign className="h-4 w-4" />
              <span>Total Revenue</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{formatCurrency(netRevenue)}</p>
            <p className="text-xs text-slate-500 mt-1">After {salesCommissionPct}% commission</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
              <DollarSign className="h-4 w-4" />
              <span>Total Costs</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{formatCurrency(totalCosts)}</p>
            <p className="text-xs text-slate-500 mt-1">With {contingencyPct}% contingency</p>
          </CardContent>
        </Card>

        <Card className={cn("border-0 shadow-sm", profit >= 0 ? "bg-emerald-50" : "bg-red-50")}>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
              <TrendingUp className="h-4 w-4" />
              <span>Net Profit</span>
            </div>
            <p className={cn("text-2xl font-bold", profit >= 0 ? "text-emerald-700" : "text-red-700")}>
              {formatCurrency(profit)}
            </p>
            <p className="text-xs text-slate-500 mt-1">{profitMargin.toFixed(1)}% margin</p>
          </CardContent>
        </Card>

        <Card className={cn("border-0 shadow-sm", profitMargin >= 0 ? "bg-indigo-50" : "bg-red-50")}>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
              <TrendingUp className="h-4 w-4" />
              <span>Net Pretax Margin</span>
            </div>
            <p className={cn("text-2xl font-bold", profitMargin >= 0 ? "text-indigo-700" : "text-red-700")}>
              {profitMargin.toFixed(1)}%
            </p>
            <p className="text-xs text-slate-500 mt-1">Profit / Gross Revenue</p>
          </CardContent>
        </Card>

        <Card className={cn("border-0 shadow-sm", roi >= 0 ? "bg-emerald-50" : "bg-red-50")}>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
              <TrendingUp className="h-4 w-4" />
              <span>ROI</span>
            </div>
            <p className={cn("text-2xl font-bold", roi >= 0 ? "text-emerald-700" : "text-red-700")}>
              {roi.toFixed(1)}%
            </p>
            <p className="text-xs text-slate-500 mt-1">Return on investment</p>
          </CardContent>
        </Card>
      </div>

      {/* Advanced Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className={cn("border-0 shadow-sm", grossMargin >= 0 ? "bg-purple-50" : "bg-red-50")}>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
              <TrendingUp className="h-4 w-4" />
              <span>Gross Margin</span>
            </div>
            <p className={cn("text-2xl font-bold", grossMargin >= 0 ? "text-purple-700" : "text-red-700")}>
              {grossMargin.toFixed(1)}%
            </p>
            <p className="text-xs text-slate-500 mt-1">(Revenue - Total Costs) / Revenue</p>
          </CardContent>
        </Card>

        <Card className={cn("border-0 shadow-sm", rona >= 0 ? "bg-blue-50" : "bg-red-50")}>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
              <TrendingUp className="h-4 w-4" />
              <span>RONA</span>
            </div>
            <p className={cn("text-2xl font-bold", rona >= 0 ? "text-blue-700" : "text-red-700")}>
              {rona.toFixed(1)}%
            </p>
            <p className="text-xs text-slate-500 mt-1">Return on Net Assets (unlevered)</p>
          </CardContent>
        </Card>

        <Card className={cn("border-0 shadow-sm", unleveredIRR && unleveredIRR >= 0 ? "bg-blue-50" : "bg-slate-50")}>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
              <TrendingUp className="h-4 w-4" />
              <span>Unlevered IRR</span>
            </div>
            <p className={cn("text-2xl font-bold", 
              unleveredIRR ? (unleveredIRR >= 0 ? "text-blue-700" : "text-red-700") : "text-slate-400"
            )}>
              {unleveredIRR ? `${unleveredIRR.toFixed(1)}%` : '—'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {unleveredIRR ? 'Annualized return' : 'Add timeline data to calculate'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Costs Breakdown */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Cost Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Purchase Price</span>
              <span className="font-medium">{formatCurrency(purchasePrice)}</span>
            </div>
            {formData.purchase_takedowns && formData.purchase_takedowns.length > 0 && (
              <div className="pl-4 space-y-1 border-l-2 border-slate-200">
                <div className="text-xs text-slate-500 font-medium mb-1">Takedown Schedule:</div>
                {formData.purchase_takedowns.map((td, idx) => (
                  <div key={idx} className="flex justify-between text-xs">
                    <span className="text-slate-500">
                      {td.description || `Takedown ${idx + 1}`} 
                      {td.date && ` (${format(new Date(td.date), 'MMM d, yyyy')})`}
                    </span>
                    <span className="font-medium">{formatCurrency(td.amount)}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-between text-sm pl-4">
              <span className="text-slate-500 text-xs">Per Unit</span>
              <span className="font-medium text-xs">{formatCurrency(purchasePricePerUnit)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Development Costs</span>
              <span className="font-medium">{formatCurrency(devCosts)}</span>
            </div>
            <div className="flex justify-between text-sm pl-4">
              <span className="text-slate-500 text-xs">Per Unit</span>
              <span className="font-medium text-xs">{formatCurrency(devCostPerUnit)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Soft Costs</span>
              <span className="font-medium">{formatCurrency(softCosts)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Financing Costs</span>
              <span className="font-medium">{formatCurrency(financingCosts)}</span>
            </div>
            {loanInterestRate > 0 && (
              <div className="flex justify-between text-xs pl-4">
                <span className="text-slate-500">
                  {loanInterestRate}% over {loanTermMonths} months
                  {(formData.construction_draws || []).length > 0 && " (from draws)"}
                </span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Direct Costs ({numUnits} units)</span>
              <span className="font-medium">{formatCurrency(totalDirectCosts)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Building Permit Costs</span>
              <span className="font-medium">{formatCurrency(totalPermitCosts)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Contingency ({contingencyPct}%)</span>
              <span className="font-medium">{formatCurrency(contingency)}</span>
            </div>
            <div className="border-t pt-3 flex justify-between font-semibold">
              <span>Total Costs</span>
              <span>{formatCurrency(totalCosts)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Revenue Breakdown */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Revenue Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {productTypes.map((pt, i) => (
              <div key={i} className="pb-3 border-b border-slate-100">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-700 font-medium">{pt.name || `Product ${i + 1}`}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-500 pl-3">
                  <span>{pt.number_of_units} units @ {formatCurrency(pt.sales_price_per_unit)}{pt.average_sqft ? ` (${pt.average_sqft.toLocaleString()} sqft)` : ''}</span>
                  <span className="font-medium">{formatCurrency((pt.number_of_units || 0) * (pt.sales_price_per_unit || 0))}</span>
                </div>
              </div>
            ))}
            <div className="flex justify-between text-sm pt-2">
              <span className="text-slate-600">Total Units</span>
              <span className="font-medium">{numUnits}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Gross Revenue</span>
              <span className="font-medium">{formatCurrency(grossRevenue)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Sales Commission ({salesCommissionPct}%)</span>
              <span className="font-medium text-red-600">-{formatCurrency(salesCommission)}</span>
            </div>
            <div className="border-t pt-3 flex justify-between font-semibold">
              <span>Net Revenue</span>
              <span>{formatCurrency(netRevenue)}</span>
            </div>
            <div className="border-t pt-3 flex justify-between text-lg font-bold">
              <span className={profit >= 0 ? "text-emerald-700" : "text-red-700"}>Net Profit</span>
              <span className={profit >= 0 ? "text-emerald-700" : "text-red-700"}>{formatCurrency(profit)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Timeline & Absorption */}
        <div className="md:col-span-2">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Project Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {proforma.entitlement_start_date && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Entitlement Start</p>
                    <p className="text-sm font-medium">{new Date(proforma.entitlement_start_date).toLocaleDateString()}</p>
                  </div>
                )}
                {proforma.entitlement_approval_date && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Entitlement Approval</p>
                    <p className="text-sm font-medium">{new Date(proforma.entitlement_approval_date).toLocaleDateString()}</p>
                  </div>
                )}
                {proforma.development_start_date && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Development Start</p>
                    <p className="text-sm font-medium">{new Date(proforma.development_start_date).toLocaleDateString()}</p>
                  </div>
                )}
                {proforma.development_completion_date && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Development Completion</p>
                    <p className="text-sm font-medium">{new Date(proforma.development_completion_date).toLocaleDateString()}</p>
                  </div>
                )}
                {proforma.first_home_start && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1">First Home Start</p>
                    <p className="text-sm font-medium">{new Date(proforma.first_home_start).toLocaleDateString()}</p>
                  </div>
                )}
                {proforma.first_home_sale && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1">First Home Sale</p>
                    <p className="text-sm font-medium">{new Date(proforma.first_home_sale).toLocaleDateString()}</p>
                  </div>
                )}
                {proforma.first_home_closing && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1">First Home Closing</p>
                    <p className="text-sm font-medium">{new Date(proforma.first_home_closing).toLocaleDateString()}</p>
                  </div>
                )}
                {totalAbsorptionPace > 0 && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Total Absorption Pace</p>
                    <p className="text-sm font-medium">{totalAbsorptionPace.toFixed(1)} units/month</p>
                  </div>
                )}
                {calculateFinalHomeClosing() && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Final Home Closing</p>
                    <p className="text-sm font-medium">{format(new Date(calculateFinalHomeClosing()), 'MMM d, yyyy')}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Notes */}
        {proforma.notes && (
          <div className="md:col-span-2">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600 whitespace-pre-wrap">{proforma.notes}</p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}