import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, DollarSign, Home, Calendar, AlertCircle, Loader } from "lucide-react";

export default function ZondaMarketAnalysis({ deal }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchMarketData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await base44.functions.invoke('zondaMarketAnalysis', {
        address: deal.address,
        city: deal.city,
        state: deal.state
      });
      setData(response.data);
    } catch (err) {
      setError(err.message || 'Failed to fetch market data');
    } finally {
      setLoading(false);
    }
  };

  if (!data && !loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-sm text-slate-600 mb-4">
            Analyze competitive market data for this deal using Zonda
          </p>
          <Button
            onClick={fetchMarketData}
            className="bg-slate-900 hover:bg-slate-700"
          >
            Analyze Market
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="flex justify-center mb-4">
            <Loader className="h-6 w-6 text-slate-400 animate-spin" />
          </div>
          <p className="text-sm text-slate-500">Fetching market data from Zonda...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-900">Market Analysis Error</p>
              <p className="text-sm text-red-700">{error}</p>
              <Button
                size="sm"
                onClick={fetchMarketData}
                variant="outline"
                className="mt-2"
              >
                Try Again
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data.data) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-sm text-slate-500 mb-4">{data.message}</p>
          <Button
            size="sm"
            onClick={fetchMarketData}
            variant="outline"
          >
            Try Different Location
          </Button>
        </CardContent>
      </Card>
    );
  }

  const market = data.data.market;
  const competitors = data.data.competitors;

  const getTrendIcon = (trend) => {
    if (!trend) return null;
    return trend > 0 ? 
      <TrendingUp className="h-4 w-4 text-green-600" /> :
      <TrendingDown className="h-4 w-4 text-red-600" />;
  };

  const getMarketConditionColor = (condition) => {
    const colors = {
      'buyer': 'bg-blue-100 text-blue-800',
      'seller': 'bg-green-100 text-green-800',
      'balanced': 'bg-slate-100 text-slate-800'
    };
    return colors[condition?.toLowerCase()] || 'bg-slate-100 text-slate-800';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">Market Analysis</h3>
        <Button
          size="sm"
          variant="outline"
          onClick={fetchMarketData}
        >
          Refresh
        </Button>
      </div>

      {/* Market Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-slate-200">
          <CardContent className="p-3">
            <div className="text-xs text-slate-500 font-medium mb-1">Avg Sale Price</div>
            <div className="text-xl font-semibold text-slate-900">
              ${market.averageSalePrice ? (market.averageSalePrice / 1000).toFixed(0) + 'K' : 'N/A'}
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="p-3">
            <div className="text-xs text-slate-500 font-medium mb-1">Price per Sqft</div>
            <div className="text-xl font-semibold text-slate-900">
              ${market.pricePerSquareFoot ? market.pricePerSquareFoot.toFixed(0) : 'N/A'}
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="p-3">
            <div className="text-xs text-slate-500 font-medium mb-1">Days on Market</div>
            <div className="text-xl font-semibold text-slate-900">
              {market.daysOnMarket || 'N/A'}
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="p-3">
            <div className="text-xs text-slate-500 font-medium mb-1">Market Condition</div>
            {market.marketCondition && (
              <Badge className={`text-xs ${getMarketConditionColor(market.marketCondition)}`}>
                {market.marketCondition}
              </Badge>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detailed Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Market Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-start justify-between p-3 bg-slate-50 rounded">
              <div>
                <div className="text-xs text-slate-500 font-medium">Absorption Rate</div>
                <div className="text-lg font-semibold text-slate-900 mt-1">
                  {market.absorptionRate ? market.absorptionRate.toFixed(1) + '%' : 'N/A'}
                </div>
              </div>
            </div>
            <div className="flex items-start justify-between p-3 bg-slate-50 rounded">
              <div>
                <div className="text-xs text-slate-500 font-medium">Current Inventory</div>
                <div className="text-lg font-semibold text-slate-900 mt-1">
                  {market.inventory || 'N/A'}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Competitors */}
      {competitors && competitors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Competitors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {competitors.map((comp, idx) => (
                <div key={idx} className="border border-slate-200 rounded-lg p-3">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h4 className="font-medium text-slate-900 text-sm">{comp.name}</h4>
                      <p className="text-xs text-slate-500">{comp.address}</p>
                    </div>
                    {comp.distance && (
                      <Badge variant="outline" className="text-xs flex-shrink-0">
                        {comp.distance} mi
                      </Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <div className="text-slate-500">Avg Price</div>
                      <div className="font-semibold text-slate-900">
                        ${comp.averagePrice ? (comp.averagePrice / 1000).toFixed(0) + 'K' : 'N/A'}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-500">Price/Sqft</div>
                      <div className="font-semibold text-slate-900">
                        ${comp.pricePerSquareFoot ? comp.pricePerSquareFoot.toFixed(0) : 'N/A'}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-500">Available</div>
                      <div className="font-semibold text-slate-900">
                        {comp.availableUnits || 0} / {comp.totalUnits || 0}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}