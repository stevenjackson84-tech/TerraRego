import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp } from "lucide-react";

export default function AvgProfitByTypeWidget({ deals, proformas }) {
  const calculateProfitByType = () => {
    const byType = {};

    deals.forEach(deal => {
      const proforma = proformas.find(p => p.deal_id === deal.id);
      if (!proforma) return;

      const type = deal.deal_type || 'unknown';
      const numUnits = parseFloat(proforma.number_of_units) || 0;
      const salesPrice = parseFloat(proforma.sales_price_per_unit) || 0;
      const directCost = parseFloat(proforma.direct_cost_per_unit) || 0;
      const purchasePrice = parseFloat(proforma.purchase_price) || 0;
      const devCosts = parseFloat(proforma.development_costs) || 0;
      const softCosts = parseFloat(proforma.soft_costs) || 0;
      const financingCosts = parseFloat(proforma.financing_costs) || 0;
      const contingencyPct = parseFloat(proforma.contingency_percentage) || 5;
      const salesCommissionPct = parseFloat(proforma.sales_commission_percentage) || 3;

      const totalDirectCosts = directCost * numUnits;
      const contingency = (purchasePrice + devCosts + softCosts + totalDirectCosts) * (contingencyPct / 100);
      const totalCosts = purchasePrice + devCosts + softCosts + financingCosts + totalDirectCosts + contingency;
      const grossRevenue = salesPrice * numUnits;
      const salesCommission = grossRevenue * (salesCommissionPct / 100);
      const netRevenue = grossRevenue - salesCommission;
      const profit = netRevenue - totalCosts;

      if (!byType[type]) {
        byType[type] = { count: 0, totalProfit: 0 };
      }
      byType[type].count++;
      byType[type].totalProfit += profit;
    });

    return Object.entries(byType).map(([type, data]) => ({
      type,
      avgProfit: data.count > 0 ? data.totalProfit / data.count : 0,
      count: data.count
    })).sort((a, b) => b.avgProfit - a.avgProfit);
  };

  const profitByType = calculateProfitByType();
  const topType = profitByType[0];

  const formatCurrency = (value) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  if (!topType) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-slate-500">Avg Profit per Deal Type</CardTitle>
          <DollarSign className="h-4 w-4 text-slate-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-slate-400">—</div>
          <p className="text-sm text-slate-500 mt-1">No proforma data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-slate-500">Avg Profit per Deal Type</CardTitle>
        <DollarSign className="h-4 w-4 text-emerald-500" />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-slate-900">{formatCurrency(topType.avgProfit)}</div>
        <p className="text-sm text-slate-500 mt-1 capitalize">
          {topType.type} ({topType.count} deals)
        </p>
        <div className="mt-3 space-y-1">
          {profitByType.slice(1, 3).map(item => (
            <div key={item.type} className="flex items-center justify-between text-xs">
              <span className="text-slate-600 capitalize">{item.type}</span>
              <span className="text-slate-700 font-medium">{formatCurrency(item.avgProfit)}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}