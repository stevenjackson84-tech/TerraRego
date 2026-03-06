import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Trophy, TrendingDown, TrendingUp, Minus } from "lucide-react";

const CATEGORY_LABELS = {
  grading: "Grading", paving: "Paving", curb_gutter: "Curb & Gutter",
  storm_drain: "Storm Drain", sanitary_sewer: "Sanitary Sewer", water: "Water",
  dry_utilities: "Dry Utilities", street_lights: "Street Lights", landscaping: "Landscaping",
  walls_fencing: "Walls & Fencing", offsite_improvements: "Offsite Improvements",
  permits_fees: "Permits & Fees", engineering_survey: "Engineering / Survey",
  general_conditions: "General Conditions", other: "Other"
};

const fmt = (n) => n != null ? `$${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—";
const fmtTotal = (n) => n != null ? `$${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "—";

function CellValue({ value, values, isTotal }) {
  if (value == null) return <span className="text-slate-300 text-xs">—</span>;
  const validValues = values.filter(v => v != null);
  const min = Math.min(...validValues);
  const max = Math.max(...validValues);
  const isMin = value === min && validValues.length > 1;
  const isMax = value === max && validValues.length > 1;

  return (
    <span className={`font-medium ${isMin ? "text-green-700" : isMax ? "text-red-600" : "text-slate-700"}`}>
      {isTotal ? fmtTotal(value) : fmt(value)}
      {isMin && validValues.length > 1 && <TrendingDown className="h-3 w-3 inline ml-0.5 text-green-500" />}
      {isMax && validValues.length > 1 && <TrendingUp className="h-3 w-3 inline ml-0.5 text-red-400" />}
    </span>
  );
}

export default function BidComparisonView({ bidUploads }) {
  const [selected, setSelected] = useState([]);

  const toggleBid = (id) => {
    setSelected(prev =>
      prev.includes(id)
        ? prev.filter(x => x !== id)
        : prev.length < 3 ? [...prev, id] : prev
    );
  };

  const selectedBids = bidUploads.filter(b => selected.includes(b.id));

  // Build unified category/description rows across selected bids
  const rows = useMemo(() => {
    if (selectedBids.length === 0) return [];
    const rowMap = {};
    for (const bid of selectedBids) {
      for (const item of bid.extracted_line_items || []) {
        const key = `${item.category}||${(item.description || "").toLowerCase().trim()}`;
        if (!rowMap[key]) {
          rowMap[key] = { category: item.category, description: item.description, values: {} };
        }
        rowMap[key].values[bid.id] = {
          unit_cost: item.unit_cost,
          total_cost: item.total_cost,
          quantity: item.quantity,
          unit_of_measure: item.unit_of_measure
        };
      }
    }
    return Object.values(rowMap).sort((a, b) =>
      (CATEGORY_LABELS[a.category] || a.category).localeCompare(CATEGORY_LABELS[b.category] || b.category)
    );
  }, [selectedBids]);

  // Group rows by category
  const groupedRows = useMemo(() => {
    return rows.reduce((acc, row) => {
      const cat = row.category || "other";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(row);
      return acc;
    }, {});
  }, [rows]);

  // Determine winner (lowest total bid amount)
  const winnerId = useMemo(() => {
    const withAmounts = selectedBids.filter(b => b.total_bid_amount);
    if (withAmounts.length < 2) return null;
    return withAmounts.reduce((best, b) => b.total_bid_amount < best.total_bid_amount ? b : best).id;
  }, [selectedBids]);

  const colCount = selectedBids.length;

  return (
    <div>
      {/* Bid selector */}
      <div className="mb-5">
        <p className="text-sm text-slate-600 mb-2 font-medium">Select 2–3 bids to compare:</p>
        <div className="flex flex-wrap gap-2">
          {bidUploads.filter(b => b.extracted_line_items?.length > 0).map(bid => (
            <button
              key={bid.id}
              onClick={() => toggleBid(bid.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${
                selected.includes(bid.id)
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-400"
              } ${!selected.includes(bid.id) && selected.length >= 3 ? "opacity-40 cursor-not-allowed" : ""}`}
              disabled={!selected.includes(bid.id) && selected.length >= 3}
            >
              {selected.includes(bid.id) && <CheckCircle2 className="h-3.5 w-3.5" />}
              <span className="font-medium">{bid.contractor_name}</span>
              {bid.bid_date && <span className="text-xs opacity-70">{bid.bid_date}</span>}
              {bid.total_bid_amount && (
                <span className={`text-xs font-semibold ${selected.includes(bid.id) ? "text-slate-300" : "text-slate-500"}`}>
                  {fmtTotal(bid.total_bid_amount)}
                </span>
              )}
            </button>
          ))}
          {bidUploads.filter(b => b.extracted_line_items?.length > 0).length === 0 && (
            <p className="text-sm text-slate-400 italic">No extracted bids available. Upload and process bid PDFs first.</p>
          )}
        </div>
        {selected.length > 0 && (
          <Button variant="ghost" size="sm" className="mt-2 text-xs text-slate-400" onClick={() => setSelected([])}>
            Clear selection
          </Button>
        )}
      </div>

      {selectedBids.length < 2 && (
        <div className="text-center py-16 text-slate-400 border border-dashed border-slate-200 rounded-xl">
          <p className="font-medium text-slate-500 mb-1">Select at least 2 bids above</p>
          <p className="text-sm">A side-by-side comparison table will appear here.</p>
        </div>
      )}

      {selectedBids.length >= 2 && (
        <>
          {/* Header Summary Cards */}
          <div className={`grid gap-3 mb-5`} style={{ gridTemplateColumns: `repeat(${colCount}, 1fr)` }}>
            {selectedBids.map(bid => (
              <div key={bid.id} className={`rounded-xl p-4 border-2 ${bid.id === winnerId ? "border-green-400 bg-green-50" : "border-slate-200 bg-white"}`}>
                <div className="flex items-center gap-2 mb-1">
                  {bid.id === winnerId && <Trophy className="h-4 w-4 text-yellow-500" />}
                  <p className="font-semibold text-slate-900 text-sm">{bid.contractor_name}</p>
                </div>
                {bid.bid_date && <p className="text-xs text-slate-400 mb-2">{bid.bid_date}</p>}
                <p className="text-2xl font-bold text-slate-900">{fmtTotal(bid.total_bid_amount)}</p>
                <p className="text-xs text-slate-400 mt-0.5">{bid.extracted_line_items?.length || 0} line items</p>
                {bid.id === winnerId && (
                  <Badge className="mt-2 bg-green-100 text-green-700 text-xs">Lowest Bid</Badge>
                )}
              </div>
            ))}
          </div>

          {/* Comparison Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 w-48">Description</th>
                    {selectedBids.map(bid => (
                      <th key={bid.id} className="px-4 py-3 text-xs font-semibold text-slate-600 text-right min-w-[130px]">
                        <div>{bid.contractor_name}</div>
                        <div className="font-normal text-slate-400">Unit Cost / Total</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(groupedRows).map(([cat, catRows]) => (
                    <>
                      <tr key={`cat-${cat}`} className="bg-slate-50/70">
                        <td colSpan={colCount + 1} className="px-4 py-2">
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                            {CATEGORY_LABELS[cat] || cat}
                          </span>
                        </td>
                      </tr>
                      {catRows.map((row, i) => {
                        const unitCostValues = selectedBids.map(b => row.values[b.id]?.unit_cost ?? null);
                        const totalCostValues = selectedBids.map(b => row.values[b.id]?.total_cost ?? null);
                        return (
                          <tr key={`${cat}-${i}`} className="border-t border-slate-100 hover:bg-slate-50/50">
                            <td className="px-4 py-3 text-slate-600 text-xs">{row.description || <span className="italic text-slate-300">—</span>}</td>
                            {selectedBids.map((bid, bi) => {
                              const v = row.values[bid.id];
                              return (
                                <td key={bid.id} className="px-4 py-3 text-right">
                                  {v ? (
                                    <div>
                                      <div>
                                        <CellValue value={v.unit_cost} values={unitCostValues} />
                                        {v.unit_of_measure && (
                                          <span className="text-xs text-slate-400 ml-0.5">/{v.unit_of_measure.replace("per_", "").replace("_", " ")}</span>
                                        )}
                                      </div>
                                      {v.total_cost && (
                                        <div className="text-xs text-slate-400 mt-0.5">
                                          <CellValue value={v.total_cost} values={totalCostValues} isTotal />
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-slate-200 text-xs">—</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </>
                  ))}

                  {/* Total Row */}
                  <tr className="border-t-2 border-slate-300 bg-slate-900 text-white">
                    <td className="px-4 py-3 font-bold text-sm">Total Bid</td>
                    {selectedBids.map(bid => {
                      const totalValues = selectedBids.map(b => b.total_bid_amount ?? null);
                      return (
                        <td key={bid.id} className="px-4 py-3 text-right">
                          <span className={`font-bold text-base ${bid.id === winnerId ? "text-green-300" : "text-white"}`}>
                            {fmtTotal(bid.total_bid_amount)}
                          </span>
                          {bid.id === winnerId && <Trophy className="h-3.5 w-3.5 text-yellow-400 inline ml-1.5" />}
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <p className="text-xs text-slate-400 mt-3 text-center">
            <TrendingDown className="h-3 w-3 inline text-green-500 mr-1" />Green = lowest · 
            <TrendingUp className="h-3 w-3 inline text-red-400 ml-2 mr-1" />Red = highest across selected bids
          </p>
        </>
      )}
    </div>
  );
}