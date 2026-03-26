import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Get all deals
    const deals = await base44.asServiceRole.entities.Deal.list();

    let syncedCount = 0;
    let changesDetected = 0;

    for (const deal of deals) {
      if (!deal.id) continue;

      try {
        // Call the sync function for each deal
        const response = await fetch('http://localhost:7800/functions/syncTitleData', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': req.headers.get('Authorization') || ''
          },
          body: JSON.stringify({ dealId: deal.id })
        });

        if (response.ok) {
          const data = await response.json();
          syncedCount++;
          if (data.ownershipChanged) {
            changesDetected++;
          }
        }
      } catch (err) {
        console.error(`Failed to sync title for deal ${deal.id}:`, err.message);
      }
    }

    return Response.json({
      success: true,
      syncedCount,
      changesDetected,
      message: `Synced ${syncedCount} deals, detected ${changesDetected} ownership changes`
    });
  } catch (error) {
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});