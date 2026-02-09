import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Building2, Users, ClipboardList, FileCheck, DollarSign, TrendingUp } from "lucide-react";
import StatsCard from "@/components/dashboard/StatsCard";
import DealPipelineChart from "@/components/dashboard/DealPipelineChart";
import RecentActivity from "@/components/dashboard/RecentActivity";
import UpcomingTasks from "@/components/dashboard/UpcomingTasks";
import QuarterlyDealsWidget from "@/components/dashboard/QuarterlyDealsWidget";
import AvgProfitByTypeWidget from "@/components/dashboard/AvgProfitByTypeWidget";

export default function Dashboard() {
  const queryClient = useQueryClient();

  const { data: deals = [] } = useQuery({
    queryKey: ['deals'],
    queryFn: () => base44.entities.Deal.list('-created_date')
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts'],
    queryFn: () => base44.entities.Contact.list('-created_date')
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list('-created_date')
  });

  const { data: activities = [] } = useQuery({
    queryKey: ['activities'],
    queryFn: () => base44.entities.Activity.list('-created_date', 10)
  });

  const { data: entitlements = [] } = useQuery({
    queryKey: ['entitlements'],
    queryFn: () => base44.entities.Entitlement.list('-created_date')
  });

  const { data: proformas = [] } = useQuery({
    queryKey: ['proformas'],
    queryFn: () => base44.entities.Proforma.list()
  });

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

  // Calculate stats
  const activeDeals = deals.filter(d => !['closed', 'dead'].includes(d.stage));
  const totalPipelineValue = activeDeals.reduce((sum, d) => sum + (d.estimated_value || 0), 0);
  const totalPipelineLots = activeDeals.reduce((sum, d) => sum + (d.number_of_lots || 0), 0);
  const pendingTasks = tasks.filter(t => t.status !== 'completed').length;
  const pendingEntitlements = entitlements.filter(e => !['approved', 'denied', 'expired'].includes(e.status)).length;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
          <p className="text-slate-500 mt-1">Overview of your land development portfolio</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <StatsCard
            title="Active Deals"
            value={activeDeals.length}
            icon={Building2}
            subtitle={`${deals.filter(d => d.stage === 'prospecting').length} in prospecting`}
          />
          <StatsCard
            title="Pipeline Value"
            value={`$${(totalPipelineValue / 1000000).toFixed(1)}M`}
            icon={DollarSign}
            trend="12%"
            trendDirection="up"
          />
          <StatsCard
            title="Pipeline Lots"
            value={totalPipelineLots.toLocaleString()}
            icon={TrendingUp}
            subtitle="Total lot count"
          />
          <StatsCard
            title="Contacts"
            value={contacts.length}
            icon={Users}
            subtitle={`${contacts.filter(c => c.contact_type === 'landowner').length} landowners`}
          />
          <StatsCard
            title="Pending Tasks"
            value={pendingTasks}
            icon={ClipboardList}
            subtitle={`${pendingEntitlements} entitlements in progress`}
          />
        </div>

        {/* KPI Widgets */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <QuarterlyDealsWidget deals={deals} />
          <AvgProfitByTypeWidget deals={deals} proformas={proformas} />
        </div>

        {/* Charts and Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <DealPipelineChart deals={deals} />
          </div>
          <div>
            <RecentActivity activities={activities} deals={deals} />
          </div>
        </div>

        {/* Tasks Section */}
        <div className="mt-6">
          <UpcomingTasks tasks={tasks} deals={deals} onToggleTask={handleToggleTask} />
        </div>
      </div>
    </div>
  );
}