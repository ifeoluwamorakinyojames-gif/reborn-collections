import { createClient } from '@sanity/client';

const projectId = import.meta.env.VITE_SANITY_PROJECT_ID || 'unv7o4vs';
const dataset = import.meta.env.VITE_SANITY_DATASET || 'production';

export const sanity = createClient({
  projectId,
  dataset,
  apiVersion: '2026-09-29',
  useCdn: false,
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
  images?: SanityImage[];
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
    images[]{asset->{url}}
  }
}`;

export async function getSiteData() {
  const data = await sanity.fetch<{ settings?: RawSettings; products?: RawProduct[] }>(query);
  const settings = {
    ...(data.settings || {}),
    logoUrl: data.settings?.logo?.asset?.url || '',
    heroImageUrl: data.settings?.heroImage?.asset?.url || '',
  };

  const products = (data.products || []).map((p) => {
    const urls = (p.images || []).map((img) => img.asset?.url || '').filter(Boolean);
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
      image: urls[0] || '',
      images: urls,
    };
  });

  return { settings, products };
}
