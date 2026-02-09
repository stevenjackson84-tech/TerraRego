import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, MapPin, Calendar, DollarSign, User, Building2, Edit, 
  Plus, FileText, ClipboardList, MessageSquare, Trash2, HardHat, 
  CheckCircle2, Clock, AlertCircle, TrendingUp, Folder
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import DealForm from "@/components/deals/DealForm";
import EntitlementCard from "@/components/entitlements/EntitlementCard";
import EntitlementForm from "@/components/entitlements/EntitlementForm";
import TaskForm from "@/components/tasks/TaskForm";
import TaskCard from "@/components/deals/TaskCard";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import ProformaTab from "@/components/deals/ProformaTab";
import DocumentList from "@/components/documents/DocumentList";

const stageStyles = {
  prospecting: "bg-slate-100 text-slate-700",
  loi: "bg-indigo-100 text-indigo-700",
  controlled_not_approved: "bg-blue-100 text-blue-700",
  controlled_approved: "bg-amber-100 text-amber-700",
  owned: "bg-cyan-100 text-cyan-700",
  entitlements: "bg-purple-100 text-purple-700",
  development: "bg-emerald-100 text-emerald-700",
  closed: "bg-green-100 text-green-700",
  dead: "bg-red-100 text-red-700"
};

const statusConfig = {
  planned: { color: "bg-slate-100 text-slate-700 border-slate-200", icon: Clock },
  in_progress: { color: "bg-blue-100 text-blue-700 border-blue-200", icon: TrendingUp },
  completed: { color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
  delayed: { color: "bg-red-100 text-red-700 border-red-200", icon: AlertCircle },
  on_hold: { color: "bg-amber-100 text-amber-700 border-amber-200", icon: AlertCircle }
};

const categoryIcons = {
  site_work: "🏗️",
  foundation: "🧱",
  framing: "🏛️",
  utilities: "⚡",
  infrastructure: "🛣️",
  landscaping: "🌳",
  permits: "📋",
  inspection: "🔍",
  other: "📌"
};

export default function DealDetails() {
  const urlParams = new URLSearchParams(window.location.search);
  const dealId = urlParams.get('id');
  
  const [showDealForm, setShowDealForm] = useState(false);
  const [showEntitlementForm, setShowEntitlementForm] = useState(false);
  const [editingEntitlement, setEditingEntitlement] = useState(null);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [showDevForm, setShowDevForm] = useState(false);
  const [editingDevUpdate, setEditingDevUpdate] = useState(null);
  const [devFormData, setDevFormData] = useState({
    deal_id: dealId || "",
    milestone: "",
    description: "",
    status: "planned",
    progress_percentage: 0,
    target_date: "",
    completion_date: "",
    category: "other",
    notes: ""
  });

  const queryClient = useQueryClient();

  const defaultMilestones = [
    { milestone: "Pre-Con Meeting", category: "permits", status: "planned" },
    { milestone: "Site Clearing", category: "site_work", status: "planned" },
    { milestone: "Mass Grading", category: "site_work", status: "planned" },
    { milestone: "Land Drain (Optional)", category: "utilities", status: "planned" },
    { milestone: "Sewer", category: "utilities", status: "planned" },
    { milestone: "Culinary Water", category: "utilities", status: "planned" },
    { milestone: "Storm Drain", category: "utilities", status: "planned" },
    { milestone: "Secondary Water", category: "utilities", status: "planned" },
    { milestone: "Curb and Gutter", category: "infrastructure", status: "planned" },
    { milestone: "Roadway", category: "infrastructure", status: "planned" },
    { milestone: "Sidewalk", category: "infrastructure", status: "planned" },
    { milestone: "Power", category: "utilities", status: "planned" },
    { milestone: "Gas", category: "utilities", status: "planned" },
    { milestone: "Street Lights", category: "infrastructure", status: "planned" },
    { milestone: "Street Signs", category: "infrastructure", status: "planned" },
    { milestone: "Mailboxes", category: "infrastructure", status: "planned" }
  ];

  const defaultEntitlements = [
    { name: "Zoning Approval", type: "zoning_change", status: "not_started" },
    { name: "DRC Approval", type: "other", status: "not_started" },
    { name: "Preliminary Plat Approval", type: "subdivision", status: "not_started" },
    { name: "Final Plat/Engineering Approval", type: "subdivision", status: "not_started" },
    { name: "Plat Recorded", type: "other", status: "not_started" }
  ];

  const createDefaultMilestones = useMutation({
    mutationFn: async () => {
      const milestones = defaultMilestones.map(m => ({
        ...m,
        deal_id: dealId,
        description: "",
        progress_percentage: 0,
        target_date: "",
        completion_date: "",
        notes: ""
      }));
      await base44.entities.DevelopmentUpdate.bulkCreate(milestones);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['developmentUpdates', dealId] });
    }
  });

  const createDefaultEntitlements = useMutation({
    mutationFn: async () => {
      const entitlements = defaultEntitlements.map(e => ({
        ...e,
        deal_id: dealId,
        agency: "",
        submission_date: "",
        approval_date: "",
        expiration_date: "",
        estimated_cost: null,
        actual_cost: null,
        assigned_to: "",
        notes: "",
        documents: []
      }));
      await base44.entities.Entitlement.bulkCreate(entitlements);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entitlements', dealId] });
    }
  });

  const { data: deal, isLoading } = useQuery({
    queryKey: ['deal', dealId],
    queryFn: async () => {
      const deals = await base44.entities.Deal.filter({ id: dealId });
      return deals[0];
    },
    enabled: !!dealId
  });

  const { data: entitlements = [] } = useQuery({
    queryKey: ['entitlements', dealId],
    queryFn: () => base44.entities.Entitlement.filter({ deal_id: dealId }),
    enabled: !!dealId
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', dealId],
    queryFn: () => base44.entities.Task.filter({ deal_id: dealId }),
    enabled: !!dealId
  });

  const { data: activities = [] } = useQuery({
    queryKey: ['activities', dealId],
    queryFn: () => base44.entities.Activity.filter({ deal_id: dealId }, '-created_date'),
    enabled: !!dealId
  });

  const { data: developmentUpdates = [] } = useQuery({
    queryKey: ['developmentUpdates', dealId],
    queryFn: () => base44.entities.DevelopmentUpdate.filter({ deal_id: dealId }),
    enabled: !!dealId
  });

  const { data: proforma } = useQuery({
    queryKey: ['proforma', dealId],
    queryFn: async () => {
      const proformas = await base44.entities.Proforma.filter({ deal_id: dealId });
      return proformas[0];
    },
    enabled: !!dealId
  });

  const { data: allDeals = [] } = useQuery({
    queryKey: ['deals'],
    queryFn: () => base44.entities.Deal.list()
  });

  const updateDealMutation = useMutation({
    mutationFn: (data) => base44.entities.Deal.update(dealId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deal', dealId] });
      setShowDealForm(false);
    }
  });

  const entitlementMutation = useMutation({
    mutationFn: (data) => editingEntitlement 
      ? base44.entities.Entitlement.update(editingEntitlement.id, data)
      : base44.entities.Entitlement.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entitlements', dealId] });
      setShowEntitlementForm(false);
      setEditingEntitlement(null);
    }
  });

  const deleteEntitlementMutation = useMutation({
    mutationFn: (id) => base44.entities.Entitlement.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['entitlements', dealId] })
  });

  const taskMutation = useMutation({
    mutationFn: (data) => editingTask 
      ? base44.entities.Task.update(editingTask.id, data)
      : base44.entities.Task.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', dealId] });
      setShowTaskForm(false);
      setEditingTask(null);
    }
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (id) => base44.entities.Task.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks', dealId] })
  });

  const updateTaskStatusMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.Task.update(id, { 
      status,
      completed_date: status === 'completed' ? new Date().toISOString().split('T')[0] : null
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks', dealId] })
  });

  const devUpdateMutation = useMutation({
    mutationFn: (data) => editingDevUpdate 
      ? base44.entities.DevelopmentUpdate.update(editingDevUpdate.id, data)
      : base44.entities.DevelopmentUpdate.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['developmentUpdates', dealId] });
      queryClient.invalidateQueries({ queryKey: ['developmentUpdates'] });
      setShowDevForm(false);
      setEditingDevUpdate(null);
      setDevFormData({
        deal_id: dealId || "",
        milestone: "",
        description: "",
        status: "planned",
        progress_percentage: 0,
        target_date: "",
        completion_date: "",
        category: "other",
        notes: ""
      });
    }
  });

  const deleteDevUpdateMutation = useMutation({
    mutationFn: (id) => base44.entities.DevelopmentUpdate.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['developmentUpdates', dealId] });
      queryClient.invalidateQueries({ queryKey: ['developmentUpdates'] });
    }
  });

  const proformaMutation = useMutation({
    mutationFn: (data) => proforma 
      ? base44.entities.Proforma.update(proforma.id, data)
      : base44.entities.Proforma.create({ ...data, deal_id: dealId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proforma', dealId] });
    }
  });

  const convertToProjectMutation = useMutation({
    mutationFn: async () => {
      const project = await base44.entities.Project.create({
        name: deal.name,
        description: deal.notes || `Project created from deal: ${deal.name}`,
        deal_id: dealId,
        status: "planning",
        priority: deal.priority || "medium",
        start_date: deal.contract_date || "",
        budget: deal.purchase_price || null,
        project_manager: deal.assigned_to || "",
        team_members: []
      });
      return project;
    },
    onSuccess: (project) => {
      window.location.href = createPageUrl("ProjectDetails") + "?id=" + project.id;
    }
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-slate-300 border-t-slate-900 rounded-full" />
      </div>
    );
  }

  if (!deal) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500">Deal not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <Link to={createPageUrl("Deals")} className="inline-flex items-center text-sm text-slate-600 hover:text-slate-900 mb-6">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Deals
        </Link>

        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{deal.name}</h1>
              <Badge className={cn("text-sm", stageStyles[deal.stage])}>
                {deal.stage?.replace('_', ' ')}
              </Badge>
            </div>
            {deal.address && (
              <div className="flex items-center text-slate-500">
                <MapPin className="h-4 w-4 mr-1" />
                {deal.address}, {deal.city}, {deal.state}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={() => convertToProjectMutation.mutate()} 
              disabled={convertToProjectMutation.isPending}
              variant="outline"
            >
              <Folder className="h-4 w-4 mr-2" />
              {convertToProjectMutation.isPending ? "Converting..." : "Convert to Project"}
            </Button>
            <Button onClick={() => setShowDealForm(true)} variant="outline">
              <Edit className="h-4 w-4 mr-2" />
              Edit Deal
            </Button>
          </div>
        </div>

        {/* Key Info Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-sm text-slate-500">Acreage</p>
              <p className="text-2xl font-semibold text-slate-900">{deal.acreage || '—'}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-sm text-slate-500">Estimated Value</p>
              <p className="text-2xl font-semibold text-slate-900">
                {deal.estimated_value ? `$${(deal.estimated_value / 1000000).toFixed(2)}M` : '—'}
              </p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-sm text-slate-500">Current Zoning</p>
              <p className="text-2xl font-semibold text-slate-900">{deal.zoning_current || '—'}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-sm text-slate-500">Target Zoning</p>
              <p className="text-2xl font-semibold text-slate-900">{deal.zoning_target || '—'}</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-white border">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="proforma">Proforma</TabsTrigger>
            <TabsTrigger value="development">
              <HardHat className="h-4 w-4 mr-1.5" />
              Development ({developmentUpdates.length})
            </TabsTrigger>
            <TabsTrigger value="entitlements">Entitlements ({entitlements.length})</TabsTrigger>
            <TabsTrigger value="tasks">Tasks ({tasks.length})</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Deal Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-slate-500">Property Type</p>
                      <p className="font-medium">{deal.property_type?.replace('_', ' ') || '—'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Deal Type</p>
                      <p className="font-medium">{deal.deal_type?.replace('_', ' ') || '—'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Parcel Number</p>
                      <p className="font-medium">{deal.parcel_number || '—'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Number of Lots</p>
                      <p className="font-medium">{deal.number_of_lots || '—'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Lead Source</p>
                      <p className="font-medium">{deal.lead_source || '—'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Assigned To</p>
                      <p className="font-medium">{deal.assigned_to || '—'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Priority</p>
                      <p className="font-medium capitalize">{deal.priority || '—'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Financial Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-slate-500">Asking Price</p>
                      <p className="font-medium">{deal.asking_price ? `$${deal.asking_price.toLocaleString()}` : '—'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Offer Price</p>
                      <p className="font-medium">{deal.offer_price ? `$${deal.offer_price.toLocaleString()}` : '—'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Purchase Price</p>
                      <p className="font-medium">{deal.purchase_price ? `$${deal.purchase_price.toLocaleString()}` : '—'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Estimated Value</p>
                      <p className="font-medium">{deal.estimated_value ? `$${deal.estimated_value.toLocaleString()}` : '—'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-lg">Key Dates</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-slate-500">Contract Date</p>
                      <p className="font-medium">{deal.contract_date ? format(new Date(deal.contract_date), 'MMM d, yyyy') : '—'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">DD Deadline</p>
                      <p className="font-medium">{deal.due_diligence_deadline ? format(new Date(deal.due_diligence_deadline), 'MMM d, yyyy') : '—'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Close Date</p>
                      <p className="font-medium">{deal.close_date ? format(new Date(deal.close_date), 'MMM d, yyyy') : '—'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Created</p>
                      <p className="font-medium">{format(new Date(deal.created_date), 'MMM d, yyyy')}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {deal.notes && (
                <Card className="border-0 shadow-sm lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-lg">Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-slate-600 whitespace-pre-wrap">{deal.notes}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="proforma">
            <ProformaTab 
              proforma={proforma} 
              onSave={(data) => proformaMutation.mutate(data)}
              isLoading={proformaMutation.isPending}
            />
          </TabsContent>

          <TabsContent value="development">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Development Progress</h2>
                <p className="text-sm text-slate-500 mt-1">Track construction milestones and progress</p>
              </div>
              <div className="flex gap-2">
                {developmentUpdates.length === 0 && (
                  <Button 
                    onClick={() => createDefaultMilestones.mutate()} 
                    disabled={createDefaultMilestones.isPending}
                    variant="outline"
                  >
                    {createDefaultMilestones.isPending ? "Adding..." : "Add Default Milestones"}
                  </Button>
                )}
                <Button onClick={() => {
                  setEditingDevUpdate(null);
                  setDevFormData({
                    deal_id: dealId,
                    milestone: "",
                    description: "",
                    status: "planned",
                    progress_percentage: 0,
                    target_date: "",
                    completion_date: "",
                    category: "other",
                    notes: ""
                  });
                  setShowDevForm(true);
                }} className="bg-slate-900 hover:bg-slate-800">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Milestone
                </Button>
              </div>
            </div>

            {/* Overall Progress */}
            {developmentUpdates.length > 0 && (
              <Card className="border-0 shadow-sm mb-6">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-slate-700">Overall Progress</span>
                    <span className="text-2xl font-bold text-slate-900">
                      {Math.round(developmentUpdates.reduce((sum, u) => sum + (u.progress_percentage || 0), 0) / developmentUpdates.length)}%
                    </span>
                  </div>
                  <Progress value={Math.round(developmentUpdates.reduce((sum, u) => sum + (u.progress_percentage || 0), 0) / developmentUpdates.length)} className="h-3" />
                </CardContent>
              </Card>
            )}

            {/* Development Updates */}
            <div className="space-y-4">
              {developmentUpdates.map((update) => {
                const StatusIcon = statusConfig[update.status].icon;
                return (
                  <Card key={update.id} className="border-0 shadow-sm">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{categoryIcons[update.category]}</span>
                          <div>
                            <h3 className="font-semibold text-slate-900">{update.milestone}</h3>
                            {update.description && (
                              <p className="text-sm text-slate-600 mt-1">{update.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant="outline" className={cn("flex items-center gap-1", statusConfig[update.status].color)}>
                            <StatusIcon className="h-3 w-3" />
                            {update.status.replace('_', ' ')}
                          </Badge>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                            setEditingDevUpdate(update);
                            setDevFormData(update);
                            setShowDevForm(true);
                          }}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => deleteDevUpdateMutation.mutate(update.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <div className="flex items-center justify-between text-sm mb-2">
                            <span className="text-slate-600 font-medium">Progress</span>
                            <span className="font-bold text-slate-900">{update.progress_percentage || 0}%</span>
                          </div>
                          <Progress value={update.progress_percentage || 0} className="h-2" />
                        </div>

                        <div className="flex gap-4 text-sm">
                          {update.target_date && (
                            <div className="flex items-center gap-1.5 text-slate-600">
                              <Calendar className="h-4 w-4" />
                              Target: {format(new Date(update.target_date), 'MMM d, yyyy')}
                            </div>
                          )}
                          {update.completion_date && (
                            <div className="flex items-center gap-1.5 text-emerald-600">
                              <CheckCircle2 className="h-4 w-4" />
                              Completed: {format(new Date(update.completion_date), 'MMM d, yyyy')}
                            </div>
                          )}
                        </div>

                        {update.notes && (
                          <div className="p-3 bg-slate-50 rounded-lg">
                            <p className="text-sm text-slate-600">{update.notes}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {developmentUpdates.length === 0 && (
                <p className="text-center py-12 text-slate-500">No development milestones added yet</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="entitlements">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-slate-900">Entitlements & Permits</h2>
              <div className="flex gap-2">
                {entitlements.length === 0 && (
                  <Button 
                    onClick={() => createDefaultEntitlements.mutate()} 
                    disabled={createDefaultEntitlements.isPending}
                    variant="outline"
                  >
                    {createDefaultEntitlements.isPending ? "Adding..." : "Add Default Entitlements"}
                  </Button>
                )}
                <Button onClick={() => setShowEntitlementForm(true)} className="bg-slate-900 hover:bg-slate-800">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Entitlement
                </Button>
              </div>
            </div>
            <div className="grid gap-4">
              {entitlements.map(ent => (
                <EntitlementCard
                  key={ent.id}
                  entitlement={ent}
                  onEdit={(e) => {
                    setEditingEntitlement(e);
                    setShowEntitlementForm(true);
                  }}
                  onDelete={(e) => deleteEntitlementMutation.mutate(e.id)}
                />
              ))}
              {entitlements.length === 0 && (
                <p className="text-center py-8 text-slate-500">No entitlements added yet</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="tasks">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Tasks</h2>
                <p className="text-sm text-slate-500 mt-1">
                  {tasks.filter(t => t.status === 'completed').length} of {tasks.length} completed
                </p>
              </div>
              <Button onClick={() => {
                setEditingTask(null);
                setShowTaskForm(true);
              }} className="bg-slate-900 hover:bg-slate-800">
                <Plus className="h-4 w-4 mr-2" />
                Add Task
              </Button>
            </div>
            <div className="space-y-3">
              {tasks
                .sort((a, b) => {
                  // Sort: incomplete first, then by due date, then by priority
                  if (a.status === 'completed' && b.status !== 'completed') return 1;
                  if (a.status !== 'completed' && b.status === 'completed') return -1;
                  if (a.due_date && b.due_date) {
                    return new Date(a.due_date) - new Date(b.due_date);
                  }
                  const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
                  return (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2);
                })
                .map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onEdit={(t) => {
                      setEditingTask(t);
                      setShowTaskForm(true);
                    }}
                    onDelete={(id) => deleteTaskMutation.mutate(id)}
                    onStatusChange={(t, status) => updateTaskStatusMutation.mutate({ id: t.id, status })}
                  />
                ))}
              {tasks.length === 0 && (
                <div className="text-center py-12">
                  <ClipboardList className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 font-medium">No tasks yet</p>
                  <p className="text-sm text-slate-400 mt-1">Create your first task to get started</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="documents">
            <DocumentList entityType="deal" entityId={dealId} />
          </TabsContent>

          <TabsContent value="activity">
            <div className="space-y-4">
              {activities.map(activity => (
                <Card key={activity.id} className="border-0 shadow-sm p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-slate-100">
                      <MessageSquare className="h-4 w-4 text-slate-600" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-900">{activity.description}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {format(new Date(activity.created_date), 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
              {activities.length === 0 && (
                <p className="text-center py-8 text-slate-500">No activity recorded yet</p>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Modals */}
        <DealForm
          deal={deal}
          open={showDealForm}
          onClose={() => setShowDealForm(false)}
          onSave={(data) => updateDealMutation.mutate(data)}
          isLoading={updateDealMutation.isPending}
        />

        <EntitlementForm
          entitlement={editingEntitlement}
          deals={allDeals}
          open={showEntitlementForm}
          onClose={() => {
            setShowEntitlementForm(false);
            setEditingEntitlement(null);
          }}
          onSave={(data) => entitlementMutation.mutate(data)}
          isLoading={entitlementMutation.isPending}
          preselectedDealId={dealId}
        />

        <TaskForm
          task={editingTask ? { ...editingTask } : { deal_id: dealId }}
          deals={allDeals}
          open={showTaskForm}
          onClose={() => {
            setShowTaskForm(false);
            setEditingTask(null);
          }}
          onSave={(data) => taskMutation.mutate(data)}
          isLoading={taskMutation.isPending}
        />

        {/* Development Update Form */}
        <Dialog open={showDevForm} onOpenChange={(open) => {
          setShowDevForm(open);
          if (!open) {
            setEditingDevUpdate(null);
            setDevFormData({
              deal_id: dealId,
              milestone: "",
              description: "",
              status: "planned",
              progress_percentage: 0,
              target_date: "",
              completion_date: "",
              category: "other",
              notes: ""
            });
          }
        }}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingDevUpdate ? "Edit Milestone" : "Add Development Milestone"}</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label>Milestone Name *</Label>
                <Input
                  value={devFormData.milestone}
                  onChange={(e) => setDevFormData({...devFormData, milestone: e.target.value})}
                  placeholder="e.g., Foundation Pour"
                />
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  value={devFormData.description}
                  onChange={(e) => setDevFormData({...devFormData, description: e.target.value})}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Category</Label>
                  <Select value={devFormData.category} onValueChange={(v) => setDevFormData({...devFormData, category: v})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="site_work">Site Work</SelectItem>
                      <SelectItem value="foundation">Foundation</SelectItem>
                      <SelectItem value="framing">Framing</SelectItem>
                      <SelectItem value="utilities">Utilities</SelectItem>
                      <SelectItem value="infrastructure">Infrastructure</SelectItem>
                      <SelectItem value="landscaping">Landscaping</SelectItem>
                      <SelectItem value="permits">Permits</SelectItem>
                      <SelectItem value="inspection">Inspection</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Status</Label>
                  <Select value={devFormData.status} onValueChange={(v) => setDevFormData({...devFormData, status: v})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planned">Planned</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="delayed">Delayed</SelectItem>
                      <SelectItem value="on_hold">On Hold</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Progress %</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={devFormData.progress_percentage}
                    onChange={(e) => setDevFormData({...devFormData, progress_percentage: e.target.value})}
                  />
                </div>

                <div>
                  <Label>Target Date</Label>
                  <Input
                    type="date"
                    value={devFormData.target_date}
                    onChange={(e) => setDevFormData({...devFormData, target_date: e.target.value})}
                  />
                </div>

                <div className="col-span-2">
                  <Label>Completion Date</Label>
                  <Input
                    type="date"
                    value={devFormData.completion_date}
                    onChange={(e) => setDevFormData({...devFormData, completion_date: e.target.value})}
                  />
                </div>

                <div className="col-span-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={devFormData.notes}
                    onChange={(e) => setDevFormData({...devFormData, notes: e.target.value})}
                    rows={2}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDevForm(false)}>Cancel</Button>
              <Button 
                onClick={() => {
                  const data = {
                    ...devFormData,
                    progress_percentage: devFormData.progress_percentage ? parseFloat(devFormData.progress_percentage) : 0
                  };
                  devUpdateMutation.mutate(data);
                }}
                disabled={!devFormData.milestone}
                className="bg-slate-900 hover:bg-slate-800"
              >
                {editingDevUpdate ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}