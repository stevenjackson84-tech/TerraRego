import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Loader2, TrendingUp, TrendingDown, AlertTriangle, Lightbulb } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart } from "recharts";
import { cn } from "@/lib/utils";

const fmt = (v) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v || 0);

export default function MarketPredictions({ competitorSales, deal }) {
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [forecastMonths, setForecastMonths] = useState('12');

  const handleForecast = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('predictMarketTrends', {
        deal_id: deal?.id,
        competitor_sales: competitorSales,
        forecast_months: parseInt(forecastMonths)
      });
      if (res.data?.success) {
        setPrediction(res.data.prediction);
      }
    } catch (e) {
      console.error('Forecast failed:', e);
    } finally {
      setLoading(false);
    }
  };

  if (!prediction) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <CardTitle className="text-base">Market Forecast</CardTitle>
              <p className="text-xs text-slate-500 mt-1">AI-powered predictions for price appreciation and demand trends</p>
            </div>
            <div className="flex items-center gap-2">
              <Select value={forecastMonths} onValueChange={setForecastMonths}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="6">6 months</SelectItem>
                  <SelectItem value="12">12 months</SelectItem>
                  <SelectItem value="24">24 months</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleForecast} disabled={loading || competitorSales.length === 0} className="bg-blue-600 hover:bg-blue-700">
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                {loading ? 'Forecasting...' : 'Generate Forecast'}
              </Button>
            </div>
          </div>
        </CardHeader>
        {competitorSales.length > 0 && !loading && (
          <CardContent>
            <p className="text-sm text-slate-500">Click "Generate Forecast" to create a {forecastMonths}-month market prediction based on competitor sales data.</p>
          </CardContent>
        )}
      </Card>
    );
  }

  const trendColor = {
    bullish: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    neutral: 'text-amber-700 bg-amber-50 border-amber-200',
    bearish: 'text-red-700 bg-red-50 border-red-200'
  };

  const absorptionColor = {
    accelerating: 'text-emerald-600',
    stable: 'text-slate-600',
    decelerating: 'text-amber-600'
  };

  const currentPrice = prediction.historical?.avgPriceHistory?.[prediction.historical.avgPriceHistory.length - 1]?.avg_price || 0;
  const forecastedPrice = prediction.forecasts?.[prediction.forecasts.length - 1]?.predicted_price || currentPrice;
  const totalAppreciation = currentPrice > 0 ? ((forecastedPrice - currentPrice) / currentPrice) * 100 : 0;

  // Combine historical and forecasted data for visualization
  const chartData = [
    ...(prediction.historical?.avgPriceHistory || []).slice(-6).map(h => ({
      month: new Date(h.month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      price: h.avg_price,
      absorption: null,
      type: 'historical'
    })),
    ...(prediction.forecasts || []).map(f => ({
      month: f.month_label,
      price: f.predicted_price,
      absorption: f.predicted_absorption,
      type: 'forecast'
    }))
  ];

  return (
    <div className="space-y-6">
      {/* Market Outlook Banner */}
      <Card className={cn("border-2 shadow-sm", trendColor[prediction.overall_trend])}>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-lg mb-2">
                <span className="capitalize">{prediction.overall_trend}</span> Market Outlook
              </h3>
              <p className="text-sm">
                Expected price appreciation: <span className="font-bold">{totalAppreciation > 0 ? '+' : ''}{totalAppreciation.toFixed(1)}%</span> over {forecastMonths} months
              </p>
              <p className="text-xs mt-1 opacity-75">
                Absorption trend: <span className="capitalize font-medium">{prediction.absorption_outlook}</span> •
                Confidence: <span className="capitalize font-medium">{prediction.confidence_level}</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-600 mb-1">Current Avg Price</p>
              <p className="text-2xl font-bold">{fmt(currentPrice)}</p>
              <p className="text-xs text-slate-600 mt-2">Projected Price</p>
              <p className="text-xl font-bold text-emerald-600">{fmt(forecastedPrice)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Price Forecast Chart */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Price Trend Forecast</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 12 }} angle={-45} textAnchor="end" height={80} />
              <YAxis yAxisId="left" tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <YAxis yAxisId="right" orientation="right" tick={{ fill: '#64748b', fontSize: 12 }} label={{ value: 'Units/Month', angle: 90, position: 'insideRight' }} />
              <Tooltip 
                formatter={(value, name) => {
                  if (name === 'price') return [fmt(value), 'Avg Price'];
                  if (name === 'absorption') return [Math.round(value), 'Absorption'];
                  return value;
                }}
                labelFormatter={(label) => `${label}`}
              />
              <Legend />
              <Bar yAxisId="left" dataKey="price" fill="#3b82f6" opacity={0.7} radius={[4, 4, 0, 0]} />
              <Line yAxisId="right" type="monotone" dataKey="absorption" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981', r: 4 }} />
            </ComposedChart>
          </ResponsiveContainer>
          <p className="text-xs text-slate-500 mt-2">Blue bars = historical prices, Line = forecasted absorption</p>
        </CardContent>
      </Card>

      {/* Monthly Forecast Details */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Monthly Forecast Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {prediction.forecasts.map((f, i) => (
              <div key={i} className="border border-slate-200 rounded-lg p-3 hover:bg-slate-50 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold text-slate-900">{f.month_label}</p>
                    <p className="text-xs text-slate-500">{f.notes}</p>
                  </div>
                  <div className={cn("flex items-center gap-1 text-xs font-medium px-2 py-1 rounded", absorptionColor[f.momentum])}>
                    {f.momentum === 'accelerating' && <TrendingUp className="h-3 w-3" />}
                    {f.momentum === 'decelerating' && <TrendingDown className="h-3 w-3" />}
                    <span className="capitalize">{f.momentum}</span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div className="bg-blue-50 rounded p-2">
                    <p className="text-xs text-slate-600">Avg Price</p>
                    <p className="font-semibold">{fmt(f.predicted_price)}</p>
                  </div>
                  <div className="bg-emerald-50 rounded p-2">
                    <p className="text-xs text-slate-600">Absorption</p>
                    <p className="font-semibold">{Math.round(f.predicted_absorption)} units/mo</p>
                  </div>
                  <div className={cn("rounded p-2", f.price_change_pct > 0 ? "bg-emerald-50" : "bg-red-50")}>
                    <p className="text-xs text-slate-600">Price Change</p>
                    <p className={cn("font-semibold", f.price_change_pct > 0 ? "text-emerald-700" : "text-red-700")}>
                      {f.price_change_pct > 0 ? '+' : ''}{f.price_change_pct.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Strategic Recommendations */}
      {prediction.strategic_recommendations?.length > 0 && (
        <Card className="border-0 shadow-sm border-l-4 border-l-blue-500">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-blue-700">
              <Lightbulb className="h-5 w-5" /> Strategic Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {prediction.strategic_recommendations.map((rec, i) => (
                <li key={i} className="text-sm text-slate-700 flex gap-2">
                  <span className="text-blue-600">•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Key Risks */}
      {prediction.key_risks?.length > 0 && (
        <Card className="border-0 shadow-sm border-l-4 border-l-red-500">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" /> Key Risks to Monitor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {prediction.key_risks.map((risk, i) => (
                <li key={i} className="text-sm text-slate-700 flex gap-2">
                  <span className="text-red-600">•</span>
                  <span>{risk}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Button onClick={() => setPrediction(null)} variant="outline" className="w-full">
        Clear Forecast
      </Button>
    </div>
  );
}