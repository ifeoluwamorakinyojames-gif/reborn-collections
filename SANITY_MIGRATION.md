# REBORN → Sanity migration stage

The storefront has been refactored to read public catalogue/settings data from Sanity project:

- Project ID: `unv7o4vs`
- Dataset: `production`

## What changed

- Removed the storefront dependency on `@appdeploy/client`
- Added `src/sanity.ts`
- Added `@sanity/client`
- Added a separate `studio/` admin project
- Product images now come from Sanity Assets
- Products, New Arrival, Combo Sale, collection filtering and Meta Pixel settings are driven by Sanity content
- WhatsApp checkout remains in the React storefront

## What is not migrated automatically

The old AppDeploy database and uploaded AppDeploy Storage images are not inside GitHub. Existing products/images need to be recreated or exported/imported into Sanity.

## Next actions

1. In the project root:
   - copy `.env.example` to `.env`
   - run `npm install`
   - run `npm run dev`
2. In `studio/`:
   - run `npm install`
   - run `npm run dev`
3. Sign into Sanity Studio.
4. Create one `Site Settings` document.
5. Add one test product with at least one image.
6. Confirm it appears on the storefront.
7. After testing, deploy the storefront to Cloudflare Pages.
8. Do not repoint `reborncollections.com` until the new deployment is verified.

## Important

Sanity Project ID is public configuration and is safe in frontend code. Do not put Sanity write tokens into the public Vite frontend.
