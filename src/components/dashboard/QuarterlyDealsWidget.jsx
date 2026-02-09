import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, TrendingUp } from "lucide-react";
import { startOfQuarter, endOfQuarter, isWithinInterval } from "date-fns";

export default function QuarterlyDealsWidget({ deals }) {
  const now = new Date();
  const quarterStart = startOfQuarter(now);
  const quarterEnd = endOfQuarter(now);

  const dealsClosedThisQuarter = deals.filter(deal => {
    if (deal.stage !== 'closed' || !deal.close_date) return false;
    const closeDate = new Date(deal.close_date);
    return isWithinInterval(closeDate, { start: quarterStart, end: quarterEnd });
  });

  const totalValue = dealsClosedThisQuarter.reduce((sum, d) => sum + (d.purchase_price || 0), 0);
  const avgValue = dealsClosedThisQuarter.length > 0 ? totalValue / dealsClosedThisQuarter.length : 0;

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

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-slate-500">Deals Closed This Quarter</CardTitle>
        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-slate-900">{dealsClosedThisQuarter.length}</div>
        <p className="text-sm text-slate-500 mt-1">
          {formatCurrency(totalValue)} total value
        </p>
        <div className="flex items-center gap-1 mt-2 text-xs text-slate-600">
          <TrendingUp className="h-3 w-3" />
          Avg: {formatCurrency(avgValue)} per deal
        </div>
      </CardContent>
    </Card>
  );
}