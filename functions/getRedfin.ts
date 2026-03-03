import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { latitude, longitude, radius = 5 } = await req.json();

    if (!latitude || !longitude) {
      return Response.json({ error: 'latitude and longitude required' }, { status: 400 });
    }

    const apiKey = Deno.env.get('SCRAPER_API_KEY');
    if (!apiKey) {
      return Response.json({ error: 'ScraperAPI key not configured' }, { status: 500 });
    }

    // Build Redfin search URL with bounding box
    const latDelta = radius * 0.0145;
    const lngDelta = radius * 0.0145 / Math.cos(latitude * Math.PI / 180);
    
    const minLat = latitude - latDelta;
    const maxLat = latitude + latDelta;
    const minLng = longitude - lngDelta;
    const maxLng = longitude + lngDelta;

    // Redfin search URL with coordinates
    const redfinUrl = `https://www.redfin.com/search?bounds=${minLat},${minLng},${maxLat},${maxLng}&include=sold`;

    // Call ScraperAPI structured endpoint
    const scraperUrl = new URL('https://api.scraperapi.com/structured/redfin/search');
    scraperUrl.searchParams.append('api_key', apiKey);
    scraperUrl.searchParams.append('url', redfinUrl);
    scraperUrl.searchParams.append('country_code', 'US');
    scraperUrl.searchParams.append('tld', 'com');

    const response = await fetch(scraperUrl.toString());

    if (!response.ok) {
      return Response.json(
        { error: 'Failed to fetch from ScraperAPI', status: response.status },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Convert ScraperAPI response to GeoJSON
    const features = [];
    if (data.properties && Array.isArray(data.properties)) {
      data.properties.forEach((property) => {
        if (property.latitude && property.longitude) {
          features.push({
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [property.longitude, property.latitude],
            },
            properties: {
              id: property.id || property.url,
              price: property.price || property.last_sale_price,
              address: property.address,
              beds: property.beds,
              baths: property.baths,
              sqft: property.sqft,
              saleDate: property.last_sale_date,
              pricePerSqft: property.price_per_sqft,
              url: property.url,
              source: 'Redfin (ScraperAPI)',
              status: property.status,
            },
          });
        }
      });
    }

    return Response.json({
      type: 'FeatureCollection',
      features,
    });
  } catch (error) {
    console.error('Redfin fetch error:', error);
    return Response.json(
      { error: error.message || 'Failed to fetch Redfin data' },
      { status: 500 }
    );
  }
});