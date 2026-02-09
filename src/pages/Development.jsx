import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Calendar, CheckCircle2, Clock, AlertCircle, TrendingUp, Edit, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

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

const defaultUpdate = {
  deal_id: "",
  milestone: "",
  description: "",
  status: "planned",
  progress_percentage: 0,
  target_date: "",
  completion_date: "",
  category: "other",
  notes: ""
};

export default function Development() {
  const [showForm, setShowForm] = useState(false);
  const [editingUpdate, setEditingUpdate] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [formData, setFormData] = useState(defaultUpdate);

  const queryClient = useQueryClient();

  const { data: updates = [] } = useQuery({
    queryKey: ['developmentUpdates'],
    queryFn: () => base44.entities.DevelopmentUpdate.list('-created_date')
  });

  const { data: deals = [] } = useQuery({
    queryKey: ['deals'],
    queryFn: () => base44.entities.Deal.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.DevelopmentUpdate.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['developmentUpdates'] });
      setShowForm(false);
      setFormData(defaultUpdate);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.DevelopmentUpdate.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['developmentUpdates'] });
      setShowForm(false);
      setEditingUpdate(null);
      setFormData(defaultUpdate);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.DevelopmentUpdate.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['developmentUpdates'] })
  });

  const handleSave = () => {
    const data = {
      ...formData,
      progress_percentage: formData.progress_percentage ? parseFloat(formData.progress_percentage) : 0
    };
    
    if (editingUpdate) {
      updateMutation.mutate({ id: editingUpdate.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (update) => {
    setEditingUpdate(update);
    setFormData(update);
    setShowForm(true);
  };

  const handleDelete = (update) => {
    if (window.confirm(`Delete "${update.milestone}"?`)) {
      deleteMutation.mutate(update.id);
    }
  };

  const getDealName = (dealId) => {
    const deal = deals.find(d => d.id === dealId);
    return deal?.name || 'Unknown Deal';
  };

  // Calculate overall stats
  const totalUpdates = updates.length;
  const completedUpdates = updates.filter(u => u.status === 'completed').length;
  const inProgressUpdates = updates.filter(u => u.status === 'in_progress').length;
  const overallProgress = totalUpdates > 0 
    ? Math.round((updates.reduce((sum, u) => sum + (u.progress_percentage || 0), 0) / totalUpdates))
    : 0;

  const filteredUpdates = updates.filter(update => {
    if (filterStatus === "all") return true;
    if (filterStatus === "active") return update.status !== 'completed';
    return update.status === filterStatus;
  }).sort((a, b) => {
    if (a.status === 'in_progress' && b.status !== 'in_progress') return -1;
    if (a.status !== 'in_progress' && b.status === 'in_progress') return 1;
    return new Date(a.target_date) - new Date(b.target_date);
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Development Dashboard</h1>
            <p className="text-slate-500 mt-1">Track construction milestones and project progress</p>
          </div>
          <Button onClick={() => {
            setEditingUpdate(null);
            setFormData(defaultUpdate);
            setShowForm(true);
          }} className="bg-slate-900 hover:bg-slate-800">
            <Plus className="h-4 w-4 mr-2" />
            Add Milestone
          </Button>
        </div>

        {/* Overall Progress Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <p className="text-sm text-slate-500 mb-2">Overall Progress</p>
              <p className="text-3xl font-bold text-slate-900 mb-3">{overallProgress}%</p>
              <Progress value={overallProgress} className="h-2" />
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <p className="text-sm text-slate-500 mb-2">Total Milestones</p>
              <p className="text-3xl font-bold text-slate-900">{totalUpdates}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <p className="text-sm text-slate-500 mb-2">In Progress</p>
              <p className="text-3xl font-bold text-blue-600">{inProgressUpdates}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <p className="text-sm text-slate-500 mb-2">Completed</p>
              <p className="text-3xl font-bold text-emerald-600">{completedUpdates}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="mb-6">
          <Tabs value={filterStatus} onValueChange={setFilterStatus}>
            <TabsList className="bg-white border">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="planned">Planned</TabsTrigger>
              <TabsTrigger value="in_progress">In Progress</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
              <TabsTrigger value="delayed">Delayed</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Development Updates List */}
        <div className="space-y-4">
          {filteredUpdates.map((update) => {
            const StatusIcon = statusConfig[update.status].icon;
            
            return (
              <Card key={update.id} className="border-0 shadow-sm hover:shadow-md transition-all duration-200">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">{categoryIcons[update.category]}</span>
                        <div>
                          <h3 className="text-lg font-semibold text-slate-900">{update.milestone}</h3>
                          <p className="text-sm text-amber-600 font-medium">{getDealName(update.deal_id)}</p>
                        </div>
                      </div>
                      {update.description && (
                        <p className="text-sm text-slate-600 mt-2">{update.description}</p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className={cn("flex items-center gap-1.5", statusConfig[update.status].color)}>
                        <StatusIcon className="h-3.5 w-3.5" />
                        {update.status.replace('_', ' ')}
                      </Badge>
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(update)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-red-500" onClick={() => handleDelete(update)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Progress */}
                    <div className="lg:col-span-2">
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-slate-600 font-medium">Progress</span>
                        <span className="text-lg font-bold text-slate-900">{update.progress_percentage || 0}%</span>
                      </div>
                      <Progress value={update.progress_percentage || 0} className="h-3" />
                    </div>

                    {/* Dates */}
                    <div className="space-y-2 text-sm">
                      {update.target_date && (
                        <div className="flex items-center gap-2 text-slate-600">
                          <Calendar className="h-4 w-4" />
                          <span>Target: {format(new Date(update.target_date), 'MMM d, yyyy')}</span>
                        </div>
                      )}
                      {update.completion_date && (
                        <div className="flex items-center gap-2 text-emerald-600">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>Completed: {format(new Date(update.completion_date), 'MMM d, yyyy')}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {update.notes && (
                    <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                      <p className="text-sm text-slate-600">{update.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}

          {filteredUpdates.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              No development updates found. Add your first milestone to get started.
            </div>
          )}
        </div>

        {/* Form Dialog */}
        <Dialog open={showForm} onOpenChange={(open) => {
          setShowForm(open);
          if (!open) {
            setEditingUpdate(null);
            setFormData(defaultUpdate);
          }
        }}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingUpdate ? "Edit Milestone" : "Add Development Milestone"}</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label>Related Deal *</Label>
                <Select value={formData.deal_id} onValueChange={(v) => setFormData({...formData, deal_id: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select deal" />
                  </SelectTrigger>
                  <SelectContent>
                    {deals.map(deal => (
                      <SelectItem key={deal.id} value={deal.id}>{deal.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Milestone Name *</Label>
                <Input
                  value={formData.milestone}
                  onChange={(e) => setFormData({...formData, milestone: e.target.value})}
                  placeholder="e.g., Foundation Pour"
                />
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Category</Label>
                  <Select value={formData.category} onValueChange={(v) => setFormData({...formData, category: v})}>
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
                  <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v})}>
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
                    value={formData.progress_percentage}
                    onChange={(e) => setFormData({...formData, progress_percentage: e.target.value})}
                  />
                </div>

                <div>
                  <Label>Target Date</Label>
                  <Input
                    type="date"
                    value={formData.target_date}
                    onChange={(e) => setFormData({...formData, target_date: e.target.value})}
                  />
                </div>

                <div className="col-span-2">
                  <Label>Completion Date</Label>
                  <Input
                    type="date"
                    value={formData.completion_date}
                    onChange={(e) => setFormData({...formData, completion_date: e.target.value})}
                  />
                </div>

                <div className="col-span-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    rows={2}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button 
                onClick={handleSave} 
                disabled={!formData.deal_id || !formData.milestone}
                className="bg-slate-900 hover:bg-slate-800"
              >
                {editingUpdate ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}