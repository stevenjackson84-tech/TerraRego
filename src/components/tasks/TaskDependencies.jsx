import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
// Task dependencies component
import { AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function TaskDependencies({ dependsOn }) {
  const { data: dependencies = [] } = useQuery({
    queryKey: ['taskDependencies', dependsOn],
    queryFn: async () => {
      if (!dependsOn?.length) return [];
      const tasks = await Promise.all(
        dependsOn.map(id => base44.entities.Task.filter({ id }))
      );
      return tasks.map(t => t[0]).filter(Boolean);
    },
    enabled: !!dependsOn?.length
  });

  if (!dependencies.length) return null;

  const blockedCount = dependencies.filter(t => t.status !== 'completed').length;
  const allComplete = blockedCount === 0;

  return (
    <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
      <div className="flex items-center gap-2 mb-3">
        {allComplete ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
        ) : (
          <AlertCircle className="h-4 w-4 text-amber-600" />
        )}
        <span className="text-sm font-medium text-slate-900">
          Dependencies ({blockedCount} blocked)
        </span>
      </div>
      <div className="space-y-2">
        {dependencies.map(dep => (
          <div key={dep.id} className="flex items-center justify-between p-2 bg-white rounded border border-slate-100 text-sm">
            <div className="flex-1">
              <p className="text-slate-900">{dep.title}</p>
              <p className="text-xs text-slate-500">{dep.category}</p>
            </div>
            {dep.status === 'completed' ? (
              <Badge className="bg-emerald-100 text-emerald-700 text-xs">Done</Badge>
            ) : (
              <Badge className="bg-amber-100 text-amber-700 text-xs">Pending</Badge>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}