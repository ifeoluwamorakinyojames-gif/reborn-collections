# REBORN Admin Access Setup

The frontend admin at `/#admin` now supports an owner account plus delegated admin accounts.

## Owner account

Owner email defaults to:

`ifeoluwamorakinyojames@gmail.com`

For production, add these Cloudflare Pages environment variables/secrets:

- `SANITY_PROJECT_ID=unv7o4vs`
- `SANITY_DATASET=production`
- `SANITY_WRITE_TOKEN=<Sanity editor token>`
- `ADMIN_OWNER_EMAIL=ifeoluwamorakinyojames@gmail.com`
- `ADMIN_PASSWORD=<strong owner password>`
- `ADMIN_SESSION_SECRET=<long random secret, 32+ characters>`

## Delegated admin storage

Delegated admin accounts are stored in Cloudflare KV, not in the public Sanity dataset.

Create a Cloudflare KV namespace, for example:

`REBORN_ADMIN_ACCESS`

Then bind it to the Pages project with the variable/binding name:

`ADMIN_ACCESS`

The owner can then open `/#admin` → **Admin access**, enter an email address and a temporary password, and create access.

Only the owner can add or revoke admin accounts. Delegated admins can manage products, bulk uploads and site settings, but cannot manage other admins.

## Security notes

- Do not put `SANITY_WRITE_TOKEN`, `ADMIN_PASSWORD`, or `ADMIN_SESSION_SECRET` in the frontend source or GitHub repository.
- The login cookie is HttpOnly, SameSite=Strict and signed by `ADMIN_SESSION_SECRET`.
- Delegated passwords are PBKDF2-hashed before being stored in KV.
- Revoking an email invalidates that delegated admin's access on their next request.
