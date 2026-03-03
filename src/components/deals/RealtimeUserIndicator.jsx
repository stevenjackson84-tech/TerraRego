import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useQuery } from "@tanstack/react-query";

export default function RealtimeUserIndicator({ dealId, currentUserEmail }) {
  const [activeUsers, setActiveUsers] = useState([]);

  // Simulate active users by checking recent activity
  const { data: recentActivity = [] } = useQuery({
    queryKey: ["dealActivity", dealId],
    queryFn: () => {
      // In a real implementation, you'd track user activity on the deal
      // This is a placeholder that returns recent comments/updates
      return base44.entities.Comment.filter(
        { entity_type: "deal", entity_id: dealId },
        "-created_date",
        10
      );
    },
    enabled: !!dealId,
    refetchInterval: 3000 // Refresh every 3 seconds
  });

  useEffect(() => {
    // Get unique users who have interacted recently
    const users = [...new Set(recentActivity.map(item => item.created_by))];
    setActiveUsers(
      users
        .filter(u => u !== currentUserEmail) // Exclude self
        .slice(0, 5) // Show max 5 users
    );
  }, [recentActivity, currentUserEmail]);

  if (activeUsers.length === 0) return null;

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg border border-blue-200">
        <span className="text-xs font-medium text-blue-700">Active now:</span>
        <div className="flex gap-1">
          {activeUsers.map((email) => (
            <Tooltip key={email}>
              <TooltipTrigger asChild>
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-xs bg-blue-300">
                    {email.split("@")[0].substring(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent>
                <p>{email.split("@")[0]}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </div>
    </TooltipProvider>
  );
}