import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Phone, Mail, FileText, MapPin, Calendar, MessageSquare, RefreshCw } from "lucide-react";
import { format } from "date-fns";

const activityIcons = {
  note: MessageSquare,
  call: Phone,
  email: Mail,
  meeting: Calendar,
  site_visit: MapPin,
  document: FileText,
  status_change: RefreshCw
};

const activityColors = {
  note: "bg-slate-100 text-slate-600",
  call: "bg-blue-100 text-blue-600",
  email: "bg-amber-100 text-amber-600",
  meeting: "bg-purple-100 text-purple-600",
  site_visit: "bg-emerald-100 text-emerald-600",
  document: "bg-rose-100 text-rose-600",
  status_change: "bg-cyan-100 text-cyan-600"
};

export default function RecentActivity({ activities, deals }) {
  const getDealName = (dealId) => {
    const deal = deals.find(d => d.id === dealId);
    return deal?.name || 'Unknown Deal';
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold text-slate-900">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.slice(0, 6).map((activity) => {
            const Icon = activityIcons[activity.type] || MessageSquare;
            return (
              <div key={activity.id} className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${activityColors[activity.type]}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-900 line-clamp-2">{activity.description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {activity.deal_id && (
                      <span className="text-xs text-amber-600 font-medium">{getDealName(activity.deal_id)}</span>
                    )}
                    <span className="text-xs text-slate-400">
                      {activity.date ? format(new Date(activity.date), 'MMM d, h:mm a') : format(new Date(activity.created_date), 'MMM d, h:mm a')}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
          {activities.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-8">No recent activity</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}