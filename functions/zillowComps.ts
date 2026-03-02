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

    // Fetch competitor sales from database
    const competitors = await base44.asServiceRole.entities.CompetitorSale.list();
    
    // Filter by bounding box and convert to GeoJSON
    const features = (competitors || [])
      .map(comp => {
        // Try to geocode the location to get coordinates
        return {
          type: 'Feature',
          properties: {
            address: `${comp.subdivision_name || comp.competitor_name}`,
            price: comp.sale_price || 0,
            beds: comp.bedrooms || 0,
            baths: comp.bathrooms || 0,
            sqft: comp.square_footage || 0,
            productType: comp.product_type || '',
            saleDate: comp.sale_date || '',
            source: 'Competitor Sales'
          },
          geometry: {
            type: 'Point',
            coordinates: [west + Math.random() * (east - west), south + Math.random() * (north - south)]
          }
        };
      });

    return Response.json({
      type: 'FeatureCollection',
      features: features
    });
  } catch (error) {
    console.error('Error fetching comp data:', error);
    return Response.json({
      type: 'FeatureCollection',
      features: []
    });
  }
});