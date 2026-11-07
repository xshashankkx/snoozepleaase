import type { GlobalConfig } from 'payload'
import { isOwner } from '../collections/Users'
import { publicRead, seoField } from '../lib/fields'

// Business details and rules used across the storefront. Only the Owner can change them.
export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  label: 'Site settings',
  admin: { group: 'Settings', description: 'Contact details, shipping rules and defaults. Only the Owner can change these.' },
  custom: publicRead,
  access: { read: () => true, update: isOwner },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Brand and contact',
          fields: [
            { name: 'brandName', label: 'Brand name', type: 'text', required: true, defaultValue: 'Snooze Pleaase' },
            { name: 'tagline', type: 'text', defaultValue: 'Sleep naturally, dream sustainably.' },
            {
              type: 'row',
              fields: [
                { name: 'whatsapp', label: 'WhatsApp number', type: 'text', admin: { description: 'With country code, for example +91 98765 43210.' } },
                { name: 'email', type: 'email' },
              ],
            },
            {
              type: 'row',
              fields: [
                { name: 'instagram', type: 'text', admin: { description: 'The handle without @.' } },
                { name: 'hours', type: 'text', admin: { description: 'For example: Mon to Sat, 10am to 6pm IST.' } },
              ],
            },
            { name: 'legalName', label: 'Legal company name', type: 'text', admin: { description: 'The company name printed on invoices.' } },
            { name: 'gstin', type: 'text', label: 'GSTIN', admin: { description: 'Printed on invoices. Leave empty until registered.' } },
          ],
        },
        {
          label: 'Shipping and returns',
          fields: [
            {
              type: 'row',
              fields: [
                { name: 'freeShippingOver', label: 'Free shipping over (₹)', type: 'number', required: true, defaultValue: 1999, min: 0, admin: { description: 'In rupees, after discounts.' } },
                { name: 'standardShipping', label: 'Standard shipping price (₹)', type: 'number', required: true, defaultValue: 79, min: 0 },
                { name: 'expressShipping', label: 'Express shipping price (₹)', type: 'number', required: true, defaultValue: 149, min: 0 },
              ],
            },
            {
              type: 'row',
              fields: [
                { name: 'standardDays', label: 'Standard delivery days', type: 'text', defaultValue: '4–7', admin: { description: 'Shown as "4–7 days".' } },
                { name: 'expressDays', label: 'Express delivery days', type: 'text', defaultValue: '2–3' },
                { name: 'returnsDays', label: 'Return window (days)', type: 'number', defaultValue: 7, min: 0, admin: { description: 'The return window, in days.' } },
              ],
            },
          ],
        },
        {
          label: 'Payments and delivery',
          description: 'Rules for cash on delivery and where parcels are picked up. The Razorpay and Shiprocket logins themselves live in the server settings file, not here.',
          fields: [
            { name: 'pickupPincode', label: 'Pickup pincode', type: 'text', admin: { description: 'The pincode parcels leave from (your warehouse). Needed for the delivery check at checkout.' }, validate: (v: unknown) => !v || /^[1-9]\d{5}$/.test(String(v)) || 'Enter a 6-digit pincode.' },
            {
              type: 'row',
              fields: [
                { name: 'codEnabled', label: 'Offer cash on delivery', type: 'checkbox', defaultValue: true },
                { name: 'codMaxTotal', label: 'Cash on delivery limit (₹)', type: 'number', min: 0, defaultValue: 5000, admin: { description: 'Orders above this must be paid online. 0 means no limit.' } },
                { name: 'codFee', label: 'Cash on delivery fee (₹)', type: 'number', min: 0, defaultValue: 0, admin: { description: 'Added to the total when the customer chooses cash on delivery. 0 for none.' } },
              ],
            },
          ],
        },
        {
          label: 'Newsletter',
          fields: [
            {
              name: 'newsletterConsent', label: 'Newsletter tick-box wording',
              type: 'textarea',
              required: true,
              defaultValue: 'I agree to receive offers and updates from Snooze Pleaase by email. I can unsubscribe at any time.',
              admin: { description: 'The wording next to the sign-up tick box. Keep it clear that shoppers can unsubscribe.' },
            },
          ],
        },
        {
          label: 'Search defaults',
          description: 'Used for any page that does not have its own title, description or share image.',
          fields: [seoField],
        },
      ],
    },
  ],
}
