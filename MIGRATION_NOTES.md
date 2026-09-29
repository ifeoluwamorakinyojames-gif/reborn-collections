# Migration notes

This repository is a source-code snapshot of the REBORN Collections site.

## Important AppDeploy dependencies

The current application was built around AppDeploy services:

- `@appdeploy/client` in `src/App.tsx`
- `@appdeploy/sdk` in `backend/index.ts`
- AppDeploy authentication for the admin
- AppDeploy database for settings/products/orders
- AppDeploy storage for product and hero images

Because those are platform services, uploading this repository to GitHub by itself does **not** migrate the live database, user accounts, or uploaded images.

## Recommended migration order

1. Push this folder to a private GitHub repository first.
2. Choose the new runtime/host.
3. Replace the AppDeploy client/backend SDK calls with the new backend.
4. Create database tables/collections for settings, products, orders and site owner/admin.
5. Create object storage for uploaded product/hero images.
6. Add admin authentication.
7. Migrate product data and images.
8. Test the storefront, admin, WhatsApp checkout, collection landing pages and Meta Pixel.
9. Only then point `reborncollections.com` to the new deployment.

## Current application behavior

- Retail and wholesale catalogue
- Women, Men, Unisex, Kids, Wigs, Shoes, Perfumes, Accessories
- Men's Denim / Baggy Jean filtering
- Product gallery uploads and batch uploads
- New Arrival slideshow
- Combo Sales campaign section and landing page
- Cart and WhatsApp checkout
- Meta Pixel field and funnel event tracking
- SEO/static landing pages
- Admin settings and product management

## Security

Do not commit private API keys or new credentials to GitHub. Use environment variables/secrets on the replacement platform.
