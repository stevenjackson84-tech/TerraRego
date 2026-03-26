import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { dealId } = await req.json();

    // Get deal details
    const deals = await base44.entities.Deal.filter({ id: dealId });
    const deal = deals[0];

    if (!deal) {
      return Response.json({ error: 'Deal not found' }, { status: 404 });
    }

    const apiKey = Deno.env.get('PUBLIC_RECORDS_API_KEY');
    if (!apiKey) {
      return Response.json({ error: 'Public records API key not configured' }, { status: 500 });
    }

    // Get existing title record
    const existingTitles = await base44.entities.Title.filter({ deal_id: dealId });
    const existingTitle = existingTitles[0];

    // Call public records API (using RealtyMole as example)
    const searchUrl = new URL('https://api.realitymole.com/api/v1/propertyowner');
    searchUrl.searchParams.append('address', deal.address || '');
    searchUrl.searchParams.append('city', deal.city || '');
    searchUrl.searchParams.append('state', deal.state || '');
    searchUrl.searchParams.append('key', apiKey);

    const apiResponse = await fetch(searchUrl.toString());
    
    if (!apiResponse.ok) {
      return Response.json({ 
        error: 'Failed to fetch from public records API',
        status: apiResponse.status
      }, { status: 500 });
    }

    const apiData = await apiResponse.json();

    // Extract title information
    const titleData = {
      deal_id: dealId,
      parcel_number: apiData.parcelNumber || deal.parcel_number || '',
      county: apiData.county || '',
      state: apiData.state || deal.state || '',
      current_owner: apiData.ownerName || apiData.ownerOccupied?.name || '',
      transfer_date: apiData.lastSaleDate || '',
      deed_type: apiData.deedType || '',
      price: apiData.lastSalePrice || null,
      last_sync_date: new Date().toISOString(),
      raw_data: apiData,
      ownership_changed: false
    };

    // Check if ownership changed
    if (existingTitle && existingTitle.current_owner && titleData.current_owner) {
      if (existingTitle.current_owner !== titleData.current_owner) {
        titleData.ownership_changed = true;
        titleData.previous_owner = existingTitle.current_owner;

        // Create notification for ownership change
        await base44.entities.Notification.create({
          recipient_email: user.email,
          type: 'status_change',
          title: `Title Ownership Changed: ${deal.name}`,
          message: `Property ownership has changed from "${existingTitle.current_owner}" to "${titleData.current_owner}" on ${titleData.transfer_date}`,
          entity_type: 'deal',
          entity_id: dealId,
          related_user_email: user.email
        });

        // Send email notification
        await base44.integrations.Core.SendEmail({
          to: user.email,
          subject: `⚠️ Title Ownership Changed: ${deal.name}`,
          body: `The ownership of ${deal.name} has changed!\n\nPrevious Owner: ${existingTitle.current_owner}\nNew Owner: ${titleData.current_owner}\nTransfer Date: ${titleData.transfer_date}\nDeed Type: ${titleData.deed_type}\n\nPlease review and update your records accordingly.`
        });
      }
    }

    // Save or update title
    if (existingTitle) {
      await base44.entities.Title.update(existingTitle.id, titleData);
    } else {
      await base44.entities.Title.create(titleData);
    }

    return Response.json({
      success: true,
      ownershipChanged: titleData.ownership_changed,
      currentOwner: titleData.current_owner,
      previousOwner: titleData.previous_owner || null,
      transferDate: titleData.transfer_date,
      deedType: titleData.deed_type
    });
  } catch (error) {
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});