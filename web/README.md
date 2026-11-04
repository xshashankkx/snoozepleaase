# Snooze Pleaase storefront and CMS (slices 1 to 4)

Next.js + Payload CMS + PostgreSQL. One project: the admin at `/admin` and the shop at `/`. The Vite storefront in the repository root is the earlier prototype; this project replaces it.

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

## The storefront (slice 3)

The shop is the same design as the prototype, now server-rendered and reading everything from the CMS: home page sections, menus, announcement bar, age-step words and stages, collections, products, pages, blog and events.

- **Fast and searchable:** pages arrive as finished HTML with titles, descriptions, share images, product structured data (price, stock, breadcrumbs), `sitemap.xml` and `robots.txt`. Old Shopify collection addresses redirect to the new ones.
- **Publish goes live in seconds:** content is cached, and saving anything in the admin refreshes the cache (`src/lib/revalidate.ts`).
- **Preview:** the "Preview" button in the admin opens the site showing saved drafts, behind a staff-only switch (`/api/preview`). A bar at the top has an "Exit preview" link.
- **Age step:** the remembered age is a session cookie (`sp_age`) so the server can render the right page.
- **Cart:** each cart line keeps a small snapshot of the product for display, but the server prices the bag (see Discounts). The payment step is still a demo until Razorpay is connected.
- **Demo products:** `npm run demo-fill` fills clearly fake SKUs (prefixed `DEMO-`), barcodes, weights and box sizes and publishes every product that is otherwise complete. `npm run demo-fill -- --undo` removes them again. Products with no fabric listed stay as drafts until someone fills it in.
- **Layout:** `src/storefront/` holds the shop components and styles, `src/lib/cms.ts` loads CMS data on the server.

## Discounts (slice 4)

Marketing > Discounts holds every offer: a percentage off, a flat amount off, buy X get Y, or free shipping, either automatic or with a code.

- **Rules:** switch on or off, optional start and end time, applies to everything / certain categories / certain products, minimum spend, first order only, once per customer.
- **Best single offer wins.** Tick "Can combine with other offers" for offers that should stack (free shipping is the usual one). A typed code wins a tie.
- **Headline sale:** one automatic offer can be marked "This is the headline sale". Its name and text fill the header tag, and product pages say what it is, so the header, product pages and the bag can never disagree. The fields in Site > Announcement are only a fallback.
- **Prices are checked on the server.** The bag sends only product, size and quantity to `POST /api/storefront/quote`; prices, stock, offers and codes are all looked up there (`src/lib/quote.ts`, rules in `src/lib/discounts.ts`). Secret codes are never sent to the browser. Sold-out or removed items are flagged and block checkout.
- **Demo-level:** first-order and once-per-customer checks use orders saved in the shopper's browser, matched on the email or phone typed at checkout. Real enforcement needs real customer accounts and orders.
- **Seed:** `npm run seed:discounts` creates the live Dreamtime Sale (10% off, headline) and four switched-off examples (welcome code, buy 2 get 1, free shipping code, flat amount off). Nothing else is live until someone switches it on.
- **Checks:** `npm run check:discounts` (37 engine examples, no database), `npm run check:quote` (16 checks against the running site) and `npm run check:discount-admin` (18 admin rules).

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
