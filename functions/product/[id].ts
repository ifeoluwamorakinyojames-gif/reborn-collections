// Cloudflare Pages Function: crawlable, server-rendered product detail page.
const esc = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char] || char));
const money = (value: number) => '₦' + value.toLocaleString('en-NG');
export async function onRequestGet({ params }: { params: { id: string } }) {
  const id = String(params.id || '');
  if (!/^[a-zA-Z0-9._-]{1,150}$/.test(id) || id.startsWith('drafts.')) return new Response('Not found', { status: 404 });
  const query = '*[_type == "product" && _id == $id][0]{name,description,brand,category,price,salePrice,inStock,sizes,images[]{asset->{url}}}';
  const api = new URL('https://unv7o4vs.apicdn.sanity.io/v2026-09-29/data/query/production');
  api.searchParams.set('query', query);
  api.searchParams.set('$id', JSON.stringify(id));
  let product: any;
  try {
    const response = await fetch(api.toString(), { headers: { accept: 'application/json' } });
    if (!response.ok) throw new Error('Catalogue unavailable');
    product = (await response.json() as any).result;
  } catch {
    return new Response('Product temporarily unavailable', { status: 503, headers: { 'cache-control': 'no-store' } });
  }
  if (!product?.name) return new Response('Product not found', { status: 404 });
  const title = String(product.name);
  const description = String(product.description || 'Explore this REBORN Collections fashion item. Contact our team to confirm availability and order.');
  const price = Number(product.salePrice > 0 && product.salePrice < product.price ? product.salePrice : product.price);
  const validPrice = Number.isFinite(price) && price > 0;
  const images = (product.images || []).map((item: any) => item?.asset?.url).filter((url: any) => typeof url === 'string' && /^https:\/\/cdn\.sanity\.io\//.test(url));
  const canonical = 'https://reborncollections.com/product/' + encodeURIComponent(id);
  const previewImage = images[0] ? (() => { const url = new URL(images[0]); url.searchParams.set('w', '1200'); url.searchParams.set('h', '630'); url.searchParams.set('fit', 'crop'); url.searchParams.set('auto', 'format'); url.searchParams.set('q', '85'); return url.toString(); })() : '';
  const order = 'https://wa.me/2349060759664?text=' + encodeURIComponent('Hello REBORN, I would like to ask about ' + title + ': ' + canonical);
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org', '@type': 'Product', name: title, description,
    url: canonical, brand: { '@type': 'Brand', name: String(product.brand || 'REBORN') },
    ...(images.length ? { image: images } : {}),
    ...(validPrice ? { offers: { '@type': 'Offer', priceCurrency: 'NGN', price: price.toFixed(2), availability: product.inStock === false ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock', url: canonical, seller: { '@type': 'Organization', name: 'REBORN Collections' } } } : {})
  };
  const jsonld = JSON.stringify(schema).replace(/</g, '\\u003c');
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} — Price in Nigeria | REBORN Collections</title><meta name="description" content="${esc(description.slice(0, 160))}"><link rel="canonical" href="${esc(canonical)}"><meta property="og:type" content="product"><meta property="og:title" content="${esc(title)} | REBORN Collections"><meta property="og:description" content="${esc(description.slice(0, 160))}"><meta property="og:url" content="${esc(canonical)}">${previewImage ? `<meta property="og:image" content="${esc(previewImage)}"><meta property="og:image:secure_url" content="${esc(previewImage)}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="${esc(title)} product photograph"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="${esc(previewImage)}">` : ''}<script type="application/ld+json">${jsonld}</script><style>body{margin:0;font:16px/1.6 system-ui,sans-serif;color:#252525;background:#fff}header,main,footer{max-width:1080px;margin:auto;padding:22px}header{border-bottom:1px solid #eee}a{color:#943f18}h1{font-size:clamp(1.8rem,4vw,3rem)}.layout{display:grid;grid-template-columns:1fr 1fr;gap:32px}.gallery img{width:100%;height:auto;object-fit:contain;border-radius:12px}.buy{display:inline-block;padding:14px 22px;background:#1e6546;color:white;border-radius:8px;text-decoration:none}small{color:#666}@media(max-width:700px){.layout{grid-template-columns:1fr}}</style></head><body><header><a href="/">REBORN Collections</a> / <a href="/">Shop</a> / ${esc(product.category || 'Fashion')}</header><main><div class="layout"><div class="gallery">${images.length ? images.map((img: string, i: number) => `<img loading="${i ? 'lazy' : 'eager'}" src="${esc(img)}" alt="${esc(title)} photograph ${i+1}">`).join('') : '<p>Product photograph currently unavailable. Contact us for current photos.</p>'}</div><div><small>${esc(product.brand || 'REBORN')} · ${esc(product.category || 'Fashion')}</small><h1>${esc(title)}</h1>${validPrice ? `<h2>${money(price)}</h2>` : '<p>Contact us for current pricing.</p>'}<p>${esc(description)}</p>${Array.isArray(product.sizes) && product.sizes.length ? `<p><strong>Listed sizes:</strong> ${product.sizes.map(esc).join(', ')}</p>` : ''}<p><strong>Availability:</strong> ${product.inStock === false ? 'Currently marked out of stock' : 'Please confirm before payment'}</p><a class="buy" href="${esc(order)}" rel="noopener noreferrer">Enquire / order on WhatsApp</a><p><small>Confirm availability, size, delivery and final total before paying.</small></p></div></div></main><footer>REBORN Collections · Warri, Delta State, Nigeria</footer></body></html>`;
  return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=0, s-maxage=300' } });
}
