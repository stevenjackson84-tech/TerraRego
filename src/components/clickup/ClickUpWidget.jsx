import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ExternalLink, RefreshCw, CheckCircle2, Circle, Clock, AlertCircle, ChevronDown, ChevronRight, Star } from "lucide-react";
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

export default function ClickUpWidget() {
   const [workspaces, setWorkspaces] = useState([]);
   const [spaces, setSpaces] = useState([]);
   const [lists, setLists] = useState([]);
   const [tasks, setTasks] = useState([]);
   const [dashboards, setDashboards] = useState([]);
   const [pinnedDashboards, setPinnedDashboards] = useState(() => {
     const stored = localStorage.getItem("clickup_pinned_dashboards");
     return stored ? JSON.parse(stored) : [];
   });
   const [selectedWorkspace, setSelectedWorkspace] = useState(null);
   const [selectedSpace, setSelectedSpace] = useState(null);
   const [selectedList, setSelectedList] = useState(null);
   const [loading, setLoading] = useState(true);
   const [tasksLoading, setTasksLoading] = useState(false);
   const [dashboardsLoading, setDashboardsLoading] = useState(false);
   const [expanded, setExpanded] = useState(true);
   const [activeTab, setActiveTab] = useState("dashboards");

  const invoke = (action, params = {}) =>
    base44.functions.invoke("clickup", { action, ...params }).then(r => r.data);

  useEffect(() => {
    invoke("getWorkspaces").then(data => {
      const teams = data.teams || [];
      setWorkspaces(teams);
      if (teams.length > 0) {
        const first = teams[0];
        setSelectedWorkspace(first);
        loadSpaces(first.id);
        loadDashboards(first.id);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const loadDashboards = async (teamId) => {
    setDashboardsLoading(true);
    try {
      const data = await invoke("getDashboards", { teamId });
      setDashboards(data.dashboards || []);
    } catch (e) {
      console.warn("Failed to load dashboards:", e);
      setDashboards([]);
    }
    setDashboardsLoading(false);
  };

  const loadSpaces = async (teamId) => {
    const data = await invoke("getSpaces", { teamId });
    setSpaces(data.spaces || []);
    setSelectedSpace(null);
    setSelectedList(null);
    setTasks([]);
    setLists([]);
  };

  const loadLists = async (spaceId) => {
    setSelectedSpace(spaceId);
    setSelectedList(null);
    setTasks([]);
    // Get folderless lists
    const data = await invoke("getFolderlessLists", { spaceId });
    setLists(data.lists || []);
  };

  const loadTasks = async (listId) => {
    setSelectedList(listId);
    setTasksLoading(true);
    const data = await invoke("getTasks", { listId });
    setTasks(data.tasks || []);
    setTasksLoading(false);
  };

  const togglePinDashboard = (dashId, dashName) => {
    setPinnedDashboards(prev => {
      const updated = prev.find(d => d.id === dashId)
        ? prev.filter(d => d.id !== dashId)
        : [...prev, { id: dashId, name: dashName }];
      localStorage.setItem("clickup_pinned_dashboards", JSON.stringify(updated));
      return updated;
    });
  };

  const addCustomDashboard = (dashId, dashName) => {
    const newDash = { id: dashId, name: dashName, custom: true };
    setPinnedDashboards(prev => {
      const updated = prev.find(d => d.id === dashId) ? prev : [...prev, newDash];
      localStorage.setItem("clickup_pinned_dashboards", JSON.stringify(updated));
      return updated;
    });
  };

  const refresh = () => {
    if (selectedList) loadTasks(selectedList);
  };

  if (loading) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Loading ClickUp...
          </div>
        </CardContent>
      </Card>
    );
  }

  const openInClickUp = () => {
    window.open(`https://app.clickup.com/${selectedWorkspace?.id || "36019843"}`, "_blank");
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3 pt-4 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => setExpanded(!expanded)} className="text-slate-400 hover:text-slate-600">
              {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
            <div className="w-5 h-5 rounded flex items-center justify-center" style={{ backgroundColor: "#7B68EE" }}>
              <span className="text-white text-xs font-bold">C</span>
            </div>
            <CardTitle className="text-base">ClickUp</CardTitle>
            {tasks.length > 0 && (
              <Badge className="bg-violet-100 text-violet-700 text-xs">{tasks.length}</Badge>
            )}
          </div>
          <div className="flex gap-1">
            {selectedList && (
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={refresh} disabled={tasksLoading}>
                <RefreshCw className={cn("h-3.5 w-3.5", tasksLoading && "animate-spin")} />
              </Button>
            )}
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={openInClickUp}>
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="px-4 pb-4 space-y-3">
          {/* Tabs */}
          <div className="flex gap-1 border-b border-slate-200">
            <button
              onClick={() => setActiveTab("dashboards")}
              className={cn(
                "text-xs px-2 py-2 border-b-2 font-medium transition-colors",
                activeTab === "dashboards"
                  ? "border-violet-600 text-violet-700"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              )}
            >
              Dashboards
            </button>
            <button
              onClick={() => setActiveTab("tasks")}
              className={cn(
                "text-xs px-2 py-2 border-b-2 font-medium transition-colors",
                activeTab === "tasks"
                  ? "border-violet-600 text-violet-700"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              )}
            >
              Tasks
            </button>
          </div>

          {/* Dashboards Tab */}
          {activeTab === "dashboards" && (
            dashboardsLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-8 bg-slate-100 rounded animate-pulse" />
                ))}
              </div>
            ) : dashboards.length > 0 ? (
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {dashboards.map(dash => (
                  <a
                    key={dash.id}
                    href={`https://app.clickup.com/${selectedWorkspace?.id}/v/li/dashboard/${dash.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 group transition-colors"
                  >
                    <div className="text-xs font-medium text-slate-800 group-hover:text-violet-700">
                      {dash.name}
                    </div>
                    <ExternalLink className="h-3 w-3 text-slate-300 group-hover:text-violet-600" />
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 text-center py-4">No dashboards available</p>
            )
          )}

          {/* Tasks Tab */}
          {activeTab === "tasks" && (
            <>
              {/* Filters */}
              <div className="flex gap-2 flex-wrap">
            {spaces.length > 0 && (
              <Select value={selectedSpace || ""} onValueChange={loadLists}>
                <SelectTrigger className="h-8 text-xs w-36">
                  <SelectValue placeholder="Select Space" />
                </SelectTrigger>
                <SelectContent>
                  {spaces.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {lists.length > 0 && (
              <Select value={selectedList || ""} onValueChange={loadTasks}>
                <SelectTrigger className="h-8 text-xs w-40">
                  <SelectValue placeholder="Select List" />
                </SelectTrigger>
                <SelectContent>
                  {lists.map(l => (
                    <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Tasks */}
          {tasksLoading ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-8 bg-slate-100 rounded animate-pulse" />
              ))}
            </div>
          ) : tasks.length > 0 ? (
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {tasks.map(task => (
                <a
                  key={task.id}
                  href={task.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-2 p-2 rounded-lg hover:bg-slate-50 group transition-colors"
                >
                  <div className="mt-0.5 flex-shrink-0">{statusIcon(task.status?.status)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-slate-800 truncate group-hover:text-violet-700">
                      {task.name}
                    </div>
                    {task.due_date && (
                      <div className="text-xs text-slate-400 mt-0.5">
                        Due: {new Date(parseInt(task.due_date)).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                  {task.priority?.priority && (
                    <Badge className={cn("text-xs flex-shrink-0 py-0", priorityConfig[task.priority.priority]?.color)}>
                      {priorityConfig[task.priority.priority]?.label}
                    </Badge>
                  )}
                </a>
              ))}
            </div>
          ) : selectedList ? (
            <p className="text-xs text-slate-400 text-center py-4">No open tasks in this list</p>
          ) : (
            <p className="text-xs text-slate-400 text-center py-4">Select a space and list to view tasks</p>
          )}
            </>
          )}
          </CardContent>
          )}
          </Card>
          );
          }