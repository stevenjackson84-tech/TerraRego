import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Edit, Trash2, Clock, CheckCircle2, AlertCircle, 
  Circle, Flag, User as UserIcon 
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const statusConfig = {
  todo: { 
    color: "bg-slate-100 text-slate-700 border-slate-200", 
    icon: Circle,
    label: "To Do"
  },
  in_progress: { 
    color: "bg-blue-100 text-blue-700 border-blue-200", 
    icon: Clock,
    label: "In Progress"
  },
  blocked: { 
    color: "bg-red-100 text-red-700 border-red-200", 
    icon: AlertCircle,
    label: "Blocked"
  },
  completed: { 
    color: "bg-emerald-100 text-emerald-700 border-emerald-200", 
    icon: CheckCircle2,
    label: "Completed"
  }
};

const priorityConfig = {
  low: { color: "bg-slate-100 text-slate-600", label: "Low" },
  medium: { color: "bg-blue-100 text-blue-700", label: "Medium" },
  high: { color: "bg-orange-100 text-orange-700", label: "High" },
  urgent: { color: "bg-red-100 text-red-700", label: "Urgent" }
};

const categoryLabels = {
  general: "General",
  due_diligence: "Due Diligence",
  legal: "Legal",
  financial: "Financial",
  entitlement: "Entitlement",
  construction: "Construction",
  marketing: "Marketing"
};

export default function TaskCard({ task, onEdit, onDelete, onStatusChange }) {
  const StatusIcon = statusConfig[task.status]?.icon || Circle;
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';

  return (
    <Card className={cn(
      "border-l-4 shadow-sm transition-all hover:shadow-md",
      task.status === 'completed' ? "border-l-emerald-500 bg-slate-50" : "border-l-blue-500"
    )}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Title and Status */}
            <div className="flex items-start gap-3 mb-2">
              <button
                onClick={() => {
                  const nextStatus = task.status === 'completed' ? 'todo' : 
                                   task.status === 'todo' ? 'in_progress' : 
                                   task.status === 'in_progress' ? 'completed' : 'todo';
                  onStatusChange(task, nextStatus);
                }}
                className="mt-0.5 hover:opacity-70 transition-opacity"
              >
                <StatusIcon className={cn(
                  "h-5 w-5",
                  task.status === 'completed' ? "text-emerald-600" : 
                  task.status === 'in_progress' ? "text-blue-600" : 
                  task.status === 'blocked' ? "text-red-600" : "text-slate-400"
                )} />
              </button>
              <div className="flex-1">
                <h3 className={cn(
                  "font-semibold text-slate-900",
                  task.status === 'completed' && "text-slate-400 line-through"
                )}>
                  {task.title}
                </h3>
                {task.description && (
                  <p className="text-sm text-slate-600 mt-1 line-clamp-2">
                    {task.description}
                  </p>
                )}
              </div>
            </div>

            {/* Metadata */}
            <div className="flex flex-wrap items-center gap-2 ml-8">
              <Badge 
                variant="outline" 
                className={cn("text-xs", statusConfig[task.status]?.color)}
              >
                {statusConfig[task.status]?.label || task.status}
              </Badge>

              <Badge 
                className={cn("text-xs", priorityConfig[task.priority]?.color)}
              >
                <Flag className="h-3 w-3 mr-1" />
                {priorityConfig[task.priority]?.label || task.priority}
              </Badge>

              {task.category && (
                <Badge variant="outline" className="text-xs bg-slate-50 text-slate-600">
                  {categoryLabels[task.category] || task.category}
                </Badge>
              )}

              {task.due_date && (
                <div className={cn(
                  "flex items-center gap-1 text-xs",
                  isOverdue ? "text-red-600 font-medium" : "text-slate-500"
                )}>
                  <Clock className="h-3 w-3" />
                  {format(new Date(task.due_date), 'MMM d, yyyy')}
                  {isOverdue && <span className="ml-1">(Overdue)</span>}
                </div>
              )}

              {task.assigned_to && (
                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <UserIcon className="h-3 w-3" />
                  {task.assigned_to}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-1 shrink-0">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8" 
              onClick={() => onEdit(task)}
            >
              <Edit className="h-4 w-4 text-slate-600" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-red-500 hover:text-red-600" 
              onClick={() => onDelete(task.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}