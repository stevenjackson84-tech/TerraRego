import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function CalendarSyncButton({ dealId }) {
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await base44.functions.invoke('syncToGoogleCalendar', { dealId });
      if (res.data.success) {
        toast.success(`Synced ${res.data.syncedCount} events to Google Calendar`);
      }
    } catch (err) {
      toast.error('Failed to sync with calendar');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Button 
      onClick={handleSync} 
      disabled={syncing}
      variant="outline"
      className="gap-2"
    >
      <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
      {syncing ? 'Syncing...' : 'Sync to Calendar'}
    </Button>
  );
}