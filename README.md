# Snooze Pleaase storefront

React + Vite storefront for Snooze Pleaase, built from the "Dream Big, Sleep Cozy" mockup.
Real catalog (44 products, sizes and stock) and photos come from the working model.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build in dist/
```

## What is here

- Routes: `/`, `/collections/:slug` (all, kids-nightwear, co-ords, bath-towels, mom-me, best-sellers, new-arrivals), `/search?q=`, `/products/:handle`, `/wishlist`, `/account`, `/checkout`, `/order/:id`, `/pages/:slug` (about-us, contact, faq, size-guide, shipping-returns, privacy-policy).
- Cart, wishlist, demo account and orders are saved in the browser (`localStorage`). Payment is mocked: nothing is charged or sent.
- 10% Dreamtime Sale is applied automatically in the bag. Free standard shipping over ₹1,999.
- Motion: GSAP + ScrollTrigger (hero, parallax, sky that darkens as you scroll), Lenis smooth scroll, View Transitions (box glides into the product page), a box that flies into the bag. All of it respects reduced-motion.

## Age step

Kids Nightwear, Co-ords and all products open a growth-chart "Who are you shopping for?" step first (`src/pages/AgeStep.jsx`). The chosen stage (Toddler 1–3, Little 4–6, Big 7–9, Tween 10+) is kept in `sessionStorage` until the tab closes, filters those pages, adds a "Picks for…" row, and highlights and pre-selects fitting sizes on product pages. "Show me everything" skips it. Bath & Towels and Mom & Me never ask. Stages, size matching and the hand-picked rows live in `src/lib/age.js`.

## Where to change things

| What | File |
| --- | --- |
| Shipping, sale, contact details, nav | `src/lib/config.js` |
| Products, sizes, prices, stock | `src/data/seed.json` |
| Box art themes per product | `themeOf()` in `src/lib/catalog.js`, art in `src/components/Doodles.jsx` |
| Colors, fonts | `:root` in `src/styles/base.css` |

## Placeholders to replace before launch

- WhatsApp number, email, Instagram handle, support hours (`config.js`).
- Delivery days, express price, return window (`config.js`).
- Size chart numbers (`src/pages/Info.jsx`) are a typical kids chart, not Snooze Pleaase measurements.
- FAQ, care instructions and shipping and returns copy are drafts.
- Compare-at prices and stock counts come from the working model (stock is placeholder).
- Lifestyle photos in "Bedtime, photographed" are from the pomelli shoots and show styles that may not be in the catalog yet.
- The logo is the high-resolution file you supplied (`public/img/logo.webp`, 1100px wide, transparent). It sits on a cream badge in the header and footer. An SVG would be ideal if you have one; replace the file at the same path and update the `width`/`height` in `Logo` (`src/components/Shell.jsx`).

## Going live

Swap `src/store/StoreProvider.jsx` and `src/lib/catalog.js` for Shopify Storefront API calls (the cart shape is `{handle, variantId, qty}`), and replace the mocked payment step in `src/pages/Checkout.jsx` with Shopify or Razorpay checkout.
