# REBORN Collections

Source repository for the REBORN Collections wholesale and retail fashion website.

## Snapshot

This project was exported from the current AppDeploy source snapshot `1790559714186` (`v48`) on 28 September 2026.

## Project structure

- `src/` — React/Vite storefront and admin UI
- `backend/` — current AppDeploy backend implementation
- `public/` — SEO pages, collection/ad landing pages, logo, favicon, sitemap
- `tests/` — application QA scenarios
- `MIGRATION_NOTES.md` — what must be changed before moving away from AppDeploy

## Local source

The frontend is React + Vite + TypeScript.

The current source uses AppDeploy SDK imports for API/auth/database/storage. Those services need to be replaced or migrated before a non-AppDeploy deployment will be fully functional.

## Domain

The intended branded domain is:

`https://reborncollections.com`

Do not switch DNS to a new host until the replacement deployment has been tested.

## Important

The source archive does not contain live AppDeploy database rows, admin accounts, or uploaded product images because those live in managed AppDeploy services rather than in the code repository.


## Sanity migration

A Sanity Studio and public Sanity data client have been added for project `unv7o4vs`. See `SANITY_MIGRATION.md`.
