import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ExternalLink, Send } from "lucide-react";

export default function SendToClickUp({ parcelInfo, location }) {
  const [open, setOpen] = useState(false);
  const [workspaces, setWorkspaces] = useState([]);
  const [spaces, setSpaces] = useState([]);
  const [lists, setLists] = useState([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState(null);
  const [selectedSpace, setSelectedSpace] = useState(null);
  const [selectedList, setSelectedList] = useState(null);
  const [taskName, setTaskName] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingLists, setLoadingLists] = useState(false);
  const [success, setSuccess] = useState(false);
  const [createdTask, setCreatedTask] = useState(null);

  const invoke = (action, params = {}) =>
    base44.functions.invoke("clickup", { action, ...params }).then(r => r.data);

  const openDialog = async () => {
    setOpen(true);
    setSuccess(false);
    setCreatedTask(null);
    // Pre-fill task name
    const addr = location ? `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}` : "";
    setTaskName(`Parcel Analysis${addr ? ` - ${addr}` : ""}`);

    const data = await invoke("getWorkspaces");
    const teams = data.teams || [];
    setWorkspaces(teams);
    if (teams.length > 0) {
      setSelectedWorkspace(teams[0].id);
      const sData = await invoke("getSpaces", { teamId: teams[0].id });
      setSpaces(sData.spaces || []);
    }
  };

  const loadLists = async (spaceId) => {
    setSelectedSpace(spaceId);
    setSelectedList(null);
    setLoadingLists(true);
    const data = await invoke("getFolderlessLists", { spaceId });
    setLists(data.lists || []);
    setLoadingLists(false);
  };

  const buildDescription = () => {
    if (!parcelInfo) return "";
    const lines = [
      `📍 **Location:** ${location?.lat?.toFixed(5)}, ${location?.lng?.toFixed(5)}`,
      `📐 **Parcel Size:** ${parcelInfo.parcel_size_acres?.toFixed(2)} acres`,
      `🏷️ **Zoning:** ${parcelInfo.zoning || "—"}`,
      `🏗️ **Land Use:** ${parcelInfo.land_use || "—"}`,
      `💰 **Value/Acre:** $${parcelInfo.estimated_value_per_acre?.toLocaleString() || "—"}`,
      `📊 **Development Potential:** ${parcelInfo.development_potential || "—"}`,
      parcelInfo.owner_name ? `👤 **Owner:** ${parcelInfo.owner_name}` : null,
      parcelInfo.parcel_id ? `🔑 **Parcel ID:** ${parcelInfo.parcel_id}` : null,
      "",
      `**Observations:**\n${parcelInfo.observations || "—"}`,
      parcelInfo.opportunities ? `\n**Opportunities:**\n${parcelInfo.opportunities}` : null,
      parcelInfo.risks ? `\n**Risks:**\n${parcelInfo.risks}` : null,
      "",
      `*Created from Parcelr GIS Map*`,
    ];
    return lines.filter(Boolean).join("\n");
  };

  const createTask = async () => {
    if (!selectedList || !taskName) return;
    setLoading(true);
    const data = await invoke("createTask", {
      listId: selectedList,
      name: taskName,
      description: buildDescription(),
      priority: 3,
    });
    setCreatedTask(data);
    setSuccess(true);
    setLoading(false);
  };

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="w-full text-xs h-7 border-violet-200 text-violet-700 hover:bg-violet-50"
        onClick={openDialog}
      >
        <Send className="h-3 w-3 mr-1" />
        Send to ClickUp
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-5 h-5 rounded flex items-center justify-center" style={{ backgroundColor: "#7B68EE" }}>
                <span className="text-white text-xs font-bold">C</span>
              </div>
              Send Parcel to ClickUp
            </DialogTitle>
          </DialogHeader>

          {success && createdTask ? (
            <div className="py-4 text-center space-y-3">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <span className="text-2xl">✓</span>
              </div>
              <p className="font-medium text-slate-800">Task created!</p>
              <a
                href={createdTask.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-violet-600 hover:underline"
              >
                View in ClickUp <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label className="text-xs">Task Name</Label>
                <Input value={taskName} onChange={e => setTaskName(e.target.value)} className="mt-1 text-sm" />
              </div>

              {spaces.length > 0 && (
                <div>
                  <Label className="text-xs">Space</Label>
                  <Select value={selectedSpace || ""} onValueChange={loadLists}>
                    <SelectTrigger className="mt-1 text-sm">
                      <SelectValue placeholder="Select a space..." />
                    </SelectTrigger>
                    <SelectContent>
                      {spaces.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {lists.length > 0 && (
                <div>
                  <Label className="text-xs">List</Label>
                  <Select value={selectedList || ""} onValueChange={setSelectedList}>
                    <SelectTrigger className="mt-1 text-sm">
                      <SelectValue placeholder="Select a list..." />
                    </SelectTrigger>
                    <SelectContent>
                      {lists.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {loadingLists && <p className="text-xs text-slate-400">Loading lists...</p>}
            </div>
          )}

          {!success && (
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)} size="sm">Cancel</Button>
              <Button
                onClick={createTask}
                disabled={!selectedList || !taskName || loading}
                size="sm"
                className="bg-violet-600 hover:bg-violet-700 text-white"
              >
                {loading ? "Creating..." : "Create Task"}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}