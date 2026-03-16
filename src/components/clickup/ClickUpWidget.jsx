import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ExternalLink, RefreshCw, CheckCircle2, Circle, Clock, AlertCircle, ChevronDown, ChevronRight, Star, Plus, Maximize2, X, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import ClickUpCalendarView from "./ClickUpCalendarView";
import ClickUpConnect from "./ClickUpConnect";
import { isClickUpConnected } from "@/lib/clickupAuth";
import { clickupApi } from "@/lib/clickupApi";

const priorityConfig = {
  1: { label: "Urgent", color: "bg-red-100 text-red-700" },
  2: { label: "High", color: "bg-orange-100 text-orange-700" },
  3: { label: "Normal", color: "bg-blue-100 text-blue-700" },
  4: { label: "Low", color: "bg-slate-100 text-slate-600" },
};

function statusIcon(status) {
  const s = status?.toLowerCase();
  if (s === "complete" || s === "closed" || s === "done")
    return <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />;
  if (s === "in progress" || s === "in review")
    return <Clock className="h-3.5 w-3.5 text-blue-500" />;
  if (s === "blocked")
    return <AlertCircle className="h-3.5 w-3.5 text-red-500" />;
  return <Circle className="h-3.5 w-3.5 text-slate-400" />;
}

export default function ClickUpWidget() {
  const [connected, setConnected] = useState(isClickUpConnected());
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
  const [loading, setLoading] = useState(false);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [dashboardsLoading, setDashboardsLoading] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboards");
  const [urlInput, setUrlInput] = useState("");
  const [urlError, setUrlError] = useState("");
  const [viewingDash, setViewingDash] = useState(null); // { id, name, embedUrl }
  const [iframeBlocked, setIframeBlocked] = useState(false);
  const [embedUrlInput, setEmbedUrlInput] = useState("");
  const [editingEmbedFor, setEditingEmbedFor] = useState(null);

  // Compatibility shim for ClickUpCalendarView which uses invoke("createTask", ...)
  const invoke = (action, params = {}) => {
    if (action === "createTask") {
      return clickupApi.createTask(params.listId, {
        name: params.name,
        description: params.description,
        priority: params.priority,
        due_date: params.dueDate,
      });
    }
    return Promise.reject(new Error(`Unknown action: ${action}`));
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await clickupApi.getWorkspaces();
      const teams = data.teams || [];
      setWorkspaces(teams);
      if (teams.length > 0) {
        const first = teams[0];
        setSelectedWorkspace(first);
        loadSpaces(first.id);
        loadDashboards(first.id);
      }
    } catch (e) {
      console.warn("Failed to load ClickUp workspaces:", e);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (connected) loadData();
  }, [connected]);

  const loadDashboards = async (teamId) => {
    setDashboardsLoading(true);
    try {
      const data = await clickupApi.getDashboards(teamId);
      setDashboards(data.dashboards || []);
    } catch (e) {
      console.warn("Failed to load dashboards:", e);
      setDashboards([]);
    }
    setDashboardsLoading(false);
  };

  const loadSpaces = async (teamId) => {
    try {
      const data = await clickupApi.getSpaces(teamId);
      setSpaces(data.spaces || []);
    } catch (e) {
      console.warn("Failed to load spaces:", e);
    }
    setSelectedSpace(null);
    setSelectedList(null);
    setTasks([]);
    setLists([]);
  };

  const loadLists = async (spaceId) => {
    setSelectedSpace(spaceId);
    setSelectedList(null);
    setTasks([]);
    try {
      const data = await clickupApi.getFolderlessLists(spaceId);
      setLists(data.lists || []);
    } catch (e) {
      console.warn("Failed to load lists:", e);
    }
  };

  const loadTasks = async (listId) => {
    setSelectedList(listId);
    setTasksLoading(true);
    try {
      const data = await clickupApi.getTasks(listId);
      setTasks(data.tasks || []);
    } catch (e) {
      console.warn("Failed to load tasks:", e);
    }
    setTasksLoading(false);
  };

  const togglePinDashboard = (dashId, dashName) => {
    setPinnedDashboards((prev) => {
      const updated = prev.find((d) => d.id === dashId)
        ? prev.filter((d) => d.id !== dashId)
        : [...prev, { id: dashId, name: dashName }];
      localStorage.setItem("clickup_pinned_dashboards", JSON.stringify(updated));
      return updated;
    });
  };

  const saveEmbedUrl = (dashId) => {
    setPinnedDashboards((prev) => {
      const updated = prev.map((d) =>
        d.id === dashId ? { ...d, embedUrl: embedUrlInput.trim() } : d
      );
      localStorage.setItem("clickup_pinned_dashboards", JSON.stringify(updated));
      return updated;
    });
    setEditingEmbedFor(null);
    setEmbedUrlInput("");
  };

  const addDashboardByUrl = () => {
    setUrlError("");
    const match = urlInput.match(/app\.clickup\.com\/(\d+)\/dashboards\/([\w-]+)/);
    if (!match) {
      setUrlError("Paste a valid ClickUp dashboard URL.");
      return;
    }
    const [, wsId, dashId] = match;
    if (pinnedDashboards.some((d) => d.id === dashId)) {
      setUrlError("This dashboard is already pinned.");
      return;
    }
    const name = `Dashboard ${dashId}`;
    setPinnedDashboards((prev) => {
      const updated = [...prev, { id: dashId, name, workspaceId: wsId, custom: true }];
      localStorage.setItem("clickup_pinned_dashboards", JSON.stringify(updated));
      return updated;
    });
    setUrlInput("");
  };

  const handleDisconnect = () => {
    setConnected(false);
    setWorkspaces([]);
    setSpaces([]);
    setLists([]);
    setTasks([]);
    setDashboards([]);
    setSelectedWorkspace(null);
    setSelectedSpace(null);
    setSelectedList(null);
  };

  return (
    <>
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3 pt-4 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-slate-400 hover:text-slate-600"
            >
              {expanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
            <div
              className="w-5 h-5 rounded flex items-center justify-center"
              style={{ backgroundColor: "#7B68EE" }}
            >
              <span className="text-white text-xs font-bold">C</span>
            </div>
            <CardTitle className="text-base">ClickUp</CardTitle>
            {connected && tasks.length > 0 && (
              <Badge className="bg-violet-100 text-violet-700 text-xs">
                {tasks.length}
              </Badge>
            )}
          </div>
          <div className="flex gap-1">
            {connected && selectedList && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0"
                onClick={() => loadTasks(selectedList)}
                disabled={tasksLoading}
              >
                <RefreshCw className={cn("h-3.5 w-3.5", tasksLoading && "animate-spin")} />
              </Button>
            )}
            {connected && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0"
                onClick={() =>
                  window.open(
                    `https://app.clickup.com/${selectedWorkspace?.id || ""}`,
                    "_blank"
                  )
                }
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="px-4 pb-4 space-y-3">
          {!connected ? (
            <ClickUpConnect onConnect={() => setConnected(true)} />
          ) : loading ? (
            <div className="flex items-center gap-2 text-slate-500 text-sm py-2">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Loading ClickUp...
            </div>
          ) : (
            <>
              {/* Compact connection status */}
              <ClickUpConnect
                compact
                onConnect={() => setConnected(true)}
                onDisconnect={handleDisconnect}
              />

              {/* Tabs */}
              <div className="flex gap-1 border-b border-slate-200">
                {["dashboards", "tasks", "calendar"].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      "text-xs px-3 py-2 border-b-2 font-medium transition-colors capitalize",
                      activeTab === tab
                        ? "border-violet-600 text-violet-700"
                        : "border-transparent text-slate-500 hover:text-slate-700"
                    )}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Dashboards Tab */}
              {activeTab === "dashboards" && (
                <>
                  {/* Pinned dashboards — prominent feature cards */}
                  {pinnedDashboards.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                        Pinned Dashboards
                      </p>
                      <div className="grid grid-cols-1 gap-2">
                        {pinnedDashboards.map((dash) => (
                          <div
                            key={dash.id}
                            className="rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50 to-indigo-50 p-3"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <div
                                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                                  style={{ backgroundColor: "#7B68EE" }}
                                >
                                  <span className="text-white text-xs font-bold">C</span>
                                </div>
                                <span className="text-sm font-semibold text-violet-900 truncate">
                                  {dash.name}
                                </span>
                              </div>
                              <button
                                onClick={() => togglePinDashboard(dash.id, dash.name)}
                                className="shrink-0 text-violet-400 hover:text-violet-600 transition-colors"
                                title="Unpin"
                              >
                                <Star className="h-3.5 w-3.5 fill-violet-500 text-violet-500" />
                              </button>
                            </div>

                            <div className="mt-2.5 flex gap-2">
                              <button
                                onClick={() => { setViewingDash(dash); setIframeBlocked(false); }}
                                className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-medium py-1.5 transition-colors"
                              >
                                <Maximize2 className="h-3 w-3" />
                                View Inline
                              </button>
                              <a
                                href={`https://app.clickup.com/${dash.workspaceId || selectedWorkspace?.id}/dashboards/${dash.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-1 rounded-lg border border-violet-300 text-violet-700 hover:bg-violet-100 text-xs font-medium px-2.5 py-1.5 transition-colors"
                              >
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            </div>

                            {/* Embed URL row */}
                            {editingEmbedFor === dash.id ? (
                              <div className="mt-2 flex gap-1.5">
                                <Input
                                  autoFocus
                                  placeholder="Paste ClickUp share/embed URL…"
                                  value={embedUrlInput}
                                  onChange={(e) => setEmbedUrlInput(e.target.value)}
                                  onKeyDown={(e) => e.key === "Enter" && saveEmbedUrl(dash.id)}
                                  className="h-7 text-xs flex-1"
                                />
                                <button onClick={() => saveEmbedUrl(dash.id)} className="text-xs px-2 rounded bg-violet-600 text-white hover:bg-violet-700">Save</button>
                                <button onClick={() => setEditingEmbedFor(null)} className="text-xs px-1.5 rounded border text-slate-500 hover:bg-slate-100">✕</button>
                              </div>
                            ) : (
                              <button
                                onClick={() => { setEditingEmbedFor(dash.id); setEmbedUrlInput(dash.embedUrl || ""); }}
                                className="mt-1.5 text-xs text-violet-500 hover:text-violet-700 w-full text-left"
                              >
                                {dash.embedUrl ? "Edit embed URL" : "+ Set embed URL for inline view"}
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* All dashboards list */}
                  {dashboardsLoading ? (
                    <div className="space-y-2">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-8 bg-slate-100 rounded animate-pulse" />
                      ))}
                    </div>
                  ) : dashboards.length > 0 ? (
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                        All Dashboards
                      </p>
                      <div className="space-y-1 max-h-52 overflow-y-auto">
                        {dashboards.map((dash) => {
                          const isPinned = pinnedDashboards.some((d) => d.id === dash.id);
                          return (
                            <div
                              key={dash.id}
                              className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 group transition-colors"
                            >
                              <a
                                href={`https://app.clickup.com/${selectedWorkspace?.id}/v/li/dashboard/${dash.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 text-xs font-medium text-slate-700 group-hover:text-violet-700 truncate"
                              >
                                {dash.name}
                              </a>
                              <button
                                onClick={() => togglePinDashboard(dash.id, dash.name)}
                                className="ml-2 shrink-0 text-slate-300 hover:text-violet-600 transition-colors"
                                title={isPinned ? "Unpin" : "Pin to top"}
                              >
                                <Star
                                  className={cn(
                                    "h-3.5 w-3.5",
                                    isPinned && "fill-violet-500 text-violet-500"
                                  )}
                                />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : pinnedDashboards.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-4">
                      No dashboards available
                    </p>
                  ) : null}

                  {/* Add by URL */}
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                      Add Dashboard by URL
                    </p>
                    <div className="flex gap-2">
                      <Input
                        placeholder="https://app.clickup.com/…/dashboards/…"
                        value={urlInput}
                        onChange={(e) => { setUrlInput(e.target.value); setUrlError(""); }}
                        onKeyDown={(e) => e.key === "Enter" && addDashboardByUrl()}
                        className="h-8 text-xs flex-1"
                      />
                      <Button
                        size="sm"
                        className="h-8 px-2 bg-violet-600 hover:bg-violet-700 shrink-0"
                        onClick={addDashboardByUrl}
                        disabled={!urlInput.trim()}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    {urlError && (
                      <p className="text-xs text-red-500 mt-1">{urlError}</p>
                    )}
                  </div>
                </>
              )}

              {/* Tasks Tab */}
              {activeTab === "tasks" && (
                <>
                  <div className="flex gap-2 flex-wrap">
                    {spaces.length > 0 && (
                      <Select value={selectedSpace || ""} onValueChange={loadLists}>
                        <SelectTrigger className="h-8 text-xs w-36">
                          <SelectValue placeholder="Select Space" />
                        </SelectTrigger>
                        <SelectContent>
                          {spaces.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name}
                            </SelectItem>
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
                          {lists.map((l) => (
                            <SelectItem key={l.id} value={l.id}>
                              {l.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  {tasksLoading ? (
                    <div className="space-y-2">
                      {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-8 bg-slate-100 rounded animate-pulse" />
                      ))}
                    </div>
                  ) : tasks.length > 0 ? (
                    <div className="space-y-1.5 max-h-64 overflow-y-auto">
                      {tasks.map((task) => (
                        <a
                          key={task.id}
                          href={task.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-start gap-2 p-2 rounded-lg hover:bg-slate-50 group transition-colors"
                        >
                          <div className="mt-0.5 flex-shrink-0">
                            {statusIcon(task.status?.status)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium text-slate-800 truncate group-hover:text-violet-700">
                              {task.name}
                            </div>
                            {task.due_date && (
                              <div className="text-xs text-slate-400 mt-0.5">
                                Due:{" "}
                                {new Date(
                                  parseInt(task.due_date)
                                ).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                          {task.priority?.priority && (
                            <Badge
                              className={cn(
                                "text-xs flex-shrink-0 py-0",
                                priorityConfig[task.priority.priority]?.color
                              )}
                            >
                              {priorityConfig[task.priority.priority]?.label}
                            </Badge>
                          )}
                        </a>
                      ))}
                    </div>
                  ) : selectedList ? (
                    <p className="text-xs text-slate-400 text-center py-4">
                      No open tasks in this list
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400 text-center py-4">
                      Select a space and list to view tasks
                    </p>
                  )}
                </>
              )}

              {/* Calendar Tab */}
              {activeTab === "calendar" && (
                <ClickUpCalendarView
                  tasks={tasks}
                  selectedList={selectedList}
                  selectedSpace={selectedSpace}
                  selectedWorkspace={selectedWorkspace}
                  invoke={invoke}
                />
              )}
            </>
          )}
        </CardContent>
      )}
    </Card>

    {/* Fullscreen inline dashboard viewer */}
    {viewingDash && (
      <div className="fixed inset-0 z-50 flex flex-col bg-white">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2 bg-slate-900 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded flex items-center justify-center" style={{ backgroundColor: "#7B68EE" }}>
              <span className="text-white text-xs font-bold">C</span>
            </div>
            <span className="text-white font-semibold text-sm">{viewingDash.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={`https://app.clickup.com/${viewingDash.workspaceId || selectedWorkspace?.id}/dashboards/${viewingDash.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white px-2 py-1 rounded hover:bg-white/10 transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open in ClickUp
            </a>
            <button
              onClick={() => { setViewingDash(null); setIframeBlocked(false); }}
              className="text-slate-300 hover:text-white p-1.5 rounded hover:bg-white/10 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* iframe or blocked state */}
        {iframeBlocked || !viewingDash.embedUrl ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-5 bg-slate-50 p-8 text-center">
            <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="h-7 w-7 text-amber-500" />
            </div>
            <div className="max-w-sm">
              <p className="font-semibold text-slate-800 mb-2">Dashboard can't be embedded</p>
              <p className="text-sm text-slate-500 mb-4">
                ClickUp blocks direct embedding. To view this dashboard inline, set a public share URL:
              </p>
              <ol className="text-sm text-slate-600 text-left space-y-1 mb-5 list-decimal list-inside">
                <li>Open the dashboard in ClickUp</li>
                <li>Click <strong>Share</strong> → enable <strong>Public sharing</strong></li>
                <li>Copy the share link and paste it below</li>
              </ol>
              <div className="flex gap-2">
                <Input
                  placeholder="https://sharing.clickup.com/…"
                  value={embedUrlInput}
                  onChange={(e) => setEmbedUrlInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { saveEmbedUrl(viewingDash.id); setViewingDash({ ...viewingDash, embedUrl: embedUrlInput.trim() }); setIframeBlocked(false); }}}
                  className="flex-1 h-9 text-sm"
                />
                <Button
                  className="bg-violet-600 hover:bg-violet-700 h-9 shrink-0"
                  onClick={() => { saveEmbedUrl(viewingDash.id); setViewingDash({ ...viewingDash, embedUrl: embedUrlInput.trim() }); setIframeBlocked(false); }}
                  disabled={!embedUrlInput.trim()}
                >
                  View
                </Button>
              </div>
            </div>
            <a
              href={`https://app.clickup.com/${viewingDash.workspaceId || selectedWorkspace?.id}/dashboards/${viewingDash.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-violet-600 hover:underline"
            >
              <ExternalLink className="h-4 w-4" />
              Open dashboard in ClickUp instead
            </a>
          </div>
        ) : (
          <iframe
            key={viewingDash.embedUrl}
            src={viewingDash.embedUrl}
            className="flex-1 w-full border-0"
            title={viewingDash.name}
            onError={() => setIframeBlocked(true)}
          />
        )}
      </div>
    )}
  </>
  );
}
