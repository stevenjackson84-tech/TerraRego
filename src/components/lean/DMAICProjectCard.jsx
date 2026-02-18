import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Edit, Trash2, TrendingUp, Calendar } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const PHASE_CONFIG = {
  define:  { label: "Define",  color: "bg-purple-100 text-purple-700", order: 1 },
  measure: { label: "Measure", color: "bg-blue-100 text-blue-700",   order: 2 },
  analyze: { label: "Analyze", color: "bg-yellow-100 text-yellow-700", order: 3 },
  improve: { label: "Improve", color: "bg-orange-100 text-orange-700", order: 4 },
  control: { label: "Control", color: "bg-emerald-100 text-emerald-700", order: 5 },
};

const STATUS_COLOR = {
  active:    "bg-emerald-100 text-emerald-700",
  on_hold:   "bg-yellow-100 text-yellow-700",
  completed: "bg-slate-100 text-slate-600",
  cancelled: "bg-red-100 text-red-600",
};

const AREA_LABELS = {
  deal_acquisition: "Deal Acquisition",
  entitlement: "Entitlement",
  development: "Development",
  sales: "Sales",
  general: "General",
};

export default function DMAICProjectCard({ project, onEdit, onDelete }) {
  const phase = PHASE_CONFIG[project.phase] || PHASE_CONFIG.define;
  const progress = ((phase.order - 1) / 5) * 100;
  const savingsGap = project.estimated_savings && !project.actual_savings;

  return (
    <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-slate-900 truncate">{project.name}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{AREA_LABELS[project.process_area] || "General"}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEdit(project)}>
              <Edit className="h-3.5 w-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7 text-red-400 hover:text-red-600" onClick={() => onDelete(project.id)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* DMAIC Progress Bar */}
        <div className="mb-3">
          <div className="flex gap-0.5 mb-1">
            {Object.entries(PHASE_CONFIG).map(([key, cfg]) => (
              <div
                key={key}
                className={cn(
                  "flex-1 h-2 rounded-sm transition-colors",
                  cfg.order <= phase.order ? "bg-slate-800" : "bg-slate-200"
                )}
              />
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-slate-400">
            {Object.entries(PHASE_CONFIG).map(([key, cfg]) => (
              <span key={key}>{cfg.label}</span>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          <Badge className={phase.color}>{phase.label}</Badge>
          <Badge className={STATUS_COLOR[project.status]}>{project.status?.replace("_", " ")}</Badge>
        </div>

        {project.problem_statement && (
          <p className="text-xs text-slate-600 mb-3 line-clamp-2">{project.problem_statement}</p>
        )}

        {/* Metrics */}
        {(project.baseline_metric != null || project.target_metric != null || project.actual_metric != null) && (
          <div className="grid grid-cols-3 gap-2 mb-3 p-2 bg-slate-50 rounded-lg">
            {[
              { label: "Baseline", val: project.baseline_metric },
              { label: "Target", val: project.target_metric },
              { label: "Actual", val: project.actual_metric },
            ].map(({ label, val }) => (
              <div key={label} className="text-center">
                <div className="text-[10px] text-slate-500">{label}</div>
                <div className="text-sm font-semibold text-slate-800">
                  {val != null ? `${val}${project.metric_unit ? ` ${project.metric_unit}` : ""}` : "—"}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Savings */}
        {(project.estimated_savings || project.actual_savings) && (
          <div className="flex items-center gap-2 text-xs mb-3">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
            <span className="text-slate-500">
              {project.actual_savings
                ? `Savings: $${project.actual_savings.toLocaleString()}`
                : `Est. Savings: $${project.estimated_savings?.toLocaleString()}`}
            </span>
          </div>
        )}

        {/* Dates */}
        {(project.start_date || project.target_completion) && (
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Calendar className="h-3.5 w-3.5" />
            <span>
              {project.start_date ? format(new Date(project.start_date), "MMM d, yyyy") : "—"}
              {project.target_completion && ` → ${format(new Date(project.target_completion), "MMM d, yyyy")}`}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}