import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { latitude, longitude, radius = 1 } = await req.json();

    if (!latitude || !longitude) {
      return Response.json({ error: 'latitude and longitude required' }, { status: 400 });
    }

    const apiKey = Deno.env.get('SCRAPER_API_KEY');
    if (!apiKey) {
      return Response.json({ error: 'ScraperAPI key not configured' }, { status: 500 });
    }

    // Build Redfin search URL with bounding box for comps
    const latDelta = radius * 0.0145;
    const lngDelta = radius * 0.0145 / Math.cos(latitude * Math.PI / 180);
    
    const minLat = latitude - latDelta;
    const maxLat = latitude + latDelta;
    const minLng = longitude - lngDelta;
    const maxLng = longitude + lngDelta;

    const redfinUrl = `https://www.redfin.com/search?bounds=${minLat},${minLng},${maxLat},${maxLng}&include=sold,recently_sold`;

    // Call ScraperAPI structured endpoint
    const scraperUrl = new URL('https://api.scraperapi.com/structured/redfin/search');
    scraperUrl.searchParams.append('api_key', apiKey);
    scraperUrl.searchParams.append('url', redfinUrl);
    scraperUrl.searchParams.append('country_code', 'US');
    scraperUrl.searchParams.append('tld', 'com');

    const response = await fetch(scraperUrl.toString());

    if (!response.ok) {
      return Response.json(
        { error: 'Failed to fetch comps', status: response.status },
        { status: response.status }
      );
    }

    const data = await response.json();

    const comps = [];
    if (data.properties && Array.isArray(data.properties)) {
      data.properties.slice(0, 10).forEach((property) => {
        if (property.latitude && property.longitude) {
          comps.push({
            address: property.address,
            price: property.price || property.last_sale_price,
            beds: property.beds,
            baths: property.baths,
            sqft: property.sqft,
            pricePerSqft: property.price_per_sqft,
            saleDate: property.last_sale_date,
            daysAgo: property.days_on_market,
            latitude: property.latitude,
            longitude: property.longitude,
            url: property.url,
          });
        }
      });
    }

    return Response.json({
      comps,
      count: comps.length,
    });
  } catch (error) {
    console.error('Comps fetch error:', error);
    return Response.json(
      { error: error.message || 'Failed to fetch comps' },
      { status: 500 }
    );
  }
});