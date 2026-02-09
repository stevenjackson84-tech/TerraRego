import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, FileText, Filter, TrendingUp, DollarSign, Clock, BarChart3 } from "lucide-react";
import jsPDF from "jspdf";
import { format, startOfQuarter, endOfQuarter, differenceInDays } from "date-fns";

export default function Reports() {
  const [reportType, setReportType] = useState("performance");
  const [dateRange, setDateRange] = useState("quarter");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [dealType, setDealType] = useState("all");
  const [stage, setStage] = useState("all");

  const { data: deals = [], isLoading } = useQuery({
    queryKey: ['deals'],
    queryFn: () => base44.entities.Deal.list(),
  });

  const { data: proformas = [] } = useQuery({
    queryKey: ['proformas'],
    queryFn: () => base44.entities.Proforma.list(),
  });

  // Filter deals based on criteria
  const getFilteredDeals = () => {
    let filtered = [...deals];
    
    // Date range filter
    const now = new Date();
    let start, end;
    
    if (dateRange === "quarter") {
      start = startOfQuarter(now);
      end = endOfQuarter(now);
    } else if (dateRange === "custom" && startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
    }
    
    if (start && end) {
      filtered = filtered.filter(deal => {
        const dealDate = deal.created_date ? new Date(deal.created_date) : null;
        return dealDate && dealDate >= start && dealDate <= end;
      });
    }
    
    // Deal type filter
    if (dealType !== "all") {
      filtered = filtered.filter(deal => deal.deal_type === dealType);
    }
    
    // Stage filter
    if (stage !== "all") {
      filtered = filtered.filter(deal => deal.stage === stage);
    }
    
    return filtered;
  };

  const filteredDeals = getFilteredDeals();

  // Calculate metrics
  const calculateMetrics = () => {
    const totalDeals = filteredDeals.length;
    const closedDeals = filteredDeals.filter(d => d.stage === 'closed').length;
    const totalValue = filteredDeals.reduce((sum, d) => sum + (d.purchase_price || 0), 0);
    const avgDealSize = totalDeals > 0 ? totalValue / totalDeals : 0;
    
    // Pipeline velocity (avg days to close)
    const closedWithDates = filteredDeals.filter(d => 
      d.stage === 'closed' && d.created_date && d.close_date
    );
    const avgDaysToClose = closedWithDates.length > 0
      ? closedWithDates.reduce((sum, d) => {
          return sum + differenceInDays(new Date(d.close_date), new Date(d.created_date));
        }, 0) / closedWithDates.length
      : 0;
    
    // Calculate profitability from proformas
    const dealsWithProforma = filteredDeals.filter(d => 
      proformas.some(p => p.deal_id === d.id)
    );
    
    const profitabilityData = dealsWithProforma.map(deal => {
      const proforma = proformas.find(p => p.deal_id === deal.id);
      if (!proforma) return null;
      
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
      const roi = totalCosts > 0 ? (profit / totalCosts) * 100 : 0;
      
      return {
        deal_name: deal.name,
        deal_type: deal.deal_type,
        profit,
        roi,
        totalCosts,
        netRevenue
      };
    }).filter(Boolean);
    
    const totalProfit = profitabilityData.reduce((sum, d) => sum + d.profit, 0);
    const avgProfit = profitabilityData.length > 0 ? totalProfit / profitabilityData.length : 0;
    const avgROI = profitabilityData.length > 0 
      ? profitabilityData.reduce((sum, d) => sum + d.roi, 0) / profitabilityData.length 
      : 0;
    
    // By deal type
    const byDealType = {};
    filteredDeals.forEach(deal => {
      const type = deal.deal_type || 'unknown';
      if (!byDealType[type]) {
        byDealType[type] = { count: 0, value: 0, profit: 0 };
      }
      byDealType[type].count++;
      byDealType[type].value += deal.purchase_price || 0;
      
      const profitData = profitabilityData.find(p => p.deal_name === deal.name);
      if (profitData) {
        byDealType[type].profit += profitData.profit;
      }
    });
    
    return {
      totalDeals,
      closedDeals,
      totalValue,
      avgDealSize,
      avgDaysToClose,
      totalProfit,
      avgProfit,
      avgROI,
      byDealType,
      profitabilityData
    };
  };

  const metrics = calculateMetrics();

  // Export to CSV
  const exportToCSV = () => {
    const headers = ["Deal Name", "Type", "Stage", "Purchase Price", "Estimated Value", "Created Date", "Close Date"];
    const rows = filteredDeals.map(deal => [
      deal.name || '',
      deal.deal_type || '',
      deal.stage || '',
      deal.purchase_price || 0,
      deal.estimated_value || 0,
      deal.created_date ? format(new Date(deal.created_date), 'yyyy-MM-dd') : '',
      deal.close_date ? format(new Date(deal.close_date), 'yyyy-MM-dd') : ''
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `deals-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export to PDF
  const exportToPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('Deal Performance Report', 14, 20);
    
    doc.setFontSize(11);
    doc.text(`Generated: ${format(new Date(), 'PPP')}`, 14, 30);
    doc.text(`Report Type: ${reportType}`, 14, 37);
    doc.text(`Period: ${dateRange}`, 14, 44);
    
    // Metrics
    doc.setFontSize(14);
    doc.text('Summary Metrics', 14, 55);
    
    doc.setFontSize(10);
    let y = 65;
    doc.text(`Total Deals: ${metrics.totalDeals}`, 14, y);
    y += 7;
    doc.text(`Closed Deals: ${metrics.closedDeals}`, 14, y);
    y += 7;
    doc.text(`Total Value: $${metrics.totalValue.toLocaleString()}`, 14, y);
    y += 7;
    doc.text(`Average Deal Size: $${metrics.avgDealSize.toLocaleString()}`, 14, y);
    y += 7;
    doc.text(`Average Days to Close: ${Math.round(metrics.avgDaysToClose)} days`, 14, y);
    y += 7;
    doc.text(`Average Profit: $${metrics.avgProfit.toLocaleString()}`, 14, y);
    y += 7;
    doc.text(`Average ROI: ${metrics.avgROI.toFixed(1)}%`, 14, y);
    
    // By Deal Type
    y += 15;
    doc.setFontSize(14);
    doc.text('Performance by Deal Type', 14, y);
    
    y += 10;
    doc.setFontSize(10);
    Object.entries(metrics.byDealType).forEach(([type, data]) => {
      doc.text(`${type}: ${data.count} deals, $${data.value.toLocaleString()} value, $${data.profit.toLocaleString()} profit`, 14, y);
      y += 7;
    });
    
    doc.save(`deal-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Reports & Analytics</h1>
            <p className="text-slate-500 mt-1">Generate customizable reports on deal performance</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={exportToCSV} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button onClick={exportToPDF} className="bg-slate-900 hover:bg-slate-800">
              <FileText className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Report Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div>
                <Label>Report Type</Label>
                <Select value={reportType} onValueChange={setReportType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="performance">Performance</SelectItem>
                    <SelectItem value="velocity">Pipeline Velocity</SelectItem>
                    <SelectItem value="profitability">Profitability</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Date Range</Label>
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quarter">This Quarter</SelectItem>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {dateRange === "custom" && (
                <>
                  <div>
                    <Label>Start Date</Label>
                    <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                  </div>
                  <div>
                    <Label>End Date</Label>
                    <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                  </div>
                </>
              )}

              <div>
                <Label>Deal Type</Label>
                <Select value={dealType} onValueChange={setDealType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="acquisition">Acquisition</SelectItem>
                    <SelectItem value="disposition">Disposition</SelectItem>
                    <SelectItem value="joint_venture">Joint Venture</SelectItem>
                    <SelectItem value="option">Option</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Stage</Label>
                <Select value={stage} onValueChange={setStage}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Stages</SelectItem>
                    <SelectItem value="prospecting">Prospecting</SelectItem>
                    <SelectItem value="loi">LOI</SelectItem>
                    <SelectItem value="due_diligence">Due Diligence</SelectItem>
                    <SelectItem value="under_contract">Under Contract</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
                <BarChart3 className="h-4 w-4" />
                <span>Total Deals</span>
              </div>
              <p className="text-3xl font-bold text-slate-900">{metrics.totalDeals}</p>
              <p className="text-sm text-slate-500 mt-1">{metrics.closedDeals} closed</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
                <DollarSign className="h-4 w-4" />
                <span>Total Value</span>
              </div>
              <p className="text-3xl font-bold text-slate-900">{formatCurrency(metrics.totalValue)}</p>
              <p className="text-sm text-slate-500 mt-1">Avg: {formatCurrency(metrics.avgDealSize)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
                <Clock className="h-4 w-4" />
                <span>Avg Days to Close</span>
              </div>
              <p className="text-3xl font-bold text-slate-900">{Math.round(metrics.avgDaysToClose)}</p>
              <p className="text-sm text-slate-500 mt-1">Pipeline velocity</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
                <TrendingUp className="h-4 w-4" />
                <span>Avg Profit</span>
              </div>
              <p className="text-3xl font-bold text-slate-900">{formatCurrency(metrics.avgProfit)}</p>
              <p className="text-sm text-slate-500 mt-1">ROI: {metrics.avgROI.toFixed(1)}%</p>
            </CardContent>
          </Card>
        </div>

        {/* Performance by Deal Type */}
        <Card>
          <CardHeader>
            <CardTitle>Performance by Deal Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(metrics.byDealType).map(([type, data]) => (
                <div key={type} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div>
                    <p className="font-medium text-slate-900 capitalize">{type}</p>
                    <p className="text-sm text-slate-500">{data.count} deals</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-900">{formatCurrency(data.value)}</p>
                    <p className="text-sm text-emerald-600">+{formatCurrency(data.profit)} profit</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Profitability Details */}
        {reportType === "profitability" && metrics.profitabilityData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Profitability by Deal</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">Deal Name</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">Type</th>
                      <th className="text-right py-3 px-4 font-semibold text-slate-700">Revenue</th>
                      <th className="text-right py-3 px-4 font-semibold text-slate-700">Costs</th>
                      <th className="text-right py-3 px-4 font-semibold text-slate-700">Profit</th>
                      <th className="text-right py-3 px-4 font-semibold text-slate-700">ROI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.profitabilityData.map((item, idx) => (
                      <tr key={idx} className="border-b hover:bg-slate-50">
                        <td className="py-3 px-4">{item.deal_name}</td>
                        <td className="py-3 px-4 capitalize">{item.deal_type}</td>
                        <td className="py-3 px-4 text-right">{formatCurrency(item.netRevenue)}</td>
                        <td className="py-3 px-4 text-right">{formatCurrency(item.totalCosts)}</td>
                        <td className="py-3 px-4 text-right font-semibold text-emerald-600">
                          {formatCurrency(item.profit)}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold">{item.roi.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}