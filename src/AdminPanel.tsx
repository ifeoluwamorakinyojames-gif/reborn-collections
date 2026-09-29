import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ImagePlus, KeyRound, LogOut, PackagePlus, RefreshCw, Save, Trash2, UploadCloud, UserPlus } from 'lucide-react';
import './admin.css';

type AdminProduct = {
  _id: string;
  name: string;
  category: string;
  subcategory?: string;
  brand?: string;
  price?: number;
  wholesalePrice?: number;
  salePrice?: number;
  description?: string;
  inStock?: boolean;
  badge?: string;
  sizes?: string[];
  colors?: string[];
  images?: { asset?: { _ref?: string; url?: string } }[];
};

type AdminSettings = {
  _id?: string;
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
};

type ProductDraft = {
  name: string;
  category: string;
  subcategory: string;
  brand: string;
  price: string;
  wholesalePrice: string;
  salePrice: string;
  description: string;
  badge: string;
  sizes: string;
  colors: string;
  inStock: boolean;
};

const categories = ['Women', 'Men', 'Unisex', 'Kids', 'Wigs', 'Shoes', 'Perfumes', 'Accessories'];
const badges = ['', 'New Arrival', 'Combo Sale', 'Sale', 'Best Seller', 'Featured'];

const emptyDraft: ProductDraft = {
  name: '',
  category: 'Women',
  subcategory: '',
  brand: 'REBORN',
  price: '',
  wholesalePrice: '',
  salePrice: '',
  description: '',
  badge: '',
  sizes: '',
  colors: '',
  inStock: true,
};

async function api(path: string, init?: RequestInit) {
  const response = await fetch('/api/admin/' + path, {
    credentials: 'include',
    ...init,
    headers: {
      ...(init?.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(init?.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || 'Request failed');
  return data;
}

function toArray(value: string) {
  return value.split(',').map((v) => v.trim()).filter(Boolean);
}

export default function AdminPanel() {
  const [checking, setChecking] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const [email, setEmail] = useState('ifeoluwamorakinyojames@gmail.com');
  const [password, setPassword] = useState('');
  const [sessionEmail, setSessionEmail] = useState('');
  const [sessionRole, setSessionRole] = useState<'owner' | 'admin'>('admin');
  const [accessUsers, setAccessUsers] = useState<{email:string; role:string; active:boolean; createdAt:string}[]>([]);
  const [newAccessEmail, setNewAccessEmail] = useState('');
  const [newAccessPassword, setNewAccessPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [settings, setSettings] = useState<AdminSettings>({});
  const [draft, setDraft] = useState<ProductDraft>(emptyDraft);
  const [singleImages, setSingleImages] = useState<File[]>([]);
  const [bulkImages, setBulkImages] = useState<File[]>([]);
  const [bulkBaseName, setBulkBaseName] = useState('Men Jeans');
  const [tab, setTab] = useState<'products' | 'bulk' | 'settings' | 'access'>('products');

  const productCount = useMemo(() => products.length, [products]);

  useEffect(() => {
    api('session')
      .then((session) => { setLoggedIn(true); setSessionEmail(session.email || ''); setSessionRole(session.role || 'admin'); return loadAll(); })
      .catch(() => setLoggedIn(false))
      .finally(() => setChecking(false));
  }, []);

  async function login(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const session = await api('login', { method: 'POST', body: JSON.stringify({ email, password }) });
      setLoggedIn(true);
      setSessionEmail(session.email || email);
      setSessionRole(session.role || 'admin');
      setPassword('');
      await loadAll();
    } catch (e: any) {
      setError(e.message || 'Login failed');
    } finally { setBusy(false); }
  }

  async function logout() {
    await api('logout', { method: 'POST', body: '{}' }).catch(() => undefined);
    setLoggedIn(false);
  }

  async function loadAll() {
    const [p, s] = await Promise.all([api('products'), api('settings')]);
    setProducts(p.products || []);
    setSettings(s.settings || {});
  }

  async function loadAccess() {
    if (sessionRole !== 'owner') return;
    const result = await api('access');
    setAccessUsers(result.users || []);
  }

  async function createAccess(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      await api('access', { method: 'POST', body: JSON.stringify({ email: newAccessEmail, password: newAccessPassword }) });
      setNewAccessEmail(''); setNewAccessPassword('');
      setMessage('Admin access created. Share the email and temporary password privately with the person.');
      await loadAccess();
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  }

  async function revokeAccess(emailToRemove: string) {
    if (!confirm(`Revoke admin access for ${emailToRemove}?`)) return;
    setBusy(true); setError('');
    try {
      await api('access/' + encodeURIComponent(emailToRemove), { method: 'DELETE' });
      setMessage('Admin access revoked.');
      await loadAccess();
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  }

  async function uploadFiles(files: File[]) {
    const refs: string[] = [];
    for (const file of files) {
      const form = new FormData();
      form.append('file', file, file.name);
      const result = await api('upload', { method: 'POST', body: form });
      refs.push(result.assetId);
    }
    return refs;
  }

  function productPayload(name: string, refs: string[]) {
    return {
      name,
      category: draft.category,
      subcategory: draft.subcategory || undefined,
      brand: draft.brand || 'REBORN',
      price: Number(draft.price || 0),
      wholesalePrice: Number(draft.wholesalePrice || 0),
      salePrice: draft.salePrice ? Number(draft.salePrice) : undefined,
      description: draft.description,
      badge: draft.badge || undefined,
      sizes: toArray(draft.sizes),
      colors: toArray(draft.colors),
      inStock: draft.inStock,
      imageAssetRefs: refs,
    };
  }

  async function createProduct(e: FormEvent) {
    e.preventDefault();
    if (!draft.name.trim()) return setError('Enter a product name.');
    if (!singleImages.length) return setError('Choose at least one product image.');
    setBusy(true); setError(''); setMessage('Uploading images…');
    try {
      const refs = await uploadFiles(singleImages);
      setMessage('Creating product…');
      await api('products', { method: 'POST', body: JSON.stringify({ product: productPayload(draft.name.trim(), refs) }) });
      setMessage('Product published to Sanity successfully.');
      setDraft(emptyDraft); setSingleImages([]);
      await loadAll();
    } catch (e: any) { setError(e.message); setMessage(''); }
    finally { setBusy(false); }
  }

  async function createBulk(e: FormEvent) {
    e.preventDefault();
    if (!bulkImages.length) return setError('Choose the product images for the batch.');
    setBusy(true); setError('');
    try {
      const items: any[] = [];
      for (let i = 0; i < bulkImages.length; i++) {
        setMessage(`Uploading ${i + 1} of ${bulkImages.length}…`);
        const refs = await uploadFiles([bulkImages[i]]);
        items.push(productPayload(`${bulkBaseName.trim() || 'Product'} ${i + 1}`, refs));
      }
      setMessage('Creating products in Sanity…');
      await api('products/bulk', { method: 'POST', body: JSON.stringify({ products: items }) });
      setMessage(`${items.length} products published successfully.`);
      setBulkImages([]);
      await loadAll();
    } catch (e: any) { setError(e.message); setMessage(''); }
    finally { setBusy(false); }
  }

  async function deleteProduct(id: string) {
    if (!confirm('Delete this product from Sanity?')) return;
    setBusy(true); setError('');
    try {
      await api('products/' + encodeURIComponent(id), { method: 'DELETE' });
      setProducts((list) => list.filter((p) => p._id !== id));
      setMessage('Product deleted.');
    } catch (e: any) { setError(e.message); }
    finally { setBusy(false); }
  }

  async function saveSettings(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const result = await api('settings', { method: 'PUT', body: JSON.stringify({ settings }) });
      setSettings(result.settings || settings);
      setMessage('Site settings saved to Sanity.');
    } catch (e: any) { setError(e.message); }
    finally { setBusy(false); }
  }

  if (checking) return <div className='adminShell'><div className='adminCard'>Checking admin session…</div></div>;

  if (!loggedIn) {
    return (
      <div className='adminShell'>
        <form className='adminLogin adminCard' onSubmit={login}>
          <div className='adminBrand'>REBORN <span>Admin</span></div>
          <h1>Store Management</h1>
          <p>Sign in to upload products and update the live storefront.</p>
          <label>Admin email<input type='email' value={email} onChange={(e) => setEmail(e.target.value)} autoComplete='username' /></label>
          <label>Admin password<input type='password' value={password} onChange={(e) => setPassword(e.target.value)} autoComplete='current-password' /></label>
          {error && <div className='adminError'>{error}</div>}
          <button disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
          <a href='#top'><ArrowLeft size={16}/> Back to store</a>
        </form>
      </div>
    );
  }

  return (
    <div className='adminPage'>
      <aside className='adminSidebar'>
        <div className='adminBrand'>REBORN <span>Admin</span></div>
        <p>{productCount} products</p>
        <small className='adminSession'>{sessionEmail}</small>
        <button className={tab === 'products' ? 'active' : ''} onClick={() => setTab('products')}><PackagePlus/> Products</button>
        <button className={tab === 'bulk' ? 'active' : ''} onClick={() => setTab('bulk')}><UploadCloud/> Bulk upload</button>
        <button className={tab === 'settings' ? 'active' : ''} onClick={() => setTab('settings')}><Save/> Site settings</button>
        {sessionRole === 'owner' && <button className={tab === 'access' ? 'active' : ''} onClick={() => { setTab('access'); loadAccess().catch((e) => setError(e.message)); }}><KeyRound/> Admin access</button>}
        <button onClick={() => { setMessage('Refreshing…'); loadAll().then(() => setMessage('Refreshed.')).catch((e) => setError(e.message)); }}><RefreshCw/> Refresh</button>
        <a href='#top'><ArrowLeft/> View store</a>
        <button onClick={logout}><LogOut/> Sign out</button>
      </aside>

      <main className='adminMain'>
        <div className='adminTop'><div><small>REBORN COLLECTIONS</small><h1>{tab === 'products' ? 'Products' : tab === 'bulk' ? 'Bulk Product Upload' : tab === 'settings' ? 'Site Settings' : 'Admin Access'}</h1></div></div>
        {error && <div className='adminError'>{error}</div>}
        {message && <div className='adminSuccess'>{message}</div>}

        {tab === 'products' && (
          <div className='adminColumns'>
            <form className='adminCard adminForm' onSubmit={createProduct}>
              <h2>Add a product</h2>
              <label>Product name<input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></label>
              <div className='adminRow'>
                <label>Category<select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>{categories.map(c => <option key={c}>{c}</option>)}</select></label>
                <label>Subcategory<input value={draft.subcategory} onChange={(e) => setDraft({ ...draft, subcategory: e.target.value })} placeholder='e.g. Denim' /></label>
              </div>
              <div className='adminRow'>
                <label>Retail price<input inputMode='numeric' value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} /></label>
                <label>Wholesale price<input inputMode='numeric' value={draft.wholesalePrice} onChange={(e) => setDraft({ ...draft, wholesalePrice: e.target.value })} /></label>
              </div>
              <div className='adminRow'>
                <label>Sale price<input inputMode='numeric' value={draft.salePrice} onChange={(e) => setDraft({ ...draft, salePrice: e.target.value })} /></label>
                <label>Promo<select value={draft.badge} onChange={(e) => setDraft({ ...draft, badge: e.target.value })}>{badges.map(b => <option key={b} value={b}>{b || 'None'}</option>)}</select></label>
              </div>
              <label>Brand<input value={draft.brand} onChange={(e) => setDraft({ ...draft, brand: e.target.value })} /></label>
              <label>Description<textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></label>
              <label>Sizes <small>Separate with commas</small><input value={draft.sizes} onChange={(e) => setDraft({ ...draft, sizes: e.target.value })} placeholder='S, M, L, XL' /></label>
              <label>Colours <small>Separate with commas</small><input value={draft.colors} onChange={(e) => setDraft({ ...draft, colors: e.target.value })} placeholder='Black, Blue, Orange' /></label>
              <label className='adminCheck'><input type='checkbox' checked={draft.inStock} onChange={(e) => setDraft({ ...draft, inStock: e.target.checked })} /> In stock</label>
              <label className='adminUpload'><ImagePlus/> Product images<input type='file' accept='image/*' multiple onChange={(e) => setSingleImages(Array.from(e.target.files || []))} /><span>{singleImages.length ? `${singleImages.length} image(s) selected` : 'Choose up to 15 images'}</span></label>
              <button className='adminPrimary' disabled={busy}>{busy ? 'Working…' : 'Publish product'}</button>
            </form>

            <section className='adminCard'>
              <h2>Published products</h2>
              <div className='adminProductList'>
                {products.map((p) => <div className='adminProductItem' key={p._id}>
                  {p.images?.[0]?.asset?.url ? <img src={p.images[0].asset!.url} alt='' /> : <div className='adminThumb'/>}
                  <div><b>{p.name}</b><small>{p.category} · ₦{Number(p.price || 0).toLocaleString()}</small></div>
                  <button title='Delete' onClick={() => deleteProduct(p._id)}><Trash2 size={17}/></button>
                </div>)}
                {!products.length && <p>No products yet.</p>}
              </div>
            </section>
          </div>
        )}

        {tab === 'bulk' && (
          <form className='adminCard adminForm adminBulk' onSubmit={createBulk}>
            <div className='bulkIntro'><UploadCloud/><div><h2>Upload many products at once</h2><p>Example: select 20 jeans photos, enter the shared price once, and REBORN Admin creates 20 separate products in Sanity.</p></div></div>
            <label>Base product name<input value={bulkBaseName} onChange={(e) => setBulkBaseName(e.target.value)} placeholder='Men Jeans' /></label>
            <div className='adminRow'>
              <label>Category<select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>{categories.map(c => <option key={c}>{c}</option>)}</select></label>
              <label>Subcategory<input value={draft.subcategory} onChange={(e) => setDraft({ ...draft, subcategory: e.target.value })} placeholder='Denim' /></label>
            </div>
            <div className='adminRow'>
              <label>Retail price<input inputMode='numeric' value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} /></label>
              <label>Wholesale price<input inputMode='numeric' value={draft.wholesalePrice} onChange={(e) => setDraft({ ...draft, wholesalePrice: e.target.value })} /></label>
            </div>
            <div className='adminRow'>
              <label>Promo<select value={draft.badge} onChange={(e) => setDraft({ ...draft, badge: e.target.value })}>{badges.map(b => <option key={b} value={b}>{b || 'None'}</option>)}</select></label>
              <label>Brand<input value={draft.brand} onChange={(e) => setDraft({ ...draft, brand: e.target.value })} /></label>
            </div>
            <label>Description<textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></label>
            <label>Sizes<input value={draft.sizes} onChange={(e) => setDraft({ ...draft, sizes: e.target.value })} placeholder='30, 32, 34, 36' /></label>
            <label className='adminUpload adminUploadLarge'><UploadCloud/> Select product images<input type='file' accept='image/*' multiple onChange={(e) => setBulkImages(Array.from(e.target.files || []))} /><span>{bulkImages.length ? `${bulkImages.length} products will be created` : 'Choose all product images in one selection'}</span></label>
            <button className='adminPrimary' disabled={busy || !bulkImages.length}>{busy ? 'Uploading…' : `Publish ${bulkImages.length || ''} products`}</button>
          </form>
        )}

        {tab === 'settings' && (
          <form className='adminCard adminForm' onSubmit={saveSettings}>
            <div className='adminRow'><label>Brand<input value={settings.brand || ''} onChange={e => setSettings({ ...settings, brand: e.target.value })}/></label><label>Tagline<input value={settings.tagline || ''} onChange={e => setSettings({ ...settings, tagline: e.target.value })}/></label></div>
            <label>Hero title<input value={settings.heroTitle || ''} onChange={e => setSettings({ ...settings, heroTitle: e.target.value })}/></label>
            <label>Hero text<textarea value={settings.heroText || ''} onChange={e => setSettings({ ...settings, heroText: e.target.value })}/></label>
            <div className='adminRow'><label>WhatsApp<input value={settings.whatsapp || ''} onChange={e => setSettings({ ...settings, whatsapp: e.target.value })}/></label><label>Phone<input value={settings.phone || ''} onChange={e => setSettings({ ...settings, phone: e.target.value })}/></label></div>
            <label>Address<input value={settings.address || ''} onChange={e => setSettings({ ...settings, address: e.target.value })}/></label>
            <div className='adminRow'><label>Combo heading<input value={settings.comboSaleEyebrow || ''} onChange={e => setSettings({ ...settings, comboSaleEyebrow: e.target.value })}/></label><label>Combo title<input value={settings.comboSaleTitle || ''} onChange={e => setSettings({ ...settings, comboSaleTitle: e.target.value })}/></label></div>
            <label>Combo description<textarea value={settings.comboSaleText || ''} onChange={e => setSettings({ ...settings, comboSaleText: e.target.value })}/></label>
            <label>Meta Pixel ID<input value={settings.metaPixelId || ''} onChange={e => setSettings({ ...settings, metaPixelId: e.target.value })}/></label>
            <button className='adminPrimary' disabled={busy}>{busy ? 'Saving…' : 'Save settings'}</button>
          </form>
        )}


        {tab === 'access' && sessionRole === 'owner' && (
          <div className='adminColumns'>
            <form className='adminCard adminForm' onSubmit={createAccess}>
              <div className='bulkIntro'><UserPlus/><div><h2>Give admin access</h2><p>Only emails you add here can sign in. Each person gets their own temporary password.</p></div></div>
              <label>Email address<input type='email' value={newAccessEmail} onChange={(e) => setNewAccessEmail(e.target.value)} placeholder='person@example.com' /></label>
              <label>Temporary password<input type='password' value={newAccessPassword} onChange={(e) => setNewAccessPassword(e.target.value)} placeholder='Minimum 8 characters' /></label>
              <button className='adminPrimary' disabled={busy || !newAccessEmail || newAccessPassword.length < 8}>{busy ? 'Creating…' : 'Create access'}</button>
              <small>The owner account remains {sessionEmail}. Delegated admins can manage products and settings but cannot add or remove other admins.</small>
            </form>
            <section className='adminCard'>
              <h2>Authorized admins</h2>
              <div className='adminProductList'>
                <div className='adminProductItem'><div><b>{sessionEmail}</b><small>Owner · permanent access</small></div></div>
                {accessUsers.map((u) => <div className='adminProductItem' key={u.email}>
                  <div><b>{u.email}</b><small>Admin · {u.active ? 'Active' : 'Inactive'}</small></div>
                  <button title='Revoke access' onClick={() => revokeAccess(u.email)}><Trash2 size={17}/></button>
                </div>)}
                {!accessUsers.length && <p>No delegated admins yet.</p>}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
