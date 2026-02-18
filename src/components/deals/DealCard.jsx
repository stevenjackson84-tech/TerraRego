import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, DollarSign, Calendar, User } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { DealScoreBadge, computeDealScore } from "./DealScore";

const priorityStyles = {
  low: "bg-slate-100 text-slate-600 border-slate-200",
  medium: "bg-blue-50 text-blue-700 border-blue-200",
  high: "bg-amber-50 text-amber-700 border-amber-200",
  critical: "bg-red-50 text-red-700 border-red-200"
};

const propertyTypeStyles = {
  residential: "bg-emerald-50 text-emerald-700",
  commercial: "bg-purple-50 text-purple-700",
  industrial: "bg-slate-100 text-slate-700",
  mixed_use: "bg-cyan-50 text-cyan-700",
  land: "bg-amber-50 text-amber-700",
  multifamily: "bg-rose-50 text-rose-700"
};

export default function DealCard({ deal, tasks = [], proforma = null }) {
  const { score } = computeDealScore(deal, tasks, proforma);

  return (
    <Link to={createPageUrl(`DealDetails?id=${deal.id}`)}>
      <Card className={cn(
        "border-0 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer overflow-hidden group",
        "bg-white"
      )}>
        {deal.image_url ? (
          <div className="h-32 overflow-hidden">
            <img 
              src={deal.image_url} 
              alt={deal.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          </div>
        ) : (
          <div className="h-32 bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
            <MapPin className="h-8 w-8 text-slate-400" />
          </div>
        )}
        <div className="p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="font-semibold text-slate-900 line-clamp-1">{deal.name}</h3>
            <div className="flex items-center gap-1.5 shrink-0">
              <DealScoreBadge score={score} />
              <Badge variant="outline" className={cn("text-xs", priorityStyles[deal.priority])}>
                {deal.priority}
              </Badge>
            </div>
          </div>
          
          {deal.address && (
            <div className="flex items-center gap-1.5 text-sm text-slate-500 mb-3">
              <MapPin className="h-3.5 w-3.5" />
              <span className="line-clamp-1">{deal.address}, {deal.city}</span>
            </div>
          )}

          <div className="flex items-center gap-2 mb-3 flex-wrap">
            {deal.property_type && (
              <Badge variant="secondary" className={cn("text-xs", propertyTypeStyles[deal.property_type])}>
                {deal.property_type.replace('_', ' ')}
              </Badge>
            )}
            {deal.acreage && (
              <span className="text-xs text-slate-500">{deal.acreage} acres</span>
            )}
          </div>

          <div className="space-y-1.5 text-sm">
            {deal.estimated_value && (
              <div className="flex items-center gap-1.5 text-slate-600">
                <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
                <span className="font-medium">${(deal.estimated_value / 1000000).toFixed(2)}M</span>
                <span className="text-slate-400">est. value</span>
              </div>
            )}
            {deal.close_date && (
              <div className="flex items-center gap-1.5 text-slate-500">
                <Calendar className="h-3.5 w-3.5" />
                <span>{format(new Date(deal.close_date), 'MMM d, yyyy')}</span>
              </div>
            )}
            {deal.assigned_to && (
              <div className="flex items-center gap-1.5 text-slate-500">
                <User className="h-3.5 w-3.5" />
                <span>{deal.assigned_to}</span>
              </div>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}