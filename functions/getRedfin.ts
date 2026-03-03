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

    // Convert radius miles to degrees (approximately 1 mile = 0.0145 degrees)
    const latDelta = radius * 0.0145;
    const lngDelta = radius * 0.0145 / Math.cos(latitude * Math.PI / 180);

    // Redfin API endpoint for property search
    const url = `https://www.redfin.com/stingray/api/gis?al=1&num_homes=100&ltlat=${latitude - latDelta}&lnglat=${longitude - lngDelta}&rtlat=${latitude + latDelta}&rnglat=${longitude + lngDelta}&type=2,3,6,9&status=9&offset=0&count=100`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      return Response.json(
        { error: 'Failed to fetch Redfin data', status: response.status },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Convert Redfin response to GeoJSON
    const features = [];
    if (data.payload?.homes) {
      data.payload.homes.forEach((home) => {
        if (home.latLng) {
          features.push({
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [home.latLng.lng, home.latLng.lat],
            },
            properties: {
              id: home.id,
              price: home.price,
              address: home.streetLine?.full,
              beds: home.beds,
              baths: home.baths,
              sqft: home.sqft,
              saleDate: home.saleDate,
              pricePerSqft: home.pricePerSqft,
              url: home.url,
              source: 'Redfin',
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