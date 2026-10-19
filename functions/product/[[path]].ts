/**
 * Cloudflare Pages product landing route: serves index.html with product-specific
 * server-rendered Open Graph/Twitter metadata for Facebook and WhatsApp crawlers.
 * This is deliberately a public READ-ONLY Sanity query; no write tokens are used.
 */
type ProductContext = {
  request: Request;
  params: { path?: string | string[] };
  env: {
    ASSETS: { fetch(request: Request): Promise<Response> };
    SANITY_PROJECT_ID?: string;
    SANITY_DATASET?: string;
  };
};

type SharedProduct = {
  _id: string;
  name: string;
  description?: string;
  category?: string;
  brand?: string;
  price?: number;
  salePrice?: number;
  inStock?: boolean;
  image?: string;
};

const QUERY = `*[_type == "product" && _id == $id][0]{
  _id, name, description, category, brand, price, salePrice, inStock,
  "image": coalesce(adImage.asset->url, images[0].asset->url)
}`;

const htmlHandler = (value: string) => ({ element(element: any) { element.setInnerContent(value); } });
const contentHandler = (value: string) => ({ element(element: any) { element.setAttribute('content', value); } });

function imageForSocial(image: string | undefined): string {
  if (!image || !/^https:\/\/cdn\.sanity\.io\/images\//i.test(image)) {
    return 'https://reborncollections.com/favicon-192.png';
  }
  const url = new URL(image);
  url.searchParams.set('w', '1200');
  url.searchParams.set('fit', 'max');
  url.searchParams.set('fm', 'jpg');
  url.searchParams.set('q', '85');
  return url.toString();
}

function cleanText(value: unknown, max: number): string {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

export async function onRequestGet(context: ProductContext): Promise<Response> {
  const segments = context.params.path;
  const id = Array.isArray(segments) ? segments[0] : String(segments || '').split('/')[0];
  if (!id || !/^[a-zA-Z0-9._-]{1,128}$/.test(id)) {
    return new Response('Invalid product link', { status: 404 });
  }
  const project = context.env.SANITY_PROJECT_ID || 'unv7o4vs';
  const dataset = context.env.SANITY_DATASET || 'production';
  if (!/^[a-zA-Z0-9-]+$/.test(project) || !/^[a-zA-Z0-9_-]+$/.test(dataset)) {
    return new Response('Product service unavailable', { status: 503 });
  }

  const sanityUrl = new URL(`https://${project}.apicdn.sanity.io/v2026-09-29/data/query/${dataset}`);
  sanityUrl.searchParams.set('query', QUERY);
  sanityUrl.searchParams.set('$id', JSON.stringify(id));
  sanityUrl.searchParams.set('perspective', 'published');

  let product: SharedProduct | null = null;
  try {
    const response = await fetch(sanityUrl.toString(), { headers: { accept: 'application/json' } });
    if (!response.ok) throw new Error('Sanity read failed');
    product = ((await response.json()) as { result?: SharedProduct | null }).result || null;
  } catch {
    return new Response('Product preview is temporarily unavailable', {
      status: 503,
      headers: { 'cache-control': 'no-store' },
    });
  }
  if (!product) {
    return new Response('This REBORN product is no longer available.', {
      status: 404,
      headers: { 'cache-control': 'public, max-age=60' },
    });
  }

  // Ignore ad-tracking query strings in the canonical/social URLs.
  const canonical = new URL(context.request.url);
  canonical.search = '';
  canonical.hash = '';
  const name = cleanText(product.name, 100) || 'REBORN fashion item';
  const price = Number(product.salePrice) > 0 && Number(product.salePrice) < Number(product.price)
    ? Number(product.salePrice) : Number(product.price);
  const priceText = price > 0 ? `₦${price.toLocaleString('en-NG')} · ` : '';
  const description = cleanText(
    product.description || `${name} from REBORN Collections. Shop via WhatsApp and confirm availability.`,
    250,
  );
  const socialDescription = `${priceText}${description}`.slice(0, 300);
  const image = imageForSocial(product.image);
  const imageFallback = !product.image || !/^https:\/\/cdn\.sanity\.io\/images\//i.test(product.image);
  const title = `${name} | REBORN Collections`;
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    description,
    sku: product._id,
    category: product.category || undefined,
    brand: { '@type': 'Brand', name: product.brand || 'REBORN' },
    image: imageFallback ? [] : [image],
    url: canonical.toString(),
    ...(price > 0 ? {
      offers: {
        '@type': 'Offer',
        priceCurrency: 'NGN',
        price,
        availability: product.inStock === false ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
        url: canonical.toString(),
      },
    } : {}),
  };

  // Assets are served from the same Cloudflare Pages deployment so Vite assets,
  // Sanity admin and checkout continue to run normally after hydration.
  const indexUrl = new URL('/index.html', context.request.url);
  const index = await context.env.ASSETS.fetch(new Request(indexUrl.toString(), { method: 'GET' }));
  if (!index.ok) return new Response('Shop frontend unavailable', { status: 503 });

  const headers = new Headers(index.headers);
  headers.set('content-type', 'text/html; charset=utf-8');
  headers.set('cache-control', 'public, max-age=0, s-maxage=300');
  // Cloudflare HTMLRewriter adjusts content-encoding/length as required.
  const page = new Response(index.body, { status: 200, headers });
  return new HTMLRewriter()
    .on('title', htmlHandler(title))
    .on('meta[name="description"]', contentHandler(description))
    .on('meta[property="og:type"]', contentHandler('product'))
    .on('meta[property="og:url"]', contentHandler(canonical.toString()))
    .on('meta[property="og:title"]', contentHandler(title))
    .on('meta[property="og:description"]', contentHandler(socialDescription))
    .on('meta[property="og:image"]', contentHandler(image))
    .on('meta[property="og:image:secure_url"]', contentHandler(image))
    .on('meta[property="og:image:alt"]', contentHandler(name))
    .on('meta[property="og:image:type"]', contentHandler(imageFallback ? 'image/png' : 'image/jpeg'))
    .on('meta[property="og:image:width"]', { element(element) { element.remove(); } })
    .on('meta[property="og:image:height"]', { element(element) { element.remove(); } })
    .on('meta[name="twitter:title"]', contentHandler(title))
    .on('meta[name="twitter:description"]', contentHandler(socialDescription))
    .on('meta[name="twitter:image"]', contentHandler(image))
    .on('link[rel="canonical"]', { element(element) { element.setAttribute('href', canonical.toString()); } })
    .on('script[type="application/ld+json"]', {
      element(element) {
        element.setInnerContent(JSON.stringify(schema).replace(/</g, '\\u003c'), { html: true });
      },
    })
    .transform(page);
}
