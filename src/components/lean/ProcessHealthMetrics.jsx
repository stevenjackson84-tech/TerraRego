import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Clock, Target, Gauge, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { differenceInDays } from "date-fns";

// Convert DPMO to Sigma Level
const dpmoToSigma = (dpmo) => {
  if (dpmo <= 0) return 6.0;
  if (dpmo >= 1000000) return 0;
  // Approximation table
  const table = [
    { dpmo: 3.4, sigma: 6.0 },
    { dpmo: 233, sigma: 5.0 },
    { dpmo: 6210, sigma: 4.0 },
    { dpmo: 66807, sigma: 3.0 },
    { dpmo: 308537, sigma: 2.0 },
    { dpmo: 690000, sigma: 1.0 },
  ];
  for (let i = 0; i < table.length - 1; i++) {
    if (dpmo <= table[i + 1].dpmo) return table[i].sigma;
    if (dpmo <= table[i + 1].dpmo) return table[i + 1].sigma;
  }
  // Linear interpolation
  for (let i = 0; i < table.length - 1; i++) {
    if (dpmo >= table[i].dpmo && dpmo <= table[i + 1].dpmo) {
      const ratio = (dpmo - table[i].dpmo) / (table[i + 1].dpmo - table[i].dpmo);
      return table[i].sigma - ratio * (table[i].sigma - table[i + 1].sigma);
    }
  }
  return 1.0;
};

const sigmaColor = (sigma) => {
  if (sigma >= 5) return "text-emerald-600";
  if (sigma >= 4) return "text-blue-600";
  if (sigma >= 3) return "text-yellow-600";
  return "text-red-600";
};

export default function ProcessHealthMetrics({ deals, tasks }) {
  const metrics = useMemo(() => {
    // 1. Deal conversion rate (prospecting → closed vs dead)
    const closedDeals = deals.filter(d => d.stage === "closed").length;
    const deadDeals = deals.filter(d => d.stage === "dead").length;
    const totalTerminated = closedDeals + deadDeals;
    const conversionRate = totalTerminated > 0 ? (closedDeals / totalTerminated) * 100 : null;

    // 2. Average deal cycle time (contract_date → close_date)
    const dealsWithCycle = deals.filter(d => d.contract_date && d.close_date);
    const avgCycleDays = dealsWithCycle.length > 0
      ? dealsWithCycle.reduce((sum, d) => sum + differenceInDays(new Date(d.close_date), new Date(d.contract_date)), 0) / dealsWithCycle.length
      : null;

    // 3. Task on-time completion rate (defect = overdue or missed due date)
    const completedTasks = tasks.filter(t => t.status === "completed");
    const onTimeTasks = completedTasks.filter(t => {
      if (!t.due_date || !t.completed_date) return true;
      return new Date(t.completed_date) <= new Date(t.due_date);
    });
    const taskOnTimeRate = completedTasks.length > 0
      ? (onTimeTasks.length / completedTasks.length) * 100
      : null;

    // 4. Currently overdue tasks
    const today = new Date();
    const overdueTasks = tasks.filter(t =>
      t.status !== "completed" && t.due_date && new Date(t.due_date) < today
    ).length;

    // 5. Sigma level from task defect rate
    const taskDefectRate = taskOnTimeRate != null ? 100 - taskOnTimeRate : null;
    const taskDPMO = taskDefectRate != null ? taskDefectRate * 10000 : null;
    const taskSigma = taskDPMO != null ? dpmoToSigma(taskDPMO) : null;

    // 6. Pipeline velocity (active deals in pipeline)
    const activeDeals = deals.filter(d => !["closed", "dead"].includes(d.stage)).length;

    // 7. Deal defect rate (dead / total)
    const dealDPMO = totalTerminated > 0 ? (deadDeals / totalTerminated) * 1000000 : null;
    const dealSigma = dealDPMO != null ? dpmoToSigma(dealDPMO) : null;

    return {
      conversionRate,
      avgCycleDays,
      taskOnTimeRate,
      overdueTasks,
      taskSigma,
      dealSigma,
      activeDeals,
      totalDeals: deals.length,
    };
  }, [deals, tasks]);

  const MetricCard = ({ icon: Icon, label, value, sub, sigmaVal, positive = true, color = "slate" }) => (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
          <Icon className="h-4 w-4" />
          <span>{label}</span>
        </div>
        <p className={cn("text-2xl font-bold", value === null ? "text-slate-300" : positive ? "text-emerald-600" : "text-red-600")}>
          {value === null ? "—" : value}
        </p>
        {sigmaVal != null && (
          <p className={cn("text-xs font-semibold mt-1", sigmaColor(sigmaVal))}>
            {sigmaVal.toFixed(1)}σ Sigma Level
          </p>
        )}
        {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <MetricCard
        icon={Target}
        label="Deal Conversion Rate"
        value={metrics.conversionRate != null ? `${metrics.conversionRate.toFixed(1)}%` : null}
        sub="Closed / (Closed + Dead)"
        sigmaVal={metrics.dealSigma}
        positive={metrics.conversionRate >= 50}
      />
      <MetricCard
        icon={Clock}
        label="Avg Deal Cycle Time"
        value={metrics.avgCycleDays != null ? `${Math.round(metrics.avgCycleDays)} days` : null}
        sub="Contract to close"
        positive={metrics.avgCycleDays != null && metrics.avgCycleDays < 180}
      />
      <MetricCard
        icon={CheckCircle2}
        label="Task On-Time Rate"
        value={metrics.taskOnTimeRate != null ? `${metrics.taskOnTimeRate.toFixed(1)}%` : null}
        sub={`${metrics.overdueTasks} currently overdue`}
        sigmaVal={metrics.taskSigma}
        positive={metrics.taskOnTimeRate >= 80}
      />
      <MetricCard
        icon={Gauge}
        label="Active Pipeline"
        value={`${metrics.activeDeals} deals`}
        sub={`${metrics.totalDeals} total deals`}
        positive={true}
      />
    </div>
  );
}