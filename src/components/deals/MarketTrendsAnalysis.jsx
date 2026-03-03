import { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, TrendingUp, AlertCircle, CheckCircle2 } from "lucide-react";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter } from "recharts";
import { cn } from "@/lib/utils";

const fmt = (v) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v || 0);

const COLORS = ['#0f172a', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function MarketTrendsAnalysis({ competitorSales, deal }) {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('analyzeMarketTrends', {
        deal_id: deal?.id,
        competitor_sales: competitorSales
      });
      if (res.data?.success) {
        setAnalysis(res.data.analysis);
      }
    } catch (e) {
      console.error('Analysis failed:', e);
    } finally {
      setLoading(false);
    }
  };

  // Prepare chart data
  const priceByType = useMemo(() => {
    const grouped = {};
    competitorSales.forEach(sale => {
      if (!grouped[sale.product_type]) {
        grouped[sale.product_type] = { type: sale.product_type, prices: [], count: 0 };
      }
      grouped[sale.product_type].prices.push(sale.sale_price);
      grouped[sale.product_type].count++;
    });
    return Object.values(grouped).map(g => ({
      name: g.type,
      average: Math.round(g.prices.reduce((a, b) => a + b, 0) / g.prices.length),
      count: g.count
    }));
  }, [competitorSales]);

  const pricePerSqft = useMemo(() => {
    return competitorSales
      .filter(s => s.square_footage)
      .map(s => ({
        name: s.competitor_name?.substring(0, 15),
        price_per_sqft: Math.round(s.sale_price / s.square_footage),
        product_type: s.product_type
      }))
      .slice(0, 10);
  }, [competitorSales]);

  const priceDistribution = useMemo(() => {
    const bins = [
      { range: '$0-$300k', min: 0, max: 300000, count: 0 },
      { range: '$300k-$500k', min: 300000, max: 500000, count: 0 },
      { range: '$500k-$750k', min: 500000, max: 750000, count: 0 },
      { range: '$750k-$1M', min: 750000, max: 1000000, count: 0 },
      { range: '$1M+', min: 1000000, max: Infinity, count: 0 }
    ];
    competitorSales.forEach(sale => {
      const bin = bins.find(b => sale.sale_price >= b.min && sale.sale_price < b.max);
      if (bin) bin.count++;
    });
    return bins.filter(b => b.count > 0);
  }, [competitorSales]);

  const salesVelocity = useMemo(() => {
    const salesByMonth = {};
    competitorSales
      .filter(s => s.sale_date)
      .forEach(sale => {
        const date = new Date(sale.sale_date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        salesByMonth[monthKey] = (salesByMonth[monthKey] || 0) + 1;
      });
    
    return Object.entries(salesByMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, count]) => ({
        month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        sales: count
      }));
  }, [competitorSales]);

  if (!analysis) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Market Trends Analysis</CardTitle>
            <Button onClick={handleAnalyze} disabled={loading || competitorSales.length === 0} className="bg-purple-600 hover:bg-purple-700">
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
              {loading ? 'Analyzing...' : 'Analyze Trends'}
            </Button>
          </div>
        </CardHeader>
        {competitorSales.length > 0 && !loading && (
          <CardContent>
            <p className="text-sm text-slate-500">Click "Analyze Trends" to generate AI-powered market insights based on {competitorSales.length} competitor sales.</p>
          </CardContent>
        )}
      </Card>
    );
  }

  const healthColor = {
    strong: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    moderate: 'bg-amber-50 border-amber-200 text-amber-800',
    weak: 'bg-red-50 border-red-200 text-red-800'
  };

  return (
    <div className="space-y-6">
      {/* Overall Market Health */}
      <Card className={cn("border-2 shadow-sm", healthColor[analysis.market_health] || 'bg-slate-50')}>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-lg mb-2">Market Health: <span className="capitalize">{analysis.market_health}</span></h3>
              <p className="text-sm">{competitorSales.length} sales analyzed • Average Price: {fmt(analysis.average_price)} • Price Range: {fmt(analysis.price_range.min)} - {fmt(analysis.price_range.max)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-600 mb-1">Avg Price/Sqft</p>
              <p className="text-2xl font-bold">${analysis.avg_price_per_sqft}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {priceByType.length > 0 && (
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Average Price by Product Type</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={priceByType}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} angle={-45} textAnchor="end" height={80} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v) => fmt(v)} />
                  <Bar dataKey="average" fill="#0f172a" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {pricePerSqft.length > 0 && (
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Price Per Square Foot</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={pricePerSqft}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} angle={-45} textAnchor="end" height={80} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
                  <Tooltip formatter={(v) => `$${v}`} />
                  <Bar dataKey="price_per_sqft" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {priceDistribution.length > 0 && (
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Price Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={priceDistribution} dataKey="count" nameKey="range" cx="50%" cy="50%" outerRadius={100} label>
                    {priceDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {analysis.product_type_analysis?.length > 0 && (
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Product Type Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analysis.product_type_analysis.map((pt, i) => (
                  <div key={i} className="border-b border-slate-100 pb-3 last:border-0">
                    <div className="flex items-start justify-between mb-1">
                      <span className="font-medium text-slate-900">{pt.product_type}</span>
                      <span className="text-xs bg-slate-100 px-2 py-1 rounded">{pt.count} sales</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs text-slate-600">
                      <div>
                        <p className="text-slate-500">Avg Price</p>
                        <p className="font-semibold">{fmt(pt.avg_price)}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Avg Sqft</p>
                        <p className="font-semibold">{pt.avg_sqft?.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">$/Sqft</p>
                        <p className="font-semibold">${pt.avg_price_per_sqft}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Key Insights */}
      {analysis.key_insights?.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Key Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {analysis.key_insights.map((insight, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <TrendingUp className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700">{insight}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Opportunities & Risks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {analysis.opportunities?.length > 0 && (
          <Card className="border-0 shadow-sm border-l-4 border-l-emerald-500">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 text-emerald-700">
                <CheckCircle2 className="h-5 w-5" /> Opportunities
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {analysis.opportunities.map((opp, i) => (
                  <li key={i} className="text-sm text-slate-700">• {opp}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {analysis.risks?.length > 0 && (
          <Card className="border-0 shadow-sm border-l-4 border-l-red-500">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 text-red-700">
                <AlertCircle className="h-5 w-5" /> Risks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {analysis.risks.map((risk, i) => (
                  <li key={i} className="text-sm text-slate-700">• {risk}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>

      <Button onClick={() => setAnalysis(null)} variant="outline" className="w-full">
        Clear Analysis
      </Button>
    </div>
  );
}