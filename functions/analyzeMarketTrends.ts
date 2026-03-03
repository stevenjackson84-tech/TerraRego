import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { deal_id, competitor_sales } = body;

    if (!deal_id || !competitor_sales || competitor_sales.length === 0) {
      return Response.json({ error: 'Missing deal_id or competitor_sales' }, { status: 400 });
    }

    // Prepare data for analysis
    const salesData = competitor_sales.map(sale => ({
      competitor: sale.competitor_name,
      product_type: sale.product_type,
      price: sale.sale_price,
      sqft: sale.square_footage,
      price_per_sqft: sale.square_footage ? Math.round(sale.sale_price / sale.square_footage) : null,
      date: sale.sale_date,
      bedrooms: sale.bedrooms,
      bathrooms: sale.bathrooms,
    }));

    // Get deal info for context
    const deal = await base44.entities.Deal.filter({ id: deal_id });
    const dealInfo = deal[0] || {};

    // Use AI to analyze trends
    const analysis = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are a real estate market analyst. Analyze the following competitor sales data for a deal in ${dealInfo.city || ''}, ${dealInfo.state || ''} and provide insights on market trends.

Sales Data:
${JSON.stringify(salesData, null, 2)}

Analyze and provide:
1. Pricing trends (average price, price range, price per sqft)
2. Product type distribution and their average prices
3. Sales velocity (if dates available, estimate monthly absorption)
4. Price competitiveness for different product types
5. Market opportunities and risks

Be concise and actionable.`,
      response_json_schema: {
        type: "object",
        properties: {
          average_price: { type: "number" },
          price_range: { type: "object", properties: { min: { type: "number" }, max: { type: "number" } } },
          avg_price_per_sqft: { type: "number" },
          product_type_analysis: {
            type: "array",
            items: {
              type: "object",
              properties: {
                product_type: { type: "string" },
                count: { type: "number" },
                avg_price: { type: "number" },
                avg_sqft: { type: "number" },
                avg_price_per_sqft: { type: "number" }
              }
            }
          },
          market_health: { type: "string", enum: ["strong", "moderate", "weak"] },
          key_insights: {
            type: "array",
            items: { type: "string" }
          },
          opportunities: {
            type: "array",
            items: { type: "string" }
          },
          risks: {
            type: "array",
            items: { type: "string" }
          }
        }
      }
    });

    return Response.json({ success: true, analysis });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});