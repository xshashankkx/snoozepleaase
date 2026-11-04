import type { Metadata } from 'next'
import { Order } from '@/storefront/pages/Account'

export const metadata: Metadata = { title: 'Your order', robots: { index: false } }

export default function OrderPage() {
  return <Order />
}
