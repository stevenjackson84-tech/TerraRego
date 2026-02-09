import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Folder, Calendar, DollarSign, Users, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { cn } from "@/lib/utils";
import ProjectForm from "@/components/projects/ProjectForm";

const statusConfig = {
  planning: { color: "bg-slate-100 text-slate-700", label: "Planning" },
  active: { color: "bg-blue-100 text-blue-700", label: "Active" },
  on_hold: { color: "bg-amber-100 text-amber-700", label: "On Hold" },
  completed: { color: "bg-emerald-100 text-emerald-700", label: "Completed" },
  cancelled: { color: "bg-red-100 text-red-700", label: "Cancelled" }
};

export default function Projects() {
  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");

  const queryClient = useQueryClient();

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('-created_date')
  });

  const { data: deals = [] } = useQuery({
    queryKey: ['deals'],
    queryFn: () => base44.entities.Deal.list()
  });

  const projectMutation = useMutation({
    mutationFn: (data) => editingProject 
      ? base44.entities.Project.update(editingProject.id, data)
      : base44.entities.Project.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setShowForm(false);
      setEditingProject(null);
    }
  });

  const filteredProjects = projects.filter(p => 
    filterStatus === "all" || p.status === filterStatus
  );

  const stats = {
    total: projects.length,
    active: projects.filter(p => p.status === 'active').length,
    completed: projects.filter(p => p.status === 'completed').length,
    totalBudget: projects.reduce((sum, p) => sum + (p.budget || 0), 0),
    totalSpent: projects.reduce((sum, p) => sum + (p.actual_cost || 0), 0)
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Projects</h1>
            <p className="text-slate-500 mt-1">Manage development projects, timelines, and resources</p>
          </div>
          <Button onClick={() => {
            setEditingProject(null);
            setShowForm(true);
          }} className="bg-slate-900 hover:bg-slate-800">
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
                <Folder className="h-4 w-4" />
                <span>Total Projects</span>
              </div>
              <p className="text-3xl font-bold text-slate-900">{stats.total}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
                <TrendingUp className="h-4 w-4" />
                <span>Active</span>
              </div>
              <p className="text-3xl font-bold text-blue-600">{stats.active}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
                <Calendar className="h-4 w-4" />
                <span>Completed</span>
              </div>
              <p className="text-3xl font-bold text-emerald-600">{stats.completed}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
                <DollarSign className="h-4 w-4" />
                <span>Total Budget</span>
              </div>
              <p className="text-2xl font-bold text-slate-900">{formatCurrency(stats.totalBudget)}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
                <DollarSign className="h-4 w-4" />
                <span>Total Spent</span>
              </div>
              <p className="text-2xl font-bold text-slate-900">{formatCurrency(stats.totalSpent)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6">
          {["all", "planning", "active", "on_hold", "completed"].map(status => (
            <Button
              key={status}
              variant={filterStatus === status ? "default" : "outline"}
              onClick={() => setFilterStatus(status)}
              className={filterStatus === status ? "bg-slate-900" : ""}
            >
              {status === "all" ? "All" : statusConfig[status]?.label || status}
            </Button>
          ))}
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredProjects.map(project => (
            <Link key={project.id} to={createPageUrl("ProjectDetails") + "?id=" + project.id}>
              <Card className="border-0 shadow-sm hover:shadow-lg transition-all cursor-pointer">
                <CardHeader className="border-b border-slate-100">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2">{project.name}</CardTitle>
                      <Badge className={cn(statusConfig[project.status]?.color)}>
                        {statusConfig[project.status]?.label}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  {project.description && (
                    <p className="text-sm text-slate-600 mb-4 line-clamp-2">{project.description}</p>
                  )}
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-slate-500">Budget</p>
                      <p className="font-semibold text-slate-900">
                        {project.budget ? formatCurrency(project.budget) : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">Spent</p>
                      <p className="font-semibold text-slate-900">
                        {project.actual_cost ? formatCurrency(project.actual_cost) : '$0'}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">Progress</p>
                      <p className="font-semibold text-slate-900">{project.completion_percentage || 0}%</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Manager</p>
                      <p className="font-semibold text-slate-900">{project.project_manager || '—'}</p>
                    </div>
                  </div>

                  {project.team_members && project.team_members.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Users className="h-3 w-3" />
                        <span>{project.team_members.length} team member{project.team_members.length !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {filteredProjects.length === 0 && (
          <div className="text-center py-12">
            <Folder className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">No projects found</p>
            <p className="text-sm text-slate-400 mt-1">Create your first project to get started</p>
          </div>
        )}

        {/* Project Form */}
        <ProjectForm
          project={editingProject}
          deals={deals}
          open={showForm}
          onClose={() => {
            setShowForm(false);
            setEditingProject(null);
          }}
          onSave={(data) => projectMutation.mutate(data)}
          isLoading={projectMutation.isPending}
        />
      </div>
    </div>
  );
}