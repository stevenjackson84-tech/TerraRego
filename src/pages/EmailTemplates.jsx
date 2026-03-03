import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Mail } from 'lucide-react';

const categories = [
  { value: 'follow_up', label: 'Follow-up' },
  { value: 'offer', label: 'Offer' },
  { value: 'status_update', label: 'Status Update' },
  { value: 'introduction', label: 'Introduction' },
  { value: 'negotiation', label: 'Negotiation' },
  { value: 'closing', label: 'Closing' },
  { value: 'general', label: 'General' }
];

export default function EmailTemplates() {
  const [showDialog, setShowDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    category: 'general',
    subject: '',
    body: ''
  });

  const queryClient = useQueryClient();

  const { data: templates = [] } = useQuery({
    queryKey: ['emailTemplates'],
    queryFn: () => base44.entities.EmailTemplate.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.EmailTemplate.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emailTemplates'] });
      resetForm();
      setShowDialog(false);
    }
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.EmailTemplate.update(editingTemplate.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emailTemplates'] });
      resetForm();
      setShowDialog(false);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.EmailTemplate.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['emailTemplates'] })
  });

  const resetForm = () => {
    setEditingTemplate(null);
    setFormData({ name: '', category: 'general', subject: '', body: '' });
  };

  const handleEdit = (template) => {
    setEditingTemplate(template);
    setFormData(template);
    setShowDialog(true);
  };

  const handleSave = () => {
    if (!formData.name.trim() || !formData.subject.trim() || !formData.body.trim()) return;
    
    if (editingTemplate) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Email Templates</h1>
            <p className="text-slate-500 mt-2">Create and manage email templates for common communications</p>
          </div>
          <Button
            onClick={() => { resetForm(); setShowDialog(true); }}
            className="bg-slate-900 hover:bg-slate-800 gap-2"
          >
            <Plus className="h-4 w-4" />
            New Template
          </Button>
        </div>

        {templates.length === 0 ? (
          <Card className="border-0 shadow-sm p-12 text-center">
            <Mail className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600 font-medium">No templates created yet</p>
            <p className="text-sm text-slate-400 mt-1">Create your first template to speed up email communications</p>
          </Card>
        ) : (
          <div className="grid gap-4">
            {templates.map((template) => (
              <Card key={template.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-slate-900">{template.name}</h3>
                        <Badge variant="outline">
                          {categories.find(c => c.value === template.category)?.label || template.category}
                        </Badge>
                      </div>
                      <p className="text-sm font-mono text-slate-700 mb-2">Subject: {template.subject}</p>
                      <p className="text-sm text-slate-600 line-clamp-2 whitespace-pre-wrap">{template.body}</p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(template)}
                        className="text-slate-600 hover:text-slate-900"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteMutation.mutate(template.id)}
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
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingTemplate ? 'Edit Template' : 'New Email Template'}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label>Template Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Follow-up Email"
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Category</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Subject</Label>
                <Input
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="e.g., Follow-up - {deal_name}"
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Body</Label>
                <Textarea
                  value={formData.body}
                  onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                  placeholder="Write your email template..."
                  className="mt-1 h-48 font-mono text-sm"
                />
              </div>

              <div className="bg-slate-50 p-3 rounded-lg text-xs text-slate-600">
                <p className="font-semibold mb-1">Available placeholders:</p>
                <p>{'{contact_name}'}, {'{deal_name}'}, {'{deal_address}'}</p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button
                onClick={handleSave}
                disabled={createMutation.isPending || updateMutation.isPending}
                className="bg-slate-900 hover:bg-slate-800"
              >
                {editingTemplate ? 'Update' : 'Create'} Template
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}