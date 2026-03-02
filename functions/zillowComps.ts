import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { south, west, north, east } = await req.json();

    if (south === undefined || west === undefined || north === undefined || east === undefined) {
      return Response.json({ error: 'Missing bounds parameters' }, { status: 400 });
    }

    // Use Zillow API via Rapid API (requires ZILLOW_API_KEY secret)
    // Alternative: Use Redfin, Realtor.com, or other real estate APIs
    // For now, using a free/public real estate data source approach
    
    // Fetch properties from Realtor.com API (public endpoint) as Zillow alternative
    const searchUrl = `https://realty-mole-property-api.p.rapidapi.com/properties?latitude=${(south + north) / 2}&longitude=${(west + east) / 2}&radius=5&limit=50`;
    
    const response = await fetch(searchUrl, {
      method: 'GET',
      headers: {
        'x-rapidapi-host': 'realty-mole-property-api.p.rapidapi.com',
        'x-rapidapi-key': Deno.env.get('REALTOR_API_KEY') || '',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      // Fallback: Return empty result if API not configured
      console.warn('Realtor API failed:', response.status);
      return Response.json({
        type: 'FeatureCollection',
        features: []
      });
    }

    const data = await response.json();
    
    // Convert to GeoJSON format
    const features = (data.properties || [])
      .filter(prop => prop.latitude && prop.longitude && prop.propertyType === 'Single Family')
      .map(prop => ({
        type: 'Feature',
        properties: {
          address: `${prop.address}, ${prop.city}, ${prop.state}`,
          price: prop.zestimate || prop.price || 0,
          beds: prop.bedrooms || 0,
          baths: prop.bathrooms || 0,
          sqft: prop.squareFeet || 0,
          url: prop.url || `https://www.zillow.com/homedetails/${prop.zpid}`,
          status: 'for_sale',
          daysOnMarket: prop.daysOnMarket || 0
        },
        geometry: {
          type: 'Point',
          coordinates: [prop.longitude, prop.latitude]
        }
      }));

    return Response.json({
      type: 'FeatureCollection',
      features: features
    });
  } catch (error) {
    console.error('Error fetching Zillow comps:', error);
    return Response.json({
      type: 'FeatureCollection',
      features: []
    });
  }
});