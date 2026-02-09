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
  Plus, FileText, ClipboardList, MessageSquare, Trash2
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import DealForm from "@/components/deals/DealForm";
import EntitlementCard from "@/components/entitlements/EntitlementCard";
import EntitlementForm from "@/components/entitlements/EntitlementForm";
import TaskForm from "@/components/tasks/TaskForm";

const stageStyles = {
  prospecting: "bg-slate-100 text-slate-700",
  due_diligence: "bg-blue-100 text-blue-700",
  under_contract: "bg-amber-100 text-amber-700",
  entitlements: "bg-purple-100 text-purple-700",
  development: "bg-emerald-100 text-emerald-700",
  closed: "bg-green-100 text-green-700",
  dead: "bg-red-100 text-red-700"
};

export default function DealDetails() {
  const urlParams = new URLSearchParams(window.location.search);
  const dealId = urlParams.get('id');
  
  const [showDealForm, setShowDealForm] = useState(false);
  const [showEntitlementForm, setShowEntitlementForm] = useState(false);
  const [editingEntitlement, setEditingEntitlement] = useState(null);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const queryClient = useQueryClient();

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
          <Button onClick={() => setShowDealForm(true)} variant="outline">
            <Edit className="h-4 w-4 mr-2" />
            Edit Deal
          </Button>
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
            <TabsTrigger value="entitlements">Entitlements ({entitlements.length})</TabsTrigger>
            <TabsTrigger value="tasks">Tasks ({tasks.length})</TabsTrigger>
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

          <TabsContent value="entitlements">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-slate-900">Entitlements & Permits</h2>
              <Button onClick={() => setShowEntitlementForm(true)} className="bg-slate-900 hover:bg-slate-800">
                <Plus className="h-4 w-4 mr-2" />
                Add Entitlement
              </Button>
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
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-slate-900">Tasks</h2>
              <Button onClick={() => setShowTaskForm(true)} className="bg-slate-900 hover:bg-slate-800">
                <Plus className="h-4 w-4 mr-2" />
                Add Task
              </Button>
            </div>
            <div className="space-y-3">
              {tasks.map(task => (
                <Card key={task.id} className="border-0 shadow-sm p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className={cn("font-medium", task.status === 'completed' && "text-slate-400 line-through")}>
                        {task.title}
                      </h3>
                      {task.description && (
                        <p className="text-sm text-slate-500 mt-1">{task.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">{task.category}</Badge>
                        <Badge variant="secondary" className="text-xs">{task.priority}</Badge>
                        {task.due_date && (
                          <span className="text-xs text-slate-500">{format(new Date(task.due_date), 'MMM d')}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                        setEditingTask(task);
                        setShowTaskForm(true);
                      }}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => deleteTaskMutation.mutate(task.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
              {tasks.length === 0 && (
                <p className="text-center py-8 text-slate-500">No tasks added yet</p>
              )}
            </div>
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
      </div>
    </div>
  );
}