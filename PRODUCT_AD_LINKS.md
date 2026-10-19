# REBORN product advertising and share previews

## What this adds

Every **published** Sanity product has a permanent shareable product URL. Staff can obtain it from the storefront catalogue by clicking **Copy ad link** or from the product detail pop-up. The link looks like:

`https://reborncollections.com/product/<sanity-product-id>/<readable-product-name>`

The Sanity product ID is the permanent identifier, so renaming a product will not break old advertising links. The optional human-readable final segment improves legibility.

## What customers see

A customer opening a product link sees the **correct product details** immediately after the public Sanity fetch, including its image, price, sizes, and existing WhatsApp actions. Direct ad visits fetch only the advertised item and settings, rather than the entire product catalogue.

## What appears when sharing links

Cloudflare Pages Function `functions/product/[[path]].ts` handles direct GET requests to individual product URLs. It reads the public published product from Sanity and returns **server-rendered**:
- Open Graph title, description, canonical URL, and product image
- Twitter/X card title, description and product image
- Product JSON-LD, including an offer when a price exists

For the preview image, the Function uses the product's **Advertising / link preview image** when provided in Sanity Studio. Otherwise it uses the product's first image. If the product has no published image, a REBORN fallback appears instead.

### Choosing a different advertising image

1. In Sanity Studio, open the product.
2. Optionally upload/select an image in **Advertising / link preview image**.
3. Publish the product.
4. Copy its URL from the storefront and use it as an ad destination.

The custom frontend admin panel and its APIs have **not** been given a new advertising-image picker. Continue editing this optional image through **Sanity Studio**. Regular product image management is unchanged.

## Important publishing details

- This works when the Vite build **and the repository's `functions/` directory** are deployed together to **Cloudflare Pages**. A Vite-only static host won't render per-product social metadata. Use a Cloudflare Pages Git integration or other deployment mode that includes Pages Functions.
- No code here modifies the live site until approved, merged, and deployed.
- Product content and images must be **published and publicly readable** in the intended Sanity dataset; never expose Sanity write tokens in the browser.
- Facebook/WhatsApp may cache old previews. After publishing or changing an image, use **Meta Sharing Debugger** to re-scrape the product URL. Allow for Sanity CDN and Cloudflare cache propagation.
- The HTML contains complete preview tags before JavaScript runs, which is important for social link scrapers.
- Product links generated on an unapproved development/preview domain refer to that preview domain. Use **reborncollections.com** ad links only once the production deployment has been verified.

## Verification before approval

From GitHub Actions run: `npm install`, `npm run typecheck`, `npm test`, `npm run build` and `npm run build:functions`.

Use a **Cloudflare Pages preview deployment** (not production) to verify a published product link:
1. Open the link directly in a fresh/private mobile browser tab.
2. Check the correct product image and price, gallery, sizes and WhatsApp checkout.
3. Inspect the HTML response for `og:title`, `og:image`, `og:description`, `twitter:image`, canonical and Product JSON-LD before React hydration.
4. Share the same preview URL in a private WhatsApp test and Meta Sharing Debugger.
5. Test an invalid/unpublished product URL (should return 404), other collections, the homepage and /api/admin to confirm existing routes remain intact.

Until a Pages preview is tested, preview rendering and live Sanity permissions should be treated as **runtime-unverified**.
