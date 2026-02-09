import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Edit, DollarSign, TrendingUp, Calculator } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ProformaTab({ proforma, onSave, isLoading }) {
  const [isEditing, setIsEditing] = useState(!proforma);
  const [formData, setFormData] = useState(proforma || {
    purchase_price: "",
    development_costs: "",
    soft_costs: "",
    financing_costs: "",
    number_of_units: "",
    sales_price_per_unit: "",
    direct_cost_per_unit: "",
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

  const handleSave = () => {
    const data = {
      ...formData,
      purchase_price: formData.purchase_price ? parseFloat(formData.purchase_price) : null,
      development_costs: formData.development_costs ? parseFloat(formData.development_costs) : null,
      soft_costs: formData.soft_costs ? parseFloat(formData.soft_costs) : null,
      financing_costs: formData.financing_costs ? parseFloat(formData.financing_costs) : null,
      number_of_units: formData.number_of_units ? parseFloat(formData.number_of_units) : null,
      sales_price_per_unit: formData.sales_price_per_unit ? parseFloat(formData.sales_price_per_unit) : null,
      direct_cost_per_unit: formData.direct_cost_per_unit ? parseFloat(formData.direct_cost_per_unit) : null,
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
  const numUnits = parseFloat(formData.number_of_units) || 0;
  const salesPricePerUnit = parseFloat(formData.sales_price_per_unit) || 0;
  const directCostPerUnit = parseFloat(formData.direct_cost_per_unit) || 0;
  const contingencyPct = parseFloat(formData.contingency_percentage) || 5;
  const salesCommissionPct = parseFloat(formData.sales_commission_percentage) || 3;

  const totalDirectCosts = directCostPerUnit * numUnits;
  const devCostPerUnit = numUnits > 0 ? devCosts / numUnits : 0;
  const contingency = (purchasePrice + devCosts + softCosts + totalDirectCosts) * (contingencyPct / 100);
  const totalCosts = purchasePrice + devCosts + softCosts + financingCosts + totalDirectCosts + contingency;
  
  const grossRevenue = salesPricePerUnit * numUnits;
  const salesCommission = grossRevenue * (salesCommissionPct / 100);
  const netRevenue = grossRevenue - salesCommission;
  
  const profit = netRevenue - totalCosts;
  const roi = totalCosts > 0 ? (profit / totalCosts) * 100 : 0;
  const profitMargin = grossRevenue > 0 ? (profit / grossRevenue) * 100 : 0;

  // RONA - Return on Net Assets (excluding financing costs for unlevered calculation)
  const netAssets = purchasePrice + devCosts + softCosts + totalDirectCosts + contingency;
  const rona = netAssets > 0 ? (profit / netAssets) * 100 : 0;

  // Unlevered IRR calculation
  const calculateUnleveredIRR = () => {
    if (!formData.development_start_date || !formData.absorption_pace || numUnits === 0) return null;
    
    const startDate = new Date(formData.development_start_date);
    const absorptionPace = parseFloat(formData.absorption_pace) || 0;
    
    if (absorptionPace === 0) return null;
    
    // Build cash flow array
    const cashFlows = [];
    
    // Initial investment (negative cash flow at time 0)
    cashFlows.push(-netAssets);
    
    // Calculate number of months to sell all units
    const monthsToSellOut = Math.ceil(numUnits / absorptionPace);
    
    // Revenue cash flows from sales (spread over absorption period)
    const revenuePerMonth = (salesPricePerUnit * absorptionPace) - (salesPricePerUnit * absorptionPace * (salesCommissionPct / 100));
    
    for (let i = 1; i <= monthsToSellOut; i++) {
      cashFlows.push(revenuePerMonth);
    }
    
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

          {/* Unit Economics */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Unit Economics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="number_of_units">Number of Units</Label>
                <Input
                  id="number_of_units"
                  type="number"
                  value={formData.number_of_units}
                  onChange={(e) => handleChange("number_of_units", e.target.value)}
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="sales_price_per_unit">Sales Price per Unit</Label>
                <Input
                  id="sales_price_per_unit"
                  type="number"
                  value={formData.sales_price_per_unit}
                  onChange={(e) => handleChange("sales_price_per_unit", e.target.value)}
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="direct_cost_per_unit">Direct Cost per Unit</Label>
                <Input
                  id="direct_cost_per_unit"
                  type="number"
                  value={formData.direct_cost_per_unit}
                  onChange={(e) => handleChange("direct_cost_per_unit", e.target.value)}
                  placeholder="0"
                />
              </div>
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
              <div>
                <Label htmlFor="absorption_pace">Absorption Pace (units/month)</Label>
                <Input
                  id="absorption_pace"
                  type="number"
                  step="0.1"
                  value={formData.absorption_pace}
                  onChange={(e) => handleChange("absorption_pace", e.target.value)}
                  placeholder="0"
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Units</span>
              <span className="font-medium">{numUnits}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Price per Unit</span>
              <span className="font-medium">{formatCurrency(salesPricePerUnit)}</span>
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
                {proforma.absorption_pace && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Absorption Pace</p>
                    <p className="text-sm font-medium">{proforma.absorption_pace} units/month</p>
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