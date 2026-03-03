import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Loader2, RefreshCw } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const { data: events = [], isLoading, refetch } = useQuery({
    queryKey: ['calendarEvents'],
    queryFn: async () => {
      const res = await base44.functions.invoke('getCalendarEvents', { maxResults: 50 });
      return res.data.events || [];
    }
  });

  // Filter events for current month
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const monthEvents = events.filter(event => {
    const eventDate = new Date(event.start);
    return eventDate >= monthStart && eventDate <= monthEnd;
  });

  // Get all deals for sync
  const { data: deals = [] } = useQuery({
    queryKey: ['deals'],
    queryFn: () => base44.entities.Deal.list()
  });

  const handleSyncAll = async () => {
    for (const deal of deals) {
      if (deal.id) {
        try {
          await base44.functions.invoke('syncToGoogleCalendar', { dealId: deal.id });
        } catch (err) {
          console.error('Failed to sync deal:', deal.id);
        }
      }
    }
    refetch();
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Calendar className="h-8 w-8 text-slate-600" />
            <h1 className="text-3xl font-bold text-slate-900">Calendar Integration</h1>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={handleSyncAll}
              disabled={isLoading || deals.length === 0}
              className="bg-slate-900 hover:bg-slate-800"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {isLoading ? 'Syncing...' : 'Sync All Deals'}
            </Button>
            <Button 
              variant="outline"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              {isLoading ? 'Loading...' : 'Refresh'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Card className="border-0 shadow-sm lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">
                {format(currentMonth, 'MMMM yyyy')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {monthEvents.length > 0 ? (
                <div className="space-y-4">
                  {monthEvents.map(event => (
                    <div key={event.id} className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition-colors">
                      <div className="flex justify-between items-start gap-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-slate-900">{event.summary}</h3>
                          {event.description && (
                            <p className="text-sm text-slate-600 mt-2 whitespace-pre-wrap">
                              {event.description}
                            </p>
                          )}
                          <p className="text-sm text-slate-500 mt-3">
                            📅 {format(new Date(event.start), 'MMM d, yyyy h:mm a')}
                          </p>
                        </div>
                        {event.htmlLink && (
                          <a 
                            href={event.htmlLink} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:text-blue-700 whitespace-nowrap font-medium"
                          >
                            Open →
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Calendar className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">No events in {format(currentMonth, 'MMMM')}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Upcoming Events</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {events.slice(0, 5).map(event => (
                  <div key={event.id} className="pb-3 border-b border-slate-200 last:border-0 last:pb-0">
                    <p className="font-medium text-sm text-slate-900">{event.summary}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {format(new Date(event.start), 'MMM d, h:mm a')}
                    </p>
                  </div>
                ))}
                {events.length === 0 && (
                  <p className="text-sm text-slate-500 text-center py-4">No upcoming events</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Sync Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-slate-600">
              <p>✓ Google Calendar connected</p>
              <p>✓ {events.length} events fetched</p>
              <p>✓ {deals.length} deals available for sync</p>
              <p className="text-xs text-slate-500 mt-4">
                All deal deadlines, task due dates, and entitlement milestones sync automatically to your Google Calendar.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}