import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { getProductImages, getProductPageData, getSiteData } from './sanity';
import { imageSrcSet, imageUrl } from './image';
import { productIdFromPath, productPath } from './product-links';
import { collectionSlug, effectivePrice, phoneNumber } from './storefront';

import {
  ArrowRight,
  CheckCircle2,
  Filter,
  Headphones,
  Link2,
  Menu,
  MessageCircle,
  Minus,
  Package,
  Plus,
  RefreshCw,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  X,
} from 'lucide-react';

const AdminPanel = lazy(() => import('./AdminPanel'));

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
  logoUrl?: string;
  heroImagePath?: string;
  heroImageUrl?: string;
};

type Product = {
  id: string;
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
  image: string;
  images?: string[];
  imagePath?: string;
  imagePaths?: string[];
  originalImagePath?: string;
  originalImagePaths?: string[];
};

type CartItem = { product: Product; qty: number; size?: string };

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

const cats = ['All', 'Women', 'Men', 'Unisex', 'Kids', 'Wigs', 'Shoes', 'Perfumes', 'Accessories'];
const menSizes = ['S', 'M', 'L', 'XL', '2XL', '3XL'];
const money = (n: number) => '₦' + Number(n || 0).toLocaleString();

function metaTrack(event: string, data?: Record<string, unknown>) {
  const fbq = (window as any).fbq;
  if (typeof fbq === 'function') fbq('track', event, data || {});
}

function initMetaPixel(pixelId: string) {
  const id = String(pixelId || '').trim();
  if (!/^\d{5,30}$/.test(id)) return;
  const w = window as any;
  if (!w.fbq) {
    const fbq: any = function (...args: any[]) { fbq.callMethod ? fbq.callMethod.apply(fbq, args) : fbq.queue.push(args); };
    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = '2.0';
    fbq.queue = [];
    w.fbq = fbq;
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://connect.facebook.net/en_US/fbevents.js';
    document.head.appendChild(script);
  }
  if (w.__rebornMetaPixelId !== id) {
    w.fbq('init', id);
    w.__rebornMetaPixelId = id;
  }
}

const parseCollectionHash = () => {
  const raw = location.hash.replace(/^#collection\/?/, '');
  if (!raw || location.hash === '#admin') return { category: 'All', subcategory: '' };
  const [catSlug, subSlug] = raw.split('/');
  const category = cats.slice(1).find((c) => collectionSlug(c) === catSlug) || 'All';
  const subcategory = subSlug === 'denim' ? 'Denim' : subSlug === 'baggy-jean' ? 'Baggy Jean' : '';
  return { category, subcategory };
};

const collectionCopy: Record<string, { title: string; text: string }> = {
  Women: { title: "Women's Collection", text: 'Shop stylish women’s fashion for everyday wear, outings and special occasions.' },
  Men: { title: "Men's Collection", text: 'Explore denim, baggy fits, polos and everyday men’s fashion.' },
  Unisex: { title: 'Unisex Collection', text: 'Shop versatile styles designed for everyone, including polos, tees, hoodies and more.' },
  Kids: { title: "Kids' Collection", text: 'Comfortable, stylish fashion and essentials for children.' },
  Wigs: { title: 'Wigs Collection', text: 'Explore beautiful wigs and hair options selected for everyday and occasion looks.' },
  Shoes: { title: 'Shoes Collection', text: 'Shop footwear for everyday style, work, outings and special occasions.' },
  Perfumes: { title: 'Perfumes Collection', text: 'Discover fragrances for personal use, gifting and everyday confidence.' },
  Accessories: { title: 'Accessories Collection', text: 'Complete your look with practical and stylish fashion accessories.' },
};

function App() {
  const [settings, setSettings] = useState(defaults);
  const [adminMode, setAdminMode] = useState(location.hash === '#admin');
  const initialCollection = parseCollectionHash();
  const [products, setProducts] = useState<Product[]>([]);
  const [category, setCategory] = useState(initialCollection.category);
  const [selected, setSelected] = useState<Product | null>(null);
  const [productRouteId, setProductRouteId] = useState<string | null>(() => productIdFromPath(location.pathname));
  const openedRouteRef = useRef<string | null>(null);
  const hasFullCatalogueRef = useRef(false);
  const [shareMessage, setShareMessage] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [menu, setMenu] = useState(false);
  const [loading, setLoading] = useState(true);
  const [catalogError, setCatalogError] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [visibleCount, setVisibleCount] = useState(24);
  const [menTab, setMenTab] = useState(initialCollection.subcategory || 'All Men');
  const [menBrand, setMenBrand] = useState('All');
  const [menSize, setMenSize] = useState('All');
  const [showFilters, setShowFilters] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [newArrivalIndex, setNewArrivalIndex] = useState(0);
  const [comboSaleOnly, setComboSaleOnly] = useState(location.hash === '#promo/combo-sales');
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('reborn-cart') || '[]');
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const onHash = () => {
      setAdminMode(location.hash === '#admin');
      setComboSaleOnly(location.hash === '#promo/combo-sales');
      if (location.hash !== '#promo/combo-sales') {
        const next = parseCollectionHash();
        setCategory(next.category);
        if (next.category === 'Men') setMenTab(next.subcategory || 'All Men');
      }
    };
    addEventListener('hashchange', onHash);
    return () => removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    const syncProductRoute = () => {
      const nextId = productIdFromPath(location.pathname);
      openedRouteRef.current = null;
      setProductRouteId(nextId);
      if (!nextId) setSelected(null);
    };
    addEventListener('popstate', syncProductRoute);
    return () => removeEventListener('popstate', syncProductRoute);
  }, []);

  useEffect(() => {
    if (!productRouteId || loading || openedRouteRef.current === productRouteId) return;
    const match = products.find((product) => product.id === productRouteId);
    if (match) openProduct(match, false);
  }, [productRouteId, products, loading]);

  useEffect(() => {
    const copy = collectionCopy[category];
    if (productIdFromPath(location.pathname)) return; // Server supplies ad-page product metadata.
    document.title = copy ? `${copy.title} | REBORN Collections` : 'REBORN Fashion | Women, Men, Kids, Wigs, Shoes & Perfumes';
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', copy ? `${copy.text} Wholesale and retail shopping from REBORN Collections.` : 'Shop REBORN for women, men and kids fashion, wigs, shoes and perfumes. Wholesale and retail orders with WhatsApp availability confirmation.');
  }, [category]);

  useEffect(() => {
    localStorage.setItem('reborn-cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    if (settings.metaPixelId) initMetaPixel(settings.metaPixelId);
  }, [settings.metaPixelId]);

  useEffect(() => {
    if (!settings.metaPixelId) return;
    metaTrack('PageView');
    if (comboSaleOnly) {
      metaTrack('ViewContent', { content_name: settings.comboSaleTitle, content_category: 'Combo Sales', content_type: 'product_group' });
    } else if (category !== 'All') {
      metaTrack('ViewContent', { content_name: category + ' Collection', content_category: category, content_type: 'product_group' });
    }
  }, [category, comboSaleOnly, settings.metaPixelId, settings.comboSaleTitle]);

  const newArrivals = products.filter((p) => p.badge === 'New Arrival' && (category === 'All' || p.category === category));
  const comboSales = products.filter((p) => p.badge === 'Combo Sale');

  useEffect(() => {
    setNewArrivalIndex(0);
    if (newArrivals.length <= 1) return;
    const timer = setInterval(() => setNewArrivalIndex((current) => (current + 1) % newArrivals.length), 4500);
    return () => clearInterval(timer);
  }, [category, products.length, newArrivals.length]);

  async function load() {
    try {
      const directProduct = productIdFromPath(location.pathname);
      const fullCatalogue = !directProduct || hasFullCatalogueRef.current;
      const data = fullCatalogue ? await getSiteData() : await getProductPageData(directProduct);
      if (fullCatalogue) hasFullCatalogueRef.current = true;
      setSettings({ ...defaults, ...data.settings });
      setProducts(data.products || []);
      setCatalogError(false);
    } catch (e) {
      setCatalogError(true);
      console.error('Could not load Sanity content', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const timer = setInterval(() => { if (!document.hidden) void load(); }, 120000);
    const refreshOnFocus = () => { if (!document.hidden) void load(); };
    document.addEventListener('visibilitychange', refreshOnFocus);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', refreshOnFocus); };
  }, []);

  const menProducts = products.filter((p) => p.category === 'Men');
  const menBrands = Array.from(new Set(menProducts.map((p) => p.brand || 'REBORN'))).sort();
  const list = useMemo(() => {
    if (comboSaleOnly) return products.filter((p) => p.badge === 'Combo Sale');
    if (category !== 'Men') return category === 'All' ? products : products.filter((p) => p.category === category);
    return menProducts.filter(
      (p) =>
        (menTab === 'All Men' || p.subcategory === menTab) &&
        (menBrand === 'All' || (p.brand || 'REBORN') === menBrand) &&
        (menSize === 'All' || (p.sizes || []).includes(menSize)),
    );
  }, [products, category, menTab, menBrand, menSize, comboSaleOnly]);

  const collectionHighlights = useMemo(
    () => cats.slice(1).map((name) => {
      const matches = products.filter((product) => product.category === name);
      return { name, count: matches.length, image: matches.find((product) => product.image)?.image || '' };
    }).filter((item) => item.count > 0),
    [products],
  );
  const featuredProducts = useMemo(() => {
    const promoted = products.filter((product) => product.inStock && ['Featured', 'Best Seller'].includes(product.badge || ''));
    return (promoted.length ? promoted : products.filter((product) => product.inStock)).slice(0, 4);
  }, [products]);

  useEffect(() => {
    setVisibleCount(24);
  }, [category, menTab, menBrand, menSize, comboSaleOnly]);
  const visibleProducts = useMemo(() => list.slice(0, visibleCount), [list, visibleCount]);

  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);
  const cartTotal = cart.reduce((sum, item) => sum + effectivePrice(item.product) * item.qty, 0);

  function closeProduct() {
    setSelected(null);
    if (productIdFromPath(location.pathname)) {
      window.history.replaceState(null, '', '/');
      setProductRouteId(null);
      openedRouteRef.current = null;
      if (!hasFullCatalogueRef.current) {
        setLoading(true);
        void load();
      }
    }
  }

  async function copyProductLink(product: Product) {
    const link = new URL(productPath(product), window.location.origin).toString();
    try {
      await navigator.clipboard.writeText(link);
      setShareMessage('Advertising link copied for ' + product.name);
    } catch {
      setShareMessage('Copy this advertising link: ' + link);
    }
  }

  function openProduct(p: Product, updateUrl = true) {
    if (updateUrl) {
      window.history.pushState(null, '', productPath(p));
      setProductRouteId(p.id);
    }
    openedRouteRef.current = p.id;
    metaTrack('ViewContent', { content_ids: [p.id], content_name: p.name, content_category: p.category, content_type: 'product', value: effectivePrice(p), currency: 'NGN' });
    setSelected(p);
    setGalleryIndex(0);
    setSelectedSize(p.sizes?.[0] || '');
    void getProductImages(p.id).then((images) => {
      if (images.length) setSelected((current) => current?.id === p.id ? { ...current, images } : current);
    }).catch(() => {
      // Retain the cover image if a gallery request fails.
    });
  }

  function addToCart(p: Product, size?: string) {
    metaTrack('AddToCart', { content_ids: [p.id], content_name: p.name, content_category: p.category, content_type: 'product', value: effectivePrice(p), currency: 'NGN' });
    setCart((current) => {
      const index = current.findIndex((item) => item.product.id === p.id && (item.size || '') === (size || ''));
      if (index >= 0) {
        return current.map((item, i) => (i === index ? { ...item, qty: item.qty + 1 } : item));
      }
      return [...current, { product: p, qty: 1, size }];
    });
    closeProduct();
    setCartOpen(true);
  }

  function updateQty(index: number, qty: number) {
    if (qty <= 0) setCart((c) => c.filter((_, i) => i !== index));
    else setCart((c) => c.map((item, i) => (i === index ? { ...item, qty } : item)));
  }

  function cartSummary(prefix: string) {
    const lines = cart.map(
      (item, i) =>
        `${i + 1}. ${item.product.name}${item.size ? ' - Size ' + item.size : ''} x${item.qty} — ${money(
          effectivePrice(item.product) * item.qty,
        )}`,
    );
    return [prefix, '', ...lines, '', 'Total: ' + money(cartTotal)].join('\n');
  }

  function paymentInstructions(total: number) {
    return [
      '',
      'PAYMENT DETAILS',
      'Account name: Reborn Classica collection',
      'Bank: Moniepoint',
      'Account number: 5107360858',
      'Amount to transfer: ' + money(total),
      '',
      'Please transfer the exact amount and send your payment receipt in this WhatsApp chat together with your name, phone number and delivery address.',
    ].join('\n');
  }

  function whatsappCheckout() {
    if (!cart.length) return;
    metaTrack('InitiateCheckout', { content_ids: cart.map((item) => item.product.id), content_type: 'product', value: cartTotal, currency: 'NGN', num_items: cart.reduce((sum, item) => sum + item.qty, 0) });
    const reference = 'RBW-' + Date.now().toString(36).toUpperCase();
    const text = cartSummary('Hello REBORN, I want to checkout these items:') + '\n\nOrder reference: ' + reference + paymentInstructions(cartTotal);
    window.open('https://wa.me/' + phoneNumber(settings.whatsapp) + '?text=' + encodeURIComponent(text), '_blank');
  }

  function singleWhatsAppCheckout(p: Product, size?: string) {
    const total = effectivePrice(p);
    metaTrack('InitiateCheckout', { content_ids: [p.id], content_name: p.name, content_category: p.category, content_type: 'product', value: total, currency: 'NGN', num_items: 1 });
    const reference = 'RBW-' + Date.now().toString(36).toUpperCase();
    const text = [
      'Hello REBORN, I want to buy this item:',
      '',
      p.name + (size ? ' - Size ' + size : ''),
      'Price: ' + money(total),
      'Order reference: ' + reference,
      paymentInstructions(total),
    ].join('\n');
    window.open('https://wa.me/' + phoneNumber(settings.whatsapp) + '?text=' + encodeURIComponent(text), '_blank');
  }

  if (adminMode) return <Suspense fallback={<div role='status' className='empty'>Loading admin…</div>}><AdminPanel /></Suspense>;

  return (
    <div className='site'>
      <header id='top'>
        <div className='announcement'><span>Style for every day · Wholesale & retail</span><a href='#shop'>Shop the catalogue →</a></div>
        <nav aria-label='Main navigation'>
          <a href='#top' className='brand'>
            {settings.logoUrl ? <img src={imageUrl(settings.logoUrl, 350, 80)} alt='REBORN logo' decoding='async' /> : settings.brand}
          </a>
          <div id='collection-navigation' className={'nav ' + (menu ? 'open' : '')}>
            {cats.slice(1).map((c) => (
              <button key={c} aria-current={category === c ? 'page' : undefined} onClick={() => { location.hash = '#collection/' + collectionSlug(c); setCategory(c); setMenu(false); }}>
                {c}
              </button>
            ))}
          </div>
          <div className='navActions'>
            <button className='cartButton' aria-label={'Open cart with ' + cartCount + ' items'} onClick={() => setCartOpen(true)}>
              <ShoppingCart size={19} /> Cart {cartCount > 0 && <span>{cartCount}</span>}
            </button>
            <button className='menu' aria-controls='collection-navigation' aria-label={menu ? 'Close collections menu' : 'Open collections menu'} aria-expanded={menu} onClick={() => setMenu(!menu)}>{menu ? <X /> : <Menu />}</button>
          </div>
        </nav>
        {!productRouteId && <section className='hero'>
          <div>
            <small>{category === 'All' ? 'WHOLESALE & RETAIL' : 'REBORN COLLECTION'}</small>
            <h1>{category === 'All' ? settings.heroTitle : collectionCopy[category]?.title || category + ' Collection'}</h1>
            <p>{category === 'All' ? settings.heroText : collectionCopy[category]?.text}</p>
            <div className='heroCtas'>
              <a href='#shop'>{category === 'All' ? 'Explore collections' : 'Shop ' + category}</a>
              <a className='heroSecondary' href={'https://wa.me/' + phoneNumber(settings.whatsapp) + '?text=' + encodeURIComponent('Hello REBORN, I would like help choosing from your fashion collection.')} target='_blank' rel='noopener noreferrer'><MessageCircle size={18} /> Chat to shop</a>
            </div>
          </div>
          {settings.heroImageUrl ? (
            <div className='heroVisual'>
              <div className='heroArch'></div>
              <img src={imageUrl(settings.heroImageUrl, 960, 80)} srcSet={imageSrcSet(settings.heroImageUrl, [480, 720, 960, 1280])} sizes='(max-width: 900px) 90vw, 520px' alt='REBORN featured collection' fetchPriority='high' loading='eager' decoding='async' />
            </div>
          ) : (
            <div className='heroBox'><ShoppingBag /><b>REBORN Collections</b><span>{settings.address}</span></div>
          )}
        </section>}
      </header>

      {shareMessage && <div className='adCopyNotice' role='status' aria-live='polite'>{shareMessage}</div>}
      <main id='shop'>
        {productRouteId ? (
          <div className='adProductLanding' role='status'>
            {loading ? 'Loading product details…' : products.some((product) => product.id === productRouteId) ? 'REBORN product details' : 'This product is no longer available. Browse our catalogue from the homepage.'}
          </div>
        ) : <>
        {category === 'All' && !comboSaleOnly && <>
          <section className='storeBenefits' aria-label='Shopping benefits'>
            <div><Sparkles size={23} /><div><b>Style across collections</b><span>Fashion, footwear, wigs and accessories in one catalogue.</span></div></div>
            <div><CheckCircle2 size={23} /><div><b>Retail & wholesale</b><span>Explore listed products and available pricing.</span></div></div>
            <div><Headphones size={23} /><div><b>WhatsApp ordering</b><span>Confirm your order, availability and delivery with our team.</span></div></div>
          </section>
          {collectionHighlights.length > 0 && <section className='collectionEdit' aria-label='Shop by collection'>
            <div className='editorialHeading'><div><small>Find your next look</small><h2>Shop by collection</h2><p>Discover what is currently available.</p></div><a href='#product-catalogue'>View all products <ArrowRight size={16}/></a></div>
            <div className='collectionTiles'>{collectionHighlights.map(item =>
              <a key={item.name} className='collectionTile' href={'#collection/' + collectionSlug(item.name)} onClick={() => setCategory(item.name)}>
                {item.image ? <CatalogueImage src={item.image} alt={item.name + ' collection'} /> : <div className='collectionPlaceholder'>{item.name[0]}</div>}
                <span className='collectionText'><strong>{item.name}</strong><small>{item.count} products · Explore →</small></span>
              </a>)}</div>
          </section>}
          {featuredProducts.length > 0 && <section className='featuredEdit' aria-label='Featured products'>
            <div className='editorialHeading'><div><small>Selected for you</small><h2>The REBORN edit</h2><p>A selection from our current catalogue.</p></div><a href='#product-catalogue'>Explore everything <ArrowRight size={16}/></a></div>
            <ProductGrid list={featuredProducts} loading={false} open={openProduct} add={addToCart} share={copyProductLink} />
          </section>}
        </>}

        {comboSales.length > 0 && !comboSaleOnly && (
          <section className='newArrivalShowcase' aria-label='Combo sales promotion'>
            <div className='newArrivalTop'>
              <div><small>{settings.comboSaleEyebrow}</small><h2>{settings.comboSaleTitle}</h2><p>{settings.comboSaleText}</p></div>
              <div className='newArrivalActions'><button onClick={() => { location.hash = '#promo/combo-sales'; setComboSaleOnly(true); }}>Shop Combo Sales</button></div>
            </div>
            <div className='grid'>{comboSales.slice(0, 4).map((p) => <article key={p.id}><button className='photo' onClick={() => openProduct(p)}><CatalogueImage src={p.image} alt={p.name} /><span>COMBO SALE</span></button><div className='info'><small>{p.category}</small><h3>{p.name}</h3><div><b>{money(effectivePrice(p))}</b><em>Promo bundle</em></div><div className='cardActions'><button onClick={() => openProduct(p)}>View</button><button disabled={!p.inStock} onClick={() => addToCart(p, p.sizes?.[0])}><ShoppingCart size={15} /> {p.inStock ? 'Add' : 'Sold out'}</button></div></div></article>)}</div>
          </section>
        )}
        {newArrivals.length > 0 && !comboSaleOnly && (
          <section className='newArrivalShowcase' aria-label='New arrivals slideshow'>
            <div className='newArrivalTop'>
              <div><small>JUST DROPPED</small><h2>New Arrival Alert</h2><p>Fresh styles just landed at REBORN. Tap any slide to see the product or shop its collection.</p></div>
              <div className='newArrivalControls'>
                <button aria-label='Previous new arrival' onClick={() => setNewArrivalIndex((newArrivalIndex - 1 + newArrivals.length) % newArrivals.length)}>‹</button>
                <button aria-label='Next new arrival' onClick={() => setNewArrivalIndex((newArrivalIndex + 1) % newArrivals.length)}>›</button>
              </div>
            </div>
            {(() => {
              const item = newArrivals[newArrivalIndex % newArrivals.length];
              return (
                <div className='newArrivalSlide'>
                  <button className='newArrivalImage' onClick={() => openProduct(item)}><CatalogueImage src={item.image} alt={item.name} /><span>NEW ARRIVAL</span></button>
                  <div className='newArrivalCopy'>
                    <small>{item.brand || 'REBORN'} · {item.category}</small>
                    <h3>{item.name}</h3>
                    <strong>{money(effectivePrice(item))}</strong>
                    <p>{item.description || 'A fresh REBORN arrival ready to shop now.'}</p>
                    <div className='newArrivalActions'>
                      <button onClick={() => openProduct(item)}>View product</button>
                      <button onClick={() => { location.hash = '#collection/' + collectionSlug(item.category); setCategory(item.category); }}>Shop {item.category}</button>
                    </div>
                  </div>
                </div>
              );
            })()}
            {newArrivals.length > 1 && <div className='newArrivalDots'>{newArrivals.map((item, i) => <button key={item.id} aria-label={'Show new arrival ' + (i + 1)} className={i === newArrivalIndex ? 'active' : ''} onClick={() => setNewArrivalIndex(i)} />)}</div>}
          </section>
        )}
        <div id='product-catalogue' className='shopHead'>
          <div>
            <small>OUR CURRENT CATALOGUE</small>
            <h2>{comboSaleOnly ? settings.comboSaleTitle : category === 'All' ? 'Current products' : collectionCopy[category]?.title || category + ' Collection'}</h2>
            <p>{comboSaleOnly ? settings.comboSaleText : category === 'All' ? 'Explore our fashion catalogue and send your selection to us on WhatsApp.' : collectionCopy[category]?.text}</p>
          </div>
          <button onClick={load}><RefreshCw size={17} /> Refresh</button>
        </div>
        {catalogError && <p className='catalogError' role='alert'>Could not refresh Sanity products. Try Refresh to reconnect; previously loaded products remain visible.</p>}
        <div className='chips'>
          {comboSaleOnly && <button className='active'>Combo Sales</button>}
          {cats.map((c) => (
            <button key={c} className={category === c ? 'active' : ''} onClick={() => { if (c === 'All') location.hash = ''; else location.hash = '#collection/' + collectionSlug(c); setCategory(c); }}>{c}</button>
          ))}
        </div>

        {category === 'Men' && (
          <>
            <section className='menBanner'>
              <div>
                <small>REBORN MEN</small>
                <h2>Premium Men's Jeans & Streetwear</h2>
                <p>Denim, baggy fits and everyday trousers — retail and wholesale.</p>
                <div className='menTabs'>
                  {['All Men', 'Denim', 'Baggy Jean'].map((tab) => (
                    <button key={tab} className={menTab === tab ? 'active' : ''} onClick={() => { setMenTab(tab); location.hash = tab === 'All Men' ? '#collection/men' : '#collection/men/' + collectionSlug(tab); }}>{tab}</button>
                  ))}
                </div>
              </div>
              <div className='denimArt'><span>R</span><b>DENIM</b></div>
            </section>
            <button className='mobileFilter' onClick={() => setShowFilters(!showFilters)}>
              <Filter size={17} /> Filter by brand & size
            </button>
            <div className='menShop'>
              <aside className={showFilters ? 'show' : ''}>
                <div className='filterBlock'>
                  <b>BRAND</b>
                  <label><input type='radio' name='brand' checked={menBrand === 'All'} onChange={() => setMenBrand('All')} /> All brands</label>
                  {menBrands.map((b) => (
                    <label key={b}><input type='radio' name='brand' checked={menBrand === b} onChange={() => setMenBrand(b)} /> {b}</label>
                  ))}
                </div>
                <div className='filterBlock'>
                  <b>SIZE</b>
                  <label><input type='radio' name='size' checked={menSize === 'All'} onChange={() => setMenSize('All')} /> All sizes</label>
                  {menSizes.map((s) => (
                    <label key={s}><input type='radio' name='size' checked={menSize === s} onChange={() => setMenSize(s)} /> {s}</label>
                  ))}
                </div>
              </aside>
              <ProductGrid list={visibleProducts} loading={loading} open={openProduct} add={addToCart} share={copyProductLink} />
            </div>
          </>
        )}
        {category !== 'Men' && <ProductGrid list={visibleProducts} loading={loading} open={openProduct} add={addToCart} share={copyProductLink} />}
        {!loading && visibleCount < list.length && <div className='loadMoreRow'><span>Showing {visibleProducts.length} of {list.length} products</span><button type='button' onClick={() => setVisibleCount((count) => count + 24)}>Load more styles</button></div>}
        {category === 'All' && !comboSaleOnly && <section className='orderSteps'>
          <div className='editorialHeading'><div><small>How to shop</small><h2>From discovery to your door</h2><p>Shop your way and confirm the details with REBORN.</p></div></div>
          <div className='orderStepsGrid'>
            <article><b>01</b><h3>Discover</h3><p>Explore our product images, sizes and prices.</p></article>
            <article><b>02</b><h3>Select</h3><p>Build your cart or choose one item directly.</p></article>
            <article><b>03</b><h3>Confirm</h3><p>Send your order through WhatsApp to confirm availability and delivery details.</p></article>
          </div>
        </section>}
        </>}
      </main>

      <footer><b>{settings.brand}</b><span>{settings.tagline}</span><a onClick={() => metaTrack('Contact', { content_name: 'Footer WhatsApp' })} href={'https://wa.me/' + phoneNumber(settings.whatsapp)}>WhatsApp</a></footer>
      <a className='float' onClick={() => metaTrack('Contact', { content_name: 'Floating WhatsApp chat' })} href={'https://wa.me/' + phoneNumber(settings.whatsapp)}><MessageCircle /> Chat</a>

      {selected && (
        <div className='modal' role='presentation' onClick={closeProduct}>
          <div className='productModal' role='dialog' aria-modal='true' aria-label={selected.name} onClick={(e) => e.stopPropagation()}>
            <button className='close' aria-label='Close product details' onClick={closeProduct}><X /></button>
            <div className='gallery'>
              <CatalogueImage src={selected.images?.[galleryIndex] || selected.image} alt={selected.name} eager width={960} sizes='(max-width: 900px) 90vw, 480px' />
              {selected.images && selected.images.length > 1 && (
                <div className='galleryThumbButtons'>{selected.images.map((img, n) => <button key={img + n} className={n === galleryIndex ? 'active' : ''} aria-label={'Show image ' + (n + 1)} aria-pressed={n === galleryIndex} onClick={() => setGalleryIndex(n)}><CatalogueImage src={img} alt={selected.name + ' view ' + (n + 1)} width={140} sizes='70px' /></button>)}</div>
              )}
            </div>
            <div className='detail'>
              {!selected.inStock && <p className='catalogError'>This product is marked out of stock. Ask us about availability on WhatsApp.</p>}
              <small>{selected.brand || 'REBORN'} · {selected.category}</small>
              <h2>{selected.name}</h2>
              <h3>{money(effectivePrice(selected))}</h3>
              <p>{selected.description}</p>
              {!!selected.sizes?.length && (
                <label className='sizeSelect'>Size
                  <select value={selectedSize} onChange={(e) => setSelectedSize(e.target.value)}>
                    {selected.sizes.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </label>
              )}
              <div className='productActions'>
                <button className='adCopyButton' type='button' onClick={() => copyProductLink(selected)}><Link2 size={18} /> Copy product link for ads</button>
                <button className='addCart' disabled={!selected.inStock} onClick={() => addToCart(selected, selectedSize || undefined)}><ShoppingCart size={18} /> Add to cart</button>
                <button className='whatsappButton' disabled={!selected.inStock} onClick={() => singleWhatsAppCheckout(selected, selectedSize || undefined)}><MessageCircle size={18} /> Buy on WhatsApp</button>
                <a onClick={() => metaTrack('Contact', { content_ids: [selected.id], content_name: selected.name, content_category: selected.category })} href={'https://wa.me/' + phoneNumber(settings.whatsapp) + '?text=' + encodeURIComponent('Hello REBORN, is ' + selected.name + (selectedSize ? ' in size ' + selectedSize : '') + ' available?')}>
                  <MessageCircle size={18} /> Check availability
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {cartOpen && (
        <div className='cartDrawer'>
          <div className='cartPanel'>
            <div className='cartHead'><h2>Your cart</h2><button onClick={() => setCartOpen(false)}><X /></button></div>
            {!cart.length ? (
              <div className='empty'><ShoppingCart /><b>Your cart is empty</b></div>
            ) : (
              <>
                <div className='cartLines'>
                  {cart.map((item, index) => (
                    <div className='cartLine' key={item.product.id + (item.size || '')}>
                      <CatalogueImage src={item.product.image} alt={item.product.name} />
                      <div><b>{item.product.name}</b>{item.size && <small>Size: {item.size}</small>}<span>{money(effectivePrice(item.product))}</span></div>
                      <div className='qty'>
                        <button onClick={() => updateQty(index, item.qty - 1)}><Minus size={14} /></button>
                        <b>{item.qty}</b>
                        <button onClick={() => updateQty(index, item.qty + 1)}><Plus size={14} /></button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className='cartTotal'><span>Total</span><b>{money(cartTotal)}</b></div>
                <div className='cartCheckoutButtons'>
                  <button className='whatsappButton' onClick={whatsappCheckout}><MessageCircle size={18} /> Checkout & Pay on WhatsApp</button>
                  <p className='hint'>Your order summary, total and Moniepoint transfer details will open in WhatsApp DM. Send your receipt there after payment.</p>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CatalogueImage({ src, alt, eager = false, width = 640, sizes = '(max-width: 600px) 46vw, (max-width: 900px) 44vw, 280px' }: { src: string; alt: string; eager?: boolean; width?: number; sizes?: string }) {
  return <img src={imageUrl(src, width)} srcSet={imageSrcSet(src, width <= 140 ? [140] : [320, 480, 640, 960])} sizes={sizes} alt={alt} loading={eager ? 'eager' : 'lazy'} decoding='async' onError={event => {
    const img = event.currentTarget;
    if (!img.src.endsWith('/reborn-icon.svg')) img.src = '/reborn-icon.svg';
  }} />;
}

function ProductGrid({
  list,
  loading,
  open,
  add,
  share,
}: {
  list: Product[];
  loading: boolean;
  open: (p: Product) => void;
  add: (p: Product, size?: string) => void;
  share: (p: Product) => void;
}) {
  if (loading) return <div className='empty'>Loading…</div>;
  if (!list.length) return <div className='empty'><Package /><b>No products match these filters</b><p>Try another brand, size or collection.</p></div>;
  return (
    <div className='grid'>
      {list.map((p) => (
        <article key={p.id}>
          <button className='photo' onClick={() => open(p)}><CatalogueImage src={p.image} alt={p.name} />{p.badge && <span>{p.badge}</span>}</button>
          <div className='info'>
            <small>{p.brand || 'REBORN'} · {p.category}{p.subcategory ? ' · ' + p.subcategory : ''}</small>
            <h3>{p.name}</h3>
            <div><b>{p.price > 0 ? money(effectivePrice(p)) : 'Ask for price'}</b>{p.wholesalePrice > 0 && <em>Wholesale {money(p.wholesalePrice)}</em>}</div>
            <div className='sizeLine'>{(p.sizes || []).slice(0, 6).map((s) => <span key={s}>{s}</span>)}</div>
            <div className='cardActions'>
              <button onClick={() => open(p)}>View</button>
              <button disabled={!p.inStock} onClick={() => add(p, p.sizes?.[0])}><ShoppingCart size={15} /> {p.inStock ? 'Add' : 'Sold out'}</button>
              <button className='adCopyButton' type='button' title={'Copy advertising link for ' + p.name} onClick={() => share(p)}><Link2 size={15} /> Copy ad link</button>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

export default App;
