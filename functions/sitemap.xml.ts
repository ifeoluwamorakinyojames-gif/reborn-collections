// Server-generated sitemap: only real, indexable pages and published products.
export async function onRequestGet() {
  const api = new URL('https://unv7o4vs.apicdn.sanity.io/v2026-09-29/data/query/production');
  api.searchParams.set('query', '*[_type == "product" && defined(name) && !(_id in path("drafts.**"))]._id');
  let ids: string[] = [];
  try {
    const response = await fetch(api.toString());
    if (!response.ok) throw new Error('Sanity unavailable');
    const payload = await response.json() as { result?: unknown };
    ids = Array.isArray(payload.result) ? payload.result.filter((id): id is string => typeof id === 'string' && /^[a-zA-Z0-9._-]{1,150}$/.test(id)) : [];
  } catch {
    // A temporary Sanity outage should not generate an empty indexable sitemap.
    return new Response('Sitemap temporarily unavailable', { status: 503, headers: { 'cache-control': 'no-store' } });
  }
  const base = 'https://reborncollections.com';
  const urls = [base + '/', ...ids.map((id) => base + '/product/' + encodeURIComponent(id))];
  const xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + urls.map((url) => '<url><loc>' + url.replace(/&/g, '&amp;') + '</loc></url>').join('') + '</urlset>';
  return new Response(xml, { headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=0, s-maxage=3600' } });
}
