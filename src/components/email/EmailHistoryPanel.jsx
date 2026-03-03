import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mail, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function EmailHistoryPanel({ dealId, contactId }) {
  const { data: sentEmails = [] } = useQuery({
    queryKey: ['sentEmails', dealId, contactId],
    queryFn: async () => {
      const filter = {};
      if (dealId) filter.deal_id = dealId;
      if (contactId) filter.contact_id = contactId;
      return base44.entities.SentEmail.filter(filter, '-sent_date');
    },
    enabled: !!(dealId || contactId)
  });

  if (sentEmails.length === 0) {
    return null;
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Email History
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {sentEmails.map((email) => (
          <div key={email.id} className="border-b pb-3 last:border-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-900">{email.subject}</p>
                <p className="text-xs text-slate-500 mt-0.5">To: {email.to}</p>
              </div>
              <Badge
                variant={email.status === 'sent' ? 'default' : 'destructive'}
                className={email.status === 'sent' ? 'bg-green-100 text-green-800' : ''}
              >
                {email.status}
              </Badge>
            </div>
            <p className="text-xs text-slate-500">
              {format(new Date(email.sent_date), 'MMM d, yyyy h:mm a')} by {email.sent_by}
            </p>
            {email.error_message && (
              <div className="flex items-start gap-2 mt-2 p-2 bg-red-50 rounded">
                <AlertCircle className="h-3 w-3 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-600">{email.error_message}</p>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}