# REBORN Frontend Admin → Sanity setup

This version restores a custom REBORN admin page at `/#admin` while keeping Sanity as the database and image store.

## Architecture

- Customer storefront: React/Vite
- Admin page: same frontend at `/#admin`
- Secure write API: Cloudflare Pages Functions under `/api/admin/*`
- Content + images: Sanity project `unv7o4vs`, dataset `production`
- Sanity write token stays only in Cloudflare server-side secrets. It is never shipped to the browser.

## 1. Create a Sanity write token

In Sanity project management, create an API token with Editor/write access for this project. Copy it once and keep it private.

## 2. Configure Cloudflare Pages secrets

In the Cloudflare Pages project, add these Environment Variables/Secrets for Production (and Preview if desired):

- `SANITY_PROJECT_ID` = `unv7o4vs`
- `SANITY_DATASET` = `production`
- `SANITY_WRITE_TOKEN` = your private Sanity Editor token
- `ADMIN_PASSWORD` = a strong password only you know
- `ADMIN_SESSION_SECRET` = a long random secret (32+ characters)

Do NOT add `SANITY_WRITE_TOKEN`, `ADMIN_PASSWORD`, or `ADMIN_SESSION_SECRET` as `VITE_*` variables.

Frontend public variables remain:

- `VITE_SANITY_PROJECT_ID` = `unv7o4vs`
- `VITE_SANITY_DATASET` = `production`

## 3. Cloudflare Pages build settings

- Build command: `npm run build`
- Build output directory: `dist`
- Functions are automatically read from the repository `functions/` directory.

## 4. Local full-stack test

Copy `.dev.vars.example` to `.dev.vars` in the project root and fill the real secret values. `.dev.vars` is ignored by Git and must never be committed.

Then run:

```bash
npm install
npm run dev:full
```

Wrangler will print the local URL (usually `http://localhost:8788`). Open:

- Storefront: `http://localhost:8788/`
- Frontend admin: `http://localhost:8788/#admin`

Regular `npm run dev` still starts Vite only. It is useful for storefront work, but the secure admin API requires `npm run dev:full` or a Cloudflare deployment.

## 5. Admin capabilities

The frontend admin can:

- Sign in with a server-verified admin password
- Add a product with up to 15 images
- Create many products in one batch using shared price/category details
- Upload product images directly into Sanity Assets
- Delete products
- Update core site settings

Bulk example: choose 20 jeans photos, set `Men / Denim`, one retail price and one wholesale price. The admin creates `Men Jeans 1` through `Men Jeans 20` as separate Sanity products.

## Security notes

- The Sanity write token never appears in frontend JavaScript.
- Admin login uses a signed HttpOnly cookie.
- The cookie is valid for 12 hours and is `Secure` + `SameSite=Strict` in production.
- Keep Sanity Studio available as a backup/content-management interface.

## Owner + delegated admin access

This build uses an owner email login and a Cloudflare KV-backed access list. See `ADMIN_ACCESS_SETUP.md` for the exact Cloudflare KV binding and secrets configuration.
