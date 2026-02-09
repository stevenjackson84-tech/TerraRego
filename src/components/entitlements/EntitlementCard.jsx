import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, DollarSign, Building2, MoreVertical, User } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const statusStyles = {
  not_started: "bg-slate-100 text-slate-700",
  in_progress: "bg-blue-100 text-blue-700",
  submitted: "bg-amber-100 text-amber-700",
  under_review: "bg-purple-100 text-purple-700",
  approved: "bg-emerald-100 text-emerald-700",
  denied: "bg-red-100 text-red-700",
  expired: "bg-gray-100 text-gray-600"
};

const typeLabels = {
  zoning_change: "Zoning Change",
  variance: "Variance",
  conditional_use: "Conditional Use",
  site_plan: "Site Plan",
  subdivision: "Subdivision",
  environmental: "Environmental",
  traffic_study: "Traffic Study",
  utility: "Utility",
  building_permit: "Building Permit",
  grading_permit: "Grading Permit",
  other: "Other"
};

export default function EntitlementCard({ entitlement, dealName, onEdit, onDelete }) {
  return (
    <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300 p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-slate-900">{entitlement.name}</h3>
            <Badge variant="secondary" className={cn("text-xs", statusStyles[entitlement.status])}>
              {entitlement.status.replace('_', ' ')}
            </Badge>
          </div>
          
          {dealName && (
            <p className="text-sm text-amber-600 font-medium mb-2">{dealName}</p>
          )}
          
          <div className="flex items-center gap-3 flex-wrap text-sm text-slate-500">
            <Badge variant="outline" className="text-xs">
              {typeLabels[entitlement.type]}
            </Badge>
            {entitlement.agency && (
              <div className="flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5" />
                {entitlement.agency}
              </div>
            )}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            {entitlement.submission_date && (
              <div className="flex items-center gap-1.5 text-slate-500">
                <Calendar className="h-3.5 w-3.5" />
                <span>Submitted: {format(new Date(entitlement.submission_date), 'MMM d, yyyy')}</span>
              </div>
            )}
            {entitlement.approval_date && (
              <div className="flex items-center gap-1.5 text-emerald-600">
                <Calendar className="h-3.5 w-3.5" />
                <span>Approved: {format(new Date(entitlement.approval_date), 'MMM d, yyyy')}</span>
              </div>
            )}
            {entitlement.estimated_cost && (
              <div className="flex items-center gap-1.5 text-slate-500">
                <DollarSign className="h-3.5 w-3.5" />
                <span>Est: ${entitlement.estimated_cost.toLocaleString()}</span>
              </div>
            )}
            {entitlement.assigned_to && (
              <div className="flex items-center gap-1.5 text-slate-500">
                <User className="h-3.5 w-3.5" />
                <span>{entitlement.assigned_to}</span>
              </div>
            )}
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(entitlement)}>Edit</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDelete(entitlement)} className="text-red-600">Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
  );
}