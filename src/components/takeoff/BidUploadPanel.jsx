import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Upload, Trash2, FileText, Loader2, CheckCircle2, Folder, FolderOpen, ExternalLink, Download } from "lucide-react";
import { format } from "date-fns";

const CATEGORY_MAP = {
  grading: "grading", earthwork: "grading", excavation: "grading",
  paving: "paving", asphalt: "paving", concrete: "paving",
  curb: "curb_gutter", gutter: "curb_gutter",
  storm: "storm_drain", drainage: "storm_drain",
  sewer: "sanitary_sewer", wastewater: "sanitary_sewer",
  water: "water", waterline: "water",
  electric: "dry_utilities", gas: "dry_utilities", telecom: "dry_utilities",
  street: "street_lights", lighting: "street_lights",
  landscape: "landscaping",
  wall: "walls_fencing", fence: "walls_fencing",
  permit: "permits_fees", fee: "permits_fees",
  survey: "engineering_survey", engineering: "engineering_survey",
  general: "general_conditions"
};

export default function BidUploadPanel({ takeoff, bidUploads, onUpdate }) {
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [contractor, setContractor] = useState("");
  const [bidDate, setBidDate] = useState(new Date().toISOString().split("T")[0]);
  const [fileInput, setFileInput] = useState(null);
  const queryClient = useQueryClient();

  const deleteBidMutation = useMutation({
    mutationFn: (id) => base44.entities.BidUpload.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bid-uploads", takeoff.id] });
      onUpdate();
    }
  });

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !contractor) {
      alert("Please enter a contractor name before uploading.");
      return;
    }
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // Use AI to extract line items from the PDF
      setExtracting(true);
      let extracted = [];
      let totalBidAmount = null;
      let lotCount = null;

      const aiResult = await base44.integrations.Core.InvokeLLM({
        prompt: `You are analyzing a construction bid PDF for a residential land development project. 
Extract all line items including category of work, description, quantity, unit of measure, unit cost, and total cost.
Also extract the total bid amount and lot count if mentioned.
Map categories to one of: grading, paving, curb_gutter, storm_drain, sanitary_sewer, water, dry_utilities, street_lights, landscaping, walls_fencing, offsite_improvements, permits_fees, engineering_survey, general_conditions, other.
For unit_of_measure use: per_lot, per_lf, per_sf, lump_sum, per_unit.`,
        file_urls: [file_url],
        response_json_schema: {
          type: "object",
          properties: {
            total_bid_amount: { type: "number" },
            lot_count: { type: "number" },
            line_items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  category: { type: "string" },
                  description: { type: "string" },
                  unit_of_measure: { type: "string" },
                  quantity: { type: "number" },
                  unit_cost: { type: "number" },
                  total_cost: { type: "number" }
                }
              }
            }
          }
        }
      });

      extracted = aiResult.line_items || [];
      totalBidAmount = aiResult.total_bid_amount;
      lotCount = aiResult.lot_count;

      const bidRecord = await base44.entities.BidUpload.create({
        takeoff_id: takeoff.id,
        contractor_name: contractor,
        development_type: takeoff.development_type,
        file_url,
        file_name: file.name,
        bid_date: bidDate,
        total_bid_amount: totalBidAmount,
        lot_count: lotCount,
        extracted_line_items: extracted,
        status: "extracted"
      });

      // Apply extracted costs to update historical averages on line items
      if (extracted.length > 0) {
        const existingItems = await base44.entities.TakeoffLineItem.filter({ takeoff_id: takeoff.id });

        for (const extractedItem of extracted) {
          if (!extractedItem.unit_cost || !extractedItem.category) continue;

          const match = existingItems.find(li => li.category === extractedItem.category);
          if (match) {
            const prevCount = match.bid_count || 0;
            const prevAvg = match.historical_avg_unit_cost || extractedItem.unit_cost;
            const newCount = prevCount + 1;
            const newAvg = (prevAvg * prevCount + extractedItem.unit_cost) / newCount;
            await base44.entities.TakeoffLineItem.update(match.id, {
              historical_avg_unit_cost: newAvg,
              bid_count: newCount
            });
          }
        }
      }

      await base44.entities.BidUpload.update(bidRecord.id, { status: "applied" });
      setContractor("");
      onUpdate();
    } finally {
      setUploading(false);
      setExtracting(false);
    }
  };

  return (
    <div>
      {/* Upload Form */}
      <div className="bg-slate-50 rounded-xl p-4 mb-4 border border-dashed border-slate-200">
        <p className="text-sm font-medium text-slate-700 mb-3">Upload Bid PDF</p>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <Label className="text-xs">Contractor Name *</Label>
            <Input
              value={contractor}
              onChange={e => setContractor(e.target.value)}
              placeholder="e.g. ABC Civil Inc."
              className="h-8 text-sm"
            />
          </div>
          <div>
            <Label className="text-xs">Bid Date</Label>
            <Input
              type="date"
              value={bidDate}
              onChange={e => setBidDate(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
        </div>
        <label className="block">
          <div className="flex items-center justify-center gap-2 bg-slate-900 text-white rounded-lg px-4 py-2 cursor-pointer hover:bg-slate-800 text-sm w-full">
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {extracting ? "Extracting with AI..." : "Uploading..."}
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Upload & Extract Bid PDF
              </>
            )}
          </div>
          <input
            type="file"
            accept=".pdf"
            className="hidden"
            disabled={uploading}
            onChange={handleUpload}
          />
        </label>
        <p className="text-xs text-slate-400 mt-2 text-center">
          AI will extract line items and automatically update historical cost averages.
        </p>
      </div>

      {/* Uploaded Bids List */}
      {bidUploads.length === 0 ? (
        <div className="text-center py-8 text-slate-400 text-sm">
          No bids uploaded yet.
        </div>
      ) : (
        <div className="space-y-2">
          {bidUploads.map(bid => (
            <div key={bid.id} className="bg-white border border-slate-200 rounded-lg p-4 flex items-start justify-between">
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-slate-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-slate-900 text-sm">{bid.contractor_name}</p>
                  <p className="text-xs text-slate-500">{bid.file_name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {bid.bid_date && (
                      <span className="text-xs text-slate-400">{bid.bid_date}</span>
                    )}
                    {bid.total_bid_amount && (
                      <span className="text-xs font-medium text-slate-700">
                        ${bid.total_bid_amount.toLocaleString()}
                      </span>
                    )}
                    {bid.lot_count && (
                      <span className="text-xs text-slate-500">{bid.lot_count} lots</span>
                    )}
                    <Badge className={`text-xs ${bid.status === "applied" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                      {bid.status === "applied" ? <><CheckCircle2 className="h-3 w-3 mr-1" />Applied</> : bid.status}
                    </Badge>
                  </div>
                  {bid.extracted_line_items?.length > 0 && (
                    <p className="text-xs text-blue-600 mt-1">{bid.extracted_line_items.length} line items extracted</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a href={bid.file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">View PDF</a>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-red-500 hover:text-red-700"
                  onClick={() => deleteBidMutation.mutate(bid.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}