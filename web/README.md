# Snooze Pleaase storefront and CMS (slices 1 to 5)

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
- **Cart:** each cart line keeps a small snapshot of the product for display, but the server prices the bag (see Discounts). Payment goes through Razorpay (see Orders, payments and shipping).
- **Demo products:** `npm run demo-fill` fills clearly fake SKUs (prefixed `DEMO-`), barcodes, weights and box sizes and publishes every product that is otherwise complete. `npm run demo-fill -- --undo` removes them again. Products with no fabric listed stay as drafts until someone fills it in.
- **Layout:** `src/storefront/` holds the shop components and styles, `src/lib/cms.ts` loads CMS data on the server.

## Discounts (slice 4)

Marketing > Discounts holds every offer: a percentage off, a flat amount off, buy X get Y, or free shipping, either automatic or with a code.

- **Rules:** switch on or off, optional start and end time, applies to everything / certain categories / certain products, minimum spend, first order only, once per customer.
- **Best single offer wins.** Tick "Can combine with other offers" for offers that should stack (free shipping is the usual one). A typed code wins a tie.
- **Headline sale:** one automatic offer can be marked "This is the headline sale". Its name and text fill the header tag, and product pages say what it is, so the header, product pages and the bag can never disagree. The fields in Site > Announcement are only a fallback.
- **Prices are checked on the server.** The bag sends only product, size and quantity to `POST /api/storefront/quote`; prices, stock, offers and codes are all looked up there (`src/lib/quote.ts`, rules in `src/lib/discounts.ts`). Secret codes are never sent to the browser. Sold-out or removed items are flagged and block checkout.
- **First-order checks:** matched against the orders saved on the server by email or phone (see slice 5). Before the shopper has typed an email or phone, the bag uses a browser hint, only to show a price; checkout always asks the server again.
- **Seed:** `npm run seed:discounts` creates the live Dreamtime Sale (10% off, headline) and four switched-off examples (welcome code, buy 2 get 1, free shipping code, flat amount off). Nothing else is live until someone switches it on.
- **Checks:** `npm run check:discounts` (37 engine examples, no database), `npm run check:quote` (16 checks against the running site) and `npm run check:discount-admin` (18 admin rules).

## Orders, payments and shipping (slice 5)

Every order is saved on the server (Sales > Orders). Online payments go through Razorpay; confirmed orders are sent to Shiprocket.

**How an order moves**
1. The shopper's bag is priced again on the server (`POST /api/storefront/checkout`), including offers, stock, the cash on delivery rules and a delivery check for their pincode.
2. *Online:* the order waits for payment while Razorpay's window is open. A genuine payment (checked by signature, and again by Razorpay's webhook) makes it **Confirmed**.
3. *Cash on delivery:* the order waits as **Cash on delivery: to confirm**. A staff member calls or messages the customer, then sets it to **Confirmed**. (A phone OTP needs an SMS provider; that is a later decision.)
4. Confirmed orders are sent to Shiprocket on their own. If that fails, the order's history says why; tick "Send to Shiprocket again" and save to retry.
5. Shiprocket's webhook moves the order to Shipped and Delivered.

**Rules in the admin** (Settings > Site settings > Payments and delivery, Owner only): pickup pincode, whether cash on delivery is offered, its limit (default ₹5,000) and an optional fee.

**First-order and once-per-customer offers** now use the real orders on the server, matched on email or phone, so a new email with the same phone number does not get a second welcome offer.

**Not done yet:** stock is not reduced when an order is placed (the inventory ledger will own that), refunds are not started from the admin (refunds made in Razorpay are recorded), no confirmation emails or WhatsApp messages (needs an email/WhatsApp provider), no GST invoices, no returns.

### Connecting real accounts (test mode first)

1. **Razorpay:** create an account, stay in *Test mode*, copy the Key Id and Key Secret into `.env` (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`). For the webhook, go to Settings > Webhooks, add `https://YOUR-SITE/api/webhooks/razorpay`, choose a secret (`RAZORPAY_WEBHOOK_SECRET`) and tick payment.captured, order.paid, payment.failed and refund.processed. Keep auto-capture on. Live keys (`rzp_live_...`) need Razorpay's KYC and the shipping, returns and terms pages to be live.
2. **Shiprocket:** in Settings > API create an API user with its own email (not your login email), set `SHIPROCKET_EMAIL` and `SHIPROCKET_PASSWORD`. Add your pickup address (Settings > Pickup Addresses) and put its exact name in `SHIPROCKET_PICKUP_LOCATION` and its pincode in `SHIPROCKET_PICKUP_PINCODE`. For tracking updates, add `https://YOUR-SITE/api/webhooks/shiprocket` with a token (`SHIPROCKET_WEBHOOK_TOKEN`). `SHIPROCKET_AUTO_AWB=true` picks a courier automatically, which spends wallet balance; leave it off while testing.
3. Webhooks need a public address. On a local computer use a tunnel (for example ngrok) or wait until the demo is online.
4. Fill in real SKUs, weights and box sizes (Shiprocket uses them) and check that the shopper-facing delivery days match what the courier says.

Secrets live only in `.env`, never in the browser. Only the public Razorpay key id reaches the shop's page.

### Testing without accounts (the sandbox)

`npm run dev:sandbox` starts the site on port 3100 pointed at a pretend Razorpay and Shiprocket. `npm run check:orders` (run with `DISABLE_2FA=true`) starts the pretend providers itself and runs 58 checks: wrong signatures, paying twice, changed prices, undeliverable pincodes, COD rules, staff permissions, webhooks and first-order offers. It cleans up after itself. The pretend providers prove our side works; the real services still need a real test order.

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
