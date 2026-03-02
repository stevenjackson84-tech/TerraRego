import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { event, data } = await req.json();

    // Only process updates (not creates/deletes)
    if (event.type !== 'update') {
      return Response.json({ success: true, message: 'Not an update event' });
    }

    const deal = data;
    const stage = deal.stage;

    // Only trigger for Controlled (Approved) and Owned stages
    if (!['controlled_approved', 'owned'].includes(stage)) {
      return Response.json({ success: true, message: 'Stage not in trigger list' });
    }

    // Get assigned user email and sales manager (assume it's the current user or from a config)
    const assignedEmail = deal.assigned_to || user.email;
    const salesManagerEmail = user.email; // Sales manager is the logged-in user

    // Create ClickUp task
    const clickupApiKey = Deno.env.get('CLICKUP_API_KEY');
    if (!clickupApiKey) {
      console.warn('CLICKUP_API_KEY not set, skipping task creation');
    } else {
      try {
        // Get ClickUp workspace and list ID (hardcoded or from config - using default workspace/list)
        const workspaceId = '90150687696'; // Default ClickUp workspace
        const listId = '901506797614'; // Default list for deals

        const stageLabel = {
          controlled_approved: 'Controlled (Approved)',
          owned: 'Owned'
        }[stage];

        const taskName = `${stageLabel}: ${deal.name}`;
        const taskDescription = `Deal Details:
- Name: ${deal.name}
- Address: ${deal.address || 'N/A'}
- City: ${deal.city || 'N/A'}
- Stage: ${stageLabel}
- Price: ${deal.purchase_price ? '$' + deal.purchase_price.toLocaleString() : 'N/A'}
- Acreage: ${deal.acreage || 'N/A'} acres
- Assigned To: ${deal.assigned_to || 'Unassigned'}

View full deal: https://your-app-url.com/deals/${deal.id}`;

        const taskResponse = await fetch(`https://api.clickup.com/api/v2/list/${listId}/task`, {
          method: 'POST',
          headers: {
            'Authorization': clickupApiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: taskName,
            description: taskDescription,
            priority: stage === 'owned' ? 3 : 2, // Higher priority for Owned
            due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).getTime() // 7 days from now
          })
        });

        if (!taskResponse.ok) {
          console.warn('ClickUp task creation failed:', await taskResponse.text());
        } else {
          console.log('ClickUp task created successfully');
        }
      } catch (e) {
        console.warn('Error creating ClickUp task:', e.message);
      }
    }

    // Send email notification to sales manager
    try {
      const stageLabel = {
        controlled_approved: 'Controlled (Approved)',
        owned: 'Owned'
      }[stage];

      await base44.integrations.Core.SendEmail({
        to: salesManagerEmail,
        subject: `Deal Stage Update: ${deal.name} → ${stageLabel}`,
        body: `A deal has advanced in the pipeline:

Deal: ${deal.name}
New Stage: ${stageLabel}
Address: ${deal.address || 'N/A'}, ${deal.city || 'N/A'}
Acreage: ${deal.acreage || 'N/A'} acres
Purchase Price: ${deal.purchase_price ? '$' + deal.purchase_price.toLocaleString() : 'N/A'}
Assigned To: ${deal.assigned_to || 'Unassigned'}

A corresponding task has been created in ClickUp.`
      });
      console.log('Email notification sent to sales manager');
    } catch (e) {
      console.warn('Error sending email:', e.message);
    }

    return Response.json({
      success: true,
      message: `Workflow triggered for deal stage: ${stage}`
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});