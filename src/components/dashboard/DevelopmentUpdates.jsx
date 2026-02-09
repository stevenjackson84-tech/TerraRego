import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Calendar, TrendingUp, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const statusConfig = {
  planned: { color: "bg-slate-100 text-slate-700", icon: Clock },
  in_progress: { color: "bg-blue-100 text-blue-700", icon: TrendingUp },
  completed: { color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
  delayed: { color: "bg-red-100 text-red-700", icon: AlertCircle },
  on_hold: { color: "bg-amber-100 text-amber-700", icon: AlertCircle }
};

const categoryIcons = {
  site_work: "🏗️",
  foundation: "🧱",
  framing: "🏛️",
  utilities: "⚡",
  infrastructure: "🛣️",
  landscaping: "🌳",
  permits: "📋",
  inspection: "🔍",
  other: "📌"
};

export default function DevelopmentUpdates({ updates, deals }) {
  const getDealName = (dealId) => {
    const deal = deals?.find(d => d.id === dealId);
    return deal?.name || 'Unknown Deal';
  };

  const activeUpdates = updates
    .filter(u => u.status !== 'completed')
    .sort((a, b) => {
      if (a.status === 'in_progress' && b.status !== 'in_progress') return -1;
      if (a.status !== 'in_progress' && b.status === 'in_progress') return 1;
      return new Date(a.target_date) - new Date(b.target_date);
    })
    .slice(0, 5);

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold text-slate-900">Development Updates</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activeUpdates.map((update) => {
            const StatusIcon = statusConfig[update.status].icon;
            
            return (
              <div key={update.id} className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{categoryIcons[update.category]}</span>
                      <h4 className="font-medium text-slate-900 text-sm line-clamp-1">
                        {update.milestone}
                      </h4>
                    </div>
                    <p className="text-xs text-amber-600 font-medium mt-0.5">
                      {getDealName(update.deal_id)}
                    </p>
                  </div>
                  <Badge variant="secondary" className={cn("text-xs shrink-0 flex items-center gap-1", statusConfig[update.status].color)}>
                    <StatusIcon className="h-3 w-3" />
                    {update.status.replace('_', ' ')}
                  </Badge>
                </div>

                {update.progress_percentage !== null && update.progress_percentage !== undefined && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Progress</span>
                      <span className="font-medium text-slate-700">{update.progress_percentage}%</span>
                    </div>
                    <Progress value={update.progress_percentage} className="h-1.5" />
                  </div>
                )}

                {update.target_date && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Calendar className="h-3 w-3" />
                    <span>Target: {format(new Date(update.target_date), 'MMM d, yyyy')}</span>
                  </div>
                )}

                {update.description && (
                  <p className="text-xs text-slate-600 line-clamp-2">{update.description}</p>
                )}
              </div>
            );
          })}
          
          {activeUpdates.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-8">No active development updates</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}