import test from 'node:test';
import assert from 'node:assert/strict';
import { onRequestGet } from '../functions/product/[[path]].ts';

test('Cloudflare product route prepares each product image, title, canonical and offer', async () => {
  const originalFetch = globalThis.fetch;
  const originalRewriter = (globalThis as any).HTMLRewriter;
  const changed: Record<string, Record<string, string>> = {};
  class ProbeRewriter {
    handlers: { selector: string; handler: any }[] = [];
    on(selector: string, handler: any) { this.handlers.push({ selector, handler }); return this; }
    transform(response: Response) {
      assert.equal(response.status, 200);
      for (const { selector, handler } of this.handlers) {
        changed[selector] = {};
        handler.element({
          setAttribute(key: string, value: string) { changed[selector][key] = value; },
          setInnerContent(value: string) { changed[selector].text = value; },
          remove() { changed[selector].removed = 'true'; },
        });
      }
      return new Response(JSON.stringify(changed), { status: 200 });
    }
  }
  try {
    (globalThis as any).HTMLRewriter = ProbeRewriter;
    globalThis.fetch = async (input) => {
      const url = new URL(String(input));
      assert.equal(url.hostname, 'unv7o4vs.apicdn.sanity.io');
      assert.equal(url.searchParams.get('$id'), JSON.stringify('my-product-01'));
      return new Response(JSON.stringify({
        result: {
          _id: 'my-product-01',
          name: 'Classic Denim Polo',
          price: 18000,
          salePrice: 15000,
          inStock: true,
          image: 'https://cdn.sanity.io/images/unv7o4vs/production/photo.jpg',
          description: 'A classic look for everyday wear',
        },
      }), { headers: { 'content-type': 'application/json' } });
    };
    const page = await onRequestGet({
      request: new Request('https://reborncollections.com/product/my-product-01/classic-denim-polo?utm_source=instagram'),
      params: { path: ['my-product-01', 'classic-denim-polo'] },
      env: {
        ASSETS: { fetch: async () => new Response('<html><head></head></html>', { status: 200, headers: { 'content-type': 'text/html' } }) },
      },
    });
    assert.equal(page.status, 200);
    assert.equal(changed['meta[property="og:title"]'].content, 'Classic Denim Polo | REBORN Collections');
    assert.match(changed['meta[property="og:image"]'].content, /cdn\.sanity\.io.*fm=jpg/);
    assert.match(changed['meta[property="og:description"]'].content, /₦15,000/);
    assert.equal(changed['meta[property="og:url"]'].content, 'https://reborncollections.com/product/my-product-01/classic-denim-polo');
    assert.equal(changed['link[rel="canonical"]'].href, 'https://reborncollections.com/product/my-product-01/classic-denim-polo');
    assert.match(changed['script[type="application/ld+json"]'].text, /"price":15000/);
  } finally {
    globalThis.fetch = originalFetch;
    (globalThis as any).HTMLRewriter = originalRewriter;
  }
});

test('unpublished product returns a 404 and no generic ad preview', async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response(JSON.stringify({ result: null }), { status: 200 });
    const page = await onRequestGet({
      request: new Request('https://reborncollections.com/product/missing/item'),
      params: { path: ['missing', 'item'] },
      env: { ASSETS: { fetch: async () => new Response('unused') } },
    });
    assert.equal(page.status, 404);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
