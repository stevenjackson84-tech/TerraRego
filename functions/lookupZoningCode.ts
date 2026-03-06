import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const SCRAPER_API_KEY = Deno.env.get("SCRAPER_API_KEY");

async function scrapeUrl(url) {
  const scraperUrl = `http://api.scraperapi.com?api_key=${SCRAPER_API_KEY}&url=${encodeURIComponent(url)}&render=false`;
  const res = await fetch(scraperUrl, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`Scrape failed: ${res.status}`);
  return await res.text();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { zoning_code, city, state, address } = await req.json();
    if (!zoning_code) return Response.json({ error: 'zoning_code is required' }, { status: 400 });

    const cityQuery = city || (address ? address.split(',').slice(-3).join(' ') : '');

    // Search for the city's zoning ordinance page
    const searchQuery = `${cityQuery} ${state || ''} zoning ordinance "${zoning_code}" lot size setback requirements site:*.gov OR site:*.us OR site:municode.com OR site:ecode360.com`;
    const searchUrl = `https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(searchQuery)}&num=3&key=nokey`;

    // Use ScraperAPI to search via Google
    const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}&num=5`;
    let searchHtml = "";
    try {
      searchHtml = await scrapeUrl(googleSearchUrl);
    } catch (e) {
      console.log("Search scrape failed:", e.message);
    }

    // Try common municode / ecode patterns for the city
    const citySlug = (city || "").toLowerCase().replace(/\s+/g, "-");
    const stateSlug = (state || "").toLowerCase();

    const candidateUrls = [
      `https://library.municode.com/search#q=${encodeURIComponent(`${zoning_code} ${cityQuery}`)}`,
      `https://www.municode.com/library/search?query=${encodeURIComponent(`${cityQuery} ${zoning_code} zoning`)}`,
    ];

    // Extract URLs from Google search HTML using LLM
    let scrapedText = "";

    const urlExtractResult = await base44.integrations.Core.InvokeLLM({
      prompt: `From this Google search HTML, extract up to 3 URLs that are likely to contain zoning ordinance information for "${zoning_code}" in "${cityQuery}". Look for .gov sites, municode.com, ecode360.com, or city official sites. Return only URLs, one per line, no explanation.

HTML snippet (first 8000 chars):
${searchHtml.slice(0, 8000)}`,
      response_json_schema: {
        type: "object",
        properties: {
          urls: { type: "array", items: { type: "string" } }
        }
      }
    });

    const urls = (urlExtractResult.urls || []).filter(u => u.startsWith("http")).slice(0, 2);

    // Scrape up to 2 candidate pages
    for (const url of urls) {
      try {
        const html = await scrapeUrl(url);
        scrapedText += `\n\n--- SOURCE: ${url} ---\n${html.slice(0, 12000)}`;
      } catch (e) {
        console.log(`Failed to scrape ${url}:`, e.message);
      }
    }

    // If no pages scraped, use internet-augmented LLM lookup as fallback
    if (!scrapedText.trim()) {
      console.log("No pages scraped, using internet-augmented LLM");
    }

    // Extract zoning standards using LLM
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a land use / zoning expert. Extract the exact dimensional standards for zoning district "${zoning_code}" in ${cityQuery || "the given city"}, ${state || ""}.

${scrapedText ? `Here is scraped zoning ordinance content to reference:\n${scrapedText.slice(0, 20000)}` : ""}

If you don't have scraped content, use your best knowledge of typical municipal zoning codes for this area. Be as accurate as possible. If you're estimating, note it in the source field.

Return the dimensional standards for zoning district "${zoning_code}":`,
      add_context_from_internet: !scrapedText.trim(),
      response_json_schema: {
        type: "object",
        properties: {
          min_lot_sf: { type: "number", description: "Minimum lot size in square feet" },
          min_lot_width_ft: { type: "number", description: "Minimum lot width in feet" },
          min_lot_depth_ft: { type: "number", description: "Minimum lot depth in feet" },
          setback_front: { type: "number", description: "Front yard setback in feet" },
          setback_rear: { type: "number", description: "Rear yard setback in feet" },
          setback_side: { type: "number", description: "Side yard setback in feet" },
          max_height_ft: { type: "number", description: "Maximum building height in feet" },
          max_density_du_per_acre: { type: "number", description: "Maximum density in dwelling units per acre" },
          max_lot_coverage_pct: { type: "number", description: "Maximum lot coverage percentage" },
          max_far: { type: "number", description: "Maximum floor area ratio" },
          permitted_uses: { type: "string", description: "Brief description of permitted uses" },
          source: { type: "string", description: "Source URL or note (e.g. 'Estimated based on typical R-2 standards')" },
          confidence: { type: "string", enum: ["high", "medium", "low"], description: "Confidence in accuracy" }
        }
      }
    });

    return Response.json({ success: true, standards: result });
  } catch (error) {
    console.error("lookupZoningCode error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});