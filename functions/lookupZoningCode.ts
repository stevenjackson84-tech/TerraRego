import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const SCRAPER_API_KEY = Deno.env.get("SCRAPER_API_KEY");

async function scrapeUrl(url) {
  if (!SCRAPER_API_KEY) throw new Error("No scraper key");
  const scraperUrl = `http://api.scraperapi.com?api_key=${SCRAPER_API_KEY}&url=${encodeURIComponent(url)}&render=false`;
  const res = await fetch(scraperUrl, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`Scrape failed: ${res.status}`);
  return await res.text();
}

// Geocode address to lat/lng using Nominatim (free, no key needed)
async function geocodeAddress(address) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;
  const res = await fetch(url, {
    headers: { "User-Agent": "ParcelrApp/1.0" },
    signal: AbortSignal.timeout(8000)
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data?.length) return null;
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), display_name: data[0].display_name };
}

// Look up zoning via Zoneomics free API (no key required for basic)
async function fetchZoneomics(lat, lng) {
  try {
    const url = `https://zoneomics.com/api/v2/zoning?lat=${lat}&lng=${lng}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.zone_code ? data : null;
  } catch {
    return null;
  }
}

// Look up zoning via OpenStreetMap Overpass (checks land-use tags)
async function fetchOSMZoning(lat, lng) {
  try {
    const delta = 0.001;
    const query = `[out:json][timeout:8];(way["landuse"](${lat-delta},${lng-delta},${lat+delta},${lng+delta});relation["landuse"](${lat-delta},${lng-delta},${lat+delta},${lng+delta}););out tags;`;
    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      body: query,
      signal: AbortSignal.timeout(10000)
    });
    if (!res.ok) return null;
    const data = await res.json();
    const el = data?.elements?.[0];
    if (!el) return null;
    return {
      land_use: el.tags?.landuse,
      zone: el.tags?.zone,
      zoning: el.tags?.zoning,
      residential: el.tags?.residential,
    };
  } catch {
    return null;
  }
}

// Scrape municode or ecode360 for the given city + zoning code
async function scrapeOrdinance(zoning_code, city, state) {
  const cityQuery = `${city} ${state}`.trim();
  let scrapedText = "";

  // Try Google search via scraper
  const searchQuery = `${cityQuery} zoning ordinance "${zoning_code}" lot size setback requirements site:municode.com OR site:ecode360.com OR site:*.gov`;
  const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}&num=5`;
  let searchHtml = "";
  try { searchHtml = await scrapeUrl(googleUrl); } catch {}

  if (searchHtml) {
    // Extract URLs from search results
    const urlPattern = /https?:\/\/[^\s"<>]+(?:municode|ecode360|\.gov)[^\s"<>]*/gi;
    const found = [...searchHtml.matchAll(urlPattern)]
      .map(m => m[0].replace(/&amp;/g, "&"))
      .filter(u => !u.includes("google") && u.length < 300)
      .slice(0, 2);

    for (const url of found) {
      try {
        const html = await scrapeUrl(url);
        scrapedText += `\n--- SOURCE: ${url} ---\n${html.slice(0, 10000)}`;
      } catch {}
    }
  }

  return scrapedText;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { zoning_code, city, state, address } = await req.json();
    if (!zoning_code && !address) {
      return Response.json({ error: 'zoning_code or address required' }, { status: 400 });
    }

    const cityQuery = city || (address ? address.split(',').slice(-3, -1).join(', ') : '');
    const stateQuery = state || (address ? address.split(',').slice(-1)[0]?.trim() : '');

    let geocodeResult = null;
    let zoneomicsData = null;
    let osmData = null;
    let detectedZoningCode = zoning_code;

    // Step 1: Geocode the address if provided
    if (address) {
      console.log("Geocoding address:", address);
      geocodeResult = await geocodeAddress(address);
      if (geocodeResult) {
        console.log("Geocoded:", geocodeResult.lat, geocodeResult.lng);

        // Step 2: Try Zoneomics for real zoning data
        zoneomicsData = await fetchZoneomics(geocodeResult.lat, geocodeResult.lng);
        if (zoneomicsData) {
          console.log("Zoneomics data:", JSON.stringify(zoneomicsData).slice(0, 500));
          detectedZoningCode = zoneomicsData.zone_code || detectedZoningCode;
        }

        // Step 3: OSM fallback for land use context
        osmData = await fetchOSMZoning(geocodeResult.lat, geocodeResult.lng);
        if (osmData) console.log("OSM data:", JSON.stringify(osmData));
      }
    }

    // Step 4: Try to scrape actual ordinance pages
    const scrapedText = await scrapeOrdinance(detectedZoningCode || zoning_code, cityQuery, stateQuery).catch(() => "");

    // Step 5: AI synthesis - combine all data sources
    const contextParts = [];
    if (geocodeResult) contextParts.push(`Parcel location: ${geocodeResult.display_name} (${geocodeResult.lat}, ${geocodeResult.lng})`);
    if (zoneomicsData) contextParts.push(`Zoneomics API data: ${JSON.stringify(zoneomicsData)}`);
    if (osmData) contextParts.push(`OpenStreetMap land use: ${JSON.stringify(osmData)}`);
    if (scrapedText) contextParts.push(`Scraped ordinance content:\n${scrapedText.slice(0, 18000)}`);

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a land use and zoning expert. Extract precise dimensional standards for zoning district "${detectedZoningCode || zoning_code}" in ${cityQuery || "this location"}, ${stateQuery || ""}.

${contextParts.length ? contextParts.join('\n\n') : ''}

Using all available data sources above (prefer real API/scraped data over estimates), extract the complete zoning standards. If Zoneomics or scraped ordinance data is available, use those values precisely. If estimating, mark confidence as "low".

Return dimensional standards for zoning district "${detectedZoningCode || zoning_code}":`,
      add_context_from_internet: !scrapedText && !zoneomicsData,
      response_json_schema: {
        type: "object",
        properties: {
          detected_zoning_code: { type: "string", description: "The actual zoning code identified (may differ from input)" },
          zoning_description: { type: "string", description: "Full name/description of the zoning district" },
          min_lot_sf: { type: "number" },
          min_lot_width_ft: { type: "number" },
          min_lot_depth_ft: { type: "number" },
          setback_front: { type: "number" },
          setback_rear: { type: "number" },
          setback_side: { type: "number" },
          max_height_ft: { type: "number" },
          max_density_du_per_acre: { type: "number" },
          max_lot_coverage_pct: { type: "number" },
          max_far: { type: "number" },
          min_parking_spaces: { type: "number" },
          permitted_uses: { type: "string" },
          conditional_uses: { type: "string" },
          special_requirements: { type: "string", description: "Any special design or development requirements" },
          source: { type: "string" },
          confidence: { type: "string", enum: ["high", "medium", "low"] },
          data_sources_used: { type: "array", items: { type: "string" }, description: "Which data sources were used: geocoder, zoneomics, osm, scraper, llm_knowledge" }
        }
      }
    });

    // Attach any raw API data for transparency
    return Response.json({
      success: true,
      standards: result,
      geocode: geocodeResult ? { lat: geocodeResult.lat, lng: geocodeResult.lng, display: geocodeResult.display_name } : null,
      zoneomics_raw: zoneomicsData,
    });

  } catch (error) {
    console.error("lookupZoningCode error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});