const PROJECT_ID = 'unv7o4vs';
const DATASET = 'production';
const API_VERSION = '2026-09-29';
const slugify = (value: string) => value.toLowerCase().normalize('NFKD').replace(/[\\u0300-\\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const xml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

export const onRequest: PagesFunction = async () => {
  try {
    const groq = '*[_type == "product"]{name,_updatedAt}';
    const endpoint = `https://${PROJECT_ID}.api.sanity.io/v${API_VERSION}/data/query/${DATASET}?query=${encodeURIComponent(groq)}`;
    const response = await fetch(endpoint, { headers: { Accept: 'application/json' }, cf: { cacheTtl: 300, cacheEverything: true } });
    if (!response.ok) throw new Error('Sanity sitemap query failed');
    const payload = await response.json() as { result?: Array<{ name?: string; _updatedAt?: string }> };
    const products = (payload.result || []).filter((p) => p.name && slugify(p.name));
    const urls = products.map((product) => {
      const loc = `https://reborncollections.com/products/${slugify(product.name || '')}`;
      const lastmod = product._updatedAt ? `<lastmod>${xml(product._updatedAt.slice(0, 10))}</lastmod>` : '';
      return `<url><loc>${xml(loc)}</loc>${lastmod}<changefreq>weekly</changefreq><priority>0.8</priority></url>`;
    }).join('');
    const staticUrls = ['/', '/shop/', '/wholesale/', '/faq/', '/about/', '/journal/', '/women/', '/men/', '/men/denim/', '/unisex/', '/kids/', '/wigs/', '/shoes/', '/perfumes/', '/accessories/', '/promo/combo-sales/']
      .map((path) => `<url><loc>https://reborncollections.com${path}</loc></url>`).join('');
    const body = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${staticUrls}${urls}</urlset>`;
    return new Response(body, { headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=300, s-maxage=900' } });
  } catch (error) {
    console.error('Sitemap generation error', error);
    return new Response('Sitemap temporarily unavailable', { status: 503, headers: { 'content-type': 'text/plain; charset=utf-8' } });
  }
};
