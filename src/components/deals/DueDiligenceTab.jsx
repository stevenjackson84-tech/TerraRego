import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { FileCheck, AlertCircle, CheckCircle2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const defaultChecklist = [
  {
    category: "1. PLANNING / ENTITLEMENT DOCUMENTS",
    items: [
      { code: "1a", description: "Zoning / General Plan" },
      { code: "1b", description: "Growth Management Act" },
      { code: "1c", description: "Specific Plan / Master Plan" },
      { code: "1d", description: "Site Plan" },
      { code: "1e", description: "Final EIR" },
      { code: "1f", description: "Development Agreement" },
      { code: "1g", description: "Tentative Tract Map With Conditions of Approval" },
      { code: "1g2", description: "Revised Tentative Tract Map with Conditions" },
      { code: "1h", description: "Final Tract Map with Subdivision Improvement Agr." },
      { code: "1i", description: "Reimbursement Agreements" },
      { code: "1j", description: "CC & R's" },
      { code: "1k", description: "Existing HOA Documents" },
      { code: "1k2", description: "HOA Budget" },
      { code: "1k3", description: "DRE White Report - Disclosure Docs" },
      { code: "1l", description: "CFD/Mello Roos District - Bonds/Assessments" },
      { code: "1m", description: "Most recent tax bill and assessment" },
      { code: "1n", description: "Water Will Serve Letter" },
      { code: "1o", description: "Sewer Will Serve Letter" },
      { code: "1p", description: "School Agreement / Service Letter" },
      { code: "1q", description: "Off-Site Requirements" },
      { code: "1r", description: "Fair Share Agreements" },
      { code: "1s", description: "City Advertising and Signage Ordinances" }
    ]
  },
  {
    category: "2. SITE & ENVIRON. REVIEW DOCUMENTS",
    items: [
      { code: "2a", description: "ALTA Survey" },
      { code: "2b", description: "Soils Reports / Geotech Report" },
      { code: "2c", description: "Vegetation/Wetlands/Biological Survey" },
      { code: "2d", description: "Alquist Priolo" },
      { code: "2e", description: "Arborist Report" },
      { code: "2f", description: "Archeology Report" },
      { code: "2g", description: "Paleontology Report" },
      { code: "2h", description: "Noise Study Report" },
      { code: "2i", description: "Flood Zone - FEMA Map" },
      { code: "2j", description: "404 Permit - ACOE or Non-Jurisdictional Letter" },
      { code: "2j2", description: "Offsite 404 Permit" },
      { code: "2k", description: "1601/1603 Permit - Dept. of Fish & Game" },
      { code: "2k2", description: "Offsite 1601/1603 Permit" },
      { code: "2l", description: "Regional Water Quality Control Board Certification" },
      { code: "2m", description: "Environmental Assessment (Phase 1)" },
      { code: "2n", description: "Environmental Assessment (Phase 2)" },
      { code: "2o", description: "Earthquake Fault Maps" },
      { code: "2p", description: "Hazardous Waste Report" },
      { code: "2q", description: "Williamson Act Documentation" },
      { code: "2r", description: "Traffic Studies" },
      { code: "2s", description: "Avigation Easements" }
    ]
  },
  {
    category: "3. ENGINEERING PLANS",
    items: [
      { code: "3a", description: "Improvements Plans" },
      { code: "3a1", description: "> Rough Grading Plans" },
      { code: "3a2", description: "> Erosion Control Plans" },
      { code: "3a3", description: "> Precise Grading Plans" },
      { code: "3a4", description: "> Water Engineering Plans" },
      { code: "3a5", description: "> Sewer Engineering Plans" },
      { code: "3a6", description: "> Storm Drainage Plans" },
      { code: "3a7", description: "> Street Improvement Plans" },
      { code: "3a8", description: "> Joint Utility Plans (Elect., Gas, Tel., CATV)" },
      { code: "3b", description: "Pad and Lot Area Calculations" },
      { code: "3c", description: "Engineers / Seller Cost Estimate" },
      { code: "3c2", description: "Updated Cost Estimates" },
      { code: "3d", description: "Traffic Study" },
      { code: "3e", description: "Water Supply Study" },
      { code: "3f", description: "Drainage Study" },
      { code: "3g", description: "Sewer Capacity Study" },
      { code: "3h", description: "Landscape/Fence plans" },
      { code: "3i", description: "Edison Relocation (16 Kv)" },
      { code: "3j", description: "Improvement Plan Schedule from Seller" }
    ]
  },
  {
    category: "4. DEV PERMITS AND RELATED AGREEMENTS",
    items: [
      { code: "4a", description: "Land Development Improvements Permits" },
      { code: "4a1", description: "> Rough Grading Permit" },
      { code: "4a2", description: "> Water Engineering Permit" },
      { code: "4a3", description: "> Sewer Engineering Permit" },
      { code: "4a4", description: "> Storm Drainage Permit" },
      { code: "4a5", description: "> Street Improvement Permit" },
      { code: "4a6", description: "> Joint Dry Utility Install Agreement" },
      { code: "4b", description: "School Agreement" },
      { code: "4c", description: "Transportation Agreement" },
      { code: "4c2", description: "Roads Agreement" },
      { code: "4d", description: "Library Agreement" },
      { code: "4e", description: "Fire Agreement" },
      { code: "4f", description: "Parks Agreement" },
      { code: "4g", description: "Street Light Maintenance Agreement" },
      { code: "4h", description: "Landscape Maintenance Agreement" },
      { code: "4j", description: "CFD Agreement" },
      { code: "4k", description: "Special Agreement" },
      { code: "4l", description: "Off-site permission letters" }
    ]
  },
  {
    category: "CONSTRAINT REVIEW - Planning/Entitlement",
    items: [
      { code: "C1a", description: "Project consistent with Zoning/General Plan?" },
      { code: "C1b", description: "Project Vested?" },
      { code: "C1c", description: "Are Park or School dedications required?" },
      { code: "C1d", description: "Have endangered species/habitat been identified?" }
    ]
  },
  {
    category: "CONSTRAINT REVIEW - Title/Easements",
    items: [
      { code: "C2a", description: "Preliminary Title Report reviewed?" },
      { code: "C2b", description: "ALTA Policy ordered / Required?" },
      { code: "C2c", description: "Existing easements / right of ways plotted?" },
      { code: "C2d", description: "Title Summary Sheet Prepared" }
    ]
  },
  {
    category: "CONSTRAINT REVIEW - Grading",
    items: [
      { code: "C3a", description: "Will grading on adjacent properties be needed?" },
      { code: "C3b", description: "Is construction water available?" },
      { code: "C3c", description: "Import / Export required?" },
      { code: "C3d", description: "Import/ Export source identified?" }
    ]
  },
  {
    category: "CONSTRAINT REVIEW - Drainage",
    items: [
      { code: "C4a", description: "Will Adjacent property drain onto project?" },
      { code: "C4b", description: "Will project drain onto adjacent property?" },
      { code: "C4c", description: "Will drainage easements needed?" },
      { code: "C4d", description: "Have maintenance provisions been defined?" }
    ]
  },
  {
    category: "CONSTRAINT REVIEW - Utilities",
    items: [
      { code: "C5a", description: "Is Water available for project? (Service Provider)" },
      { code: "C5b", description: "Is Sewer capacity available for project? (Service Provider)" },
      { code: "C5c", description: "Are any moratoriums/restrictions in effect?" },
      { code: "C5d", description: "Are allocations needed? (availability?)" },
      { code: "C5e", description: "Electric Stubbed to Site? (Service Provider)" },
      { code: "C5f", description: "Pole/Utility line relocation/ removal?" },
      { code: "C5g", description: "Will undergrounding of existing utilities be required?" }
    ]
  },
  {
    category: "CONSTRAINT REVIEW - Access/Streets",
    items: [
      { code: "C6a", description: "Are project streets public?" },
      { code: "C6b", description: "Appropriate access to site available?" },
      { code: "C6c", description: "Will future county/state roads impact project?" },
      { code: "C6d", description: "Are offsite roadway improvements required?" }
    ]
  },
  {
    category: "CONSTRAINT REVIEW - Construction",
    items: [
      { code: "C7a", description: "Post tension slab required? (expansive soils)" },
      { code: "C7b", description: "Special concrete required? (high sulfate soils)" },
      { code: "C7c", description: "Fire overlay zone requirements?" },
      { code: "C7d", description: "Noise overlay zone requirements?" }
    ]
  }
];

export default function DueDiligenceTab({ dealId }) {
  const [expandedCategories, setExpandedCategories] = useState({});
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['dueDiligence', dealId],
    queryFn: () => base44.entities.DueDiligenceItem.filter({ deal_id: dealId }),
    enabled: !!dealId
  });

  const createDefaultItems = useMutation({
    mutationFn: async () => {
      const allItems = [];
      defaultChecklist.forEach((cat, catIndex) => {
        cat.items.forEach((item, itemIndex) => {
          allItems.push({
            deal_id: dealId,
            category: cat.category,
            item_code: item.code,
            description: item.description,
            applicable: true,
            document_received: false,
            potential_problems: false,
            comments: "",
            order: catIndex * 1000 + itemIndex
          });
        });
      });
      await base44.entities.DueDiligenceItem.bulkCreate(allItems);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dueDiligence', dealId] });
      toast.success('Default checklist created');
    }
  });

  const updateItem = useMutation({
    mutationFn: ({ id, data }) => base44.entities.DueDiligenceItem.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dueDiligence', dealId] });
    }
  });

  const toggleCategory = (category) => {
    setExpandedCategories(prev => ({ ...prev, [category]: !prev[category] }));
  };

  // Group items by category
  const groupedItems = items.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {});

  // Calculate overall progress
  const applicableItems = items.filter(item => item.applicable);
  const completedItems = applicableItems.filter(item => item.document_received);
  const progress = applicableItems.length > 0 
    ? (completedItems.length / applicableItems.length) * 100 
    : 0;

  const problemItems = items.filter(item => item.potential_problems && item.applicable);

  if (isLoading) {
    return <div className="flex justify-center py-8"><div className="animate-spin h-8 w-8 border-4 border-slate-300 border-t-slate-900 rounded-full" /></div>;
  }

  if (items.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="py-12 text-center">
          <FileCheck className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No Due Diligence Checklist</h3>
          <p className="text-slate-500 mb-6">Create a comprehensive due diligence checklist for this deal</p>
          <Button 
            onClick={() => createDefaultItems.mutate()} 
            disabled={createDefaultItems.isPending}
            className="bg-slate-900 hover:bg-slate-800"
          >
            <Plus className="h-4 w-4 mr-2" />
            {createDefaultItems.isPending ? "Creating..." : "Create Standard Checklist"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress Summary */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Due Diligence Progress</CardTitle>
            <Badge variant="outline" className="text-sm">
              {completedItems.length} / {applicableItems.length} completed
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Progress value={progress} className="h-2 mb-4" />
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-slate-900">{completedItems.length}</p>
              <p className="text-sm text-slate-500">Completed</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{applicableItems.length - completedItems.length}</p>
              <p className="text-sm text-slate-500">Remaining</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{problemItems.length}</p>
              <p className="text-sm text-slate-500">Issues</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Checklist by Category */}
      {Object.keys(groupedItems).sort().map((category) => {
        const categoryItems = groupedItems[category].sort((a, b) => (a.order || 0) - (b.order || 0));
        const categoryApplicable = categoryItems.filter(i => i.applicable);
        const categoryCompleted = categoryApplicable.filter(i => i.document_received);
        const categoryProgress = categoryApplicable.length > 0 
          ? (categoryCompleted.length / categoryApplicable.length) * 100 
          : 0;
        const isExpanded = expandedCategories[category];

        return (
          <Card key={category} className="border-0 shadow-sm">
            <CardHeader 
              className="cursor-pointer hover:bg-slate-50 transition-colors"
              onClick={() => toggleCategory(category)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <CardTitle className="text-base font-semibold">{category}</CardTitle>
                  <div className="flex items-center gap-3 mt-2">
                    <Progress value={categoryProgress} className="h-1.5 flex-1 max-w-xs" />
                    <span className="text-sm text-slate-500">
                      {categoryCompleted.length}/{categoryApplicable.length}
                    </span>
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  {isExpanded ? "Collapse" : "Expand"}
                </Button>
              </div>
            </CardHeader>
            {isExpanded && (
              <CardContent>
                <div className="space-y-2">
                  {categoryItems.map((item) => (
                    <div 
                      key={item.id} 
                      className={cn(
                        "p-3 rounded-lg border transition-colors",
                        !item.applicable && "bg-slate-50 opacity-60",
                        item.potential_problems && item.applicable && "border-red-200 bg-red-50"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex items-center gap-2 shrink-0">
                          <Checkbox
                            checked={item.applicable}
                            onCheckedChange={(checked) => 
                              updateItem.mutate({ id: item.id, data: { applicable: checked } })
                            }
                          />
                          <span className="text-xs text-slate-500 w-10">{item.item_code}</span>
                        </div>
                        
                        <div className="flex-1">
                          <p className={cn(
                            "text-sm font-medium",
                            !item.applicable && "text-slate-400 line-through"
                          )}>
                            {item.description}
                          </p>
                          {item.applicable && (
                            <div className="mt-2 space-y-2">
                              <div className="flex items-center gap-4">
                                <label className="flex items-center gap-2 text-sm">
                                  <Checkbox
                                    checked={item.document_received}
                                    onCheckedChange={(checked) => 
                                      updateItem.mutate({ 
                                        id: item.id, 
                                        data: { 
                                          document_received: checked,
                                          completed_date: checked ? new Date().toISOString().split('T')[0] : null
                                        } 
                                      })
                                    }
                                  />
                                  <CheckCircle2 className={cn(
                                    "h-4 w-4",
                                    item.document_received ? "text-green-600" : "text-slate-300"
                                  )} />
                                  <span className="text-slate-600">Document Received</span>
                                </label>
                                
                                <label className="flex items-center gap-2 text-sm">
                                  <Checkbox
                                    checked={item.potential_problems}
                                    onCheckedChange={(checked) => 
                                      updateItem.mutate({ id: item.id, data: { potential_problems: checked } })
                                    }
                                  />
                                  <AlertCircle className={cn(
                                    "h-4 w-4",
                                    item.potential_problems ? "text-red-600" : "text-slate-300"
                                  )} />
                                  <span className="text-slate-600">Issues</span>
                                </label>
                              </div>
                              
                              <Textarea
                                placeholder="Add comments or notes..."
                                value={item.comments || ''}
                                onChange={(e) => {
                                  const newComments = e.target.value;
                                  updateItem.mutate({ id: item.id, data: { comments: newComments } });
                                }}
                                className="text-sm min-h-[60px]"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}