import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2, ExternalLink, Key, AlertCircle, LogOut } from "lucide-react";
import { setClickUpToken, getClickUpToken, clearClickUpToken, isClickUpConnected } from "@/lib/clickupAuth";
import { clickupApi } from "@/lib/clickupApi";

export default function ClickUpConnect({ onConnect, onDisconnect, compact = false }) {
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [connectedUser, setConnectedUser] = useState(null);
  const alreadyConnected = isClickUpConnected();

  const handleConnect = async () => {
    if (!token.trim()) return setError("Please enter your API token.");
    setError("");
    setLoading(true);
    try {
      setClickUpToken(token.trim());
      const data = await clickupApi.validateToken();
      setConnectedUser(data.user);
      onConnect?.(data.user);
    } catch (e) {
      clearClickUpToken();
      setError("Invalid token. Please check and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = () => {
    clearClickUpToken();
    setToken("");
    setConnectedUser(null);
    onDisconnect?.();
  };

  // Already connected from a previous session (no user object yet)
  if (alreadyConnected && !connectedUser) {
    if (compact) {
      return (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-emerald-600">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>ClickUp connected</span>
          </div>
          <button onClick={handleDisconnect} className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1">
            <LogOut className="h-3 w-3" /> Disconnect
          </button>
        </div>
      );
    }
    return (
      <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
        <div className="flex items-center gap-2 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4" />
          <span className="font-medium">ClickUp Connected</span>
        </div>
        <Button variant="ghost" size="sm" className="text-slate-500 h-7 text-xs" onClick={handleDisconnect}>
          <LogOut className="h-3.5 w-3.5 mr-1" /> Disconnect
        </Button>
      </div>
    );
  }

  // Just connected this session
  if (connectedUser) {
    if (compact) {
      return (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-emerald-600">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Connected as <strong>{connectedUser.username}</strong></span>
          </div>
          <button onClick={handleDisconnect} className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1">
            <LogOut className="h-3 w-3" /> Disconnect
          </button>
        </div>
      );
    }
    return (
      <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
        <div className="flex items-center gap-2 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4" />
          <span className="font-medium">Connected as <strong>{connectedUser.username}</strong></span>
        </div>
        <Button variant="ghost" size="sm" className="text-slate-500 h-7 text-xs" onClick={handleDisconnect}>
          <LogOut className="h-3.5 w-3.5 mr-1" /> Disconnect
        </Button>
      </div>
    );
  }

  // Not connected — show connect form
  return (
    <div className="space-y-3 p-4 bg-violet-50 rounded-xl border border-violet-100">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded flex items-center justify-center shrink-0" style={{ backgroundColor: "#7B68EE" }}>
          <span className="text-white text-xs font-bold">C</span>
        </div>
        <p className="text-sm font-semibold text-violet-900">Connect ClickUp</p>
      </div>

      <p className="text-xs text-violet-700">
        Enter your Personal API Token to sync tasks and dashboards.
      </p>

      <a
        href="https://app.clickup.com/settings/apps"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-xs text-violet-600 hover:text-violet-800 hover:underline"
      >
        <Key className="h-3 w-3" />
        Get token: ClickUp Settings → Apps
        <ExternalLink className="h-3 w-3" />
      </a>

      <div className="space-y-2">
        <Input
          type="password"
          placeholder="pk_xxxxxxxxxx..."
          value={token}
          onChange={(e) => setToken(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleConnect()}
          className="text-sm h-9 bg-white"
        />
        {error && (
          <p className="text-xs text-red-600 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {error}
          </p>
        )}
        <Button
          onClick={handleConnect}
          disabled={loading || !token.trim()}
          className="w-full bg-violet-600 hover:bg-violet-700 h-9"
        >
          {loading ? "Connecting..." : "Connect ClickUp"}
        </Button>
      </div>
    </div>
  );
}
