import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { dealId } = await req.json();

    if (!dealId) {
      return Response.json({ error: 'Missing dealId' }, { status: 400 });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googlecalendar');

    // Fetch deal, tasks, and entitlements
    const deals = await base44.asServiceRole.entities.Deal.filter({ id: dealId });
    const deal = deals[0];
    if (!deal) {
      return Response.json({ error: 'Deal not found' }, { status: 404 });
    }

    const tasks = await base44.asServiceRole.entities.Task.filter({ deal_id: dealId });
    const entitlements = await base44.asServiceRole.entities.Entitlement.filter({ deal_id: dealId });

    // Prepare events
    const events = [];

    // Deal-related events
    if (deal.contract_date) {
      events.push({
        summary: `Contract Date: ${deal.name}`,
        description: `Deal: ${deal.name}\nAddress: ${deal.address || ''}`,
        start: { date: deal.contract_date },
        end: { date: deal.contract_date },
        reminders: { useDefault: true }
      });
    }

    if (deal.due_diligence_deadline) {
      events.push({
        summary: `Due Diligence Deadline: ${deal.name}`,
        description: `Deal: ${deal.name}`,
        start: { date: deal.due_diligence_deadline },
        end: { date: deal.due_diligence_deadline },
        reminders: { useDefault: true }
      });
    }

    if (deal.close_date) {
      events.push({
        summary: `Close Date: ${deal.name}`,
        description: `Deal: ${deal.name}`,
        start: { date: deal.close_date },
        end: { date: deal.close_date },
        reminders: { useDefault: true }
      });
    }

    // Task events
    tasks.forEach(task => {
      if (task.due_date && task.status !== 'completed') {
        events.push({
          summary: `Task: ${task.title}`,
          description: `Deal: ${deal.name}\n${task.description || ''}`,
          start: { date: task.due_date },
          end: { date: task.due_date },
          reminders: { useDefault: true }
        });
      }
    });

    // Entitlement events
    entitlements.forEach(ent => {
      if (ent.submission_date) {
        events.push({
          summary: `${ent.name} Submitted`,
          description: `Deal: ${deal.name}\nAgency: ${ent.agency || ''}`,
          start: { date: ent.submission_date },
          end: { date: ent.submission_date },
          reminders: { useDefault: true }
        });
      }
      if (ent.approval_date) {
        events.push({
          summary: `${ent.name} Approved`,
          description: `Deal: ${deal.name}`,
          start: { date: ent.approval_date },
          end: { date: ent.approval_date },
          reminders: { useDefault: true }
        });
      }
    });

    // Sync events to Google Calendar
    let syncedCount = 0;
    for (const event of events) {
      const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(event)
      });

      if (response.ok) syncedCount++;
    }

    return Response.json({ 
      success: true, 
      syncedCount,
      totalEvents: events.length 
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});