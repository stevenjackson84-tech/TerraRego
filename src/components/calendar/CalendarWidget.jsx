import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

export default function CalendarWidget() {
  const [syncing, setSyncing] = useState(false);

  const { data: events = [], isLoading, refetch } = useQuery({
    queryKey: ['calendarEvents'],
    queryFn: async () => {
      const res = await base44.functions.invoke('getCalendarEvents', { maxResults: 10 });
      return res.data.events || [];
    }
  });

  const handleSync = async (dealId) => {
    setSyncing(true);
    try {
      const res = await base44.functions.invoke('syncToGoogleCalendar', { dealId });
      if (res.data.success) {
        refetch();
      }
    } catch (err) {
      console.error('Sync failed:', err);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-slate-600" />
            <CardTitle className="text-lg">Upcoming Calendar Events</CardTitle>
          </div>
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            {isLoading ? 'Loading...' : 'Refresh'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading events...</span>
          </div>
        ) : events.length > 0 ? (
          <div className="space-y-3">
            {events.map(event => (
              <div key={event.id} className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition-colors">
                <div className="flex justify-between items-start gap-3">
                  <div className="flex-1">
                    <h3 className="font-medium text-slate-900">{event.summary}</h3>
                    {event.description && (
                      <p className="text-sm text-slate-600 mt-1">{event.description.split('\n')[0]}</p>
                    )}
                    <p className="text-xs text-slate-500 mt-2">
                      {format(new Date(event.start), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                  {event.htmlLink && (
                    <a 
                      href={event.htmlLink} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:text-blue-700 whitespace-nowrap"
                    >
                      View
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-500 text-sm">No upcoming events</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}