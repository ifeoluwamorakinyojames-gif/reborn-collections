import { db, error, json, requireAdminEmailAllowlist, requireAuth, router, storage } from '@appdeploy/sdk';

type Settings = {
  brand: string;
  tagline: string;
  heroTitle: string;
  heroText: string;
  comboSaleEyebrow: string;
  comboSaleTitle: string;
  comboSaleText: string;
  metaPixelId: string;
  whatsapp: string;
  phone: string;
  address: string;
  logoPath?: string;
  heroImagePath?: string;
};

type Product = {
  name: string;
  category: string;
  subcategory?: string;
  brand?: string;
  price: number;
  wholesalePrice: number;
  description: string;
  inStock: boolean;
  badge?: string;
  salePrice?: number;
  sizes?: string[];
  colors?: string[];
  imagePath?: string;
  imagePaths?: string[];
  originalImagePath?: string;
  originalImagePaths?: string[];
};

type OrderBody = {
  customer?: { name?: string; phone?: string; address?: string; note?: string };
  items?: Array<{ productId?: string; name?: string; price?: number; qty?: number; size?: string }>;
};

const ADMIN_EMAILS = ['ifeoluwamorakinyojames@gmail.com'];
const defaults: Settings = {
  brand: 'REBORN',
  tagline: 'Wholesale & Retail Fashion',
  heroTitle: 'Style for Everyone',
  heroText: 'Women, Men, Kids, Wigs, Shoes, Perfumes and more — retail and wholesale.',
  comboSaleEyebrow: 'LIMITED PROMO',
  comboSaleTitle: 'Combo Sales',
  comboSaleText: 'Special bundle deals from REBORN. Shop selected combinations at promotional prices while they last.',
  metaPixelId: '',
  whatsapp: '09060759664',
  phone: '07031339024',
  address: 'Warri, Delta State, Nigeria',
};

async function owner() {
  const { items } = await db.list<{ userId: string }>('site_owner', { limit: 1 });
  return items[0] || null;
}

async function ensureOwner(id: string) {
  const current = await owner();
  return !!current && current.userId === id;
}

async function getSettings(id: string) {
  const { items } = await db.list<Settings>('settings:' + id, { limit: 1 });
  return items[0] || null;
}

async function getProducts(id: string) {
  const { items } = await db.list<Product>('products:' + id, { limit: 200 });
  return items;
}

async function hydrate(items: Array<Product & { id: string }>) {
  return Promise.all(
    items.map(async (p) => {
      const paths = (p.imagePaths?.length ? p.imagePaths : p.imagePath ? [p.imagePath] : []).filter(Boolean).slice(0, 15);
      if (!paths.length) return { ...p, image: '', images: [] };
      const signed = await storage.url(paths);
      const urls = signed.map((v) => v.url).filter(Boolean);
      return { ...p, image: urls[0] || '', images: urls, imagePath: paths[0], imagePaths: paths };
    }),
  );
}

async function payload() {
  const current = await owner();
  if (!current) return { settings: defaults, products: [], revision: Date.now() };
  const settings = await getSettings(current.userId);
  const products = await hydrate(await getProducts(current.userId));
  let logoUrl = '';
  if (settings?.logoPath) {
    const [u] = await storage.url([settings.logoPath]);
    logoUrl = u?.url || '';
  }
  let heroImageUrl = '';
  if (settings?.heroImagePath) {
    const [u] = await storage.url([settings.heroImagePath]);
    heroImageUrl = u?.url || '';
  }
  return { settings: { ...defaults, ...settings, logoUrl, heroImageUrl }, products, revision: Date.now() };
}

function clean(b: Product) {
  return {
    name: String(b.name || '').trim(),
    category: String(b.category || 'Women'),
    subcategory: b.subcategory || undefined,
    brand: String(b.brand || 'REBORN').trim() || 'REBORN',
    price: Number(b.price || 0),
    wholesalePrice: Number(b.wholesalePrice || 0),
    description: String(b.description || ''),
    inStock: b.inStock !== false,
    badge: b.badge || undefined,
    salePrice: b.salePrice ? Number(b.salePrice) : undefined,
    sizes: (b.sizes || []).filter(Boolean).slice(0, 30),
    colors: (b.colors || []).filter(Boolean).slice(0, 30),
    imagePath: b.imagePath,
    imagePaths: (b.imagePaths || []).filter(Boolean).slice(0, 15),
    originalImagePath: b.originalImagePath,
    originalImagePaths: (b.originalImagePaths || []).filter(Boolean).slice(0, 15),
  };
}

export const handler = router({
  'GET /api/_healthcheck': [async () => json({ message: 'Success' })],
  'GET /api/site': [async () => json(await payload())],

  'POST /api/orders': [
    async (c) => {
      const current = await owner();
      if (!current) return error('Store is not ready to accept orders', 503);
      const body = c.body as OrderBody;
      const customer = body.customer || {};
      const items = Array.isArray(body.items) ? body.items.slice(0, 50) : [];
      if (!String(customer.name || '').trim() || !String(customer.phone || '').trim() || !String(customer.address || '').trim()) {
        return error('Name, phone number and delivery address are required', 400);
      }
      if (!items.length) return error('Your cart is empty', 400);

      const safeItems = items.map((item) => ({
        productId: String(item.productId || ''),
        name: String(item.name || '').slice(0, 160),
        price: Math.max(0, Number(item.price || 0)),
        qty: Math.max(1, Math.min(99, Number(item.qty || 1))),
        size: String(item.size || '').slice(0, 40),
      }));
      const total = safeItems.reduce((sum, item) => sum + item.price * item.qty, 0);
      const reference = 'RB' + Date.now().toString(36).toUpperCase();
      const [id] = await db.add('orders:' + current.userId, [{
        reference,
        customer: {
          name: String(customer.name || '').trim().slice(0, 120),
          phone: String(customer.phone || '').trim().slice(0, 60),
          address: String(customer.address || '').trim().slice(0, 500),
          note: String(customer.note || '').trim().slice(0, 500),
        },
        items: safeItems,
        total,
        status: 'new',
        createdAt: new Date().toISOString(),
      }]);
      if (!id) return error('Could not place order', 500);
      return json({ ok: true, reference, total }, 201);
    },
  ],

  'POST /api/admin/claim': [
    requireAuth(),
    requireAdminEmailAllowlist(ADMIN_EMAILS),
    async (c) => {
      const current = await owner();
      if (!current) {
        const [id] = await db.add('site_owner', [{ userId: c.user!.userId }]);
        if (!id) return error('Could not activate admin', 500);
      } else if (current.userId !== c.user!.userId) {
        const [ok] = await db.update('site_owner', [{ id: current.id, record: { userId: c.user!.userId } }]);
        if (!ok) return error('Could not activate admin', 500);
      }
      if (!(await getSettings(c.user!.userId))) await db.add('settings:' + c.user!.userId, [defaults]);
      return json({ ok: true });
    },
  ],

  'GET /api/admin/data': [
    requireAuth(),
    requireAdminEmailAllowlist(ADMIN_EMAILS),
    async (c) => {
      if (!(await ensureOwner(c.user!.userId))) return error('Admin access denied', 403);
      return json(await payload());
    },
  ],

  'GET /api/admin/connection-test': [
    requireAuth(),
    requireAdminEmailAllowlist(ADMIN_EMAILS),
    async (c) => json({ ok: await ensureOwner(c.user!.userId), message: 'Admin and backend are connected' }),
  ],

  'PUT /api/admin/settings': [
    requireAuth(),
    requireAdminEmailAllowlist(ADMIN_EMAILS),
    async (c) => {
      if (!(await ensureOwner(c.user!.userId))) return error('Admin access denied', 403);
      const current = await getSettings(c.user!.userId);
      const record = { ...defaults, ...current, ...(c.body as Settings) };
      if (current?.id) {
        const { id, ...rest } = record as Settings & { id: string };
        const [ok] = await db.update('settings:' + c.user!.userId, [{ id, record: rest }]);
        if (!ok) return error('Could not save settings', 500);
      } else {
        const [id] = await db.add('settings:' + c.user!.userId, [record]);
        if (!id) return error('Could not save settings', 500);
      }
      return json(await payload());
    },
  ],

  'POST /api/admin/upload-image': [
    requireAuth(),
    requireAdminEmailAllowlist(ADMIN_EMAILS),
    async (c) => {
      if (!(await ensureOwner(c.user!.userId))) return error('Admin access denied', 403);
      const b = c.body as { data: string; contentType: string; fileName?: string };
      if (!b.data || !b.contentType?.startsWith('image/')) return error('No valid image data received', 400);
      if (b.data.length > 1300000) return error('Processed image is too large. Please choose a smaller photo.', 413);
      const path = 'products/' + c.user!.userId + '/' + Date.now() + '-' + Math.random().toString(36).slice(2, 9) + '.jpg';
      try {
        const [ok] = await storage.write([{ path, content: b.data, contentType: 'image/jpeg' }]);
        if (!ok) return error('Image storage rejected the upload', 500);
        const [u] = await storage.url([path]);
        if (!u?.url) return error('Image saved but preview URL could not be created', 500);
        return json({ ok: true, imagePath: path, url: u.url, fileName: b.fileName || '' });
      } catch (e) {
        console.error('upload-image failed', e);
        return error('Image upload failed in backend storage', 500);
      }
    },
  ],

  'POST /api/admin/products': [
    requireAuth(),
    requireAdminEmailAllowlist(ADMIN_EMAILS),
    async (c) => {
      if (!(await ensureOwner(c.user!.userId))) return error('Admin access denied', 403);
      const record = clean(c.body as Product);
      if (!record.name || record.price <= 0 || !record.imagePaths?.length) {
        return error('Product name, retail price and at least one uploaded image are required', 400);
      }
      const [id] = await db.add('products:' + c.user!.userId, [record]);
      if (!id) return error('Could not save product to database', 500);
      return json(await payload(), 201);
    },
  ],

  'PUT /api/admin/products/:id': [
    requireAuth(),
    requireAdminEmailAllowlist(ADMIN_EMAILS),
    async (c) => {
      if (!(await ensureOwner(c.user!.userId))) return error('Admin access denied', 403);
      const [old] = await db.get<Product>('products:' + c.user!.userId, [c.params.id]);
      if (!old) return error('Product not found', 404);
      const record = clean(c.body as Product);
      if (!record.name || record.price <= 0 || !record.imagePaths?.length) return error('Name, price and image are required', 400);
      const [ok] = await db.update('products:' + c.user!.userId, [{ id: c.params.id, record }]);
      if (!ok) return error('Could not update product', 500);
      return json(await payload());
    },
  ],

  'DELETE /api/admin/products/:id': [
    requireAuth(),
    requireAdminEmailAllowlist(ADMIN_EMAILS),
    async (c) => {
      if (!(await ensureOwner(c.user!.userId))) return error('Admin access denied', 403);
      const [old] = await db.get<Product>('products:' + c.user!.userId, [c.params.id]);
      const [ok] = await db.delete('products:' + c.user!.userId, [c.params.id]);
      if (!ok) return error('Could not delete product', 500);
      const pathsToDelete = Array.from(new Set([...(old?.imagePaths || []), ...(old?.originalImagePaths || [])].filter(Boolean)));
      if (pathsToDelete.length) await storage.delete(pathsToDelete);
      return json(await payload());
    },
  ],
});
