import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clickupApiKey = Deno.env.get('CLICKUP_API_KEY');
    if (!clickupApiKey) {
      return Response.json({ error: 'CLICKUP_API_KEY not set' }, { status: 500 });
    }

    // Fetch all deals
    const deals = await base44.entities.Deal.list();
    let synced = 0;
    let errors = 0;

    for (const deal of deals) {
      try {
        // Search for ClickUp tasks linked to this deal
        // ClickUp task name typically contains the deal name
        const searchUrl = `https://api.clickup.com/api/v2/team/90150687696/task?query=${encodeURIComponent(deal.name)}&include_closed=true`;
        
        const searchRes = await fetch(searchUrl, {
          headers: { 'Authorization': clickupApiKey }
        });

        if (!searchRes.ok) continue;

        const searchData = await searchRes.json();
        if (!searchData.tasks || searchData.tasks.length === 0) continue;

        // Find the most relevant task (exact name match or closest)
        const task = searchData.tasks.find(t => t.name.includes(deal.name)) || searchData.tasks[0];
        if (!task) continue;

        // Map ClickUp status to internal task status
        const statusMap = {
          'open': 'todo',
          'in progress': 'in_progress',
          'closed': 'completed',
          'on hold': 'blocked'
        };

        const taskStatus = task.status?.status?.toLowerCase() || 'open';
        const mappedStatus = statusMap[taskStatus] || 'todo';

        // Create or update a corresponding task in the app
        // First check if a task exists for this deal
        const existingTasks = await base44.entities.Task.filter({ deal_id: deal.id });
        
        if (existingTasks && existingTasks.length > 0) {
          // Update existing task
          const appTask = existingTasks[0];
          if (appTask.status !== mappedStatus) {
            await base44.entities.Task.update(appTask.id, {
              status: mappedStatus,
              description: `Synced from ClickUp task: ${task.id}`
            });
            synced++;
          }
        } else {
          // Create new task
          await base44.entities.Task.create({
            title: `${deal.name} - ClickUp Task`,
            description: `Synced from ClickUp task: ${task.id}`,
            deal_id: deal.id,
            status: mappedStatus,
            category: 'general'
          });
          synced++;
        }
      } catch (e) {
        console.warn(`Error syncing deal ${deal.id}:`, e.message);
        errors++;
      }
    }

    return Response.json({
      success: true,
      message: `Synced ${synced} tasks, ${errors} errors`
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});