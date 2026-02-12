import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Calendar, Edit, Trash2, LayoutList, LayoutGrid, ChevronRight, ListTree, Link2, Clock } from "lucide-react";
import { format, isPast, isToday } from "date-fns";
import { cn } from "@/lib/utils";
import TaskForm from "@/components/tasks/TaskForm";
import TaskKanban from "@/components/tasks/TaskKanban";

const priorityStyles = {
  low: "bg-slate-100 text-slate-600",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-amber-100 text-amber-700",
  urgent: "bg-red-100 text-red-700"
};

const statusStyles = {
  todo: "bg-slate-100 text-slate-600",
  in_progress: "bg-blue-100 text-blue-700",
  blocked: "bg-red-100 text-red-700",
  completed: "bg-emerald-100 text-emerald-700"
};

export default function Tasks() {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [view, setView] = useState("list");
  const [expandedTasks, setExpandedTasks] = useState({});
  
  const queryClient = useQueryClient();

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list('-created_date')
  });

  const { data: deals = [] } = useQuery({
    queryKey: ['deals'],
    queryFn: () => base44.entities.Deal.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Task.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setShowForm(false);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Task.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setShowForm(false);
      setEditingTask(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Task.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] })
  });

  const handleSave = (data) => {
    if (editingTask) {
      updateMutation.mutate({ id: editingTask.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleToggleComplete = (task) => {
    updateMutation.mutate({
      id: task.id,
      data: {
        status: task.status === 'completed' ? 'todo' : 'completed',
        completed_date: task.status === 'completed' ? null : new Date().toISOString().split('T')[0]
      }
    });
  };

  const getDealName = (dealId) => {
    const deal = deals.find(d => d.id === dealId);
    return deal?.name;
  };

  const getSubtasks = (taskId) => {
    return tasks.filter(t => t.parent_task_id === taskId);
  };

  const toggleExpanded = (taskId) => {
    setExpandedTasks(prev => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = !search || 
      task.title?.toLowerCase().includes(search.toLowerCase()) ||
      task.description?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === "all" || 
      (filterStatus === "active" && task.status !== 'completed') ||
      task.status === filterStatus;
    return matchesSearch && matchesStatus;
  }).sort((a, b) => {
    // Sort: incomplete first, then by due date
    if (a.status === 'completed' && b.status !== 'completed') return 1;
    if (a.status !== 'completed' && b.status === 'completed') return -1;
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;
    return new Date(a.due_date) - new Date(b.due_date);
  });

  const mainTasks = filteredTasks.filter(task => !task.parent_task_id);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Tasks</h1>
            <p className="text-slate-500 mt-1">Track your to-dos and project tasks</p>
          </div>
          <Button onClick={() => setShowForm(true)} className="bg-slate-900 hover:bg-slate-800">
            <Plus className="h-4 w-4 mr-2" />
            Add Task
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search tasks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-2">
            <Tabs value={filterStatus} onValueChange={setFilterStatus}>
              <TabsList className="bg-white border">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="active">Active</TabsTrigger>
                <TabsTrigger value="todo">To Do</TabsTrigger>
                <TabsTrigger value="in_progress">In Progress</TabsTrigger>
                <TabsTrigger value="completed">Completed</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex gap-1 bg-white border rounded-lg p-1">
              <Button
                variant={view === "list" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setView("list")}
              >
                <LayoutList className="h-4 w-4" />
              </Button>
              <Button
                variant={view === "kanban" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setView("kanban")}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Tasks View */}
        {view === "kanban" ? (
          <TaskKanban
            tasks={filteredTasks}
            deals={deals}
            onEdit={(task) => {
              setEditingTask(task);
              setShowForm(true);
            }}
            onDelete={(id) => deleteMutation.mutate(id)}
            onStatusChange={(task, status) => updateTaskStatusMutation.mutate({ id: task.id, status })}
          />
        ) : (
          <div className="space-y-3">
            {mainTasks.map(task => {
              const isOverdue = task.due_date && isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date)) && task.status !== 'completed';
              const isDueToday = task.due_date && isToday(new Date(task.due_date));
              const dealName = getDealName(task.deal_id);
              const subtasks = getSubtasks(task.id);
              const completedSubtasks = subtasks.filter(st => st.status === 'completed').length;
              const isExpanded = expandedTasks[task.id];

              return (
                <div key={task.id}>
                  <Card className={cn(
                    "border-0 shadow-sm p-4 transition-all duration-200",
                    task.status === 'completed' && "bg-slate-50"
                  )}>
                    <div className="flex items-start gap-4">
                      <Checkbox
                        checked={task.status === 'completed'}
                        onCheckedChange={() => handleToggleComplete(task)}
                        className="mt-1"
                      />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <h3 className={cn(
                              "font-medium text-slate-900",
                              task.status === 'completed' && "text-slate-400 line-through"
                            )}>
                              {task.title}
                            </h3>
                            {task.description && (
                              <p className="text-sm text-slate-500 mt-1 line-clamp-2">{task.description}</p>
                            )}
                          </div>
                          
                          <div className="flex gap-1 shrink-0">
                            {subtasks.length > 0 && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8"
                                onClick={() => toggleExpanded(task.id)}
                              >
                                <ChevronRight className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-90")} />
                              </Button>
                            )}
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8"
                              onClick={() => {
                                setEditingTask(task);
                                setShowForm(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-red-500 hover:text-red-600"
                              onClick={() => deleteMutation.mutate(task.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 mt-3 flex-wrap">
                          <Badge variant="secondary" className={cn("text-xs", statusStyles[task.status])}>
                            {task.status.replace('_', ' ')}
                          </Badge>
                          <Badge variant="secondary" className={cn("text-xs", priorityStyles[task.priority])}>
                            {task.priority}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {task.category}
                          </Badge>
                          
                          {task.is_recurring && (
                            <Badge variant="outline" className="text-xs flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Recurring
                            </Badge>
                          )}

                          {subtasks.length > 0 && (
                            <Badge variant="outline" className="text-xs flex items-center gap-1">
                              <ListTree className="h-3 w-3" />
                              {completedSubtasks}/{subtasks.length} subtasks
                            </Badge>
                          )}

                          {task.depends_on?.length > 0 && (
                            <Badge variant="outline" className="text-xs flex items-center gap-1">
                              <Link2 className="h-3 w-3" />
                              {task.depends_on.length} dependencies
                            </Badge>
                          )}
                          
                          {dealName && (
                            <span className="text-xs text-amber-600 font-medium">{dealName}</span>
                          )}
                          
                          {task.due_date && (
                            <span className={cn(
                              "flex items-center gap-1 text-xs",
                              isOverdue ? "text-red-500 font-medium" : isDueToday ? "text-amber-600 font-medium" : "text-slate-500"
                            )}>
                              <Calendar className="h-3 w-3" />
                              {isOverdue && "Overdue: "}
                              {isDueToday ? "Today" : format(new Date(task.due_date), 'MMM d')}
                            </span>
                          )}
                          
                          {task.assigned_to && (
                            <span className="text-xs text-slate-500">@{task.assigned_to}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>

                  {/* Subtasks */}
                  {isExpanded && subtasks.length > 0 && (
                    <div className="ml-12 mt-2 space-y-2">
                      {subtasks.map(subtask => {
                        const subIsOverdue = subtask.due_date && isPast(new Date(subtask.due_date)) && !isToday(new Date(subtask.due_date)) && subtask.status !== 'completed';
                        const subIsDueToday = subtask.due_date && isToday(new Date(subtask.due_date));

                        return (
                          <Card key={subtask.id} className={cn(
                            "border-l-4 border-l-slate-300 shadow-sm p-3",
                            subtask.status === 'completed' && "bg-slate-50"
                          )}>
                            <div className="flex items-start gap-3">
                              <Checkbox
                                checked={subtask.status === 'completed'}
                                onCheckedChange={() => handleToggleComplete(subtask)}
                                className="mt-0.5"
                              />
                              
                              <div className="flex-1">
                                <h4 className={cn(
                                  "text-sm font-medium text-slate-900",
                                  subtask.status === 'completed' && "text-slate-400 line-through"
                                )}>
                                  {subtask.title}
                                </h4>
                                <div className="flex items-center gap-2 mt-2 flex-wrap">
                                  <Badge variant="secondary" className={cn("text-xs", priorityStyles[subtask.priority])}>
                                    {subtask.priority}
                                  </Badge>
                                  {subtask.due_date && (
                                    <span className={cn(
                                      "flex items-center gap-1 text-xs",
                                      subIsOverdue ? "text-red-500" : subIsDueToday ? "text-amber-600" : "text-slate-500"
                                    )}>
                                      <Calendar className="h-3 w-3" />
                                      {subIsDueToday ? "Today" : format(new Date(subtask.due_date), 'MMM d')}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex gap-1">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-7 w-7"
                                  onClick={() => {
                                    setEditingTask(subtask);
                                    setShowForm(true);
                                  }}
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-7 w-7 text-red-500"
                                  onClick={() => deleteMutation.mutate(subtask.id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
            
            {mainTasks.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                No tasks found. Create your first task to get started.
              </div>
            )}
          </div>
        )}

        {/* Form Modal */}
        <TaskForm
          task={editingTask}
          deals={deals}
          allTasks={tasks}
          open={showForm}
          onClose={() => {
            setShowForm(false);
            setEditingTask(null);
          }}
          onSave={handleSave}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      </div>
    </div>
  );
}