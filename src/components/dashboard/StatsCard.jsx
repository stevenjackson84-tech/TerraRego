import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function StatsCard({ title, value, subtitle, icon: Icon, trend, trendDirection, className }) {
  return (
    <Card className={cn(
      "relative overflow-hidden bg-white border-0 shadow-sm hover:shadow-md transition-all duration-300",
      className
    )}>
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-slate-500 tracking-wide uppercase">{title}</p>
            <p className="text-3xl font-semibold text-slate-900 tracking-tight">{value}</p>
            {subtitle && (
              <p className="text-sm text-slate-500">{subtitle}</p>
            )}
          </div>
          {Icon && (
            <div className="p-3 rounded-xl bg-amber-50">
              <Icon className="h-6 w-6 text-amber-600" />
            </div>
          )}
        </div>
        {trend && (
          <div className="mt-4 flex items-center gap-1.5">
            <span className={cn(
              "text-sm font-medium",
              trendDirection === "up" ? "text-emerald-600" : "text-red-500"
            )}>
              {trendDirection === "up" ? "↑" : "↓"} {trend}
            </span>
            <span className="text-sm text-slate-500">vs last month</span>
          </div>
        )}
      </div>
    </Card>
  );
}