import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { dealId, dealData, dealStage } = body;

    if (!dealId || !dealData) {
      return Response.json({ error: 'Missing dealId or dealData' }, { status: 400 });
    }

    const rules = await base44.asServiceRole.entities.TaskAutomation.list();
    const activeRules = rules.filter(r => r.is_active);
    const results = [];

    for (const rule of activeRules) {
      let shouldExecute = false;

      // Check trigger conditions
      if (rule.trigger_type === 'deal_stage_change') {
        if (rule.trigger_config.stages?.includes(dealStage)) {
          shouldExecute = true;
        }
      } else if (rule.trigger_type === 'date_trigger') {
        const dateField = rule.trigger_config.date_field;
        const daysBeforeTrigger = rule.trigger_config.days_before || 0;
        
        if (dealData[dateField]) {
          const targetDate = new Date(dealData[dateField]);
          const today = new Date();
          const daysUntilDate = Math.ceil((targetDate - today) / (1000 * 60 * 60 * 24));
          
          if (daysUntilDate === daysBeforeTrigger) {
            shouldExecute = true;
          }
        }
      } else if (rule.trigger_type === 'deal_criteria') {
        // Check if deal matches criteria
        if (rule.trigger_config.criteria) {
          const criteria = rule.trigger_config.criteria;
          let matchesCriteria = true;
          
          for (const [field, value] of Object.entries(criteria)) {
            if (dealData[field] !== value) {
              matchesCriteria = false;
              break;
            }
          }
          
          shouldExecute = matchesCriteria;
        }
      }

      if (!shouldExecute) continue;

      // Execute action
      try {
        if (rule.action_type === 'create_task') {
          const titleTemplate = rule.action_config.task_title_template || '{deal_name}';
          const title = titleTemplate
            .replace('{deal_name}', dealData.name || '')
            .replace('{deal_address}', dealData.address || '');

          const descriptionTemplate = rule.action_config.task_description_template || '';
          const description = descriptionTemplate
            .replace('{deal_name}', dealData.name || '')
            .replace('{deal_address}', dealData.address || '');

          const dueDate = rule.action_config.days_from_trigger
            ? new Date(Date.now() + rule.action_config.days_from_trigger * 24 * 60 * 60 * 1000)
              .toISOString()
              .split('T')[0]
            : null;

          const taskData = {
            title,
            description,
            deal_id: dealId,
            status: 'todo',
            priority: rule.action_config.priority || 'medium',
            category: rule.action_config.category || 'general',
            due_date: dueDate,
            assigned_to: rule.action_config.assigned_to || []
          };

          const task = await base44.asServiceRole.entities.Task.create(taskData);
          results.push({ rule: rule.name, action: 'create_task', taskId: task.id, status: 'success' });
        } else if (rule.action_type === 'assign_task') {
          // Find existing tasks for this deal and assign
          const tasks = await base44.asServiceRole.entities.Task.filter({ deal_id: dealId });
          for (const task of tasks) {
            const currentAssignees = task.assigned_to || [];
            const newAssignees = [...new Set([...currentAssignees, ...rule.action_config.assigned_to])];
            await base44.asServiceRole.entities.Task.update(task.id, { assigned_to: newAssignees });
          }
          results.push({ rule: rule.name, action: 'assign_task', status: 'success', tasksUpdated: tasks.length });
        } else if (rule.action_type === 'update_task') {
          // Update existing tasks for this deal
          const tasks = await base44.asServiceRole.entities.Task.filter({ deal_id: dealId });
          for (const task of tasks) {
            const updateData = {};
            if (rule.action_config.status) updateData.status = rule.action_config.status;
            if (rule.action_config.priority) updateData.priority = rule.action_config.priority;
            if (rule.action_config.assigned_to) {
              const currentAssignees = task.assigned_to || [];
              updateData.assigned_to = [...new Set([...currentAssignees, ...rule.action_config.assigned_to])];
            }
            
            if (Object.keys(updateData).length > 0) {
              await base44.asServiceRole.entities.Task.update(task.id, updateData);
            }
          }
          results.push({ rule: rule.name, action: 'update_task', status: 'success', tasksUpdated: tasks.length });
        }
      } catch (actionError) {
        results.push({ 
          rule: rule.name, 
          action: rule.action_type, 
          status: 'failed', 
          error: actionError.message 
        });
      }
    }

    return Response.json({ success: true, executed: results.length, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});