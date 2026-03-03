import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function TitleInfo({ dealId, dealName }) {
  const [syncing, setSyncing] = useState(false);
  const queryClient = useQueryClient();

  const { data: title } = useQuery({
    queryKey: ['title', dealId],
    queryFn: async () => {
      const titles = await base44.entities.Title.filter({ deal_id: dealId });
      return titles[0];
    },
    enabled: !!dealId
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      setSyncing(true);
      try {
        const res = await base44.functions.invoke('syncTitleData', { dealId });
        return res.data;
      } finally {
        setSyncing(false);
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['title', dealId] });
      if (data.ownershipChanged) {
        toast.error(`⚠️ Title ownership changed: ${data.previousOwner} → ${data.currentOwner}`);
      } else {
        toast.success('Title data synced successfully');
      }
    },
    onError: (err) => {
      toast.error('Failed to sync title data');
    }
  });

  const handleSync = () => {
    syncMutation.mutate();
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Property Title</CardTitle>
        <Button
          onClick={handleSync}
          disabled={syncing}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          {syncing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Syncing...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4" />
              Sync Title Data
            </>
          )}
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        {!title ? (
          <div className="text-center py-8 text-slate-500">
            <p className="font-medium">No title data available</p>
            <p className="text-sm mt-1">Click "Sync Title Data" to fetch from public records</p>
          </div>
        ) : (
          <>
            {title.ownership_changed && (
              <div className="flex gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-red-900">Ownership Change Detected</p>
                  <p className="text-sm text-red-700">
                    {title.previous_owner} → {title.current_owner} on {title.transfer_date}
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-500">Current Owner</p>
                <p className="font-semibold text-slate-900 mt-1">{title.current_owner || '—'}</p>
              </div>

              <div>
                <p className="text-sm text-slate-500">Transfer Date</p>
                <p className="font-semibold text-slate-900 mt-1">
                  {title.transfer_date ? format(new Date(title.transfer_date), 'MMM d, yyyy') : '—'}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500">Deed Type</p>
                <p className="font-semibold text-slate-900 mt-1">{title.deed_type || '—'}</p>
              </div>

              <div>
                <p className="text-sm text-slate-500">Transfer Price</p>
                <p className="font-semibold text-slate-900 mt-1">
                  {title.price ? `$${title.price.toLocaleString()}` : '—'}
                </p>
              </div>

              <div className="col-span-2">
                <p className="text-sm text-slate-500">Parcel Number</p>
                <p className="font-semibold text-slate-900 mt-1">{title.parcel_number || '—'}</p>
              </div>

              <div className="col-span-2">
                <p className="text-sm text-slate-500">Last Synced</p>
                <p className="text-xs text-slate-600 mt-1">
                  {title.last_sync_date ? format(new Date(title.last_sync_date), 'MMM d, yyyy h:mm a') : 'Never'}
                </p>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}