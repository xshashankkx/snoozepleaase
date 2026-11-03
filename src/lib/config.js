// Single place for shop rules and brand details.
// Values marked PLACEHOLDER are not confirmed by the brand yet.
export const SHOP = {
  name: 'Snooze Pleaase',
  sale: { label: 'Dreamtime Sale', percent: 10 },
  shipping: {
    freeOver: 1999,
    standard: 79,
    express: 149,
    standardDays: '4–7', // PLACEHOLDER
    expressDays: '2–3', // PLACEHOLDER
  },
  returnsDays: 7, // PLACEHOLDER
  contact: {
    whatsapp: '+91 00000 00000', // PLACEHOLDER
    email: 'hello@snoozepleaase.com', // PLACEHOLDER
    instagram: 'snoozepleaase', // PLACEHOLDER
    hours: 'Mon–Sat, 10am–6pm IST', // PLACEHOLDER
  },
}

export const NAV = [
  { to: '/collections/kids-nightwear', label: 'Kids Nightwear' },
  { to: '/collections/co-ords', label: 'Co-ords' },
  { to: '/collections/bath-towels', label: 'Bath & Towels' },
  { to: '/collections/mom-me', label: 'Mom & Me' },
]
