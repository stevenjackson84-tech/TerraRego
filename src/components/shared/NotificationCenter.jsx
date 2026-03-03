import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, X, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export default function NotificationCenter({ userEmail }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications", userEmail],
    queryFn: () =>
      base44.entities.Notification.filter(
        { recipient_email: userEmail },
        "-created_date",
        100
      ),
    enabled: !!userEmail,
    refetchInterval: 5000 // Poll every 5 seconds for new notifications
  });

  useEffect(() => {
    const unsubscribe = base44.entities.Notification.subscribe((event) => {
      if (event.data?.recipient_email === userEmail) {
        queryClient.invalidateQueries({ queryKey: ["notifications", userEmail] });
      }
    });
    return unsubscribe;
  }, [userEmail, queryClient]);

  const markAsReadMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.update(id, { is_read: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications", userEmail] })
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications", userEmail] })
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const typeIcons = {
    comment: "💬",
    assignment: "👤",
    status_change: "📊",
    mention: "🏷️",
    task_update: "✓"
  };

  const typeColors = {
    comment: "bg-blue-50 border-blue-200",
    assignment: "bg-purple-50 border-purple-200",
    status_change: "bg-green-50 border-green-200",
    mention: "bg-amber-50 border-amber-200",
    task_update: "bg-emerald-50 border-emerald-200"
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(!open)}
        className="relative"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500 hover:bg-red-600">
            {unreadCount}
          </Badge>
        )}
      </Button>

      {open && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-12 w-96 max-h-96 bg-white rounded-lg shadow-lg border border-slate-200 overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 p-4 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">Notifications</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setOpen(false)}
                className="h-6 w-6"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No notifications yet</p>
              </div>
            ) : (
              <div className="space-y-0">
                {notifications.map((notif) => (
                  <NotificationItem
                    key={notif.id}
                    notification={notif}
                    typeIcon={typeIcons[notif.type]}
                    typeColor={typeColors[notif.type]}
                    onRead={() => markAsReadMutation.mutate(notif.id)}
                    onDelete={() => deleteNotificationMutation.mutate(notif.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function NotificationItem({
  notification,
  typeIcon,
  typeColor,
  onRead,
  onDelete
}) {
  return (
    <div
      className={cn(
        "border-b border-slate-100 p-4 hover:bg-slate-50 transition-colors cursor-pointer",
        !notification.is_read && "bg-blue-50"
      )}
      onClick={() => {
        if (!notification.is_read) onRead();
        if (notification.action_url) {
          window.location.href = notification.action_url;
        }
      }}
    >
      <div className="flex gap-3">
        <div className="text-lg flex-shrink-0">{typeIcon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-slate-900 truncate">
                {notification.title}
              </p>
              {notification.related_user_email && (
                <p className="text-xs text-slate-500 mt-0.5">
                  by {notification.related_user_email.split("@")[0]}
                </p>
              )}
            </div>
            {!notification.is_read && (
              <div className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0 mt-1" />
            )}
          </div>
          {notification.message && (
            <p className="text-xs text-slate-600 mt-1 line-clamp-2">
              {notification.message}
            </p>
          )}
          <p className="text-xs text-slate-400 mt-2">
            {format(new Date(notification.created_date), "MMM d, h:mm a")}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="h-6 w-6 flex-shrink-0"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}