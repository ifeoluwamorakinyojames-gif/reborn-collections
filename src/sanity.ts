import { createClient } from '@sanity/client';

const projectId = import.meta.env.VITE_SANITY_PROJECT_ID || 'unv7o4vs';
const dataset = import.meta.env.VITE_SANITY_DATASET || 'production';

export const sanity = createClient({
  projectId,
  dataset,
  apiVersion: '2026-09-29',
  // Public storefront reads are safe to cache at Sanity's CDN edge.
  useCdn: true,
});

type SanityImage = {
  asset?: {
    url?: string;
  };
};

type RawSettings = {
  brand?: string;
  tagline?: string;
  heroTitle?: string;
  heroText?: string;
  comboSaleEyebrow?: string;
  comboSaleTitle?: string;
  comboSaleText?: string;
  metaPixelId?: string;
  whatsapp?: string;
  phone?: string;
  address?: string;
  logo?: SanityImage;
  heroImage?: SanityImage;
};

type RawProduct = {
  _id: string;
  name?: string;
  category?: string;
  subcategory?: string;
  brand?: string;
  price?: number;
  wholesalePrice?: number;
  description?: string;
  inStock?: boolean;
  badge?: string;
  salePrice?: number;
  sizes?: string[];
  colors?: string[];
  coverUrl?: string;
};

const query = `{
  "settings": *[_type == "siteSettings"][0]{
    brand,
    tagline,
    heroTitle,
    heroText,
    comboSaleEyebrow,
    comboSaleTitle,
    comboSaleText,
    metaPixelId,
    whatsapp,
    phone,
    address,
    logo{asset->{url}},
    heroImage{asset->{url}}
  },
  "products": *[_type == "product"] | order(_createdAt desc){
    _id,
    name,
    category,
    subcategory,
    brand,
    price,
    wholesalePrice,
    description,
    inStock,
    badge,
    salePrice,
    sizes,
    colors,
    "coverUrl": images[0].asset->url
  }
}`;

type RawSiteData = { settings?: RawSettings; products?: RawProduct[] };

// Ad clicks fetch just the advertised product, not every catalogue item.
const singleProductQuery = query.replace(
  '*[_type == "product"] | order(_createdAt desc)',
  '*[_type == "product" && _id == $id]',
);

function normalizeSiteData(data: RawSiteData) {
  const settings = {
    ...(data.settings || {}),
    logoUrl: data.settings?.logo?.asset?.url || '',
    heroImageUrl: data.settings?.heroImage?.asset?.url || '',
  };

  const products = (data.products || []).map((p) => {
    const cover = p.coverUrl || '';
    return {
      id: p._id,
      name: p.name || '',
      category: p.category || 'Women',
      subcategory: p.subcategory || undefined,
      brand: p.brand || 'REBORN',
      price: Number(p.price || 0),
      wholesalePrice: Number(p.wholesalePrice || 0),
      description: p.description || '',
      inStock: p.inStock !== false,
      badge: p.badge || undefined,
      salePrice: p.salePrice ? Number(p.salePrice) : undefined,
      sizes: p.sizes || [],
      colors: p.colors || [],
      image: cover,
      images: cover ? [cover] : [],
    };
  });

  return { settings, products };
}

export async function getSiteData() {
  return normalizeSiteData(await sanity.fetch<RawSiteData>(query));
}

export async function getProductPageData(id: string) {
  return normalizeSiteData(await sanity.fetch<RawSiteData>(singleProductQuery, { id }));
}

// Full-size galleries are fetched only after a shopper opens a product, not for the whole catalogue.
const galleries = new Map<string, Promise<string[]>>();

export function getProductImages(id: string): Promise<string[]> {
  const cached = galleries.get(id);
  if (cached) return cached;
  const request = sanity.fetch<SanityImage[]>(
    '*[_type == "product" && _id == $id][0].images[]{asset->{url}}',
    { id },
  ).then((images) => (images || []).map((img) => img?.asset?.url || '').filter(Boolean));
  galleries.set(id, request);
  request.catch(() => { galleries.delete(id); });
  return request;
}
