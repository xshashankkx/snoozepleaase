# Snooze Pleaase CMS (slices 1 and 2: products and content)

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
6. Load the storefront's current words, menus, collections and home page (safe to re-run; use `-- --force` to overwrite the globals):
   ```bash
   npm run seed:content
   ```

## Content (slice 2)

| Where in the admin | What it controls |
| --- | --- |
| Site > Home page | Every home-page section: headline and buttons, featured boxes, ticker, best sellers, category boxes, story, photo strip, new arrivals, closing |
| Site > Age step | The growth chart words, the age stages (names, ranges) and the hand-picked products for each |
| Site > Announcement bar and sale tag | The top banner and the "Dreamtime Sale" tag, with scheduling |
| Site > Navigation menus | Header links and footer columns |
| Content > Pages | About, FAQ, size guide, shipping and returns, privacy, contact, or any new page |
| Content > Blog posts | The blog (empty; there are no posts yet) |
| Content > Events | Fairs and pop-ups for the "Find us at events" page (empty until added) |
| Catalog > Collections | The four categories (blurbs) and curated lists such as Best Sellers and New Arrivals |
| Settings > Site settings | Contact details, shipping and returns numbers, newsletter wording, default search text (Owner only) |

Everything except Site settings supports draft, publish and scheduled publish. Shoppers only ever see the published version. Preview needs the storefront inside this project (slice 3).

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
- `npm run dev-owner`, `scripts/check-roles.ts` and `scripts/check-content.ts` are local testing helpers. Run the checks with `DISABLE_2FA=true`, because two-factor refuses every action for an account that has not set up an authenticator yet.
