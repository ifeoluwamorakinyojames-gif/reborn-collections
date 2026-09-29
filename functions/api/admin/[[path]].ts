type KVNamespaceLike = {
  get(key: string, type?: 'text' | 'json'): Promise<any>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
  list(options?: { prefix?: string }): Promise<{ keys: { name: string }[] }>;
};

type Env = {
  SANITY_PROJECT_ID: string;
  SANITY_DATASET: string;
  SANITY_WRITE_TOKEN: string;
  ADMIN_PASSWORD: string;
  ADMIN_SESSION_SECRET: string;
  ADMIN_OWNER_EMAIL?: string;
  ADMIN_ACCESS?: KVNamespaceLike;
};

type PagesContext = {
  request: Request;
  env: Env;
  params: Record<string, string | string[]>;
};

const API_VERSION = '2026-09-29';
const cookieName = 'reborn_admin';
const DEFAULT_OWNER_EMAIL = 'ifeoluwamorakinyojames@gmail.com';
const SESSION_TTL_MS = 1000 * 60 * 60 * 12;
const USER_PREFIX = 'admin-user:';

function json(data: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
  });
}

function b64url(bytes: Uint8Array) {
  let binary = '';
  bytes.forEach((b) => binary += String.fromCharCode(b));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromB64url(value: string) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
}

async function sign(value: string, secret: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value));
  return b64url(new Uint8Array(sig));
}

function normalizeEmail(value: unknown) {
  return String(value || '').trim().toLowerCase();
}

function ownerEmail(env: Env) {
  return normalizeEmail(env.ADMIN_OWNER_EMAIL || DEFAULT_OWNER_EMAIL);
}

type Session = { email: string; role: 'owner' | 'admin'; expires: number };

async function createSessionCookie(session: Omit<Session, 'expires'>, secret: string, secure: boolean) {
  const payload: Session = { ...session, expires: Date.now() + SESSION_TTL_MS };
  const encoded = b64url(new TextEncoder().encode(JSON.stringify(payload)));
  const signature = await sign(encoded, secret);
  return `${cookieName}=${encoded}.${signature}; Path=/; HttpOnly; ${secure ? 'Secure; ' : ''}SameSite=Strict; Max-Age=43200`;
}

async function readSession(request: Request, secret: string): Promise<Session | null> {
  if (!secret) return null;
  const cookie = request.headers.get('cookie') || '';
  const token = cookie.split(';').map((v) => v.trim()).find((v) => v.startsWith(cookieName + '='))?.slice(cookieName.length + 1);
  if (!token) return null;
  const [encoded, signature] = token.split('.');
  if (!encoded || !signature || signature !== await sign(encoded, secret)) return null;
  try {
    const payload = JSON.parse(new TextDecoder().decode(fromB64url(encoded))) as Session;
    if (!payload.email || !payload.role || !payload.expires || payload.expires < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

function routePath(params: Record<string, string | string[]>) {
  const raw = params.path;
  if (Array.isArray(raw)) return raw.join('/');
  return raw || '';
}

function sanityBase(env: Env) {
  const project = env.SANITY_PROJECT_ID || 'unv7o4vs';
  const dataset = env.SANITY_DATASET || 'production';
  return { project, dataset, api: `https://${project}.api.sanity.io/v${API_VERSION}` };
}

async function sanityQuery(env: Env, query: string) {
  const { api, dataset } = sanityBase(env);
  const url = `${api}/data/query/${encodeURIComponent(dataset)}?query=${encodeURIComponent(query)}`;
  const response = await fetch(url, { headers: env.SANITY_WRITE_TOKEN ? { Authorization: `Bearer ${env.SANITY_WRITE_TOKEN}` } : {} });
  if (!response.ok) throw new Error(`Sanity query failed (${response.status})`);
  return (await response.json() as any).result;
}

async function mutate(env: Env, mutations: unknown[]) {
  const { api, dataset } = sanityBase(env);
  const response = await fetch(`${api}/data/mutate/${encodeURIComponent(dataset)}?returnIds=true&returnDocuments=true`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', Authorization: `Bearer ${env.SANITY_WRITE_TOKEN}` },
    body: JSON.stringify({ mutations }),
  });
  const data = await response.json().catch(() => ({})) as any;
  if (!response.ok) throw new Error(data?.error?.description || data?.message || `Sanity mutation failed (${response.status})`);
  return data;
}

function cleanProduct(input: any) {
  const refs = Array.isArray(input.imageAssetRefs) ? input.imageAssetRefs.filter(Boolean).slice(0, 15) : [];
  const product: any = {
    _type: 'product',
    name: String(input.name || '').trim(),
    category: String(input.category || 'Women'),
    brand: String(input.brand || 'REBORN'),
    price: Number(input.price || 0),
    wholesalePrice: Number(input.wholesalePrice || 0),
    description: String(input.description || ''),
    inStock: input.inStock !== false,
    sizes: Array.isArray(input.sizes) ? input.sizes.map(String).filter(Boolean) : [],
    colors: Array.isArray(input.colors) ? input.colors.map(String).filter(Boolean) : [],
    images: refs.map((ref: string, index: number) => ({ _type: 'image', _key: `img-${index}-${crypto.randomUUID()}`, asset: { _type: 'reference', _ref: ref } })),
  };
  if (input.subcategory) product.subcategory = String(input.subcategory);
  if (input.badge) product.badge = String(input.badge);
  if (input.salePrice !== undefined && input.salePrice !== null && input.salePrice !== '') product.salePrice = Number(input.salePrice);
  return product;
}

function randomSalt() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return b64url(bytes);
}

async function hashPassword(password: string, salt: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: fromB64url(salt), iterations: 150000 }, key, 256);
  return b64url(new Uint8Array(bits));
}

type AccessUser = { email: string; role: 'admin'; active: boolean; salt: string; passwordHash: string; createdAt: string };

async function getAccessUser(env: Env, email: string): Promise<AccessUser | null> {
  if (!env.ADMIN_ACCESS) return null;
  return await env.ADMIN_ACCESS.get(USER_PREFIX + email, 'json') as AccessUser | null;
}

async function listAccessUsers(env: Env) {
  if (!env.ADMIN_ACCESS) throw new Error('ADMIN_ACCESS KV binding is not configured.');
  const listed = await env.ADMIN_ACCESS.list({ prefix: USER_PREFIX });
  const users = await Promise.all(listed.keys.map(async ({ name }) => {
    const user = await env.ADMIN_ACCESS!.get(name, 'json') as AccessUser | null;
    return user ? { email: user.email, role: user.role, active: user.active, createdAt: user.createdAt } : null;
  }));
  return users.filter(Boolean);
}

export async function onRequest(context: PagesContext) {
  const { request, env, params } = context;
  const path = routePath(params);
  const method = request.method.toUpperCase();

  if (!env.SANITY_WRITE_TOKEN || !env.ADMIN_PASSWORD || !env.ADMIN_SESSION_SECRET) {
    return json({ error: 'Admin server secrets are not configured.' }, 500);
  }

  if (path === 'login' && method === 'POST') {
    const body = await request.json().catch(() => ({})) as any;
    const email = normalizeEmail(body.email);
    const password = String(body.password || '');
    let role: 'owner' | 'admin' | null = null;

    if (email === ownerEmail(env) && password === env.ADMIN_PASSWORD) {
      role = 'owner';
    } else {
      const user = await getAccessUser(env, email);
      if (user?.active && user.passwordHash && user.salt) {
        const candidate = await hashPassword(password, user.salt);
        if (candidate === user.passwordHash) role = 'admin';
      }
    }

    if (!role) return json({ error: 'Email or password is not authorized for REBORN Admin.' }, 401);
    const cookie = await createSessionCookie({ email, role }, env.ADMIN_SESSION_SECRET, new URL(request.url).protocol === 'https:');
    return json({ ok: true, email, role }, 200, { 'set-cookie': cookie });
  }

  if (path === 'logout' && method === 'POST') {
    return json({ ok: true }, 200, { 'set-cookie': `${cookieName}=; Path=/; HttpOnly; ${new URL(request.url).protocol === 'https:' ? 'Secure; ' : ''}SameSite=Strict; Max-Age=0` });
  }

  const session = await readSession(request, env.ADMIN_SESSION_SECRET);
  if (!session) return json({ error: 'Admin login required.' }, 401);

  if (session.role === 'admin') {
    const user = await getAccessUser(env, session.email);
    if (!user?.active) return json({ error: 'This admin access has been revoked.' }, 401);
  }

  if (path === 'session' && method === 'GET') return json({ ok: true, email: session.email, role: session.role });

  if (path === 'access' && method === 'GET') {
    if (session.role !== 'owner') return json({ error: 'Only the owner can manage admin access.' }, 403);
    try {
      const users = await listAccessUsers(env);
      return json({ ownerEmail: ownerEmail(env), users });
    } catch (e: any) {
      return json({ error: e.message || 'Access storage is not configured.' }, 500);
    }
  }

  if (path === 'access' && method === 'POST') {
    if (session.role !== 'owner') return json({ error: 'Only the owner can manage admin access.' }, 403);
    if (!env.ADMIN_ACCESS) return json({ error: 'ADMIN_ACCESS KV binding is not configured.' }, 500);
    const body = await request.json().catch(() => ({})) as any;
    const email = normalizeEmail(body.email);
    const password = String(body.password || '');
    if (!email || !email.includes('@')) return json({ error: 'Enter a valid email address.' }, 400);
    if (email === ownerEmail(env)) return json({ error: 'The owner account is already permanently authorized.' }, 400);
    if (password.length < 8) return json({ error: 'Temporary password must be at least 8 characters.' }, 400);
    const salt = randomSalt();
    const user: AccessUser = {
      email,
      role: 'admin',
      active: true,
      salt,
      passwordHash: await hashPassword(password, salt),
      createdAt: new Date().toISOString(),
    };
    await env.ADMIN_ACCESS.put(USER_PREFIX + email, JSON.stringify(user));
    return json({ ok: true, user: { email, role: 'admin', active: true, createdAt: user.createdAt } });
  }

  if (path.startsWith('access/') && method === 'DELETE') {
    if (session.role !== 'owner') return json({ error: 'Only the owner can manage admin access.' }, 403);
    if (!env.ADMIN_ACCESS) return json({ error: 'ADMIN_ACCESS KV binding is not configured.' }, 500);
    const email = normalizeEmail(decodeURIComponent(path.slice('access/'.length)));
    if (!email || email === ownerEmail(env)) return json({ error: 'Invalid admin email.' }, 400);
    await env.ADMIN_ACCESS.delete(USER_PREFIX + email);
    return json({ ok: true });
  }

  if (path === 'products' && method === 'GET') {
    const products = await sanityQuery(env, `*[_type == "product"] | order(_createdAt desc){_id,name,category,subcategory,brand,price,wholesalePrice,salePrice,description,inStock,badge,sizes,colors,images[]{asset->{_id,"_ref":_id,url}}}`);
    return json({ products });
  }

  if (path === 'products' && method === 'POST') {
    const body = await request.json().catch(() => ({})) as any;
    const product = cleanProduct(body.product || {});
    if (!product.name) return json({ error: 'Product name is required.' }, 400);
    if (!product.images.length) return json({ error: 'At least one product image is required.' }, 400);
    const result = await mutate(env, [{ create: product }]);
    return json({ ok: true, result });
  }

  if (path === 'products/bulk' && method === 'POST') {
    const body = await request.json().catch(() => ({})) as any;
    const list = Array.isArray(body.products) ? body.products.slice(0, 50) : [];
    if (!list.length) return json({ error: 'No products supplied.' }, 400);
    const docs = list.map(cleanProduct);
    if (docs.some((p: any) => !p.name || !p.images.length)) return json({ error: 'Every bulk product needs a name and image.' }, 400);
    const result = await mutate(env, docs.map((doc: any) => ({ create: doc })));
    return json({ ok: true, count: docs.length, result });
  }

  if (path.startsWith('products/') && method === 'DELETE') {
    const id = decodeURIComponent(path.slice('products/'.length));
    if (!id || id.startsWith('drafts.')) return json({ error: 'Invalid product id.' }, 400);
    await mutate(env, [{ delete: { id } }]);
    return json({ ok: true });
  }

  if (path === 'settings' && method === 'GET') {
    const settings = await sanityQuery(env, `*[_type == "siteSettings"][0]{_id,brand,tagline,heroTitle,heroText,comboSaleEyebrow,comboSaleTitle,comboSaleText,metaPixelId,whatsapp,phone,address}`);
    return json({ settings: settings || {} });
  }

  if (path === 'settings' && method === 'PUT') {
    const body = await request.json().catch(() => ({})) as any;
    const incoming = body.settings || {};
    const existing = await sanityQuery(env, `*[_type == "siteSettings"][0]{_id}`);
    const values: any = {
      brand: String(incoming.brand || 'REBORN'),
      tagline: String(incoming.tagline || ''),
      heroTitle: String(incoming.heroTitle || ''),
      heroText: String(incoming.heroText || ''),
      comboSaleEyebrow: String(incoming.comboSaleEyebrow || ''),
      comboSaleTitle: String(incoming.comboSaleTitle || ''),
      comboSaleText: String(incoming.comboSaleText || ''),
      metaPixelId: String(incoming.metaPixelId || ''),
      whatsapp: String(incoming.whatsapp || ''),
      phone: String(incoming.phone || ''),
      address: String(incoming.address || ''),
    };
    if (existing?._id) await mutate(env, [{ patch: { id: existing._id, set: values } }]);
    else await mutate(env, [{ create: { _type: 'siteSettings', ...values } }]);
    const settings = await sanityQuery(env, `*[_type == "siteSettings"][0]{_id,brand,tagline,heroTitle,heroText,comboSaleEyebrow,comboSaleTitle,comboSaleText,metaPixelId,whatsapp,phone,address}`);
    return json({ ok: true, settings });
  }

  if (path === 'upload' && method === 'POST') {
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) return json({ error: 'Image file is required.' }, 400);
    if (!file.type.startsWith('image/')) return json({ error: 'Only image uploads are allowed.' }, 400);
    if (file.size > 12 * 1024 * 1024) return json({ error: 'Image is too large. Maximum 12MB.' }, 400);
    const { api, dataset } = sanityBase(env);
    const url = `${api}/assets/images/${encodeURIComponent(dataset)}?filename=${encodeURIComponent(file.name)}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': file.type || 'application/octet-stream', Authorization: `Bearer ${env.SANITY_WRITE_TOKEN}` },
      body: file.stream(),
    });
    const data = await response.json().catch(() => ({})) as any;
    if (!response.ok) return json({ error: data?.error?.description || `Image upload failed (${response.status})` }, response.status);
    return json({ assetId: data.document?._id, url: data.document?.url });
  }

  return json({ error: 'Admin route not found.' }, 404);
}
