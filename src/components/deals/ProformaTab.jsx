import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Edit, DollarSign, TrendingUp, Calculator, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ProformaTab({ proforma, onSave, isLoading }) {
  const [isEditing, setIsEditing] = useState(!proforma);
  const [formData, setFormData] = useState(proforma || {
    purchase_price: "",
    development_costs: "",
    soft_costs: "",
    financing_costs: "",
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
    notes: ""
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addProductType = () => {
    setFormData(prev => ({
      ...prev,
      product_types: [
        ...(prev.product_types || []),
        { name: "", number_of_units: "", sales_price_per_unit: "", direct_cost_per_unit: "", absorption_pace: "" }
      ]
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

  const handleSave = () => {
    const data = {
      ...formData,
      purchase_price: formData.purchase_price ? parseFloat(formData.purchase_price) : null,
      development_costs: formData.development_costs ? parseFloat(formData.development_costs) : null,
      soft_costs: formData.soft_costs ? parseFloat(formData.soft_costs) : null,
      financing_costs: formData.financing_costs ? parseFloat(formData.financing_costs) : null,
      product_types: (formData.product_types || []).map(pt => ({
        name: pt.name,
        number_of_units: pt.number_of_units ? parseFloat(pt.number_of_units) : 0,
        sales_price_per_unit: pt.sales_price_per_unit ? parseFloat(pt.sales_price_per_unit) : 0,
        direct_cost_per_unit: pt.direct_cost_per_unit ? parseFloat(pt.direct_cost_per_unit) : 0,
        absorption_pace: pt.absorption_pace ? parseFloat(pt.absorption_pace) : 0
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
  const financingCosts = parseFloat(formData.financing_costs) || 0;
  const contingencyPct = parseFloat(formData.contingency_percentage) || 5;
  const salesCommissionPct = parseFloat(formData.sales_commission_percentage) || 3;

  const productTypes = formData.product_types || [];
  
  const numUnits = productTypes.reduce((sum, pt) => sum + (parseFloat(pt.number_of_units) || 0), 0);
  const totalDirectCosts = productTypes.reduce((sum, pt) => 
    sum + ((parseFloat(pt.number_of_units) || 0) * (parseFloat(pt.direct_cost_per_unit) || 0)), 0
  );
  const grossRevenue = productTypes.reduce((sum, pt) => 
    sum + ((parseFloat(pt.number_of_units) || 0) * (parseFloat(pt.sales_price_per_unit) || 0)), 0
  );
  const totalAbsorptionPace = productTypes.reduce((sum, pt) => sum + (parseFloat(pt.absorption_pace) || 0), 0);

  const purchasePricePerUnit = numUnits > 0 ? purchasePrice / numUnits : 0;
  const devCostPerUnit = numUnits > 0 ? devCosts / numUnits : 0;
  const contingency = (purchasePrice + devCosts + softCosts + totalDirectCosts) * (contingencyPct / 100);
  const totalCosts = purchasePrice + devCosts + softCosts + financingCosts + totalDirectCosts + contingency;
  
  const salesCommission = grossRevenue * (salesCommissionPct / 100);
  const netRevenue = grossRevenue - salesCommission;
  
  const profit = netRevenue - totalCosts;
  const roi = totalCosts > 0 ? (profit / totalCosts) * 100 : 0;
  const profitMargin = grossRevenue > 0 ? (profit / grossRevenue) * 100 : 0;
  const grossMargin = grossRevenue > 0 ? ((grossRevenue - totalCosts) / grossRevenue) * 100 : 0;

  const netAssets = purchasePrice + devCosts + softCosts + totalDirectCosts + contingency;
  const rona = netAssets > 0 ? (profit / netAssets) * 100 : 0;

  // Unlevered IRR calculation
  const calculateUnleveredIRR = () => {
    if (!formData.development_start_date || totalAbsorptionPace === 0 || numUnits === 0) return null;
    
    // Build cash flow array
    const cashFlows = [];
    
    // Initial investment (negative cash flow at time 0)
    cashFlows.push(-netAssets);
    
    // Calculate cash flows by product type
    let currentMonth = 1;
    const maxMonths = 240; // 20 years max
    const productFlows = productTypes.map(pt => ({
      units: parseFloat(pt.number_of_units) || 0,
      salesPrice: parseFloat(pt.sales_price_per_unit) || 0,
      pace: parseFloat(pt.absorption_pace) || 0,
      unitsSold: 0
    }));
    
    // Generate monthly cash flows until all units sold
    while (currentMonth <= maxMonths && productFlows.some(pf => pf.unitsSold < pf.units)) {
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
      
      cashFlows.push(monthlyRevenue);
      currentMonth++;
    }
    
    if (cashFlows.length <= 1) return null;
    
    // Simple IRR approximation using Newton's method
    const npv = (rate, flows) => {
      return flows.reduce((sum, flow, t) => sum + flow / Math.pow(1 + rate, t), 0);
    };
    
    let rate = 0.1; // Initial guess 10%
    const maxIterations = 100;
    const tolerance = 0.0001;
    
    for (let i = 0; i < maxIterations; i++) {
      const npvValue = npv(rate, cashFlows);
      const npvDerivative = cashFlows.reduce((sum, flow, t) => 
        sum - (t * flow) / Math.pow(1 + rate, t + 1), 0);
      
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
              <div>
                <Label htmlFor="development_costs">Development Costs</Label>
                <Input
                  id="development_costs"
                  type="number"
                  value={formData.development_costs}
                  onChange={(e) => handleChange("development_costs", e.target.value)}
                  placeholder="0"
                />
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
                <Label htmlFor="financing_costs">Financing Costs</Label>
                <Input
                  id="financing_costs"
                  type="number"
                  value={formData.financing_costs}
                  onChange={(e) => handleChange("financing_costs", e.target.value)}
                  placeholder="0"
                />
              </div>
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
                      <Label className="text-xs">Product Name</Label>
                      <Input
                        value={pt.name}
                        onChange={(e) => updateProductType(index, "name", e.target.value)}
                        placeholder="e.g., Single Family"
                        className="h-9"
                      />
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
              </div>
              <div>
                <Label htmlFor="development_completion_date">Development Completion Date</Label>
                <Input
                  id="development_completion_date"
                  type="date"
                  value={formData.development_completion_date}
                  onChange={(e) => handleChange("development_completion_date", e.target.value)}
                />
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Direct Costs ({numUnits} units)</span>
              <span className="font-medium">{formatCurrency(totalDirectCosts)}</span>
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
                  <span>{pt.number_of_units} units @ {formatCurrency(pt.sales_price_per_unit)}</span>
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