import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { propertyUrl } = await req.json();

    if (!propertyUrl) {
      return Response.json({ error: 'propertyUrl required' }, { status: 400 });
    }

    const apiKey = Deno.env.get('SCRAPER_API_KEY');
    if (!apiKey) {
      return Response.json({ error: 'ScraperAPI key not configured' }, { status: 500 });
    }

    // Call ScraperAPI structured endpoint for property details
    const scraperUrl = new URL('https://api.scraperapi.com/structured/redfin/property');
    scraperUrl.searchParams.append('api_key', apiKey);
    scraperUrl.searchParams.append('url', propertyUrl);
    scraperUrl.searchParams.append('country_code', 'US');
    scraperUrl.searchParams.append('tld', 'com');

    const response = await fetch(scraperUrl.toString());

    if (!response.ok) {
      return Response.json(
        { error: 'Failed to fetch property details', status: response.status },
        { status: response.status }
      );
    }

    const data = await response.json();

    return Response.json({
      address: data.address,
      price: data.price,
      beds: data.beds,
      baths: data.baths,
      sqft: data.sqft,
      lotSize: data.lot_size,
      yearBuilt: data.year_built,
      pricePerSqft: data.price_per_sqft,
      description: data.description,
      images: data.images || [],
      priceHistory: data.price_history || [],
      schoolRatings: data.schools || [],
      propertyType: data.property_type,
      daysOnMarket: data.days_on_market,
      zestimate: data.zestimate,
      taxes: data.taxes,
      hoaFee: data.hoa_fee,
      latitude: data.latitude,
      longitude: data.longitude,
      url: propertyUrl,
    });
  } catch (error) {
    console.error('Property details fetch error:', error);
    return Response.json(
      { error: error.message || 'Failed to fetch property details' },
      { status: 500 }
    );
  }
});