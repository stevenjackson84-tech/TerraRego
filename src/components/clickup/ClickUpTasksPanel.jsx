import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, Circle, Clock, AlertCircle, RefreshCw, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { isClickUpConnected } from "@/lib/clickupAuth";
import { clickupApi } from "@/lib/clickupApi";
import ClickUpConnect from "./ClickUpConnect";

const priorityConfig = {
  1: { label: "Urgent", color: "bg-red-100 text-red-700" },
  2: { label: "High", color: "bg-orange-100 text-orange-700" },
  3: { label: "Normal", color: "bg-blue-100 text-blue-700" },
  4: { label: "Low", color: "bg-slate-100 text-slate-600" },
};

const statusColorMap = {
  complete: "bg-emerald-100 text-emerald-700",
  closed: "bg-emerald-100 text-emerald-700",
  done: "bg-emerald-100 text-emerald-700",
  "in progress": "bg-blue-100 text-blue-700",
  "in review": "bg-blue-100 text-blue-700",
  blocked: "bg-red-100 text-red-700",
};

function StatusIcon({ status }) {
  const s = status?.toLowerCase();
  if (s === "complete" || s === "closed" || s === "done")
    return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
  if (s === "in progress" || s === "in review")
    return <Clock className="h-4 w-4 text-blue-500" />;
  if (s === "blocked")
    return <AlertCircle className="h-4 w-4 text-red-500" />;
  return <Circle className="h-4 w-4 text-slate-400" />;
}

export default function ClickUpTasksPanel() {
  const [connected, setConnected] = useState(isClickUpConnected());
  const [workspaces, setWorkspaces] = useState([]);
  const [spaces, setSpaces] = useState([]);
  const [lists, setLists] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState(null);
  const [selectedSpace, setSelectedSpace] = useState(null);
  const [selectedList, setSelectedList] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tasksLoading, setTasksLoading] = useState(false);

  useEffect(() => {
    if (!connected) return;
    setLoading(true);
    clickupApi
      .getWorkspaces()
      .then((data) => {
        const teams = data.teams || [];
        setWorkspaces(teams);
        if (teams.length > 0) {
          setSelectedWorkspace(teams[0]);
          return clickupApi.getSpaces(teams[0].id);
        }
      })
      .then((data) => {
        if (data) setSpaces(data.spaces || []);
      })
      .catch((e) => console.warn("ClickUp load error:", e))
      .finally(() => setLoading(false));
  }, [connected]);

  const handleSpaceChange = async (spaceId) => {
    setSelectedSpace(spaceId);
    setSelectedList(null);
    setTasks([]);
    const data = await clickupApi
      .getFolderlessLists(spaceId)
      .catch(() => ({ lists: [] }));
    setLists(data.lists || []);
  };

  const handleListChange = async (listId) => {
    setSelectedList(listId);
    setTasksLoading(true);
    const data = await clickupApi
      .getTasks(listId)
      .catch(() => ({ tasks: [] }));
    setTasks(data.tasks || []);
    setTasksLoading(false);
  };

  const refresh = () => {
    if (selectedList) handleListChange(selectedList);
  };

  if (!connected) {
    return (
      <div className="max-w-md mx-auto mt-8">
        <ClickUpConnect onConnect={() => setConnected(true)} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <ClickUpConnect
          compact
          onConnect={() => setConnected(true)}
          onDisconnect={() => {
            setConnected(false);
            setSpaces([]);
            setLists([]);
            setTasks([]);
          }}
        />

        {spaces.length > 0 && (
          <Select value={selectedSpace || ""} onValueChange={handleSpaceChange}>
            <SelectTrigger className="h-9 text-sm w-44">
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
          <Select value={selectedList || ""} onValueChange={handleListChange}>
            <SelectTrigger className="h-9 text-sm w-48">
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

        {selectedList && (
          <Button
            variant="outline"
            size="sm"
            className="h-9"
            onClick={refresh}
            disabled={tasksLoading}
          >
            <RefreshCw className={cn("h-4 w-4 mr-1.5", tasksLoading && "animate-spin")} />
            Refresh
          </Button>
        )}

        {selectedWorkspace && (
          <a
            href={`https://app.clickup.com/${selectedWorkspace.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto flex items-center gap-1.5 text-sm text-violet-600 hover:text-violet-800"
          >
            <ExternalLink className="h-4 w-4" />
            Open ClickUp
          </a>
        )}
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-2 text-slate-500 py-12">
          <RefreshCw className="h-5 w-5 animate-spin" />
          Loading workspaces...
        </div>
      )}

      {tasksLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-slate-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : tasks.length > 0 ? (
        <div className="space-y-3">
          {tasks.map((task) => (
            <Card key={task.id} className="border-0 shadow-sm p-4">
              <div className="flex items-start gap-4">
                <div className="mt-0.5 shrink-0">
                  <StatusIcon status={task.status?.status} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h3 className="font-medium text-slate-900">{task.name}</h3>
                      {task.description && (
                        <p className="text-sm text-slate-500 mt-1 line-clamp-2">
                          {task.description}
                        </p>
                      )}
                    </div>
                    <a
                      href={task.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-400 hover:text-violet-600 shrink-0"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>

                  <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                    {task.status?.status && (
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-xs capitalize",
                          statusColorMap[task.status.status.toLowerCase()] ||
                            "bg-slate-100 text-slate-600"
                        )}
                      >
                        {task.status.status}
                      </Badge>
                    )}
                    {task.priority?.priority && (
                      <Badge
                        className={cn(
                          "text-xs",
                          priorityConfig[task.priority.priority]?.color
                        )}
                      >
                        {priorityConfig[task.priority.priority]?.label}
                      </Badge>
                    )}
                    {task.due_date && (
                      <span className="text-xs text-slate-500">
                        Due:{" "}
                        {new Date(parseInt(task.due_date)).toLocaleDateString()}
                      </span>
                    )}
                    {task.list?.name && (
                      <span className="text-xs text-violet-600 font-medium">
                        {task.list.name}
                      </span>
                    )}
                    {task.assignees?.length > 0 && (
                      <span className="text-xs text-slate-500">
                        @{task.assignees[0].username}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : selectedList ? (
        <div className="text-center py-12 text-slate-500">
          No open tasks in this list.
        </div>
      ) : !loading ? (
        <div className="text-center py-12 text-slate-500">
          Select a space and list above to view your ClickUp tasks.
        </div>
      ) : null}
    </div>
  );
}
