import { useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { format, addDays, differenceInDays, startOfMonth, endOfMonth, eachMonthOfInterval, isToday, parseISO } from "date-fns";

const STATUS_COLORS = {
  planned:     { bar: "bg-slate-400",   text: "text-slate-700",   border: "border-slate-300" },
  in_progress: { bar: "bg-blue-500",    text: "text-blue-700",    border: "border-blue-300" },
  completed:   { bar: "bg-emerald-500", text: "text-emerald-700", border: "border-emerald-300" },
  delayed:     { bar: "bg-red-500",     text: "text-red-700",     border: "border-red-300" },
  on_hold:     { bar: "bg-amber-400",   text: "text-amber-700",   border: "border-amber-300" },
};

const categoryIcons = {
  site_work: "🏗️", foundation: "🧱", framing: "🏛️", utilities: "⚡",
  infrastructure: "🛣️", landscaping: "🌳", permits: "📋", inspection: "🔍", other: "📌"
};

const ROW_H = 40;
const LABEL_W = 220;
const DAY_W = 28;

function toDate(str) {
  if (!str) return null;
  try { return parseISO(str); } catch { return null; }
}

export default function GanttChart({ updates, projectPhases, projects }) {
  const [hoveredId, setHoveredId] = useState(null);
  const scrollRef = useRef(null);

  // Build rows: group by project → phase → milestones
  const rows = useMemo(() => {
    const result = [];
    const sortedProjects = [...projects].sort((a, b) => a.name.localeCompare(b.name));

    sortedProjects.forEach(project => {
      const phases = projectPhases
        .filter(ph => ph.project_id === project.id)
        .sort((a, b) => (a.order || 0) - (b.order || 0));

      const projectUpdates = updates.filter(u =>
        phases.some(ph => ph.id === u.phase_id)
      );
      if (projectUpdates.length === 0) return;

      result.push({ type: "project", id: `proj-${project.id}`, label: project.name });

      phases.forEach(phase => {
        const phaseUpdates = updates.filter(u => u.phase_id === phase.id);
        if (phaseUpdates.length === 0) return;

        result.push({ type: "phase", id: `phase-${phase.id}`, label: phase.name });

        phaseUpdates
          .sort((a, b) => (toDate(a.target_date) || 0) - (toDate(b.target_date) || 0))
          .forEach(u => {
            const start = toDate(u.created_date) || toDate(u.target_date) || new Date();
            const end = toDate(u.completion_date) || toDate(u.target_date) || addDays(start, 14);
            result.push({
              type: "task",
              id: u.id,
              label: u.milestone,
              category: u.category,
              status: u.status,
              progress: u.progress_percentage || 0,
              start: start > end ? addDays(end, -14) : start,
              end,
              notes: u.notes,
            });
          });
      });
    });

    // Fallback: orphaned updates (no matching phase/project)
    const orphans = updates.filter(u => !projectPhases.some(ph => ph.id === u.phase_id));
    if (orphans.length > 0) {
      result.push({ type: "project", id: "orphan", label: "Uncategorized" });
      orphans.forEach(u => {
        const start = toDate(u.created_date) || toDate(u.target_date) || new Date();
        const end = toDate(u.completion_date) || toDate(u.target_date) || addDays(start, 14);
        result.push({
          type: "task",
          id: u.id,
          label: u.milestone,
          category: u.category,
          status: u.status,
          progress: u.progress_percentage || 0,
          start: start > end ? addDays(end, -14) : start,
          end,
          notes: u.notes,
        });
      });
    }

    return result;
  }, [updates, projectPhases, projects]);

  // Date range
  const { minDate, maxDate, months } = useMemo(() => {
    const tasks = rows.filter(r => r.type === "task");
    if (tasks.length === 0) {
      const now = new Date();
      return {
        minDate: startOfMonth(now),
        maxDate: endOfMonth(addDays(now, 90)),
        months: eachMonthOfInterval({ start: startOfMonth(now), end: endOfMonth(addDays(now, 90)) })
      };
    }
    const allDates = tasks.flatMap(t => [t.start, t.end]);
    const min = startOfMonth(new Date(Math.min(...allDates)));
    const max = endOfMonth(new Date(Math.max(...allDates)));
    return {
      minDate: min,
      maxDate: max,
      months: eachMonthOfInterval({ start: min, end: max })
    };
  }, [rows]);

  const totalDays = differenceInDays(maxDate, minDate) + 1;
  const totalWidth = totalDays * DAY_W;

  const getX = (date) => Math.max(0, differenceInDays(date, minDate)) * DAY_W;
  const getW = (start, end) => Math.max(DAY_W, differenceInDays(end, start) * DAY_W);

  const todayX = getX(new Date());
  const showToday = todayX >= 0 && todayX <= totalWidth;

  if (rows.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-400 text-sm">
        No milestones with dates to display. Add milestones with target dates to see the Gantt chart.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white" ref={scrollRef}>
      <div style={{ minWidth: LABEL_W + totalWidth + 1 }}>
        {/* Header: month labels */}
        <div className="flex border-b border-slate-200 bg-slate-50 sticky top-0 z-10">
          {/* Label column header */}
          <div
            className="shrink-0 border-r border-slate-200 px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center"
            style={{ width: LABEL_W }}
          >
            Milestone
          </div>
          {/* Month bands */}
          <div className="relative flex" style={{ width: totalWidth }}>
            {months.map((month) => {
              const mStart = month < minDate ? minDate : month;
              const mEnd = endOfMonth(month) > maxDate ? maxDate : endOfMonth(month);
              const x = getX(mStart);
              const w = (differenceInDays(mEnd, mStart) + 1) * DAY_W;
              return (
                <div
                  key={month.toISOString()}
                  className="absolute border-r border-slate-200 px-2 py-2 text-xs font-medium text-slate-600 truncate"
                  style={{ left: x, width: w }}
                >
                  {format(month, "MMM yyyy")}
                </div>
              );
            })}
          </div>
        </div>

        {/* Rows */}
        {rows.map((row, i) => {
          if (row.type === "project") {
            return (
              <div key={row.id} className="flex bg-slate-100 border-b border-slate-200">
                <div
                  className="shrink-0 border-r border-slate-200 px-3 py-2 font-semibold text-slate-800 text-sm flex items-center gap-1.5"
                  style={{ width: LABEL_W, height: ROW_H }}
                >
                  📁 {row.label}
                </div>
                <div style={{ width: totalWidth, height: ROW_H }} />
              </div>
            );
          }

          if (row.type === "phase") {
            return (
              <div key={row.id} className="flex bg-slate-50 border-b border-slate-100">
                <div
                  className="shrink-0 border-r border-slate-200 pl-6 pr-3 py-2 text-xs font-medium text-slate-600 flex items-center"
                  style={{ width: LABEL_W, height: ROW_H }}
                >
                  ↳ {row.label}
                </div>
                <div style={{ width: totalWidth, height: ROW_H }} />
              </div>
            );
          }

          // Task row
          const colors = STATUS_COLORS[row.status] || STATUS_COLORS.planned;
          const x = getX(row.start);
          const w = getW(row.start, row.end);
          const isHovered = hoveredId === row.id;

          return (
            <div
              key={row.id}
              className={cn("flex border-b border-slate-100 hover:bg-blue-50 transition-colors group", i % 2 === 0 ? "" : "bg-slate-50/50")}
              onMouseEnter={() => setHoveredId(row.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              {/* Label */}
              <div
                className="shrink-0 border-r border-slate-200 pl-10 pr-3 py-1 flex items-center gap-1.5"
                style={{ width: LABEL_W, height: ROW_H }}
              >
                <span className="text-sm">{categoryIcons[row.category] || "📌"}</span>
                <span className="text-xs text-slate-700 truncate leading-tight">{row.label}</span>
              </div>

              {/* Chart area */}
              <div className="relative" style={{ width: totalWidth, height: ROW_H }}>
                {/* Vertical month grid lines */}
                {months.map(month => {
                  const mx = getX(month < minDate ? minDate : month);
                  return (
                    <div
                      key={month.toISOString()}
                      className="absolute top-0 bottom-0 border-l border-slate-100"
                      style={{ left: mx }}
                    />
                  );
                })}

                {/* Today line */}
                {showToday && (
                  <div
                    className="absolute top-0 bottom-0 border-l-2 border-red-400 z-10"
                    style={{ left: todayX }}
                  />
                )}

                {/* Bar */}
                <div
                  className={cn("absolute top-1/2 -translate-y-1/2 rounded-md border cursor-pointer transition-all duration-150", colors.bar, colors.border, isHovered ? "opacity-100 shadow-md ring-2 ring-offset-1 ring-blue-400" : "opacity-85")}
                  style={{ left: x, width: w, height: 22 }}
                >
                  {/* Progress fill */}
                  <div
                    className="absolute left-0 top-0 bottom-0 rounded-md bg-white/30"
                    style={{ width: `${row.progress}%` }}
                  />
                  {/* Label inside bar */}
                  {w > 60 && (
                    <span className="absolute inset-0 flex items-center px-2 text-white text-[10px] font-semibold truncate">
                      {row.progress}%
                    </span>
                  )}
                </div>

                {/* Tooltip */}
                {isHovered && (
                  <div
                    className="absolute z-20 bg-slate-900 text-white text-xs rounded-lg px-3 py-2 shadow-xl pointer-events-none"
                    style={{ left: Math.min(x + w + 8, totalWidth - 180), top: "50%", transform: "translateY(-50%)", width: 180 }}
                  >
                    <p className="font-semibold mb-1 truncate">{row.label}</p>
                    <p className="text-slate-300">Start: {format(row.start, "MMM d, yyyy")}</p>
                    <p className="text-slate-300">End: {format(row.end, "MMM d, yyyy")}</p>
                    <p className={cn("font-medium capitalize mt-1", colors.text.replace("text-", "text-") === "text-slate-700" ? "text-slate-300" : "text-slate-300")}>
                      {row.status.replace("_", " ")} · {row.progress}%
                    </p>
                    {row.notes && <p className="text-slate-400 mt-1 truncate">{row.notes}</p>}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Footer: today marker label */}
        {showToday && (
          <div className="relative flex border-t border-slate-200 bg-slate-50 py-1">
            <div className="shrink-0" style={{ width: LABEL_W }} />
            <div className="relative" style={{ width: totalWidth, height: 20 }}>
              <div
                className="absolute flex items-center gap-1"
                style={{ left: todayX - 18 }}
              >
                <div className="w-2 h-2 rounded-full bg-red-400" />
                <span className="text-[10px] text-red-500 font-medium">Today</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-4 py-3 border-t border-slate-200 bg-slate-50 flex-wrap">
        {Object.entries(STATUS_COLORS).map(([status, colors]) => (
          <div key={status} className="flex items-center gap-1.5">
            <div className={cn("w-3 h-3 rounded-sm", colors.bar)} />
            <span className="text-xs text-slate-600 capitalize">{status.replace("_", " ")}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5 ml-2">
          <div className="w-0.5 h-4 bg-red-400" />
          <span className="text-xs text-slate-600">Today</span>
        </div>
      </div>
    </div>
  );
}
