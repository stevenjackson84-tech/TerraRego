import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Plus, Edit, Trash2, Calendar, CheckCircle2, Clock, AlertCircle, TrendingUp } from "lucide-react";
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

export default function DevelopmentTab({ projectId, developmentUpdates, onSave, onDelete }) {
  const [showForm, setShowForm] = useState(false);
  const [editingUpdate, setEditingUpdate] = useState(null);
  const [formData, setFormData] = useState({
    project_id: projectId,
    milestone: "",
    description: "",
    status: "planned",
    progress_percentage: 0,
    target_date: "",
    completion_date: "",
    category: "other",
    notes: ""
  });

  const handleSubmit = () => {
    const data = {
      ...formData,
      progress_percentage: formData.progress_percentage ? parseFloat(formData.progress_percentage) : 0
    };
    onSave({ id: editingUpdate?.id, data });
    setShowForm(false);
    setEditingUpdate(null);
    setFormData({
      project_id: projectId,
      milestone: "",
      description: "",
      status: "planned",
      progress_percentage: 0,
      target_date: "",
      completion_date: "",
      category: "other",
      notes: ""
    });
  };

  const overallProgress = developmentUpdates.length > 0
    ? Math.round(developmentUpdates.reduce((sum, u) => sum + (u.progress_percentage || 0), 0) / developmentUpdates.length)
    : 0;

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Development Progress</h2>
          <p className="text-sm text-slate-500 mt-1">Track construction milestones and progress</p>
        </div>
        <Button onClick={() => {
          setEditingUpdate(null);
          setFormData({
            project_id: projectId,
            milestone: "",
            description: "",
            status: "planned",
            progress_percentage: 0,
            target_date: "",
            completion_date: "",
            category: "other",
            notes: ""
          });
          setShowForm(true);
        }} className="bg-slate-900 hover:bg-slate-800">
          <Plus className="h-4 w-4 mr-2" />
          Add Milestone
        </Button>
      </div>

      {developmentUpdates.length > 0 && (
        <Card className="border-0 shadow-sm mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-slate-700">Overall Progress</span>
              <span className="text-2xl font-bold text-slate-900">{overallProgress}%</span>
            </div>
            <Progress value={overallProgress} className="h-3" />
          </CardContent>
        </Card>
      )}

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
                      setEditingUpdate(update);
                      setFormData(update);
                      setShowForm(true);
                    }}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => onDelete(update.id)}>
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

      <Dialog open={showForm} onOpenChange={(open) => {
        setShowForm(open);
        if (!open) {
          setEditingUpdate(null);
          setFormData({
            project_id: projectId,
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
            <DialogTitle>{editingUpdate ? "Edit Milestone" : "Add Development Milestone"}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
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
              onClick={handleSubmit}
              disabled={!formData.milestone}
              className="bg-slate-900 hover:bg-slate-800"
            >
              {editingUpdate ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}