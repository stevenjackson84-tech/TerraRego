import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Edit, Plus, Trash2, CheckCircle2, Clock, AlertCircle, TrendingUp, Calendar } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import ProjectForm from "@/components/projects/ProjectForm.jsx";
import PhaseForm from "@/components/projects/PhaseForm.jsx";
import MilestoneForm from "@/components/projects/MilestoneForm.jsx";
import ExpenseForm from "@/components/projects/ExpenseForm.jsx";
import GanttChart from "@/components/projects/GanttChart.jsx";
import DocumentList from "@/components/documents/DocumentList";
import DevelopmentTab from "@/components/projects/DevelopmentTab";

const statusConfig = {
  planning: { color: "bg-slate-100 text-slate-700" },
  active: { color: "bg-blue-100 text-blue-700" },
  on_hold: { color: "bg-amber-100 text-amber-700" },
  completed: { color: "bg-emerald-100 text-emerald-700" },
  cancelled: { color: "bg-red-100 text-red-700" }
};

export default function ProjectDetails() {
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('id');
  
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [showPhaseForm, setShowPhaseForm] = useState(false);
  const [showMilestoneForm, setShowMilestoneForm] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [editingPhase, setEditingPhase] = useState(null);
  const [editingMilestone, setEditingMilestone] = useState(null);
  const [editingExpense, setEditingExpense] = useState(null);
  const [showDevForm, setShowDevForm] = useState(false);
  const [editingDevUpdate, setEditingDevUpdate] = useState(null);

  const queryClient = useQueryClient();

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const projects = await base44.entities.Project.filter({ id: projectId });
      return projects[0];
    },
    enabled: !!projectId
  });

  const { data: phases = [] } = useQuery({
    queryKey: ['projectPhases', projectId],
    queryFn: () => base44.entities.ProjectPhase.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const { data: milestones = [] } = useQuery({
    queryKey: ['projectMilestones', projectId],
    queryFn: () => base44.entities.ProjectMilestone.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['projectExpenses', projectId],
    queryFn: () => base44.entities.ProjectExpense.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const { data: allDevelopmentUpdates = [] } = useQuery({
    queryKey: ['developmentUpdates'],
    queryFn: () => base44.entities.DevelopmentUpdate.list(),
    enabled: !!projectId
  });

  const { data: deals = [] } = useQuery({
    queryKey: ['deals'],
    queryFn: () => base44.entities.Deal.list()
  });

  const updateProjectMutation = useMutation({
    mutationFn: (data) => base44.entities.Project.update(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      setShowProjectForm(false);
    }
  });

  const phaseMutation = useMutation({
    mutationFn: (data) => editingPhase 
      ? base44.entities.ProjectPhase.update(editingPhase.id, data)
      : base44.entities.ProjectPhase.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectPhases', projectId] });
      setShowPhaseForm(false);
      setEditingPhase(null);
    }
  });

  const deletePhase = useMutation({
    mutationFn: (id) => base44.entities.ProjectPhase.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projectPhases', projectId] })
  });

  const milestoneMutation = useMutation({
    mutationFn: (data) => editingMilestone 
      ? base44.entities.ProjectMilestone.update(editingMilestone.id, data)
      : base44.entities.ProjectMilestone.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectMilestones', projectId] });
      setShowMilestoneForm(false);
      setEditingMilestone(null);
    }
  });

  const deleteMilestone = useMutation({
    mutationFn: (id) => base44.entities.ProjectMilestone.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projectMilestones', projectId] })
  });

  const expenseMutation = useMutation({
    mutationFn: (data) => editingExpense 
      ? base44.entities.ProjectExpense.update(editingExpense.id, data)
      : base44.entities.ProjectExpense.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectExpenses', projectId] });
      setShowExpenseForm(false);
      setEditingExpense(null);
    }
  });

  const deleteExpense = useMutation({
    mutationFn: (id) => base44.entities.ProjectExpense.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projectExpenses', projectId] })
  });

  const devUpdateMutation = useMutation({
    mutationFn: ({ id, data }) => id
      ? base44.entities.DevelopmentUpdate.update(id, data)
      : base44.entities.DevelopmentUpdate.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['developmentUpdates'] });
    }
  });

  const deleteDevUpdate = useMutation({
    mutationFn: (id) => base44.entities.DevelopmentUpdate.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['developmentUpdates'] })
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-slate-300 border-t-slate-900 rounded-full" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500">Project not found</p>
      </div>
    );
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(value);
  };

  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const budgetRemaining = (project.budget || 0) - totalExpenses;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <Link to={createPageUrl("Projects")} className="inline-flex items-center text-sm text-slate-600 hover:text-slate-900 mb-6">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Projects
        </Link>

        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{project.name}</h1>
              <Badge className={cn(statusConfig[project.status]?.color)}>
                {project.status}
              </Badge>
            </div>
            {project.description && (
              <p className="text-slate-600">{project.description}</p>
            )}
          </div>
          <Button onClick={() => setShowProjectForm(true)} variant="outline">
            <Edit className="h-4 w-4 mr-2" />
            Edit Project
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-sm text-slate-500">Budget</p>
              <p className="text-2xl font-semibold text-slate-900">
                {project.budget ? formatCurrency(project.budget) : '—'}
              </p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-sm text-slate-500">Spent</p>
              <p className="text-2xl font-semibold text-slate-900">{formatCurrency(totalExpenses)}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-sm text-slate-500">Remaining</p>
              <p className="text-2xl font-semibold text-slate-900">{formatCurrency(budgetRemaining)}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-sm text-slate-500">Progress</p>
              <p className="text-2xl font-semibold text-slate-900">{project.completion_percentage || 0}%</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="timeline" className="space-y-6">
          <TabsList className="bg-white border">
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="phases">Phases ({phases.length})</TabsTrigger>
            <TabsTrigger value="milestones">Milestones ({milestones.length})</TabsTrigger>
            <TabsTrigger value="budget">Budget & Expenses</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="team">Team</TabsTrigger>
          </TabsList>

          <TabsContent value="timeline">
            <GanttChart phases={phases} milestones={milestones} />
          </TabsContent>

          <TabsContent value="phases">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-slate-900">Project Phases</h2>
              <Button onClick={() => {
                setEditingPhase(null);
                setShowPhaseForm(true);
              }} className="bg-slate-900 hover:bg-slate-800">
                <Plus className="h-4 w-4 mr-2" />
                Add Phase
              </Button>
            </div>
            <div className="space-y-4">
              {phases.sort((a, b) => (a.order || 0) - (b.order || 0)).map(phase => {
                const phaseDevelopmentUpdates = allDevelopmentUpdates.filter(update => update.phase_id === phase.id);
                return (
                  <Card key={phase.id} className="border-0 shadow-sm">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="font-semibold text-slate-900">{phase.name}</h3>
                          {phase.description && (
                            <p className="text-sm text-slate-600 mt-1">{phase.description}</p>
                          )}
                          <div className="flex gap-2 mt-2">
                            <Badge variant="outline">{phase.status}</Badge>
                            {phase.assigned_to && (
                              <Badge variant="secondary">{phase.assigned_to}</Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => {
                            setEditingPhase(phase);
                            setShowPhaseForm(true);
                          }}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-red-500" onClick={() => deletePhase.mutate(phase.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      {(phase.start_date || phase.end_date) && (
                        <div className="text-sm text-slate-500 mb-4">
                          {phase.start_date && format(new Date(phase.start_date), 'MMM d, yyyy')}
                          {phase.start_date && phase.end_date && ' — '}
                          {phase.end_date && format(new Date(phase.end_date), 'MMM d, yyyy')}
                        </div>
                      )}
                      
                      {/* Development Tab for this Phase */}
                      <div className="mt-6 pt-6 border-t border-slate-200">
                        <DevelopmentTab 
                          phaseId={phase.id}
                          developmentUpdates={phaseDevelopmentUpdates}
                          onSave={({ id, data }) => devUpdateMutation.mutate({ id, data })}
                          onDelete={(id) => deleteDevUpdate.mutate(id)}
                        />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {phases.length === 0 && (
                <p className="text-center py-8 text-slate-500">No phases added yet</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="milestones">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-slate-900">Milestones</h2>
              <Button onClick={() => {
                setEditingMilestone(null);
                setShowMilestoneForm(true);
              }} className="bg-slate-900 hover:bg-slate-800">
                <Plus className="h-4 w-4 mr-2" />
                Add Milestone
              </Button>
            </div>
            <div className="space-y-3">
              {milestones.map(milestone => (
                <Card key={milestone.id} className="border-0 shadow-sm p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className={cn(
                        "font-medium",
                        milestone.status === 'completed' && "text-slate-400 line-through"
                      )}>
                        {milestone.name}
                      </h3>
                      {milestone.description && (
                        <p className="text-sm text-slate-500 mt-1">{milestone.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">{milestone.status}</Badge>
                        {milestone.due_date && (
                          <span className="text-xs text-slate-500">
                            Due: {format(new Date(milestone.due_date), 'MMM d, yyyy')}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                        setEditingMilestone(milestone);
                        setShowMilestoneForm(true);
                      }}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => deleteMilestone.mutate(milestone.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
              {milestones.length === 0 && (
                <p className="text-center py-8 text-slate-500">No milestones added yet</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="budget">
            <div className="space-y-6">
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle>Budget Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-slate-600">Spent vs Budget</span>
                        <span className="font-bold">
                          {project.budget ? `${((totalExpenses / project.budget) * 100).toFixed(1)}%` : '—'}
                        </span>
                      </div>
                      <Progress 
                        value={project.budget ? Math.min((totalExpenses / project.budget) * 100, 100) : 0} 
                        className="h-3" 
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-sm text-slate-500">Total Budget</p>
                        <p className="text-xl font-bold text-slate-900">
                          {project.budget ? formatCurrency(project.budget) : '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">Total Spent</p>
                        <p className="text-xl font-bold text-blue-600">{formatCurrency(totalExpenses)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">Remaining</p>
                        <p className={cn(
                          "text-xl font-bold",
                          budgetRemaining < 0 ? "text-red-600" : "text-emerald-600"
                        )}>
                          {formatCurrency(budgetRemaining)}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-slate-900">Expenses</h2>
                <Button onClick={() => {
                  setEditingExpense(null);
                  setShowExpenseForm(true);
                }} className="bg-slate-900 hover:bg-slate-800">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Expense
                </Button>
              </div>

              <div className="space-y-3">
                {expenses.map(expense => (
                  <Card key={expense.id} className="border-0 shadow-sm p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-slate-900">{expense.description || expense.category}</h3>
                          <Badge variant="outline" className="text-xs">{expense.status}</Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-2 text-sm text-slate-500">
                          <span>{expense.category.replace('_', ' ')}</span>
                          {expense.vendor && <span>• {expense.vendor}</span>}
                          {expense.date && <span>• {format(new Date(expense.date), 'MMM d, yyyy')}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-slate-900">{formatCurrency(expense.amount)}</span>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                            setEditingExpense(expense);
                            setShowExpenseForm(true);
                          }}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => deleteExpense.mutate(expense.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
                {expenses.length === 0 && (
                  <p className="text-center py-8 text-slate-500">No expenses recorded yet</p>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="documents">
            <DocumentList entityType="project" entityId={projectId} />
          </TabsContent>

          <TabsContent value="team">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Team Members</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {project.project_manager && (
                    <div>
                      <p className="text-sm text-slate-500 mb-2">Project Manager</p>
                      <div className="p-3 bg-slate-50 rounded-lg">
                        <p className="font-medium text-slate-900">{project.project_manager}</p>
                      </div>
                    </div>
                  )}
                  {project.team_members && project.team_members.length > 0 && (
                    <div>
                      <p className="text-sm text-slate-500 mb-2">Team Members ({project.team_members.length})</p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {project.team_members.map((member, i) => (
                          <div key={i} className="p-3 bg-slate-50 rounded-lg">
                            <p className="text-sm text-slate-900">{member}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {!project.project_manager && (!project.team_members || project.team_members.length === 0) && (
                    <p className="text-center py-8 text-slate-500">No team members assigned</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Forms */}
        <ProjectForm
          project={project}
          deals={deals}
          open={showProjectForm}
          onClose={() => setShowProjectForm(false)}
          onSave={(data) => updateProjectMutation.mutate(data)}
          isLoading={updateProjectMutation.isPending}
        />

        <PhaseForm
          phase={editingPhase}
          projectId={projectId}
          phases={phases}
          open={showPhaseForm}
          onClose={() => {
            setShowPhaseForm(false);
            setEditingPhase(null);
          }}
          onSave={(data) => phaseMutation.mutate(data)}
          isLoading={phaseMutation.isPending}
        />

        <MilestoneForm
          milestone={editingMilestone}
          projectId={projectId}
          phases={phases}
          open={showMilestoneForm}
          onClose={() => {
            setShowMilestoneForm(false);
            setEditingMilestone(null);
          }}
          onSave={(data) => milestoneMutation.mutate(data)}
          isLoading={milestoneMutation.isPending}
        />

        <ExpenseForm
          expense={editingExpense}
          projectId={projectId}
          phases={phases}
          open={showExpenseForm}
          onClose={() => {
            setShowExpenseForm(false);
            setEditingExpense(null);
          }}
          onSave={(data) => expenseMutation.mutate(data)}
          isLoading={expenseMutation.isPending}
        />
      </div>
    </div>
  );
}