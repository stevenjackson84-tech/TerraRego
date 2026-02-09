import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, DollarSign, Clock, Target, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

const stageColors = {
  prospecting: "#94a3b8",
  loi: "#3b82f6",
  due_diligence: "#f59e0b",
  under_contract: "#8b5cf6",
  entitlements: "#ec4899",
  development: "#06b6d4",
  closed: "#10b981",
  dead: "#ef4444"
};

const stageLabels = {
  prospecting: "Prospecting",
  loi: "LOI",
  due_diligence: "Due Diligence",
  under_contract: "Under Contract",
  entitlements: "Entitlements",
  development: "Development",
  closed: "Closed",
  dead: "Dead"
};

export default function Analytics() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [dealTypeFilter, setDealTypeFilter] = useState("all");

  const { data: deals = [], isLoading } = useQuery({
    queryKey: ['deals'],
    queryFn: () => base44.entities.Deal.list(),
    initialData: []
  });

  // Apply filters
  const filteredDeals = useMemo(() => {
    return deals.filter(deal => {
      // Date filter
      if (dateFrom && deal.created_date) {
        if (new Date(deal.created_date) < new Date(dateFrom)) return false;
      }
      if (dateTo && deal.created_date) {
        if (new Date(deal.created_date) > new Date(dateTo)) return false;
      }
      
      // Deal type filter
      if (dealTypeFilter !== "all" && deal.deal_type !== dealTypeFilter) return false;
      
      return true;
    });
  }, [deals, dateFrom, dateTo, dealTypeFilter]);

  // Calculate metrics
  const metrics = useMemo(() => {
    const valueByStage = {};
    const dealsByStage = {};
    const leadSources = {};
    let totalClosingTime = 0;
    let closedDealsCount = 0;

    filteredDeals.forEach(deal => {
      // Value by stage
      const stage = deal.stage || 'prospecting';
      const value = deal.estimated_value || 0;
      valueByStage[stage] = (valueByStage[stage] || 0) + value;
      dealsByStage[stage] = (dealsByStage[stage] || 0) + 1;

      // Lead sources
      if (deal.lead_source) {
        leadSources[deal.lead_source] = (leadSources[deal.lead_source] || 0) + 1;
      }

      // Average closing time (for closed deals)
      if (deal.stage === 'closed' && deal.close_date && deal.created_date) {
        const created = new Date(deal.created_date);
        const closed = new Date(deal.close_date);
        const days = Math.floor((closed - created) / (1000 * 60 * 60 * 24));
        if (days > 0) {
          totalClosingTime += days;
          closedDealsCount++;
        }
      }
    });

    return {
      valueByStage,
      dealsByStage,
      leadSources,
      avgClosingTime: closedDealsCount > 0 ? Math.round(totalClosingTime / closedDealsCount) : 0,
      totalValue: Object.values(valueByStage).reduce((sum, val) => sum + val, 0),
      totalDeals: filteredDeals.length,
      activeDeals: filteredDeals.filter(d => !['closed', 'dead'].includes(d.stage)).length
    };
  }, [filteredDeals]);

  // Chart data
  const stageChartData = Object.entries(metrics.valueByStage).map(([stage, value]) => ({
    stage: stageLabels[stage] || stage,
    value: value,
    count: metrics.dealsByStage[stage],
    fill: stageColors[stage]
  })).sort((a, b) => b.value - a.value);

  const leadSourceData = Object.entries(metrics.leadSources).map(([source, count]) => ({
    name: source || 'Unknown',
    value: count
  })).sort((a, b) => b.value - a.value);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#ef4444', '#64748b'];

  // Pipeline forecast - deals by month
  const pipelineByMonth = useMemo(() => {
    const monthData = {};
    filteredDeals.forEach(deal => {
      if (deal.created_date) {
        const month = new Date(deal.created_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
        if (!monthData[month]) {
          monthData[month] = { month, deals: 0, value: 0 };
        }
        monthData[month].deals++;
        monthData[month].value += deal.estimated_value || 0;
      }
    });
    return Object.values(monthData).sort((a, b) => new Date(a.month) - new Date(b.month)).slice(-12);
  }, [filteredDeals]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Deal Analytics</h1>
        <p className="text-slate-500">Insights and performance metrics across your pipeline</p>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="dateFrom">Date From</Label>
              <Input
                id="dateFrom"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="dateTo">Date To</Label>
              <Input
                id="dateTo"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="dealType">Deal Type</Label>
              <Select value={dealTypeFilter} onValueChange={setDealTypeFilter}>
                <SelectTrigger id="dealType">
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
            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setDateFrom("");
                  setDateTo("");
                  setDealTypeFilter("all");
                }}
                className="w-full"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
              <DollarSign className="h-4 w-4" />
              <span>Total Pipeline Value</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{formatCurrency(metrics.totalValue)}</p>
            <p className="text-xs text-slate-500 mt-1">{metrics.totalDeals} total deals</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
              <Target className="h-4 w-4" />
              <span>Active Deals</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{metrics.activeDeals}</p>
            <p className="text-xs text-slate-500 mt-1">Excluding closed/dead</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
              <Clock className="h-4 w-4" />
              <span>Avg Closing Time</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">
              {metrics.avgClosingTime > 0 ? `${metrics.avgClosingTime} days` : '—'}
            </p>
            <p className="text-xs text-slate-500 mt-1">For closed deals</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
              <TrendingUp className="h-4 w-4" />
              <span>Avg Deal Size</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">
              {metrics.totalDeals > 0 ? formatCurrency(metrics.totalValue / metrics.totalDeals) : formatCurrency(0)}
            </p>
            <p className="text-xs text-slate-500 mt-1">Per deal</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Value by Stage */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Deal Value by Stage</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stageChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="stage" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`} />
                <Tooltip 
                  formatter={(value) => formatCurrency(value)}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                />
                <Bar dataKey="value" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Lead Source Performance */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Lead Source Performance</CardTitle>
          </CardHeader>
          <CardContent>
            {leadSourceData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={leadSourceData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {leadSourceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-slate-400">
                No lead source data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pipeline Forecast */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Pipeline Forecast (Last 12 Months)</CardTitle>
        </CardHeader>
        <CardContent>
          {pipelineByMonth.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={pipelineByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis 
                  yAxisId="left"
                  tick={{ fontSize: 12 }} 
                  tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`}
                />
                <YAxis 
                  yAxisId="right" 
                  orientation="right"
                  tick={{ fontSize: 12 }}
                />
                <Tooltip 
                  formatter={(value, name) => {
                    if (name === 'value') return formatCurrency(value);
                    return value;
                  }}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                />
                <Legend />
                <Line 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="value" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  name="Total Value"
                  dot={{ fill: '#3b82f6' }}
                />
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="deals" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  name="Deal Count"
                  dot={{ fill: '#10b981' }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-slate-400">
              No timeline data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Deal Count by Stage */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Deal Count by Stage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(metrics.dealsByStage).map(([stage, count]) => (
              <div key={stage} className="p-4 rounded-lg border border-slate-200">
                <div 
                  className="w-3 h-3 rounded-full mb-2" 
                  style={{ backgroundColor: stageColors[stage] }}
                />
                <p className="text-2xl font-bold text-slate-900">{count}</p>
                <p className="text-xs text-slate-500">{stageLabels[stage]}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}