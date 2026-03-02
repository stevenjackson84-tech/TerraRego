import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const zondaApiKey = Deno.env.get('ZONDA_API_KEY');
    if (!zondaApiKey) {
      return Response.json({ error: 'ZONDA_API_KEY not configured' }, { status: 500 });
    }

    const { address, city, state } = await req.json();

    if (!address || !city || !state) {
      return Response.json({ error: 'Missing required fields: address, city, state' }, { status: 400 });
    }

    // Search for communities/properties in the area
    const searchUrl = `https://api.zonda.com/v1/search?q=${encodeURIComponent(address + ' ' + city + ' ' + state)}&type=property`;
    
    const searchRes = await fetch(searchUrl, {
      headers: {
        'Authorization': `Bearer ${zondaApiKey}`,
        'Accept': 'application/json'
      }
    });

    if (!searchRes.ok) {
      console.warn('Zonda search failed:', await searchRes.text());
      return Response.json({ error: 'Failed to search Zonda market data' }, { status: 502 });
    }

    const searchData = await searchRes.json();

    if (!searchData.results || searchData.results.length === 0) {
      return Response.json({
        message: 'No market data available for this location',
        data: null
      });
    }

    const property = searchData.results[0];

    // Fetch detailed market analysis
    const analysisUrl = `https://api.zonda.com/v1/properties/${property.id}/market`;
    
    const analysisRes = await fetch(analysisUrl, {
      headers: {
        'Authorization': `Bearer ${zondaApiKey}`,
        'Accept': 'application/json'
      }
    });

    if (!analysisRes.ok) {
      return Response.json({ error: 'Failed to fetch market analysis' }, { status: 502 });
    }

    const marketData = await analysisRes.json();

    // Extract competitors
    const competitorUrl = `https://api.zonda.com/v1/properties/${property.id}/competitors`;
    
    const competitorRes = await fetch(competitorUrl, {
      headers: {
        'Authorization': `Bearer ${zondaApiKey}`,
        'Accept': 'application/json'
      }
    });

    let competitors = [];
    if (competitorRes.ok) {
      const competitorData = await competitorRes.json();
      competitors = competitorData.competitors || [];
    }

    return Response.json({
      success: true,
      property: {
        id: property.id,
        name: property.name,
        address: property.address,
        city: property.city,
        state: property.state
      },
      market: {
        averageSalePrice: marketData.average_sale_price,
        medianSalePrice: marketData.median_sale_price,
        pricePerSquareFoot: marketData.price_per_sqft,
        daysOnMarket: marketData.days_on_market,
        absorptionRate: marketData.absorption_rate,
        inventory: marketData.inventory,
        saleTrend: marketData.sale_trend,
        marketCondition: marketData.market_condition
      },
      competitors: competitors.slice(0, 5).map(c => ({
        name: c.name,
        address: c.address,
        distance: c.distance,
        averagePrice: c.average_price,
        pricePerSquareFoot: c.price_per_sqft,
        totalUnits: c.total_units,
        availableUnits: c.available_units
      }))
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});