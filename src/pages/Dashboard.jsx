import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Building2, Users, ClipboardList, DollarSign, TrendingUp, Settings, GripVertical, Move } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { cn } from "@/lib/utils";
import StatsCard from "@/components/dashboard/StatsCard";
import DealPipelineChart from "@/components/dashboard/DealPipelineChart";
import RecentActivity from "@/components/dashboard/RecentActivity";
import UpcomingTasks from "@/components/dashboard/UpcomingTasks";
import QuarterlyDealsWidget from "@/components/dashboard/QuarterlyDealsWidget";
import AvgProfitByTypeWidget from "@/components/dashboard/AvgProfitByTypeWidget";
import TaskNotifications from "@/components/tasks/TaskNotifications";
import ClickUpWidget from "@/components/clickup/ClickUpWidget";
import DashboardCustomizer from "@/components/dashboard/DashboardCustomizer";
import FinancialKPIsWidget from "@/components/dashboard/FinancialKPIsWidget";
import FinancialChartsWidget from "@/components/dashboard/FinancialChartsWidget";
import PerformanceRankingsWidget from "@/components/dashboard/PerformanceRankingsWidget";
import BidVsBudgetWidget from "@/components/dashboard/BidVsBudgetWidget";

const DEFAULT_SECTION_ORDER = [
  'stats', 'kpiRow', 'taskNotifications', 'clickUp',
  'chartsRow', 'upcomingTasks',
  'financialKPIs', 'financialCharts', 'performanceRankings', 'bidVsBudget'
];

// Which enabled widget IDs belong to each section
const SECTION_WIDGETS = {
  stats: ['stats'],
  kpiRow: ['quarterly', 'profitByType'],
  taskNotifications: ['taskNotifications'],
  clickUp: ['clickUp'],
  chartsRow: ['pipeline', 'recentActivity'],
  upcomingTasks: ['upcomingTasks'],
  financialKPIs: ['financialKPIs'],
  financialCharts: ['financialCharts'],
  performanceRankings: ['performanceRankings'],
  bidVsBudget: ['bidVsBudget'],
};

const SECTION_LABELS = {
  stats: 'Key Metrics',
  kpiRow: 'Quarterly & Profit Widgets',
  taskNotifications: 'Task Notifications',
  clickUp: 'ClickUp',
  chartsRow: 'Pipeline Chart & Activity',
  upcomingTasks: 'Upcoming Tasks',
  financialKPIs: 'Financial KPIs',
  financialCharts: 'Financial Charts',
  performanceRankings: 'Performance Rankings',
  bidVsBudget: 'Bid vs. Budget',
};

export default function Dashboard() {
  const queryClient = useQueryClient();
  const [customizerOpen, setCustomizerOpen] = useState(false);
  const [reorderMode, setReorderMode] = useState(false);
  const [enabledWidgets, setEnabledWidgets] = useState([
    'stats', 'quarterly', 'profitByType', 'taskNotifications', 'clickUp', 'pipeline', 'recentActivity', 'upcomingTasks'
  ]);
  const [sectionOrder, setSectionOrder] = useState(DEFAULT_SECTION_ORDER);

  useEffect(() => {
    const loadUser = async () => {
      const u = await base44.auth.me();
      if (u?.dashboard_widgets) setEnabledWidgets(u.dashboard_widgets);
      if (u?.dashboard_section_order) setSectionOrder(u.dashboard_section_order);
    };
    loadUser();
  }, []);

  const { data: deals = [] } = useQuery({ queryKey: ['deals'], queryFn: () => base44.entities.Deal.list('-created_date') });
  const { data: contacts = [] } = useQuery({ queryKey: ['contacts'], queryFn: () => base44.entities.Contact.list('-created_date') });
  const { data: tasks = [] } = useQuery({ queryKey: ['tasks'], queryFn: () => base44.entities.Task.list('-created_date') });
  const { data: activities = [] } = useQuery({ queryKey: ['activities'], queryFn: () => base44.entities.Activity.list('-created_date', 10) });
  const { data: entitlements = [] } = useQuery({ queryKey: ['entitlements'], queryFn: () => base44.entities.Entitlement.list('-created_date') });
  const { data: proformas = [] } = useQuery({ queryKey: ['proformas'], queryFn: () => base44.entities.Proforma.list() });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Task.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] })
  });

  const handleToggleTask = (task) => {
    updateTaskMutation.mutate({
      id: task.id,
      data: {
        status: task.status === 'completed' ? 'todo' : 'completed',
        completed_date: task.status === 'completed' ? null : new Date().toISOString().split('T')[0]
      }
    });
  };

  const handleWidgetSave = async (selected) => {
    setEnabledWidgets(selected);
    await base44.auth.updateMe({ dashboard_widgets: selected, dashboard_section_order: sectionOrder });
  };

  const handleDragEnd = async (result) => {
    if (!result.destination) return;
    const newOrder = Array.from(sectionOrder);
    const [moved] = newOrder.splice(result.source.index, 1);
    newOrder.splice(result.destination.index, 0, moved);
    setSectionOrder(newOrder);
    await base44.auth.updateMe({ dashboard_section_order: newOrder });
  };

  const activeDeals = deals.filter(d => !['closed', 'dead'].includes(d.stage));
  const totalPipelineValue = activeDeals.reduce((sum, d) => sum + (d.estimated_value || 0), 0);
  const totalPipelineLots = activeDeals.reduce((sum, d) => sum + (d.number_of_lots || 0), 0);
  const pendingTasks = tasks.filter(t => t.status !== 'completed').length;
  const pendingEntitlements = entitlements.filter(e => !['approved', 'denied', 'expired'].includes(e.status)).length;

  const isSectionVisible = (sectionId) =>
    (SECTION_WIDGETS[sectionId] || []).some(w => enabledWidgets.includes(w));

  const renderSection = (sectionId) => {
    switch (sectionId) {
      case 'stats':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <StatsCard title="Active Deals" value={activeDeals.length} icon={Building2} subtitle={`${deals.filter(d => d.stage === 'prospecting').length} in prospecting`} />
            <StatsCard title="Pipeline Value" value={`$${(totalPipelineValue / 1000000).toFixed(1)}M`} icon={DollarSign} trend="12%" trendDirection="up" />
            <StatsCard title="Pipeline Lots" value={totalPipelineLots.toLocaleString()} icon={TrendingUp} subtitle="Total lot count" />
            <StatsCard title="Contacts" value={contacts.length} icon={Users} subtitle={`${contacts.filter(c => c.contact_type === 'landowner').length} landowners`} />
            <StatsCard title="Pending Tasks" value={pendingTasks} icon={ClipboardList} subtitle={`${pendingEntitlements} entitlements in progress`} />
          </div>
        );
      case 'kpiRow':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {enabledWidgets.includes('quarterly') && <QuarterlyDealsWidget deals={deals} />}
            {enabledWidgets.includes('profitByType') && <AvgProfitByTypeWidget deals={deals} proformas={proformas} />}
          </div>
        );
      case 'taskNotifications':
        return <TaskNotifications />;
      case 'clickUp':
        return <ClickUpWidget />;
      case 'chartsRow':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {enabledWidgets.includes('pipeline') && (
              <div className="lg:col-span-2"><DealPipelineChart deals={deals} /></div>
            )}
            {enabledWidgets.includes('recentActivity') && (
              <div><RecentActivity activities={activities} deals={deals} /></div>
            )}
          </div>
        );
      case 'upcomingTasks':
        return <UpcomingTasks tasks={tasks} deals={deals} onToggleTask={handleToggleTask} />;
      case 'financialKPIs':
        return <FinancialKPIsWidget deals={deals} proformas={proformas} />;
      case 'financialCharts':
        return <FinancialChartsWidget deals={deals} proformas={proformas} />;
      case 'performanceRankings':
        return <PerformanceRankingsWidget deals={deals} proformas={proformas} />;
      default:
        return null;
    }
  };

  const visibleSections = sectionOrder.filter(isSectionVisible);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
            <p className="text-slate-500 mt-1">Overview of your land development portfolio</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={reorderMode ? "default" : "outline"}
              onClick={() => setReorderMode(!reorderMode)}
              className={cn("flex items-center gap-2", reorderMode && "bg-blue-600 hover:bg-blue-700 text-white")}
            >
              <Move className="h-4 w-4" />
              {reorderMode ? "Done Reordering" : "Reorder"}
            </Button>
            <Button variant="outline" onClick={() => setCustomizerOpen(true)} className="flex items-center gap-2">
              <Settings className="h-4 w-4" /> Customize
            </Button>
          </div>
        </div>

        {reorderMode && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700 flex items-center gap-2">
            <GripVertical className="h-4 w-4" />
            Drag the handles on each widget to reorder them. Click "Done Reordering" when finished.
          </div>
        )}

        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="dashboard" isDropDisabled={!reorderMode}>
            {(provided) => (
              <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-8">
                {visibleSections.map((sectionId, index) => (
                  <Draggable key={sectionId} draggableId={sectionId} index={index} isDragDisabled={!reorderMode}>
                    {(drag, snapshot) => (
                      <div
                        ref={drag.innerRef}
                        {...drag.draggableProps}
                        className={cn(
                          "relative",
                          reorderMode && "rounded-xl border-2 border-dashed p-4 transition-colors",
                          reorderMode && snapshot.isDragging && "border-blue-400 bg-blue-50 shadow-lg",
                          reorderMode && !snapshot.isDragging && "border-slate-300 bg-slate-50/50 hover:border-blue-300"
                        )}
                      >
                        {reorderMode && (
                          <div
                            {...drag.dragHandleProps}
                            className="absolute top-2 right-2 flex items-center gap-1.5 px-2 py-1 bg-white border border-slate-200 rounded-md shadow-sm cursor-grab active:cursor-grabbing z-10"
                          >
                            <GripVertical className="h-4 w-4 text-slate-400" />
                            <span className="text-xs text-slate-500 font-medium">{SECTION_LABELS[sectionId]}</span>
                          </div>
                        )}
                        {!reorderMode && <div {...drag.dragHandleProps} />}
                        {renderSection(sectionId)}
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>

      <DashboardCustomizer
        open={customizerOpen}
        onOpenChange={setCustomizerOpen}
        onSave={handleWidgetSave}
        enabledWidgets={enabledWidgets}
      />
    </div>
  );
}