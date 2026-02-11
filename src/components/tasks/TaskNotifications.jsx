import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, Calendar, AlertCircle } from "lucide-react";
import { format, isToday, isTomorrow, differenceInDays, isPast } from "date-fns";
import { cn } from "@/lib/utils";

export default function TaskNotifications() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    fetchUser();
  }, []);

  const { data: tasks = [] } = useQuery({
    queryKey: ['userTasks'],
    queryFn: () => base44.entities.Task.filter({ 
      assigned_to: user?.email,
      status: { $in: ['todo', 'in_progress'] }
    }),
    enabled: !!user
  });

  const { data: deals = [] } = useQuery({
    queryKey: ['deals'],
    queryFn: () => base44.entities.Deal.list()
  });

  const upcomingTasks = tasks
    .filter(task => task.due_date)
    .map(task => ({
      ...task,
      daysUntilDue: differenceInDays(new Date(task.due_date), new Date()),
      isOverdue: isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date))
    }))
    .filter(task => task.isOverdue || task.daysUntilDue <= 7)
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date));

  if (upcomingTasks.length === 0) return null;

  const getDealName = (dealId) => {
    return deals.find(d => d.id === dealId)?.name;
  };

  const getDateLabel = (task) => {
    if (task.isOverdue) return { text: "Overdue", color: "text-red-600" };
    if (isToday(new Date(task.due_date))) return { text: "Due Today", color: "text-amber-600" };
    if (isTomorrow(new Date(task.due_date))) return { text: "Due Tomorrow", color: "text-amber-600" };
    if (task.daysUntilDue <= 3) return { text: `Due in ${task.daysUntilDue} days`, color: "text-orange-600" };
    return { text: `Due ${format(new Date(task.due_date), 'MMM d')}`, color: "text-slate-600" };
  };

  return (
    <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-orange-50 border-l-4 border-l-amber-500">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-amber-100 shrink-0">
            <Bell className="h-5 w-5 text-amber-700" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-slate-900 mb-2">Upcoming & Overdue Tasks</h3>
            <div className="space-y-2">
              {upcomingTasks.slice(0, 5).map(task => {
                const dateLabel = getDateLabel(task);
                return (
                  <div key={task.id} className="flex items-start justify-between gap-2 text-sm">
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">{task.title}</p>
                      {task.deal_id && (
                        <p className="text-xs text-slate-600">{getDealName(task.deal_id)}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {task.isOverdue && <AlertCircle className="h-4 w-4 text-red-500" />}
                      <span className={cn("text-xs font-medium", dateLabel.color)}>
                        {dateLabel.text}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            {upcomingTasks.length > 5 && (
              <p className="text-xs text-slate-500 mt-2">
                +{upcomingTasks.length - 5} more task{upcomingTasks.length - 5 > 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}