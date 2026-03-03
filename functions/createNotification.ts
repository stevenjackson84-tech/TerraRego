import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { recipient_email, type, title, entity_type, entity_id, related_user_email, message, action_url } = body;

    if (!recipient_email || !type || !title || !entity_type || !entity_id) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create notification
    const notification = await base44.asServiceRole.entities.Notification.create({
      recipient_email,
      type,
      title,
      message,
      entity_type,
      entity_id,
      related_user_email,
      action_url,
      is_read: false
    });

    return Response.json({ success: true, notification });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});