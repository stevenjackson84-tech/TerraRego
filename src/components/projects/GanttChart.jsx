import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";

export default function GanttChart({ phases, milestones }) {
  // Find earliest and latest dates
  const allDates = [
    ...phases.map(p => p.start_date).filter(Boolean),
    ...phases.map(p => p.end_date).filter(Boolean),
    ...milestones.map(m => m.due_date).filter(Boolean)
  ];

  if (allDates.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-12 text-center">
          <p className="text-slate-500">No timeline data available. Add phases with dates to see the Gantt chart.</p>
        </CardContent>
      </Card>
    );
  }

  const earliestDate = new Date(Math.min(...allDates.map(d => new Date(d))));
  const latestDate = new Date(Math.max(...allDates.map(d => new Date(d))));
  const totalDays = differenceInDays(latestDate, earliestDate) || 1;

  const getBarPosition = (startDate, endDate) => {
    if (!startDate || !endDate) return { left: 0, width: 0 };
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    const daysFromStart = differenceInDays(start, earliestDate);
    const duration = differenceInDays(end, start);
    
    return {
      left: `${(daysFromStart / totalDays) * 100}%`,
      width: `${(duration / totalDays) * 100}%`
    };
  };

  const statusColors = {
    not_started: "bg-slate-400",
    in_progress: "bg-blue-500",
    completed: "bg-emerald-500",
    blocked: "bg-red-500",
    pending: "bg-slate-400",
    overdue: "bg-red-500"
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle>Project Timeline</CardTitle>
        <p className="text-sm text-slate-500">
          {format(earliestDate, 'MMM d, yyyy')} - {format(latestDate, 'MMM d, yyyy')}
        </p>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-6">
          {/* Phases */}
          {phases.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-900 mb-4">Phases</h3>
              <div className="space-y-3">
                {phases.sort((a, b) => (a.order || 0) - (b.order || 0)).map(phase => {
                  const position = getBarPosition(phase.start_date, phase.end_date);
                  
                  return (
                    <div key={phase.id} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="font-medium text-slate-900 truncate">{phase.name}</span>
                          <Badge variant="outline" className="text-xs shrink-0">
                            {phase.status}
                          </Badge>
                        </div>
                        {phase.start_date && phase.end_date && (
                          <span className="text-xs text-slate-500 ml-4 shrink-0">
                            {format(new Date(phase.start_date), 'MMM d')} - {format(new Date(phase.end_date), 'MMM d')}
                          </span>
                        )}
                      </div>
                      <div className="relative h-8 bg-slate-100 rounded-lg overflow-hidden">
                        {phase.start_date && phase.end_date && (
                          <div
                            className={cn(
                              "absolute h-full rounded transition-all",
                              statusColors[phase.status] || "bg-slate-400"
                            )}
                            style={{
                              left: position.left,
                              width: position.width,
                              minWidth: '2px'
                            }}
                          >
                            <div className="h-full flex items-center justify-center text-xs text-white font-medium px-2">
                              {differenceInDays(new Date(phase.end_date), new Date(phase.start_date))}d
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Milestones */}
          {milestones.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-900 mb-4">Milestones</h3>
              <div className="space-y-3">
                {milestones
                  .filter(m => m.due_date)
                  .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
                  .map(milestone => {
                    const daysFromStart = differenceInDays(new Date(milestone.due_date), earliestDate);
                    const position = (daysFromStart / totalDays) * 100;
                    
                    return (
                      <div key={milestone.id} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span className="font-medium text-slate-900 truncate">{milestone.name}</span>
                            <Badge variant="outline" className="text-xs shrink-0">
                              {milestone.status}
                            </Badge>
                          </div>
                          <span className="text-xs text-slate-500 ml-4 shrink-0">
                            {format(new Date(milestone.due_date), 'MMM d, yyyy')}
                          </span>
                        </div>
                        <div className="relative h-6 bg-slate-100 rounded-lg overflow-hidden">
                          <div
                            className="absolute w-1 h-full bg-amber-500"
                            style={{ left: `${position}%` }}
                          />
                          <div
                            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-amber-500 rounded-full border-2 border-white shadow-sm"
                            style={{ left: `calc(${position}% - 6px)` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}