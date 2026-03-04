import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Briefcase, Building2, Folder, Users, ChevronRight, Mail, Trophy } from "lucide-react";
import BidRequestForm from "@/components/marketplace/BidRequestForm";
import BidRequestDetail from "@/components/marketplace/BidRequestDetail";

const categoryLabels = {
  surveying: "Surveying",
  civil_engineering: "Civil Engineering",
  grading: "Grading",
  utilities: "Utilities",
  entitlement_consulting: "Entitlement Consulting",
  legal: "Legal",
  architecture: "Architecture",
  environmental: "Environmental",
  geotechnical: "Geotechnical",
  general_contractor: "General Contractor",
  other: "Other",
};

const statusStyles = {
  draft: "bg-slate-100 text-slate-600",
  open: "bg-blue-100 text-blue-700",
  awarded: "bg-green-100 text-green-700",
  closed: "bg-slate-100 text-slate-500",
};

export default function Marketplace() {
  const [showForm, setShowForm] = useState(false);
  const [selectedBid, setSelectedBid] = useState(null);
  const queryClient = useQueryClient();

  const { data: bids = [] } = useQuery({
    queryKey: ["bid_requests"],
    queryFn: () => base44.entities.BidRequest.list("-created_date"),
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts"],
    queryFn: () => base44.entities.Contact.list(),
  });

  const { data: deals = [] } = useQuery({
    queryKey: ["deals"],
    queryFn: () => base44.entities.Deal.list("-created_date"),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => base44.entities.Project.list("-created_date"),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.BidRequest.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bid_requests"] });
      setShowForm(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.BidRequest.update(id, data),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["bid_requests"] });
      // refresh selected if open
      if (selectedBid?.id === vars.id) {
        setSelectedBid(prev => ({ ...prev, ...vars.data }));
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.BidRequest.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bid_requests"] });
      setSelectedBid(null);
    },
  });

  const openBids = bids.filter(b => b.status === "open");
  const draftBids = bids.filter(b => b.status === "draft");
  const awardedBids = bids.filter(b => b.status === "awarded" || b.status === "closed");

  const getContactById = (id) => contacts.find(c => c.id === id);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center">
                <Briefcase className="h-5 w-5 text-white" />
              </div>
              Bid Marketplace
            </h1>
            <p className="text-slate-500 mt-1">Send projects out to bid and manage vendor responses</p>
          </div>
          <Button onClick={() => setShowForm(true)} className="bg-slate-900 hover:bg-slate-800">
            <Plus className="h-4 w-4 mr-2" />
            New Bid Request
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-5">
              <p className="text-2xl font-bold text-blue-600">{openBids.length}</p>
              <p className="text-sm text-slate-500 mt-0.5">Open Bids</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-5">
              <p className="text-2xl font-bold text-slate-400">{draftBids.length}</p>
              <p className="text-sm text-slate-500 mt-0.5">Drafts</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-5">
              <p className="text-2xl font-bold text-green-600">{awardedBids.length}</p>
              <p className="text-sm text-slate-500 mt-0.5">Awarded</p>
            </CardContent>
          </Card>
        </div>

        {bids.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="py-16 text-center">
              <Briefcase className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600 font-medium">No bid requests yet</p>
              <p className="text-slate-400 text-sm mt-1">Create a bid request to send a project out to your contacts</p>
              <Button onClick={() => setShowForm(true)} className="mt-4 bg-slate-900 hover:bg-slate-800">
                <Plus className="h-4 w-4 mr-2" /> Create First Bid Request
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {bids.map(bid => {
              const invitedCount = bid.invited_contacts?.length || 0;
              const awardedContact = bid.awarded_contact_id ? getContactById(bid.awarded_contact_id) : null;
              return (
                <Card
                  key={bid.id}
                  className="border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setSelectedBid(bid)}
                >
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                          <Briefcase className="h-4 w-4 text-slate-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 truncate">{bid.title}</p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            {bid.entity_name && (
                              <span className="text-xs text-slate-500 flex items-center gap-1">
                                {bid.entity_type === "deal" ? <Building2 className="h-3 w-3" /> : <Folder className="h-3 w-3" />}
                                {bid.entity_name}
                              </span>
                            )}
                            <Badge className="text-xs bg-slate-100 text-slate-600">{categoryLabels[bid.bid_category] || bid.bid_category}</Badge>
                            {bid.due_date && (
                              <span className="text-xs text-slate-400">Due {new Date(bid.due_date).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        {awardedContact && (
                          <span className="text-xs text-green-700 flex items-center gap-1">
                            <Trophy className="h-3 w-3" />
                            {awardedContact.first_name} {awardedContact.last_name}
                          </span>
                        )}
                        {invitedCount > 0 && (
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <Users className="h-3 w-3" /> {invitedCount} invited
                          </span>
                        )}
                        <Badge className={`text-xs ${statusStyles[bid.status]}`}>{bid.status}</Badge>
                        <ChevronRight className="h-4 w-4 text-slate-300" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* New Bid Form */}
      {showForm && (
        <BidRequestForm
          deals={deals}
          projects={projects}
          contacts={contacts}
          onSave={(data) => createMutation.mutate(data)}
          onClose={() => setShowForm(false)}
          isLoading={createMutation.isPending}
        />
      )}

      {/* Bid Detail Drawer */}
      {selectedBid && (
        <BidRequestDetail
          bid={selectedBid}
          contacts={contacts}
          deals={deals}
          projects={projects}
          onUpdate={(data) => updateMutation.mutate({ id: selectedBid.id, data })}
          onDelete={() => deleteMutation.mutate(selectedBid.id)}
          onClose={() => setSelectedBid(null)}
          isUpdating={updateMutation.isPending}
        />
      )}
    </div>
  );
}