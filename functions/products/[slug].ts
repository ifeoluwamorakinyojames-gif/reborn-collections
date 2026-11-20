type Env = { SANITY_PROJECT_ID?: string; SANITY_DATASET?: string; };
type PagesContext = { params: Record<string, string | string[]>; env: Env; request: Request; };

const PROJECT_ID = 'unv7o4vs';
const DATASET = 'production';
const API_VERSION = '2026-09-29';
const SITE = 'https://reborncollections.com';

const slugify = (value: string) => value.toLowerCase().normalize('NFKD').replace(/[\\u0300-\\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const esc = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!));
const money = (value: unknown) => '₦' + Number(value || 0).toLocaleString('en-NG');
const json = (value: unknown) => JSON.stringify(value).replace(/</g, '\\u003c');

export const onRequest = async ({ params, env }: PagesContext) => {
  const slug = String(params.slug || '');
  const projectId = env.SANITY_PROJECT_ID || PROJECT_ID;
  const dataset = env.SANITY_DATASET || DATASET;
  const groq = '*[_type == "product"]{_id,name,category,subcategory,brand,price,wholesalePrice,description,inStock,badge,salePrice,sizes,colors,images[]{asset->{url}},_updatedAt}';
  const endpoint = `https://${projectId}.api.sanity.io/v${API_VERSION}/data/query/${dataset}?query=${encodeURIComponent(groq)}`;

  try {
    const response = await fetch(endpoint, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error('Sanity product query failed');
    const payload = await response.json() as { result?: any[] };
    const products = payload.result || [];
    const product = products.find((item) => slugify(item.name || '') + '-' + String(item._id || '').slice(-6).toLowerCase() === slug);
    if (!product) return new Response('Product not found', { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8' } });

    const name = String(product.name || 'REBORN product');
    const brand = String(product.brand || 'REBORN');
    const category = String(product.category || 'Fashion');
    const description = String(product.description || `Shop ${name} at REBORN Collections. Retail and wholesale fashion in Nigeria.`);
    const shortDescription = description.replace(/\\s+/g, ' ').slice(0, 158);
    const price = Number(product.salePrice && product.salePrice < product.price ? product.salePrice : product.price || 0);
    const images = (product.images || []).map((image: any) => image?.asset?.url).filter(Boolean);
    const image = images[0] || 'https://reborncollections.com/favicon-192.png';
    const canonical = `${SITE}/products/${slug}`;
    const whatsapp = '2349060759664';
    const productJsonLd = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name,
      description,
      image: images.length ? images : [image],
      sku: product._id,
      brand: { '@type': 'Brand', name: brand },
      category,
      offers: {
        '@type': 'Offer',
        url: canonical,
        priceCurrency: 'NGN',
        price: price.toFixed(2),
        availability: product.inStock === false ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
        seller: { '@type': 'Organization', name: 'REBORN Collections', url: SITE }
      }
    };
    const breadcrumb = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE + '/' },
        { '@type': 'ListItem', position: 2, name: category, item: SITE + '/#collection/' + slugify(category) },
        { '@type': 'ListItem', position: 3, name, item: canonical }
      ]
    };
    const sizes = Array.isArray(product.sizes) ? product.sizes : [];
    const colors = Array.isArray(product.colors) ? product.colors : [];
    const imageMarkup = (images.length ? images : [image]).map((url: string, index: number) => `<img src="${esc(url)}" alt="${esc(name)} - product image ${index + 1}" loading="${index ? 'lazy' : 'eager'}">`).join('');
    const checkoutText = encodeURIComponent(`Hello REBORN, I want to buy ${name}. Please confirm availability and delivery details.`);
    const html = `<!doctype html><html lang="en-NG"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(name)} | Buy Online in Nigeria | REBORN Collections</title><meta name="description" content="${esc(shortDescription)}"><meta name="robots" content="index,follow,max-image-preview:large"><link rel="canonical" href="${canonical}"><meta property="og:type" content="product"><meta property="og:site_name" content="REBORN Collections"><meta property="og:url" content="${canonical}"><meta property="og:title" content="${esc(name)} | REBORN Collections"><meta property="og:description" content="${esc(shortDescription)}"><meta property="og:image" content="${esc(image)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(name)} | REBORN Collections"><meta name="twitter:description" content="${esc(shortDescription)}"><meta name="twitter:image" content="${esc(image)}"><script type="application/ld+json">${json(productJsonLd)}</script><script type="application/ld+json">${json(breadcrumb)}</script><style>*{box-sizing:border-box}body{margin:0;font-family:Arial,Helvetica,sans-serif;color:#211d1a;background:#fff}a{color:inherit}.top{padding:18px 5%;border-bottom:1px solid #eee;display:flex;justify-content:space-between;align-items:center}.brand{font-size:24px;font-weight:800;letter-spacing:3px;text-decoration:none}.top a:last-child{font-size:14px}.wrap{max-width:1120px;margin:42px auto;padding:0 22px}.crumb{font-size:13px;color:#777;margin-bottom:26px}.crumb a{color:#777}.product{display:grid;grid-template-columns:1.05fr .95fr;gap:52px;align-items:start}.gallery{display:grid;grid-template-columns:1fr 1fr;gap:12px}.gallery img{width:100%;height:auto;max-height:650px;object-fit:contain;background:#f7f5f2;border-radius:8px}.gallery img:first-child{grid-column:1/-1;max-height:620px}.tag{font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:#8b6b4a}.detail h1{font-size:clamp(30px,4vw,44px);line-height:1.12;margin:12px 0}.price{font-size:26px;font-weight:700;margin:18px 0}.desc{line-height:1.8;color:#555;white-space:pre-line}.meta{padding:18px 0;border-top:1px solid #eee;border-bottom:1px solid #eee;margin:24px 0;line-height:2;color:#555}.actions{display:flex;flex-wrap:wrap;gap:12px}.actions a{display:inline-block;padding:15px 22px;border-radius:5px;text-decoration:none;font-weight:700;background:#211d1a;color:#fff}.actions a.secondary{background:#f1eee9;color:#211d1a}.stock{font-size:13px;font-weight:700;color:${product.inStock === false ? '#a33' : '#28744a'}}.more{margin-top:48px;padding-top:24px;border-top:1px solid #eee;color:#666;line-height:1.8}footer{margin-top:60px;padding:28px 5%;background:#211d1a;color:#fff;text-align:center;font-size:13px}@media(max-width:760px){.wrap{margin:24px auto}.product{grid-template-columns:1fr;gap:28px}.gallery img:first-child{max-height:500px}.detail h1{font-size:32px}.top{padding:15px 20px}}</style></head><body><header class="top"><a class="brand" href="/">REBORN</a><a href="/#shop">Continue shopping</a></header><main class="wrap"><nav class="crumb"><a href="/">Home</a> / <a href="/#collection/${slugify(category)}">${esc(category)}</a> / ${esc(name)}</nav><article class="product"><div class="gallery">${imageMarkup}</div><section class="detail"><div class="tag">${esc(brand)} · ${esc(category)}</div><h1>${esc(name)}</h1><div class="price">${money(price)}</div><p class="stock">${product.inStock === false ? 'Currently unavailable' : 'Available — confirm stock before payment'}</p><p class="desc">${esc(description)}</p><div class="meta">${product.subcategory ? `<div><strong>Collection:</strong> ${esc(product.subcategory)}</div>` : ''}${sizes.length ? `<div><strong>Sizes:</strong> ${sizes.map(esc).join(', ')}</div>` : ''}${colors.length ? `<div><strong>Colours:</strong> ${colors.map(esc).join(', ')}</div>` : ''}<div><strong>Shopping:</strong> Retail and wholesale enquiries</div><div><strong>Location:</strong> Warri, Delta State, Nigeria</div></div><div class="actions"><a href="https://wa.me/${whatsapp}?text=${checkoutText}" target="_blank" rel="noopener noreferrer">Order on WhatsApp</a><a class="secondary" href="/#shop">Browse more products</a></div><div class="more">REBORN Collections offers fashion, footwear, wigs, perfumes and accessories for retail and wholesale customers in Nigeria. Contact our team on WhatsApp to confirm current stock, sizes, pricing and delivery arrangements.</div></section></article></main><footer>© REBORN Collections · Wholesale & Retail · Warri, Delta State, Nigeria</footer></body></html>`;
    return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=60, s-maxage=300' } });
  } catch (error) {
    console.error('Product page error', error);
    return new Response('Unable to load this product right now. Please try again shortly.', { status: 503, headers: { 'content-type': 'text/plain; charset=utf-8', 'retry-after': '60' } });
  }
};
