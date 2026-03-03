import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { to, subject, body: emailBody, dealId, contactId, templateId } = body;

    if (!to || !subject || !emailBody) {
      return Response.json({ error: 'Missing required fields: to, subject, body' }, { status: 400 });
    }

    // Send email using Core integration
    const emailResult = await base44.integrations.Core.SendEmail({
      to,
      subject,
      body: emailBody,
      from_name: user.full_name || user.email
    });

    // Record sent email
    const sentEmailData = {
      to,
      subject,
      body: emailBody,
      contact_id: contactId || null,
      deal_id: dealId || null,
      template_id: templateId || null,
      sent_by: user.email,
      sent_date: new Date().toISOString(),
      status: 'sent'
    };

    const sentEmail = await base44.entities.SentEmail.create(sentEmailData);

    // Log activity
    if (dealId || contactId) {
      const entityType = dealId ? 'deal' : 'contact';
      const entityId = dealId || contactId;
      
      await base44.entities.Activity.create({
        type: 'email',
        description: `Email sent to ${to}: "${subject}"`,
        deal_id: dealId || null,
        contact_id: contactId || null,
        date: new Date().toISOString().split('T')[0]
      });
    }

    return Response.json({ 
      success: true, 
      sentEmailId: sentEmail.id,
      message: `Email sent to ${to}` 
    });
  } catch (error) {
    console.error('Email send error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});