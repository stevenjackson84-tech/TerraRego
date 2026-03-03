import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Copy, Power, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

const triggerTypes = [
  { value: 'deal_stage_change', label: 'Deal Stage Change' },
  { value: 'date_trigger', label: 'Date Approaching' },
  { value: 'deal_criteria', label: 'Deal Criteria' }
];

const actionTypes = [
  { value: 'create_task', label: 'Create Task' },
  { value: 'assign_task', label: 'Assign Task' },
  { value: 'update_task', label: 'Update Task' }
];

const taskCategories = [
  'due_diligence', 'legal', 'financial', 'entitlement',
  'construction', 'marketing', 'general'
];

const dealStages = [
  'prospecting', 'loi', 'controlled_not_approved', 'controlled_approved',
  'owned', 'entitlements', 'development', 'closed', 'dead'
];

const dateFields = [
  { value: 'due_diligence_deadline', label: 'Due Diligence Deadline' },
  { value: 'contract_date', label: 'Contract Date' },
  { value: 'close_date', label: 'Close Date' }
];

export default function TaskAutomationManager() {
  const [showDialog, setShowDialog] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    trigger_type: 'deal_stage_change',
    trigger_config: { stages: [] },
    action_type: 'create_task',
    action_config: { assigned_to: [] }
  });

  const queryClient = useQueryClient();

  const { data: rules = [] } = useQuery({
    queryKey: ['taskAutomations'],
    queryFn: () => base44.entities.TaskAutomation.list()
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list()
  });

  const createRuleMutation = useMutation({
    mutationFn: (data) => base44.entities.TaskAutomation.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taskAutomations'] });
      resetForm();
      setShowDialog(false);
    }
  });

  const updateRuleMutation = useMutation({
    mutationFn: (data) => base44.entities.TaskAutomation.update(editingRule.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taskAutomations'] });
      resetForm();
      setShowDialog(false);
    }
  });

  const deleteRuleMutation = useMutation({
    mutationFn: (id) => base44.entities.TaskAutomation.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['taskAutomations'] })
  });

  const toggleActiveMutation = useMutation({
    mutationFn: (rule) => base44.entities.TaskAutomation.update(rule.id, { is_active: !rule.is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['taskAutomations'] })
  });

  const duplicateRuleMutation = useMutation({
    mutationFn: (rule) => {
      const { id, created_by, created_date, updated_date, execution_history, ...data } = rule;
      return base44.entities.TaskAutomation.create({
        ...data,
        name: `${data.name} (Copy)`
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['taskAutomations'] })
  });

  const resetForm = () => {
    setEditingRule(null);
    setFormData({
      name: '',
      description: '',
      trigger_type: 'deal_stage_change',
      trigger_config: { stages: [] },
      action_type: 'create_task',
      action_config: { assigned_to: [] }
    });
  };

  const handleEdit = (rule) => {
    setEditingRule(rule);
    setFormData(rule);
    setShowDialog(true);
  };

  const handleSave = () => {
    if (!formData.name.trim()) return;
    if (editingRule) {
      updateRuleMutation.mutate(formData);
    } else {
      createRuleMutation.mutate(formData);
    }
  };

  const updateTriggerConfig = (key, value) => {
    setFormData(prev => ({
      ...prev,
      trigger_config: { ...prev.trigger_config, [key]: value }
    }));
  };

  const updateActionConfig = (key, value) => {
    setFormData(prev => ({
      ...prev,
      action_config: { ...prev.action_config, [key]: value }
    }));
  };

  const toggleStage = (stage) => {
    setFormData(prev => ({
      ...prev,
      trigger_config: {
        ...prev.trigger_config,
        stages: prev.trigger_config.stages.includes(stage)
          ? prev.trigger_config.stages.filter(s => s !== stage)
          : [...prev.trigger_config.stages, stage]
      }
    }));
  };

  const toggleUser = (email) => {
    setFormData(prev => ({
      ...prev,
      action_config: {
        ...prev.action_config,
        assigned_to: prev.action_config.assigned_to.includes(email)
          ? prev.action_config.assigned_to.filter(e => e !== email)
          : [...prev.action_config.assigned_to, email]
      }
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Task Automations</h2>
          <p className="text-sm text-slate-500 mt-1">Set up rules to automatically manage tasks</p>
        </div>
        <Button onClick={() => { resetForm(); setShowDialog(true); }} className="bg-slate-900 hover:bg-slate-800">
          <Plus className="h-4 w-4 mr-2" />
          New Rule
        </Button>
      </div>

      {rules.length === 0 ? (
        <Card className="border-0 shadow-sm p-12 text-center">
          <Zap className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600 font-medium">No automation rules yet</p>
          <p className="text-sm text-slate-400 mt-1">Create your first rule to start automating tasks</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {rules.map(rule => (
            <Card key={rule.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-slate-900">{rule.name}</h3>
                      <Badge variant="outline" className={rule.is_active ? 'bg-green-50' : 'bg-slate-50'}>
                        {rule.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    {rule.description && (
                      <p className="text-sm text-slate-600 mb-3">{rule.description}</p>
                    )}
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <p className="text-slate-500 font-medium">Trigger</p>
                        <p className="text-slate-700">
                          {triggerTypes.find(t => t.value === rule.trigger_type)?.label}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500 font-medium">Action</p>
                        <p className="text-slate-700">
                          {actionTypes.find(a => a.value === rule.action_type)?.label}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => toggleActiveMutation.mutate(rule)}
                      className="text-slate-600 hover:text-slate-900"
                    >
                      <Power className={cn("h-4 w-4", !rule.is_active && "opacity-50")} />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => duplicateRuleMutation.mutate(rule)}
                      className="text-slate-600 hover:text-slate-900"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEdit(rule)}
                      className="text-slate-600 hover:text-slate-900"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteRuleMutation.mutate(rule.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRule ? 'Edit Rule' : 'Create New Rule'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="font-semibold text-slate-900">Rule Details</h3>
              <div>
                <Label>Rule Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Create DD Task on LOI"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Description (optional)</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="What does this rule do?"
                  className="mt-1 h-20"
                />
              </div>
            </div>

            {/* Trigger */}
            <div className="space-y-4 border-t pt-4">
              <h3 className="font-semibold text-slate-900">Trigger</h3>
              <div>
                <Label>When</Label>
                <Select value={formData.trigger_type} onValueChange={(value) => setFormData({ ...formData, trigger_type: value })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {triggerTypes.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.trigger_type === 'deal_stage_change' && (
                <div>
                  <Label>Select Deal Stages</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {dealStages.map(stage => (
                      <div key={stage} className="flex items-center gap-2">
                        <Checkbox
                          checked={formData.trigger_config.stages?.includes(stage) || false}
                          onCheckedChange={() => toggleStage(stage)}
                        />
                        <label className="text-sm text-slate-700 cursor-pointer">{stage.replace('_', ' ')}</label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {formData.trigger_type === 'date_trigger' && (
                <div className="space-y-4">
                  <div>
                    <Label>Date Field</Label>
                    <Select
                      value={formData.trigger_config.date_field || ''}
                      onValueChange={(value) => updateTriggerConfig('date_field', value)}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {dateFields.map(f => (
                          <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Days Before</Label>
                    <Input
                      type="number"
                      value={formData.trigger_config.days_before || 0}
                      onChange={(e) => updateTriggerConfig('days_before', parseInt(e.target.value))}
                      className="mt-1"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Action */}
            <div className="space-y-4 border-t pt-4">
              <h3 className="font-semibold text-slate-900">Action</h3>
              <div>
                <Label>Then</Label>
                <Select value={formData.action_type} onValueChange={(value) => setFormData({ ...formData, action_type: value })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {actionTypes.map(a => (
                      <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {(formData.action_type === 'create_task' || formData.action_type === 'update_task') && (
                <div className="space-y-4">
                  <div>
                    <Label>Task Title Template</Label>
                    <Input
                      value={formData.action_config.task_title_template || ''}
                      onChange={(e) => updateActionConfig('task_title_template', e.target.value)}
                      placeholder="e.g., Due Diligence for {deal_name}"
                      className="mt-1 text-xs"
                    />
                    <p className="text-xs text-slate-500 mt-1">Use {'{deal_name}'} or {'{deal_address}'} as placeholders</p>
                  </div>
                  <div>
                    <Label>Description Template (optional)</Label>
                    <Textarea
                      value={formData.action_config.task_description_template || ''}
                      onChange={(e) => updateActionConfig('task_description_template', e.target.value)}
                      placeholder="Task description"
                      className="mt-1 h-20 text-xs"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Priority</Label>
                      <Select value={formData.action_config.priority || 'medium'} onValueChange={(value) => updateActionConfig('priority', value)}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Category</Label>
                      <Select value={formData.action_config.category || 'general'} onValueChange={(value) => updateActionConfig('category', value)}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {taskCategories.map(cat => (
                            <SelectItem key={cat} value={cat}>{cat.replace('_', ' ')}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>Due Date (days from trigger)</Label>
                    <Input
                      type="number"
                      value={formData.action_config.days_from_trigger || 0}
                      onChange={(e) => updateActionConfig('days_from_trigger', parseInt(e.target.value))}
                      className="mt-1"
                    />
                  </div>
                </div>
              )}

              <div>
                <Label>Assign To</Label>
                <div className="space-y-2 mt-2">
                  {users.map(user => (
                    <div key={user.id} className="flex items-center gap-2">
                      <Checkbox
                        checked={formData.action_config.assigned_to?.includes(user.email) || false}
                        onCheckedChange={() => toggleUser(user.email)}
                      />
                      <label className="text-sm text-slate-700 cursor-pointer">{user.full_name}</label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button
              onClick={handleSave}
              disabled={createRuleMutation.isPending || updateRuleMutation.isPending}
              className="bg-slate-900 hover:bg-slate-800"
            >
              {editingRule ? 'Update' : 'Create'} Rule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}