import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { latitude, longitude, address } = await req.json();

    if (!latitude || !longitude) {
      return Response.json({ error: 'latitude and longitude required' }, { status: 400 });
    }

    // Use LLM to generate market trend analysis based on location
    const marketData = await base44.integrations.Core.InvokeLLM({
      prompt: `Analyze the real estate market trends for the area around ${address || `${latitude}, ${longitude}`}. Provide:
      1. Average home prices in the area
      2. Price trends (up/down/stable) over the last 12 months
      3. Days on market average
      4. Market inventory levels
      5. Price per sqft average
      6. Market outlook (bullish/neutral/bearish)
      7. Key factors affecting the market
      
      Be specific and realistic based on the location provided.`,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          avgPrice: { type: "number" },
          pricePerSqft: { type: "number" },
          priceeTrend: { type: "string", enum: ["up", "down", "stable"] },
          priceChange12m: { type: "string" },
          daysOnMarket: { type: "number" },
          inventoryLevel: { type: "string", enum: ["low", "moderate", "high"] },
          marketOutlook: { type: "string", enum: ["bullish", "neutral", "bearish"] },
          demandLevel: { type: "string", enum: ["low", "moderate", "high"] },
          keyFactors: { type: "array", items: { type: "string" } },
          analysis: { type: "string" },
        },
      },
    });

    return Response.json(marketData || {});
  } catch (error) {
    console.error('Market trends fetch error:', error);
    return Response.json(
      { error: error.message || 'Failed to fetch market trends' },
      { status: 500 }
    );
  }
});