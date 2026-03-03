import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { deal_id, competitor_sales, forecast_months = 12 } = body;

    if (!deal_id || !competitor_sales || competitor_sales.length === 0) {
      return Response.json({ error: 'Missing deal_id or competitor_sales' }, { status: 400 });
    }

    // Get deal info for context
    const deals = await base44.asServiceRole.entities.Deal.filter({ id: deal_id });
    const deal = deals[0] || {};

    // Calculate historical metrics
    const salesWithDates = competitor_sales.filter(s => s.sale_date);
    const pricesByMonth = {};
    const absorptionByMonth = {};
    
    salesWithDates.forEach(sale => {
      const date = new Date(sale.sale_date);
      const monthKey = date.toISOString().substring(0, 7);
      
      if (!pricesByMonth[monthKey]) {
        pricesByMonth[monthKey] = [];
        absorptionByMonth[monthKey] = 0;
      }
      pricesByMonth[monthKey].push(sale.sale_price);
      absorptionByMonth[monthKey]++;
    });

    const avgPriceHistory = Object.entries(pricesByMonth).map(([month, prices]) => ({
      month,
      avg_price: Math.round(prices.reduce((a, b) => a + b) / prices.length)
    })).sort((a, b) => a.month.localeCompare(b.month));

    const absorptionHistory = Object.entries(absorptionByMonth)
      .map(([month, count]) => ({ month, absorption: count }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // Use AI to forecast
    const prediction = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are a real estate market forecaster. Based on the historical data below, forecast the next ${forecast_months} months of market trends for a residential development in ${deal.city || ''}, ${deal.state || ''}.

Historical Average Prices by Month:
${JSON.stringify(avgPriceHistory.slice(-12), null, 2)}

Historical Absorption (sales per month):
${JSON.stringify(absorptionHistory.slice(-12), null, 2)}

Total competitor sales in dataset: ${competitor_sales.length}
Product types: ${[...new Set(competitor_sales.map(s => s.product_type))].join(', ')}

Provide monthly forecasts for the next ${forecast_months} months including:
1. Predicted average price movements (with % change)
2. Predicted absorption rate (units/month)
3. Market momentum direction (accelerating, stable, decelerating)
4. Key risks and opportunities
5. Recommended strategy implications

Format as structured JSON with month, predicted_price, price_change_pct, predicted_absorption, momentum, and notes for each month.`,
      response_json_schema: {
        type: "object",
        properties: {
          overall_trend: { type: "string", enum: ["bullish", "neutral", "bearish"] },
          avg_price_appreciation: { type: "number", description: "Expected % appreciation over forecast period" },
          absorption_outlook: { type: "string", enum: ["accelerating", "stable", "decelerating"] },
          forecasts: {
            type: "array",
            items: {
              type: "object",
              properties: {
                month_offset: { type: "number" },
                month_label: { type: "string" },
                predicted_price: { type: "number" },
                price_change_pct: { type: "number" },
                predicted_absorption: { type: "number" },
                momentum: { type: "string" },
                notes: { type: "string" }
              }
            }
          },
          strategic_recommendations: {
            type: "array",
            items: { type: "string" }
          },
          key_risks: {
            type: "array",
            items: { type: "string" }
          },
          confidence_level: { type: "string", enum: ["high", "medium", "low"] }
        }
      }
    });

    return Response.json({ success: true, prediction, historical: { avgPriceHistory, absorptionHistory } });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});