import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight, Plus, Trash2, CheckCircle2, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function TaskSubtasks({ parentTaskId, onSubtaskEdit }) {
  const [expanded, setExpanded] = useState(true);
  const queryClient = useQueryClient();

  const { data: subtasks = [] } = useQuery({
    queryKey: ['subtasks', parentTaskId],
    queryFn: () => base44.entities.Task.filter({ parent_task_id: parentTaskId }),
    enabled: !!parentTaskId
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.Task.update(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['subtasks', parentTaskId] })
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Task.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['subtasks', parentTaskId] })
  });

  if (subtasks.length === 0) return null;

  const completedCount = subtasks.filter(t => t.status === 'completed').length;

  return (
    <div className="mt-4 pl-8 space-y-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
      >
        {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        <span>Subtasks ({completedCount}/{subtasks.length})</span>
      </button>

      {expanded && (
        <div className="space-y-2">
          {subtasks.map(subtask => (
            <div key={subtask.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors">
              <button
                onClick={() => updateStatusMutation.mutate({
                  id: subtask.id,
                  status: subtask.status === 'completed' ? 'todo' : 'completed'
                })}
                className="mt-0.5 hover:opacity-70 transition-opacity"
              >
                {subtask.status === 'completed' ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                ) : (
                  <Circle className="h-4 w-4 text-slate-400" />
                )}
              </button>
              <div className="flex-1 min-w-0">
                <h4 className={cn(
                  "text-sm font-medium",
                  subtask.status === 'completed' && "text-slate-400 line-through"
                )}>
                  {subtask.title}
                </h4>
                {subtask.assigned_to?.length > 0 && (
                  <p className="text-xs text-slate-500 mt-1">
                    Assigned to: {subtask.assigned_to.length === 1 ? subtask.assigned_to[0] : `${subtask.assigned_to.length} people`}
                  </p>
                )}
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => onSubtaskEdit(subtask)}
                >
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-red-500 hover:text-red-600"
                  onClick={() => deleteMutation.mutate(subtask.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}