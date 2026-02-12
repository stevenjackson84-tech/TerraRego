import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Edit, Trash2, AlertCircle, Clock, ListTree, Link2 } from "lucide-react";
import { format, isPast, isToday } from "date-fns";
import { cn } from "@/lib/utils";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

const columns = [
  { id: "todo", title: "To Do", color: "bg-slate-100" },
  { id: "in_progress", title: "In Progress", color: "bg-blue-100" },
  { id: "blocked", title: "Blocked", color: "bg-red-100" },
  { id: "completed", title: "Completed", color: "bg-emerald-100" }
];

const priorityColors = {
  low: "bg-slate-100 text-slate-700",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-amber-100 text-amber-700",
  urgent: "bg-red-100 text-red-700"
};

export default function TaskKanban({ tasks, deals, onEdit, onDelete, onStatusChange }) {
  const [draggedTask, setDraggedTask] = useState(null);

  const getDealName = (dealId) => {
    const deal = deals.find(d => d.id === dealId);
    return deal?.name;
  };

  const getTasksByStatus = (status) => {
    return tasks
      .filter(task => !task.parent_task_id && task.status === status)
      .sort((a, b) => {
        const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
        return (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2);
      });
  };

  const getSubtasks = (taskId) => {
    return tasks.filter(task => task.parent_task_id === taskId);
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    
    const taskId = result.draggableId;
    const newStatus = result.destination.droppableId;
    
    onStatusChange({ id: taskId }, newStatus);
  };

  const TaskCard = ({ task, index }) => {
    const isOverdue = task.due_date && isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date)) && task.status !== 'completed';
    const isDueToday = task.due_date && isToday(new Date(task.due_date));
    const dealName = getDealName(task.deal_id);
    const subtasks = getSubtasks(task.id);
    const completedSubtasks = subtasks.filter(st => st.status === 'completed').length;
    const hasDependencies = task.depends_on && task.depends_on.length > 0;

    return (
      <Draggable draggableId={task.id} index={index}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            className={cn(
              "mb-3",
              snapshot.isDragging && "opacity-50"
            )}
          >
            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-medium text-slate-900 text-sm leading-tight flex-1">
                      {task.title}
                    </h4>
                    <div className="flex gap-1 shrink-0">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7"
                        onClick={() => onEdit(task)}
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 text-red-500 hover:text-red-600"
                        onClick={() => onDelete(task.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {task.description && (
                    <p className="text-xs text-slate-500 line-clamp-2">{task.description}</p>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className={cn("text-xs", priorityColors[task.priority])}>
                      {task.priority}
                    </Badge>
                    {task.category !== 'general' && (
                      <Badge variant="outline" className="text-xs">
                        {task.category}
                      </Badge>
                    )}
                    {task.is_recurring && (
                      <Badge variant="outline" className="text-xs flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Recurring
                      </Badge>
                    )}
                  </div>

                  {dealName && (
                    <p className="text-xs text-amber-600 font-medium">{dealName}</p>
                  )}

                  {task.due_date && (
                    <div className={cn(
                      "flex items-center gap-1 text-xs",
                      isOverdue ? "text-red-500 font-medium" : isDueToday ? "text-amber-600 font-medium" : "text-slate-500"
                    )}>
                      <Calendar className="h-3 w-3" />
                      {isOverdue && "Overdue: "}
                      {isDueToday ? "Today" : format(new Date(task.due_date), 'MMM d')}
                    </div>
                  )}

                  {task.assigned_to && (
                    <p className="text-xs text-slate-500">@{task.assigned_to}</p>
                  )}

                  {subtasks.length > 0 && (
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <ListTree className="h-3 w-3" />
                      <span>{completedSubtasks}/{subtasks.length} subtasks</span>
                    </div>
                  )}

                  {hasDependencies && (
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <Link2 className="h-3 w-3" />
                      <span>{task.depends_on.length} dependencies</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </Draggable>
    );
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {columns.map(column => {
          const columnTasks = getTasksByStatus(column.id);
          
          return (
            <div key={column.id} className="flex flex-col">
              <div className={cn("rounded-t-lg p-3 border-b", column.color)}>
                <h3 className="font-semibold text-slate-900 flex items-center justify-between">
                  {column.title}
                  <Badge variant="secondary" className="ml-2">
                    {columnTasks.length}
                  </Badge>
                </h3>
              </div>
              
              <Droppable droppableId={column.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      "flex-1 p-3 bg-slate-50 rounded-b-lg min-h-[500px]",
                      snapshot.isDraggingOver && "bg-slate-100"
                    )}
                  >
                    {columnTasks.map((task, index) => (
                      <TaskCard key={task.id} task={task} index={index} />
                    ))}
                    {provided.placeholder}
                    {columnTasks.length === 0 && (
                      <div className="text-center py-8 text-slate-400 text-sm">
                        No tasks
                      </div>
                    )}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}