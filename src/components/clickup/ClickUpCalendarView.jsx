import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format, isSameDay, parseISO } from "date-fns";
import { CheckCircle2, Circle, Clock, AlertCircle, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const priorityConfig = {
  1: { label: "Urgent", color: "bg-red-100 text-red-700" },
  2: { label: "High", color: "bg-orange-100 text-orange-700" },
  3: { label: "Normal", color: "bg-blue-100 text-blue-700" },
  4: { label: "Low", color: "bg-slate-100 text-slate-600" },
};

function statusIcon(status) {
  const s = status?.toLowerCase();
  if (s === "complete" || s === "closed" || s === "done") return <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />;
  if (s === "in progress" || s === "in review") return <Clock className="h-3.5 w-3.5 text-blue-500" />;
  if (s === "blocked") return <AlertCircle className="h-3.5 w-3.5 text-red-500" />;
  return <Circle className="h-3.5 w-3.5 text-slate-400" />;
}

export default function ClickUpCalendarView({ tasks = [], selectedList, selectedSpace, selectedWorkspace, invoke }) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newTaskName, setNewTaskName] = useState("");
  const [newTaskDesc, setNewTaskDesc] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState("3");
  const [isCreating, setIsCreating] = useState(false);

  // Parse and organize tasks by due date
  const tasksWithDates = tasks
    .filter(t => t.due_date)
    .map(t => ({
      ...t,
      dueDate: new Date(parseInt(t.due_date)),
    }));

  // Get tasks for selected date
  const selectedTasks = tasksWithDates.filter(t =>
    isSameDay(t.dueDate, selectedDate)
  );

  // Get dates that have tasks
  const datesWithTasks = tasksWithDates.map(t => t.dueDate);

  const handleDayClick = (day) => {
    setSelectedDate(day);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Calendar */}
        <div className="lg:col-span-1 bg-white border border-slate-200 rounded-lg p-3">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDayClick}
            disabled={(date) => {
              // Disable dates without tasks for easier navigation
              return !datesWithTasks.some(d => isSameDay(d, date));
            }}
            className="[&_.disabled]:opacity-50"
          />
        </div>

        {/* Tasks for selected date */}
        <div className="lg:col-span-2 space-y-3">
          <div>
            <h3 className="font-semibold text-sm text-slate-900 mb-3">
              {format(selectedDate, "EEEE, MMMM d, yyyy")}
            </h3>
            {selectedTasks.length > 0 ? (
              <div className="space-y-2">
                {selectedTasks.map(task => (
                  <a
                    key={task.id}
                    href={task.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:border-violet-300 hover:bg-violet-50 group transition-all"
                  >
                    <div className="mt-0.5 flex-shrink-0">
                      {statusIcon(task.status?.status)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-900 truncate group-hover:text-violet-700">
                        {task.name}
                      </div>
                      {task.list?.name && (
                        <div className="text-xs text-slate-500 mt-0.5">
                          {task.list.name}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {task.priority?.priority && (
                        <Badge className={cn("text-xs py-0", priorityConfig[task.priority.priority]?.color)}>
                          {priorityConfig[task.priority.priority]?.label}
                        </Badge>
                      )}
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500 text-center py-8">
                No tasks scheduled for this date
              </p>
            )}
          </div>

          {/* Upcoming tasks (next 7 days) */}
          {tasksWithDates.length > 0 && (
            <div className="pt-4 border-t border-slate-200">
              <h4 className="font-semibold text-xs text-slate-600 mb-2">
                📅 Upcoming (Next 7 Days)
              </h4>
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {tasksWithDates
                  .filter(t => {
                    const daysUntil = Math.ceil(
                      (t.dueDate - new Date()) / (1000 * 60 * 60 * 24)
                    );
                    return daysUntil >= 0 && daysUntil <= 7;
                  })
                  .sort((a, b) => a.dueDate - b.dueDate)
                  .slice(0, 5)
                  .map(task => (
                    <a
                      key={task.id}
                      href={task.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-2 rounded text-xs hover:bg-slate-50 group transition-colors"
                    >
                      <div className="flex-1 truncate">
                        <span className="text-slate-900 group-hover:text-violet-700">
                          {task.name}
                        </span>
                        <span className="text-slate-400 ml-2">
                          {format(task.dueDate, "MMM d")}
                        </span>
                      </div>
                    </a>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}