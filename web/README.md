# Snooze Pleaase CMS (slice 1: products)

Next.js + Payload CMS + PostgreSQL. The storefront will move into this project in a later slice; for now it is the admin for products.

## First run

1. Install PostgreSQL 17 and create a database called `snooze_cms`.
2. Copy `.env.example` to `.env` and fill in `DATABASE_URL` and a long random `PAYLOAD_SECRET`.
3. ```bash
   npm install
   npm run dev          # http://localhost:3000/admin
   ```
4. The first person to open `/admin` creates the Owner account, then sets up two-factor login with an authenticator app (Google Authenticator, Authy, Microsoft Authenticator).
5. Load the 44 products and 377 variants from the working-model data (reads `../src/data/seed.json` and `../public/img`):
   ```bash
   npm run seed                  # drafts with the real gaps: no SKU, barcode, weight or box size
   npm run seed -- --demo-fill   # also fills clearly fake placeholder codes, weights and boxes, and publishes
   ```

## What it does now

- **Staff:** Owner (everything, including staff and settings) and Store manager (products and content). Two-factor login is required for both.
- **Images:** every upload needs alt text.
- **Products:** all PRD fields, drafts, preview, scheduled publish. A product cannot go live until every size has a SKU, barcode, price, weight and box size; the sidebar says what is still missing.
- **Spreadsheet:** Products list, "Download spreadsheet", fill in the blanks, "Import spreadsheet". Blank cells are left as they are. Duplicate SKUs and bad numbers are reported by row.
- **Stock:** shown per size as a read-only placeholder. The inventory ledger will own real stock later.

## Notes

- `DISABLE_2FA=true` in `.env` switches two-factor off for local testing only. Regenerate the admin component map afterwards with `npm run generate:importmap`.
- Two-factor uses the community plugin `payload-totp` (MIT, one maintainer). Review it before production.
- The database schema updates automatically in development. Production will need proper migrations.
- Uploaded images are stored in `media/` (git-ignored). Production should use cloud storage and a CDN.
- `npm run dev-owner` and `scripts/check-roles.ts` are local testing helpers.
