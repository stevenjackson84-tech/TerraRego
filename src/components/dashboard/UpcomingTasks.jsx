import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { format, isPast, isToday } from "date-fns";
import { cn } from "@/lib/utils";

const priorityStyles = {
  low: "bg-slate-100 text-slate-600",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-amber-100 text-amber-700",
  urgent: "bg-red-100 text-red-700"
};

export default function UpcomingTasks({ tasks, deals, onToggleTask }) {
  const getDealName = (dealId) => {
    const deal = deals.find(d => d.id === dealId);
    return deal?.name;
  };

  const upcomingTasks = tasks
    .filter(t => t.status !== 'completed')
    .sort((a, b) => {
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date) - new Date(b.due_date);
    })
    .slice(0, 5);

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold text-slate-900">Upcoming Tasks</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {upcomingTasks.map((task) => {
            const isOverdue = task.due_date && isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date));
            const isDueToday = task.due_date && isToday(new Date(task.due_date));
            
            return (
              <div 
                key={task.id} 
                className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <Checkbox 
                  checked={task.status === 'completed'}
                  onCheckedChange={() => onToggleTask(task)}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "text-sm font-medium",
                    task.status === 'completed' ? "text-slate-400 line-through" : "text-slate-900"
                  )}>
                    {task.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {task.deal_id && (
                      <span className="text-xs text-amber-600 font-medium">{getDealName(task.deal_id)}</span>
                    )}
                    {task.due_date && (
                      <span className={cn(
                        "text-xs",
                        isOverdue ? "text-red-500 font-medium" : isDueToday ? "text-amber-600 font-medium" : "text-slate-500"
                      )}>
                        {isOverdue ? "Overdue: " : isDueToday ? "Today" : ""}{!isDueToday && format(new Date(task.due_date), 'MMM d')}
                      </span>
                    )}
                    <Badge variant="secondary" className={cn("text-xs", priorityStyles[task.priority])}>
                      {task.priority}
                    </Badge>
                  </div>
                </div>
              </div>
            );
          })}
          {upcomingTasks.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-8">No upcoming tasks</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}