import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { properties, filename = 'map-export.csv' } = await req.json();

    if (!properties || !Array.isArray(properties)) {
      return Response.json({ error: 'properties array required' }, { status: 400 });
    }

    if (properties.length === 0) {
      return Response.json({ error: 'No properties to export' }, { status: 400 });
    }

    // Extract all unique keys from properties
    const headers = new Set();
    properties.forEach(prop => {
      Object.keys(prop).forEach(key => headers.add(key));
    });

    const headerArray = Array.from(headers).sort();

    // Build CSV content
    const csvLines = [headerArray.join(',')];

    properties.forEach(prop => {
      const row = headerArray.map(header => {
        const value = prop[header];
        if (value === null || value === undefined) return '';
        
        // Handle strings that contain commas or quotes
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      });
      csvLines.push(row.join(','));
    });

    const csvContent = csvLines.join('\n');

    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv;charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return Response.json(
      { error: error.message || 'Failed to export data' },
      { status: 500 }
    );
  }
});