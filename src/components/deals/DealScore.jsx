import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * Scores a deal 0–100 based on available attributes.
 * Returns { score, factors } where factors is an array of { label, points, earned }.
 */
export function computeDealScore(deal, tasks = [], proforma = null) {
  const factors = [];

  // 1. Stage progression (max 25 pts)
  const stagePoints = {
    prospecting: 5,
    loi: 10,
    controlled_not_approved: 13,
    controlled_approved: 17,
    owned: 20,
    entitlements: 22,
    development: 24,
    closed: 25,
    dead: 0,
  };
  const stageEarned = stagePoints[deal.stage] ?? 5;
  factors.push({ label: "Deal Stage", points: 25, earned: stageEarned });

  // 2. Assigned team member (max 10 pts)
  const assignedEarned = deal.assigned_to ? 10 : 0;
  factors.push({ label: "Team Assignment", points: 10, earned: assignedEarned });

  // 3. Priority (max 10 pts)
  const priorityPoints = { low: 3, medium: 6, high: 8, critical: 10 };
  const priorityEarned = priorityPoints[deal.priority] ?? 3;
  factors.push({ label: "Priority Level", points: 10, earned: priorityEarned });

  // 4. Task completion rate (max 20 pts)
  let taskEarned = 0;
  if (tasks.length > 0) {
    const completedTasks = tasks.filter(t => t.status === "completed").length;
    const completionRate = completedTasks / tasks.length;
    taskEarned = Math.round(completionRate * 20);
  } else {
    taskEarned = 5; // neutral if no tasks
  }
  factors.push({ label: "Task Completion", points: 20, earned: taskEarned });

  // 5. Financial data completeness (max 15 pts)
  let financialEarned = 0;
  if (deal.asking_price || deal.offer_price || deal.purchase_price) financialEarned += 5;
  if (deal.estimated_value) financialEarned += 5;
  if (proforma) financialEarned += 5;
  factors.push({ label: "Financial Data", points: 15, earned: financialEarned });

  // 6. Key dates set (max 10 pts)
  let datesEarned = 0;
  if (deal.contract_date) datesEarned += 3;
  if (deal.due_diligence_deadline) datesEarned += 3;
  if (deal.close_date) datesEarned += 4;
  factors.push({ label: "Key Dates", points: 10, earned: datesEarned });

  // 7. Property info completeness (max 10 pts)
  let propertyEarned = 0;
  if (deal.address && deal.city) propertyEarned += 3;
  if (deal.acreage) propertyEarned += 2;
  if (deal.number_of_lots) propertyEarned += 2;
  if (deal.zoning_current) propertyEarned += 3;
  factors.push({ label: "Property Info", points: 10, earned: propertyEarned });

  const totalPoints = factors.reduce((s, f) => s + f.points, 0);
  const earnedPoints = factors.reduce((s, f) => s + f.earned, 0);
  const score = Math.round((earnedPoints / totalPoints) * 100);

  // Dead deals always score 0
  const finalScore = deal.stage === "dead" ? 0 : score;

  return { score: finalScore, factors };
}

export function scoreColor(score) {
  if (score >= 75) return { bg: "bg-emerald-500", text: "text-emerald-700", light: "bg-emerald-50", border: "border-emerald-200" };
  if (score >= 50) return { bg: "bg-blue-500", text: "text-blue-700", light: "bg-blue-50", border: "border-blue-200" };
  if (score >= 25) return { bg: "bg-amber-500", text: "text-amber-700", light: "bg-amber-50", border: "border-amber-200" };
  return { bg: "bg-red-400", text: "text-red-700", light: "bg-red-50", border: "border-red-200" };
}

export function scoreLabel(score) {
  if (score >= 75) return "Strong";
  if (score >= 50) return "Moderate";
  if (score >= 25) return "Weak";
  return "Low";
}

/** Compact badge for deal cards / list rows */
export function DealScoreBadge({ score }) {
  const colors = scoreColor(score);
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn(
            "flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-bold shrink-0 cursor-default",
            colors.light, colors.text, colors.border
          )}>
            <span>{score}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs font-medium">{scoreLabel(score)} close probability</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/** Full scorecard panel for deal details */
export function DealScoreCard({ deal, tasks, proforma }) {
  const { score, factors } = computeDealScore(deal, tasks, proforma);
  const colors = scoreColor(score);

  return (
    <div className={cn("rounded-xl border p-5 space-y-4", colors.light, colors.border)}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-700">Close Probability Score</p>
          <p className="text-xs text-slate-500 mt-0.5">Based on deal attributes & progress</p>
        </div>
        <div className="flex flex-col items-center">
          <span className={cn("text-4xl font-black", colors.text)}>{score}</span>
          <span className={cn("text-xs font-semibold uppercase tracking-wide", colors.text)}>{scoreLabel(score)}</span>
        </div>
      </div>

      {/* Score bar */}
      <div className="w-full h-2.5 bg-white/60 rounded-full overflow-hidden border border-white">
        <div
          className={cn("h-full rounded-full transition-all duration-700", colors.bg)}
          style={{ width: `${score}%` }}
        />
      </div>

      {/* Factor breakdown */}
      <div className="space-y-2">
        {factors.map((f) => (
          <div key={f.label} className="flex items-center gap-2">
            <span className="text-xs text-slate-600 w-32 shrink-0">{f.label}</span>
            <div className="flex-1 h-1.5 bg-white/60 rounded-full overflow-hidden">
              <div
                className={cn("h-full rounded-full", colors.bg, "opacity-70")}
                style={{ width: `${(f.earned / f.points) * 100}%` }}
              />
            </div>
            <span className="text-xs font-medium text-slate-600 w-10 text-right">
              {f.earned}/{f.points}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}