import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2, TrendingUp } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export default function LineItemRow({ item, uomLabels, onDelete, onUpdate }) {
  const qty = item.quantity || 0;
  const unitCost = item.estimated_unit_cost || 0;
  const total = qty * unitCost;
  const hasHistorical = item.historical_avg_unit_cost != null && item.bid_count > 0;

  return (
    <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-50 hover:bg-slate-50 group text-sm">
      <div className="flex-1 min-w-0">
        <p className="text-slate-800 font-medium truncate">{item.description || "—"}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-slate-400">
            {qty.toLocaleString()} {uomLabels[item.unit_of_measure] || item.unit_of_measure}
            {" × "}${unitCost.toFixed(2)}
          </span>
          {hasHistorical && (
            <span className="text-xs text-blue-600 flex items-center gap-0.5">
              <TrendingUp className="h-3 w-3" />
              Hist. avg: ${item.historical_avg_unit_cost.toFixed(2)} ({item.bid_count} bids)
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3 ml-4">
        <span className="font-semibold text-slate-900">
          ${total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </span>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700"
          onClick={onDelete}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}