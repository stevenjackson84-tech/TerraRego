import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    // Support both direct call and entity automation payload
    const deal = body.data || body.deal;
    const dealId = body.event?.entity_id || body.deal_id;

    if (!dealId) {
      return Response.json({ error: 'Missing deal_id' }, { status: 400 });
    }

    // Only proceed if we have enough location info
    const city = deal?.city;
    const state = deal?.state;
    const propertyType = deal?.property_type;
    const zoning = deal?.zoning_target || deal?.zoning_current;

    if (!city && !state) {
      return Response.json({ skipped: true, reason: 'No location info on deal' });
    }

    // Check if we already have recent competitor sales for this deal (avoid duplicating)
    const existingSales = await base44.asServiceRole.entities.CompetitorSale.filter({ deal_id: dealId });
    if (existingSales.length > 0) {
      return Response.json({ skipped: true, reason: 'Competitor sales already exist for this deal' });
    }

    // Use AI to research and generate realistic competitor sales data
    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are a real estate market research analyst. Generate realistic recent competitor sales data for a residential land development deal with the following details:

Location: ${city || ''}${city && state ? ', ' : ''}${state || ''}
Property Type: ${propertyType || 'residential'}
Zoning: ${zoning || 'unknown'}

Search for and provide 5-8 realistic recent competitor/comparable home sales in this market area. Base these on your knowledge of typical home prices and builders in this region. Include a variety of product types (single family, townhome, etc.) that would be relevant competitors.

For each sale provide realistic data that reflects the actual market in ${city || 'this area'}, ${state || ''}.`,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          sales: {
            type: "array",
            items: {
              type: "object",
              properties: {
                competitor_name: { type: "string", description: "Builder or seller name" },
                subdivision_name: { type: "string", description: "Community or subdivision name" },
                product_type: { type: "string", description: "e.g. Single Family, Townhome" },
                sale_price: { type: "number" },
                square_footage: { type: "number" },
                bedrooms: { type: "number" },
                bathrooms: { type: "number" },
                sale_date: { type: "string", description: "YYYY-MM-DD format, within the last 12 months" },
                location: { type: "string", description: "General area/address" },
                notes: { type: "string" }
              },
              required: ["competitor_name", "product_type", "sale_price"]
            }
          }
        }
      }
    });

    const sales = result?.sales || [];
    if (sales.length === 0) {
      return Response.json({ success: true, imported: 0, message: 'AI returned no sales data' });
    }

    const created = [];
    for (const sale of sales) {
      if (!sale.sale_price) continue;
      const record = await base44.asServiceRole.entities.CompetitorSale.create({
        deal_id: dealId,
        competitor_name: sale.competitor_name || 'Unknown',
        subdivision_name: sale.subdivision_name || '',
        product_type: sale.product_type || 'Unknown',
        sale_price: parseFloat(sale.sale_price),
        square_footage: sale.square_footage ? parseFloat(sale.square_footage) : null,
        bedrooms: sale.bedrooms ? parseFloat(sale.bedrooms) : null,
        bathrooms: sale.bathrooms ? parseFloat(sale.bathrooms) : null,
        sale_date: sale.sale_date || null,
        location: sale.location || `${city || ''} ${state || ''}`.trim(),
        notes: (sale.notes || '') + ' [AI Auto-fetched]'
      });
      created.push(record);
    }

    return Response.json({ success: true, imported: created.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});