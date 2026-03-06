import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, BookOpen, TrendingUp, ArrowUpDown } from "lucide-react";
import CostTrendsTab from "@/components/takeoff/CostTrendsTab";

const CATEGORY_LABELS = {
  grading: "Grading", paving: "Paving", curb_gutter: "Curb & Gutter",
  storm_drain: "Storm Drain", sanitary_sewer: "Sanitary Sewer", water: "Water",
  dry_utilities: "Dry Utilities", street_lights: "Street Lights", landscaping: "Landscaping",
  walls_fencing: "Walls & Fencing", offsite_improvements: "Offsite Improvements",
  permits_fees: "Permits & Fees", engineering_survey: "Engineering / Survey",
  general_conditions: "General Conditions", other: "Other"
};

const UOM_LABELS = {
  per_lot: "/lot", per_lf: "/LF", per_sf: "/SF", lump_sum: "LS", per_unit: "/unit"
};

const CATEGORY_COLORS = {
  grading: "bg-amber-100 text-amber-800",
  paving: "bg-slate-100 text-slate-800",
  curb_gutter: "bg-gray-100 text-gray-800",
  storm_drain: "bg-blue-100 text-blue-800",
  sanitary_sewer: "bg-purple-100 text-purple-800",
  water: "bg-cyan-100 text-cyan-800",
  dry_utilities: "bg-yellow-100 text-yellow-800",
  street_lights: "bg-orange-100 text-orange-800",
  landscaping: "bg-green-100 text-green-800",
  walls_fencing: "bg-red-100 text-red-800",
  offsite_improvements: "bg-indigo-100 text-indigo-800",
  permits_fees: "bg-pink-100 text-pink-800",
  engineering_survey: "bg-teal-100 text-teal-800",
  general_conditions: "bg-violet-100 text-violet-800",
  other: "bg-slate-100 text-slate-600",
};

const fmt = (n) => n != null ? `$${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—";

export default function UnitCostLibraryPage() {
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterUom, setFilterUom] = useState("all");
  const [sortBy, setSortBy] = useState("category");

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["unit-cost-library"],
    queryFn: () => base44.entities.UnitCostLibrary.list("-updated_date", 500)
  });

  const filtered = entries
    .filter(e => {
      const searchLower = search.toLowerCase();
      const matchSearch = !search ||
        (e.description || "").toLowerCase().includes(searchLower) ||
        (CATEGORY_LABELS[e.category] || "").toLowerCase().includes(searchLower);
      const matchCat = filterCategory === "all" || e.category === filterCategory;
      const matchUom = filterUom === "all" || e.unit_of_measure === filterUom;
      return matchSearch && matchCat && matchUom;
    })
    .sort((a, b) => {
      if (sortBy === "category") return (a.category || "").localeCompare(b.category || "");
      if (sortBy === "avg_cost_asc") return (a.avg_unit_cost || 0) - (b.avg_unit_cost || 0);
      if (sortBy === "avg_cost_desc") return (b.avg_unit_cost || 0) - (a.avg_unit_cost || 0);
      if (sortBy === "bids") return (b.bid_count || 0) - (a.bid_count || 0);
      return 0;
    });

  // Group by category
  const grouped = filtered.reduce((acc, entry) => {
    const cat = entry.category || "other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(entry);
    return acc;
  }, {});

  const totalBids = entries.reduce((sum, e) => sum + (e.bid_count || 0), 0);
  const totalEntries = entries.length;

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <BookOpen className="h-6 w-6 text-slate-700" />
            <h1 className="text-2xl font-bold text-slate-900">Unit Cost Library</h1>
          </div>
          <p className="text-slate-500 text-sm">
            Global cost benchmarks aggregated from all uploaded bid PDFs across all projects.
          </p>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-slate-900">{totalEntries}</p>
            <p className="text-xs text-slate-500 mt-0.5">Cost Line Items</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-slate-900">{totalBids}</p>
            <p className="text-xs text-slate-500 mt-0.5">Total Bid Data Points</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-slate-900">{Object.keys(CATEGORY_LABELS).filter(c => entries.some(e => e.category === c)).length}</p>
            <p className="text-xs text-slate-500 mt-0.5">Categories Covered</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search description or category..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-44 h-9">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {Object.entries(CATEGORY_LABELS).map(([v, l]) => (
                <SelectItem key={v} value={v}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterUom} onValueChange={setFilterUom}>
            <SelectTrigger className="w-36 h-9">
              <SelectValue placeholder="All UOMs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All UOMs</SelectItem>
              {Object.entries(UOM_LABELS).map(([v, l]) => (
                <SelectItem key={v} value={v}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-40 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="category">Sort: Category</SelectItem>
              <SelectItem value="avg_cost_desc">Sort: Highest Cost</SelectItem>
              <SelectItem value="avg_cost_asc">Sort: Lowest Cost</SelectItem>
              <SelectItem value="bids">Sort: Most Bids</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="text-center py-20 text-slate-400">Loading cost library...</div>
        ) : entries.length === 0 ? (
          <div className="text-center py-24 text-slate-400 bg-white border border-dashed border-slate-200 rounded-xl">
            <BookOpen className="h-10 w-10 mx-auto mb-3 text-slate-300" />
            <p className="font-medium text-slate-600 mb-1">No cost data yet</p>
            <p className="text-sm">Upload bid PDFs in the Project Takeoff module to start building your cost library.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-400">No results match your filters.</div>
        ) : (
          <div className="space-y-4">
            {sortBy === "category"
              ? Object.entries(grouped).map(([cat, items]) => (
                  <div key={cat} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                    <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                      <Badge className={CATEGORY_COLORS[cat] || "bg-slate-100 text-slate-700"}>
                        {CATEGORY_LABELS[cat] || cat}
                      </Badge>
                      <span className="text-xs text-slate-400">{items.length} item{items.length !== 1 ? "s" : ""}</span>
                    </div>
                    <CostTable items={items} />
                  </div>
                ))
              : (
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                  <CostTable items={filtered} showCategory />
                </div>
              )
            }
          </div>
        )}
      </div>
    </div>
  );
}

function CostTable({ items, showCategory = false }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-xs text-slate-500 border-b border-slate-100">
          {showCategory && <th className="text-left px-4 py-2 font-medium">Category</th>}
          <th className="text-left px-4 py-2 font-medium">Description</th>
          <th className="text-center px-3 py-2 font-medium">UOM</th>
          <th className="text-right px-4 py-2 font-medium">Avg Cost</th>
          <th className="text-right px-4 py-2 font-medium">Min</th>
          <th className="text-right px-4 py-2 font-medium">Max</th>
          <th className="text-center px-4 py-2 font-medium">Bids</th>
          <th className="text-right px-4 py-2 font-medium">Last Bid</th>
        </tr>
      </thead>
      <tbody>
        {items.map((entry) => (
          <tr key={entry.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
            {showCategory && (
              <td className="px-4 py-2.5">
                <Badge className={`text-xs ${CATEGORY_COLORS[entry.category] || ""}`}>
                  {CATEGORY_LABELS[entry.category] || entry.category}
                </Badge>
              </td>
            )}
            <td className="px-4 py-2.5 text-slate-700">{entry.description || <span className="text-slate-400 italic">—</span>}</td>
            <td className="px-3 py-2.5 text-center">
              <span className="text-xs bg-slate-100 text-slate-600 rounded px-1.5 py-0.5 font-mono">
                {UOM_LABELS[entry.unit_of_measure] || entry.unit_of_measure}
              </span>
            </td>
            <td className="px-4 py-2.5 text-right font-semibold text-slate-900">{fmt(entry.avg_unit_cost)}</td>
            <td className="px-4 py-2.5 text-right text-green-700">{fmt(entry.min_unit_cost)}</td>
            <td className="px-4 py-2.5 text-right text-red-600">{fmt(entry.max_unit_cost)}</td>
            <td className="px-4 py-2.5 text-center">
              <span className="inline-flex items-center gap-1 text-xs text-slate-600">
                <TrendingUp className="h-3 w-3 text-slate-400" />
                {entry.bid_count || 0}
              </span>
            </td>
            <td className="px-4 py-2.5 text-right text-xs text-slate-400">{entry.last_bid_date || "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}