import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { AlertTriangle, CheckCircle2, TrendingUp, TrendingDown, Gavel } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const fmt = (n) => n != null ? `$${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "—";
const fmtPct = (n) => `${n > 0 ? "+" : ""}${n.toFixed(1)}%`;

export default function BidVsBudgetWidget() {
  const { data: takeoffs = [] } = useQuery({
    queryKey: ["takeoffs"],
    queryFn: () => base44.entities.Takeoff.list("-created_date"),
  });

  const { data: lineItems = [] } = useQuery({
    queryKey: ["takeoff-line-items-all"],
    queryFn: () => base44.entities.TakeoffLineItem.list(),
  });

  const { data: bidUploads = [] } = useQuery({
    queryKey: ["bid-uploads-all"],
    queryFn: () => base44.entities.BidUpload.list("-bid_date"),
  });

  const projects = useMemo(() => {
    return takeoffs.map(takeoff => {
      // Estimated budget from line items
      const items = lineItems.filter(li => li.takeoff_id === takeoff.id);
      const estimatedBudget = items.reduce((sum, li) => sum + (li.total_cost || 0), 0);

      // Best (lowest) bid for this takeoff that has been applied/extracted
      const bids = bidUploads.filter(b => b.takeoff_id === takeoff.id && b.total_bid_amount);
      const appliedBid = bids.find(b => b.status === "applied") || (bids.length > 0 ? bids.reduce((best, b) => b.total_bid_amount < best.total_bid_amount ? b : best) : null);

      const variance = appliedBid && estimatedBudget > 0
        ? appliedBid.total_bid_amount - estimatedBudget
        : null;
      const variancePct = variance != null && estimatedBudget > 0
        ? (variance / estimatedBudget) * 100
        : null;

      const isOver = variancePct != null && variancePct > 5;
      const isUnder = variancePct != null && variancePct < -5;
      const isOnBudget = variancePct != null && !isOver && !isUnder;

      return { takeoff, estimatedBudget, appliedBid, variance, variancePct, isOver, isUnder, isOnBudget, bidCount: bids.length };
    }).filter(p => p.estimatedBudget > 0 || p.appliedBid);
  }, [takeoffs, lineItems, bidUploads]);

  const overBudgetCount = projects.filter(p => p.isOver).length;
  const underBudgetCount = projects.filter(p => p.isUnder).length;

  if (projects.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-1">
          <Gavel className="h-5 w-5 text-slate-400" />
          <h3 className="font-semibold text-slate-900">Bid vs. Budget</h3>
        </div>
        <p className="text-sm text-slate-400 mt-4 text-center py-8">
          No takeoff data yet. Create takeoffs with estimated line items and upload bids to see comparisons here.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Gavel className="h-5 w-5 text-slate-700" />
          <h3 className="font-semibold text-slate-900 text-lg">Bid vs. Budget</h3>
        </div>
        <div className="flex items-center gap-2">
          {overBudgetCount > 0 && (
            <Badge className="bg-red-100 text-red-700 border-0 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              {overBudgetCount} Over Budget
            </Badge>
          )}
          {underBudgetCount > 0 && (
            <Badge className="bg-green-100 text-green-700 border-0">
              {underBudgetCount} Under Budget
            </Badge>
          )}
        </div>
      </div>

      {/* Project Rows */}
      <div className="space-y-3">
        {projects.map(({ takeoff, estimatedBudget, appliedBid, variance, variancePct, isOver, isUnder, isOnBudget, bidCount }) => {
          const barBudget = Math.max(estimatedBudget, appliedBid?.total_bid_amount || 0);
          const budgetPct = barBudget > 0 ? (estimatedBudget / barBudget) * 100 : 100;
          const bidPct = barBudget > 0 && appliedBid ? (appliedBid.total_bid_amount / barBudget) * 100 : 0;

          return (
            <div key={takeoff.id} className={`rounded-xl border p-4 transition-all ${isOver ? "border-red-200 bg-red-50/40" : isUnder ? "border-green-200 bg-green-50/30" : appliedBid ? "border-blue-100 bg-blue-50/20" : "border-slate-100 bg-slate-50/30"}`}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-semibold text-slate-900 text-sm">{takeoff.name}</p>
                  <p className="text-xs text-slate-400">
                    {takeoff.development_type?.replace("_", " ")}
                    {takeoff.lot_count ? ` · ${takeoff.lot_count} lots` : ""}
                    {bidCount > 0 ? ` · ${bidCount} bid${bidCount > 1 ? "s" : ""}` : ""}
                  </p>
                </div>
                <div className="text-right">
                  {isOver && (
                    <div className="flex items-center gap-1 text-red-600">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="text-xs font-bold">Over Budget</span>
                    </div>
                  )}
                  {isUnder && (
                    <div className="flex items-center gap-1 text-green-600">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="text-xs font-bold">Under Budget</span>
                    </div>
                  )}
                  {isOnBudget && (
                    <div className="flex items-center gap-1 text-blue-600">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="text-xs font-bold">On Budget</span>
                    </div>
                  )}
                  {!appliedBid && <span className="text-xs text-slate-400">No bid yet</span>}
                </div>
              </div>

              {/* Bar Chart */}
              {estimatedBudget > 0 && (
                <div className="mb-3 space-y-1.5">
                  {/* Budget bar */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 w-14 flex-shrink-0">Budget</span>
                    <div className="flex-1 h-5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-slate-400 rounded-full flex items-center justify-end pr-1.5 transition-all"
                        style={{ width: `${Math.min(budgetPct, 100)}%` }}
                      >
                        <span className="text-white text-xs font-semibold leading-none">{fmt(estimatedBudget)}</span>
                      </div>
                    </div>
                  </div>
                  {/* Bid bar */}
                  {appliedBid && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 w-14 flex-shrink-0">Best Bid</span>
                      <div className="flex-1 h-5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full flex items-center justify-end pr-1.5 transition-all ${isOver ? "bg-red-500" : isUnder ? "bg-green-500" : "bg-blue-500"}`}
                          style={{ width: `${Math.min(bidPct, 100)}%` }}
                        >
                          <span className="text-white text-xs font-semibold leading-none">{fmt(appliedBid.total_bid_amount)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Variance Summary */}
              {variance != null && (
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-1.5">
                    {variance > 0
                      ? <TrendingUp className="h-3.5 w-3.5 text-red-500" />
                      : <TrendingDown className="h-3.5 w-3.5 text-green-500" />}
                    <span className={`text-xs font-semibold ${isOver ? "text-red-600" : "text-green-600"}`}>
                      {variance > 0 ? "+" : ""}{fmt(variance)} ({fmtPct(variancePct)})
                    </span>
                    <span className="text-xs text-slate-400">vs. estimate</span>
                  </div>
                  <span className="text-xs text-slate-400">{appliedBid.contractor_name}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}