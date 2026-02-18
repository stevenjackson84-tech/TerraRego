import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Target, Activity } from "lucide-react";
import ProcessHealthMetrics from "@/components/lean/ProcessHealthMetrics";
import DMAICProjectCard from "@/components/lean/DMAICProjectCard";
import ImprovementProjectForm from "@/components/lean/ImprovementProjectForm";
import { cn } from "@/lib/utils";

const PHASE_FILTERS = [
  { value: "all", label: "All" },
  { value: "define", label: "Define" },
  { value: "measure", label: "Measure" },
  { value: "analyze", label: "Analyze" },
  { value: "improve", label: "Improve" },
  { value: "control", label: "Control" },
];

export default function LeanSixSigma() {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [phaseFilter, setPhaseFilter] = useState("all");
  const qc = useQueryClient();

  const { data: projects = [] } = useQuery({
    queryKey: ["improvementProjects"],
    queryFn: () => base44.entities.ImprovementProject.list("-created_date"),
  });

  const { data: deals = [] } = useQuery({
    queryKey: ["deals"],
    queryFn: () => base44.entities.Deal.list(),
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => base44.entities.Task.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ImprovementProject.create(data),
    onSuccess: () => { qc.invalidateQueries(["improvementProjects"]); setShowForm(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ImprovementProject.update(id, data),
    onSuccess: () => { qc.invalidateQueries(["improvementProjects"]); setEditing(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ImprovementProject.delete(id),
    onSuccess: () => qc.invalidateQueries(["improvementProjects"]),
  });

  const handleSave = (data) => {
    if (editing) updateMutation.mutate({ id: editing.id, data });
    else createMutation.mutate(data);
  };

  const filtered = phaseFilter === "all"
    ? projects
    : projects.filter(p => p.phase === phaseFilter);

  const activeCount = projects.filter(p => p.status === "active").length;
  const completedCount = projects.filter(p => p.status === "completed").length;
  const totalSavings = projects.reduce((s, p) => s + (p.actual_savings || 0), 0);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Lean Six Sigma</h1>
          <p className="text-slate-500 text-sm mt-1">Process improvement and operational excellence</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="bg-slate-900 hover:bg-slate-800">
          <Plus className="h-4 w-4 mr-2" />
          New DMAIC Project
        </Button>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm bg-blue-50">
          <CardContent className="p-4 flex items-center gap-3">
            <Activity className="h-8 w-8 text-blue-600" />
            <div>
              <div className="text-2xl font-bold text-blue-900">{activeCount}</div>
              <div className="text-xs text-blue-600">Active Projects</div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-emerald-50">
          <CardContent className="p-4 flex items-center gap-3">
            <Target className="h-8 w-8 text-emerald-600" />
            <div>
              <div className="text-2xl font-bold text-emerald-900">{completedCount}</div>
              <div className="text-xs text-emerald-600">Completed</div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-purple-50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="text-2xl text-purple-600 font-bold">$</div>
            <div>
              <div className="text-2xl font-bold text-purple-900">
                {totalSavings > 0 ? `$${totalSavings.toLocaleString()}` : "—"}
              </div>
              <div className="text-xs text-purple-600">Total Realized Savings</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Process Health */}
      <div>
        <h2 className="text-base font-semibold text-slate-700 mb-3">Process Health Metrics</h2>
        <ProcessHealthMetrics deals={deals} tasks={tasks} />
      </div>

      {/* DMAIC Projects */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-slate-700">DMAIC Projects</h2>
          <div className="flex gap-1">
            {PHASE_FILTERS.map(f => (
              <button
                key={f.value}
                onClick={() => setPhaseFilter(f.value)}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium transition-colors",
                  phaseFilter === f.value
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="py-16 text-center">
              <Target className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No Projects Yet</h3>
              <p className="text-slate-500 mb-4 text-sm">Start a DMAIC project to track a process improvement initiative</p>
              <Button onClick={() => setShowForm(true)} className="bg-slate-900 hover:bg-slate-800">
                <Plus className="h-4 w-4 mr-2" />
                New DMAIC Project
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(project => (
              <DMAICProjectCard
                key={project.id}
                project={project}
                onEdit={(p) => setEditing(p)}
                onDelete={(id) => deleteMutation.mutate(id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Forms */}
      {showForm && (
        <ImprovementProjectForm
          open={showForm}
          onClose={() => setShowForm(false)}
          onSave={handleSave}
        />
      )}
      {editing && (
        <ImprovementProjectForm
          project={editing}
          open={!!editing}
          onClose={() => setEditing(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}