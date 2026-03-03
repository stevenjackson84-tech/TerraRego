import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Settings, Eye, EyeOff } from "lucide-react";

const AVAILABLE_WIDGETS = [
  { id: 'stats', label: 'Key Metrics (Stats Cards)', category: 'overview' },
  { id: 'quarterly', label: 'Quarterly Deals', category: 'market' },
  { id: 'profitByType', label: 'Profit by Product Type', category: 'performance' },
  { id: 'pipeline', label: 'Deal Pipeline Chart', category: 'deals' },
  { id: 'recentActivity', label: 'Recent Activity', category: 'activity' },
  { id: 'upcomingTasks', label: 'Upcoming Tasks', category: 'tasks' },
  { id: 'taskNotifications', label: 'Task Notifications', category: 'tasks' },
  { id: 'clickUp', label: 'ClickUp Integration', category: 'integration' },
  { id: 'financialKPIs', label: 'Financial KPIs Overview', category: 'financial' },
  { id: 'financialCharts', label: 'Profit & Margin Charts', category: 'financial' },
  { id: 'performanceRankings', label: 'Deal Performance Rankings', category: 'financial' },
];

export default function DashboardCustomizer({ open, onOpenChange, onSave, enabledWidgets = [] }) {
  const [selected, setSelected] = useState(new Set(enabledWidgets));
  const [saving, setSaving] = useState(false);

  const handleToggle = (widgetId) => {
    const newSelected = new Set(selected);
    if (newSelected.has(widgetId)) {
      newSelected.delete(widgetId);
    } else {
      newSelected.add(widgetId);
    }
    setSelected(newSelected);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const user = await base44.auth.me();
      await base44.auth.updateMe({
        dashboard_widgets: Array.from(selected)
      });
      onSave(Array.from(selected));
      onOpenChange(false);
    } catch (e) {
      console.error('Failed to save dashboard preferences:', e);
    } finally {
      setSaving(false);
    }
  };

  const categories = ['overview', 'market', 'performance', 'deals', 'activity', 'tasks', 'financial', 'integration'];
  const categoryLabels = {
    overview: 'Overview',
    market: 'Market Insights',
    performance: 'Performance',
    deals: 'Deals',
    activity: 'Activity',
    tasks: 'Tasks',
    financial: '💰 Financial Dashboard',
    integration: 'Integrations'
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Customize Dashboard
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 max-h-96 overflow-y-auto py-4">
          {categories.map(category => {
            const categoryWidgets = AVAILABLE_WIDGETS.filter(w => w.category === category);
            return (
              <div key={category}>
                <h3 className="text-sm font-semibold text-slate-900 mb-3">{categoryLabels[category]}</h3>
                <div className="space-y-2 ml-2">
                  {categoryWidgets.map(widget => (
                    <div key={widget.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={widget.id}
                        checked={selected.has(widget.id)}
                        onCheckedChange={() => handleToggle(widget.id)}
                      />
                      <Label htmlFor={widget.id} className="font-normal cursor-pointer flex items-center gap-2">
                        {selected.has(widget.id) ? (
                          <Eye className="h-3.5 w-3.5 text-blue-600" />
                        ) : (
                          <EyeOff className="h-3.5 w-3.5 text-slate-400" />
                        )}
                        {widget.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-slate-900 hover:bg-slate-800">
            {saving ? 'Saving...' : 'Save Preferences'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}