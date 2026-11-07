import { APIError, type CollectionConfig, type Field } from 'payload'
import { isOwner, isStaff } from './Users'
import { logEvent, pushToShiprocket } from '../lib/fulfil'

// Money, items and the customer's details are written by the shop when the order is placed and are never
// edited by hand. Staff change the status, add a note and retry a failed Shiprocket push.
const locked = <T extends Field>(f: T): T => ({ ...f, access: { ...(f as any).access, update: () => false }, admin: { ...(f as any).admin, readOnly: true } }) as T

export const ORDER_STATUS = [
  { label: 'Waiting for payment', value: 'awaiting_payment' },
  { label: 'Payment failed', value: 'payment_failed' },
  { label: 'Cash on delivery: to confirm', value: 'awaiting_confirmation' },
  { label: 'Confirmed', value: 'confirmed' },
  { label: 'Shipped', value: 'shipped' },
  { label: 'Delivered', value: 'delivered' },
  { label: 'Cancelled', value: 'cancelled' },
]

export const Orders: CollectionConfig = {
  slug: 'orders',
  labels: { singular: 'Order', plural: 'Orders' },
  admin: {
    useAsTitle: 'number',
    defaultColumns: ['number', 'status', 'paymentMethod', 'paymentStatus', 'totals.total', 'contact.phone', 'createdAt'],
    listSearchableFields: ['number', 'contact.email', 'contact.phone', 'address.name', 'shipment.awb'],
    group: 'Sales',
    description: 'Orders placed on the shop. Online orders become Confirmed as soon as the payment arrives; cash on delivery orders wait here until someone confirms them with the customer.',
  },
  defaultSort: '-createdAt',
  // Orders are only ever created by the shop's own checkout (server code), never through the admin or the API.
  access: { read: isStaff, create: () => false, update: isStaff, delete: isOwner },
  hooks: {
    beforeValidate: [
      ({ data, originalDoc }) => {
        // Only a person editing in the admin can change the status here; reject nonsense moves.
        const d = { ...originalDoc, ...data }
        if (originalDoc && data?.status && data.status !== originalDoc.status) {
          if (data.status === 'confirmed' && d.paymentMethod === 'online' && d.paymentStatus !== 'paid') {
            throw new APIError('This order has not been paid yet, so it cannot be confirmed.', 400, undefined, true)
          }
        }
        return data
      },
    ],
    afterChange: [
      async ({ doc, previousDoc, req, context }) => {
        if (context?.skipHooks) return doc
        if (req.user && previousDoc && doc.status !== previousDoc.status) {
          const label = ORDER_STATUS.find((s) => s.value === doc.status)?.label ?? doc.status
          await logEvent(req.payload, doc.id, `Status set to "${label}" by ${(req.user as any).email}.`, {}, req)
        }
        const justConfirmed = doc.status === 'confirmed' && previousDoc?.status !== 'confirmed'
        const retry = doc.shipment?.pushAgain && !previousDoc?.shipment?.pushAgain
        if (justConfirmed || retry) void pushToShiprocket(req.payload, doc.id).catch((e) => console.error('shiprocket push failed', e))
        return doc
      },
    ],
  },
  fields: [
    {
      type: 'row',
      fields: [
        locked({ name: 'number', type: 'text', required: true, unique: true, index: true, label: 'Order number' }),
        { name: 'status', type: 'select', required: true, defaultValue: 'awaiting_payment', options: ORDER_STATUS, index: true, admin: { description: 'Move a cash on delivery order to Confirmed once the customer has said yes. That sends it to Shiprocket.' } },
      ],
    },
    {
      type: 'row',
      fields: [
        locked({ name: 'paymentMethod', type: 'select', required: true, options: [{ label: 'Online (Razorpay)', value: 'online' }, { label: 'Cash on delivery', value: 'cod' }] }),
        locked({ name: 'paymentStatus', type: 'select', required: true, defaultValue: 'pending', options: [{ label: 'Waiting', value: 'pending' }, { label: 'Paid', value: 'paid' }, { label: 'Failed', value: 'failed' }, { label: 'Pay on delivery', value: 'cod' }, { label: 'Refunded', value: 'refunded' }] }),
        locked({ name: 'shippingMethod', type: 'select', options: [{ label: 'Standard', value: 'standard' }, { label: 'Express', value: 'express' }] }),
      ],
    },
    {
      name: 'contact', type: 'group', label: 'Customer',
      fields: [{ type: 'row', fields: [locked({ name: 'email', type: 'text', index: true }), locked({ name: 'phone', type: 'text', index: true })] }],
    },
    {
      name: 'address', type: 'group', label: 'Delivery address',
      fields: [
        locked({ name: 'name', type: 'text' }),
        locked({ name: 'line1', type: 'text', label: 'House number and street' }),
        locked({ name: 'line2', type: 'text', label: 'Apartment, landmark' }),
        { type: 'row', fields: [locked({ name: 'city', type: 'text' }), locked({ name: 'state', type: 'text' }), locked({ name: 'pin', type: 'text', label: 'Pincode' })] },
      ],
    },
    {
      name: 'lines', type: 'array', labels: { singular: 'Item', plural: 'Items' },
      access: { update: () => false }, admin: { readOnly: true },
      fields: [
        { type: 'row', fields: [{ name: 'title', type: 'text' }, { name: 'size', type: 'text' }, { name: 'sku', type: 'text' }] },
        { type: 'row', fields: [{ name: 'qty', type: 'number' }, { name: 'price', type: 'number', label: 'Price each (₹)' }, { name: 'weightGrams', type: 'number' }] },
        { name: 'handle', type: 'text' }, { name: 'variantId', type: 'text' }, { name: 'image', type: 'text' },
        { name: 'box', type: 'group', fields: [{ name: 'lengthCm', type: 'number' }, { name: 'widthCm', type: 'number' }, { name: 'heightCm', type: 'number' }] },
      ],
    },
    {
      name: 'totals', type: 'group', label: 'Totals (₹)',
      fields: [{ type: 'row', fields: ['subtotal', 'discount', 'shipping', 'codFee', 'total'].map((n) => locked({ name: n, type: 'number' as const, label: n === 'codFee' ? 'Cash on delivery fee' : undefined })) }],
    },
    {
      name: 'discounts', type: 'array', labels: { singular: 'Offer', plural: 'Offers used' },
      access: { update: () => false }, admin: { readOnly: true },
      fields: [{ type: 'row', fields: [{ name: 'offerId', type: 'text' }, { name: 'title', type: 'text' }, { name: 'code', type: 'text' }, { name: 'amount', type: 'number' }] }],
    },
    { name: 'note', type: 'textarea', label: 'Gift note from the customer', access: { update: () => false }, admin: { readOnly: true } },
    {
      name: 'payment', type: 'group', label: 'Razorpay',
      fields: [
        locked({ name: 'razorpayOrderId', type: 'text', index: true }),
        locked({ name: 'razorpayPaymentId', type: 'text' }),
        locked({ name: 'paidAt', type: 'date', admin: { date: { pickerAppearance: 'dayAndTime' } } }),
      ],
    },
    {
      name: 'shipment', type: 'group', label: 'Shiprocket',
      admin: { description: 'Filled in automatically once the order is confirmed and Shiprocket is connected.' },
      fields: [
        { type: 'row', fields: [locked({ name: 'shiprocketOrderId', type: 'text' }), locked({ name: 'shipmentId', type: 'text' }), locked({ name: 'awb', type: 'text', label: 'Tracking number', index: true })] },
        { type: 'row', fields: [locked({ name: 'courier', type: 'text' }), locked({ name: 'status', type: 'text', label: 'Latest courier status' }), locked({ name: 'trackingUrl', type: 'text' })] },
        locked({ name: 'lastError', type: 'text', label: 'Last problem' }),
        { name: 'pushAgain', type: 'checkbox', label: 'Send to Shiprocket again', admin: { description: 'Tick and save to retry after a problem. Does nothing if the order is already in Shiprocket.' } },
      ],
    },
    {
      name: 'timeline', type: 'array', labels: { singular: 'Event', plural: 'What happened' },
      access: { update: () => false }, admin: { readOnly: true, initCollapsed: false },
      fields: [{ name: 'at', type: 'date', admin: { date: { pickerAppearance: 'dayAndTime' } } }, { name: 'text', type: 'text' }],
    },
    { name: 'accessToken', type: 'text', access: { read: () => false, update: () => false }, admin: { hidden: true } },
  ],
}
