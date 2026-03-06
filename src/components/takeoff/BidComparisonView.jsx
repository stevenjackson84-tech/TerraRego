import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Trophy, TrendingDown, TrendingUp, DollarSign, BarChart2, Layers } from "lucide-react";

const CATEGORY_LABELS = {
  grading: "Grading", paving: "Paving", curb_gutter: "Curb & Gutter",
  storm_drain: "Storm Drain", sanitary_sewer: "Sanitary Sewer", water: "Water",
  dry_utilities: "Dry Utilities", street_lights: "Street Lights", landscaping: "Landscaping",
  walls_fencing: "Walls & Fencing", offsite_improvements: "Offsite Improvements",
  permits_fees: "Permits & Fees", engineering_survey: "Engineering / Survey",
  general_conditions: "General Conditions", other: "Other"
};

const CATEGORY_COLORS = {
  grading: "bg-amber-50 text-amber-800",
  paving: "bg-slate-100 text-slate-700",
  curb_gutter: "bg-orange-50 text-orange-700",
  storm_drain: "bg-blue-50 text-blue-700",
  sanitary_sewer: "bg-purple-50 text-purple-700",
  water: "bg-cyan-50 text-cyan-700",
  dry_utilities: "bg-yellow-50 text-yellow-700",
  street_lights: "bg-indigo-50 text-indigo-700",
  landscaping: "bg-green-50 text-green-700",
  walls_fencing: "bg-rose-50 text-rose-700",
  offsite_improvements: "bg-teal-50 text-teal-700",
  permits_fees: "bg-pink-50 text-pink-700",
  engineering_survey: "bg-violet-50 text-violet-700",
  general_conditions: "bg-gray-100 text-gray-700",
  other: "bg-slate-50 text-slate-600",
};

const fmt = (n) => n != null ? `$${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—";
const fmtTotal = (n) => n != null ? `$${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "—";

function CellValue({ value, values, isTotal }) {
  if (value == null) return <span className="text-slate-300 text-xs">—</span>;
  const validValues = values.filter(v => v != null && v > 0);
  const min = Math.min(...validValues);
  const max = Math.max(...validValues);
  const isMin = value === min && validValues.length > 1;
  const isMax = value === max && validValues.length > 1;

  return (
    <span className={`font-semibold ${isMin ? "text-green-700" : isMax ? "text-red-600" : "text-slate-700"}`}>
      {isTotal ? fmtTotal(value) : fmt(value)}
      {isMin && <TrendingDown className="h-3 w-3 inline ml-0.5 text-green-500" />}
      {isMax && <TrendingUp className="h-3 w-3 inline ml-0.5 text-red-400" />}
    </span>
  );
}

export default function BidComparisonView({ bidUploads }) {
  const [selected, setSelected] = useState([]);
  const [view, setView] = useState("detail"); // "detail" | "summary"

  const toggleBid = (id) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const extractedBids = bidUploads.filter(b => b.extracted_line_items?.length > 0);
  const selectedBids = bidUploads.filter(b => selected.includes(b.id));

  // Build unified rows across selected bids
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

  const groupedRows = useMemo(() => {
    return rows.reduce((acc, row) => {
      const cat = row.category || "other";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(row);
      return acc;
    }, {});
  }, [rows]);

  // Category subtotals per bid
  const categorySubtotals = useMemo(() => {
    const result = {};
    for (const [cat, catRows] of Object.entries(groupedRows)) {
      result[cat] = {};
      for (const bid of selectedBids) {
        result[cat][bid.id] = catRows.reduce((sum, row) => sum + (row.values[bid.id]?.total_cost || 0), 0);
      }
    }
    return result;
  }, [groupedRows, selectedBids]);

  const winnerId = useMemo(() => {
    const withAmounts = selectedBids.filter(b => b.total_bid_amount);
    if (withAmounts.length < 2) return null;
    return withAmounts.reduce((best, b) => b.total_bid_amount < best.total_bid_amount ? b : best).id;
  }, [selectedBids]);

  const winnerBid = selectedBids.find(b => b.id === winnerId);
  const maxBid = selectedBids.filter(b => b.total_bid_amount).reduce((worst, b) => !worst || b.total_bid_amount > worst.total_bid_amount ? b : worst, null);
  const potentialSavings = winnerBid && maxBid && winnerBid.id !== maxBid.id
    ? maxBid.total_bid_amount - winnerBid.total_bid_amount
    : null;

  return (
    <div>
      {/* Bid Selector */}
      <div className="mb-5">
        <p className="text-sm text-slate-600 mb-2 font-medium">Select bids to compare:</p>
        {extractedBids.length === 0 ? (
          <p className="text-sm text-slate-400 italic">No extracted bids available. Upload and process bid PDFs first.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {extractedBids.map(bid => (
              <button
                key={bid.id}
                onClick={() => toggleBid(bid.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${
                  selected.includes(bid.id)
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-400"
                }`}
              >
                {selected.includes(bid.id) && <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />}
                <span className="font-medium">{bid.contractor_name}</span>
                {bid.bid_date && <span className="text-xs opacity-60">{bid.bid_date}</span>}
                {bid.total_bid_amount && (
                  <span className={`text-xs font-semibold ${selected.includes(bid.id) ? "text-slate-300" : "text-slate-500"}`}>
                    {fmtTotal(bid.total_bid_amount)}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
        {selected.length > 0 && (
          <Button variant="ghost" size="sm" className="mt-2 text-xs text-slate-400" onClick={() => setSelected([])}>
            Clear selection
          </Button>
        )}
      </div>

      {selectedBids.length < 2 && (
        <div className="text-center py-16 text-slate-400 border border-dashed border-slate-200 rounded-xl">
          <BarChart2 className="h-8 w-8 mx-auto mb-3 text-slate-300" />
          <p className="font-medium text-slate-500 mb-1">Select at least 2 bids above</p>
          <p className="text-sm">A side-by-side comparison table will appear here.</p>
        </div>
      )}

      {selectedBids.length >= 2 && (
        <>
          {/* Summary Cards */}
          <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: `repeat(${Math.min(selectedBids.length, 4)}, 1fr)` }}>
            {selectedBids.map(bid => {
              const isWinner = bid.id === winnerId;
              const lotCount = bid.lot_count || 1;
              const perLot = bid.total_bid_amount ? bid.total_bid_amount / lotCount : null;
              return (
                <div key={bid.id} className={`rounded-xl p-4 border-2 transition-all ${isWinner ? "border-green-400 bg-green-50 shadow-sm" : "border-slate-200 bg-white"}`}>
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      {isWinner && <Trophy className="h-4 w-4 text-yellow-500 flex-shrink-0" />}
                      <p className="font-bold text-slate-900 text-sm leading-tight">{bid.contractor_name}</p>
                    </div>
                    {isWinner && <Badge className="bg-green-100 text-green-700 text-xs border-0">Best Value</Badge>}
                  </div>
                  {bid.bid_date && <p className="text-xs text-slate-400 mb-2">{bid.bid_date}</p>}
                  <p className="text-2xl font-bold text-slate-900">{fmtTotal(bid.total_bid_amount)}</p>
                  {perLot && (
                    <p className="text-xs text-slate-500 mt-0.5">
                      {fmtTotal(perLot)}<span className="text-slate-400">/lot</span>
                      {bid.lot_count && <span className="text-slate-400 ml-1">({bid.lot_count} lots)</span>}
                    </p>
                  )}
                  <p className="text-xs text-slate-400 mt-1.5">{bid.extracted_line_items?.length || 0} line items</p>
                  {potentialSavings && bid.id !== winnerId && bid.total_bid_amount && winnerBid?.total_bid_amount && (
                    <p className="text-xs text-red-500 mt-1 font-medium">
                      +{fmtTotal(bid.total_bid_amount - winnerBid.total_bid_amount)} vs best
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Savings Banner */}
          {potentialSavings > 0 && (
            <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-4">
              <DollarSign className="h-5 w-5 text-green-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-green-800">
                  Potential savings of {fmtTotal(potentialSavings)} by choosing {winnerBid?.contractor_name}
                </p>
                <p className="text-xs text-green-600">vs. highest bid ({maxBid?.contractor_name})</p>
              </div>
            </div>
          )}

          {/* View Toggle */}
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setView("detail")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${view === "detail" ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"}`}
            >
              <Layers className="h-3.5 w-3.5" /> Line Items
            </button>
            <button
              onClick={() => setView("summary")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${view === "summary" ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"}`}
            >
              <BarChart2 className="h-3.5 w-3.5" /> Category Summary
            </button>
          </div>

          {/* SUMMARY VIEW */}
          {view === "summary" && (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 w-48">Category</th>
                      {selectedBids.map(bid => (
                        <th key={bid.id} className="px-4 py-3 text-xs font-semibold text-slate-600 text-right min-w-[120px]">
                          <div>{bid.contractor_name}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(categorySubtotals).map(([cat, subtotals]) => {
                      const values = selectedBids.map(b => subtotals[b.id] || null);
                      const validVals = values.filter(v => v != null && v > 0);
                      const min = Math.min(...validVals);
                      const max = Math.max(...validVals);
                      return (
                        <tr key={cat} className="border-t border-slate-100 hover:bg-slate-50/50">
                          <td className="px-4 py-3">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${CATEGORY_COLORS[cat] || "bg-slate-100 text-slate-600"}`}>
                              {CATEGORY_LABELS[cat] || cat}
                            </span>
                          </td>
                          {selectedBids.map(bid => {
                            const val = subtotals[bid.id];
                            const isMin = val === min && validVals.length > 1 && val > 0;
                            const isMax = val === max && validVals.length > 1 && val > 0;
                            return (
                              <td key={bid.id} className="px-4 py-3 text-right">
                                <span className={`font-semibold text-sm ${isMin ? "text-green-700" : isMax ? "text-red-600" : "text-slate-700"}`}>
                                  {val > 0 ? fmtTotal(val) : <span className="text-slate-300 text-xs">—</span>}
                                </span>
                                {isMin && <TrendingDown className="h-3 w-3 inline ml-0.5 text-green-500" />}
                                {isMax && <TrendingUp className="h-3 w-3 inline ml-0.5 text-red-400" />}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                    {/* Total Row */}
                    <tr className="border-t-2 border-slate-300 bg-slate-900 text-white">
                      <td className="px-4 py-3 font-bold text-sm">Total Bid</td>
                      {selectedBids.map(bid => (
                        <td key={bid.id} className="px-4 py-3 text-right">
                          <span className={`font-bold text-base ${bid.id === winnerId ? "text-green-300" : "text-white"}`}>
                            {fmtTotal(bid.total_bid_amount)}
                          </span>
                          {bid.id === winnerId && <Trophy className="h-3.5 w-3.5 text-yellow-400 inline ml-1.5" />}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* DETAIL VIEW */}
          {view === "detail" && (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 w-56">Description</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 w-20">Qty / UOM</th>
                      {selectedBids.map(bid => (
                        <th key={bid.id} className="px-4 py-3 text-xs font-semibold text-slate-600 text-right min-w-[130px]">
                          <div>{bid.contractor_name}</div>
                          <div className="font-normal text-slate-400">Unit / Total</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(groupedRows).map(([cat, catRows]) => {
                      const subtotals = categorySubtotals[cat] || {};
                      const subVals = selectedBids.map(b => subtotals[b.id] || null);
                      return (
                        <>
                          {/* Category Header */}
                          <tr key={`cat-${cat}`} className="bg-slate-50">
                            <td colSpan={2} className="px-4 py-2">
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${CATEGORY_COLORS[cat] || "bg-slate-100 text-slate-600"}`}>
                                {CATEGORY_LABELS[cat] || cat}
                              </span>
                            </td>
                            {selectedBids.map(bid => {
                              const val = subtotals[bid.id];
                              const validSubs = subVals.filter(v => v != null && v > 0);
                              const isMin = val === Math.min(...validSubs) && validSubs.length > 1 && val > 0;
                              const isMax = val === Math.max(...validSubs) && validSubs.length > 1 && val > 0;
                              return (
                                <td key={bid.id} className="px-4 py-2 text-right">
                                  <span className={`text-xs font-semibold ${isMin ? "text-green-600" : isMax ? "text-red-500" : "text-slate-500"}`}>
                                    {val > 0 ? fmtTotal(val) : ""}
                                  </span>
                                </td>
                              );
                            })}
                          </tr>

                          {/* Line Items */}
                          {catRows.map((row, i) => {
                            const unitCostValues = selectedBids.map(b => row.values[b.id]?.unit_cost ?? null);
                            const totalCostValues = selectedBids.map(b => row.values[b.id]?.total_cost ?? null);
                            // Get first available qty/uom for reference
                            const refVal = Object.values(row.values)[0];
                            return (
                              <tr key={`${cat}-${i}`} className="border-t border-slate-100 hover:bg-slate-50/40">
                                <td className="px-4 py-2.5 text-slate-600 text-xs">{row.description || <span className="italic text-slate-300">—</span>}</td>
                                <td className="px-4 py-2.5 text-xs text-slate-400">
                                  {refVal?.quantity && <div>{Number(refVal.quantity).toLocaleString()}</div>}
                                  {refVal?.unit_of_measure && (
                                    <div className="uppercase tracking-wide text-slate-300">
                                      {refVal.unit_of_measure.replace("per_", "").replace(/_/g, " ")}
                                    </div>
                                  )}
                                </td>
                                {selectedBids.map((bid) => {
                                  const v = row.values[bid.id];
                                  return (
                                    <td key={bid.id} className="px-4 py-2.5 text-right">
                                      {v ? (
                                        <div>
                                          <div className="text-sm">
                                            <CellValue value={v.unit_cost} values={unitCostValues} />
                                          </div>
                                          {v.total_cost != null && (
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
                      );
                    })}

                    {/* Total Row */}
                    <tr className="border-t-2 border-slate-300 bg-slate-900 text-white">
                      <td colSpan={2} className="px-4 py-3 font-bold text-sm">Total Bid</td>
                      {selectedBids.map(bid => (
                        <td key={bid.id} className="px-4 py-3 text-right">
                          <div className={`font-bold text-base ${bid.id === winnerId ? "text-green-300" : "text-white"}`}>
                            {fmtTotal(bid.total_bid_amount)}
                            {bid.id === winnerId && <Trophy className="h-3.5 w-3.5 text-yellow-400 inline ml-1.5" />}
                          </div>
                          {bid.lot_count && bid.total_bid_amount && (
                            <div className="text-xs text-slate-400 mt-0.5">{fmtTotal(bid.total_bid_amount / bid.lot_count)}/lot</div>
                          )}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <p className="text-xs text-slate-400 mt-3 text-center">
            <TrendingDown className="h-3 w-3 inline text-green-500 mr-1" />Green = lowest ·
            <TrendingUp className="h-3 w-3 inline text-red-400 ml-2 mr-1" />Red = highest across selected bids
          </p>
        </>
      )}
    </div>
  );
}