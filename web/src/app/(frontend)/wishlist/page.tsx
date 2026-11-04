import type { Metadata } from 'next'
import { Wishlist } from '@/storefront/pages/Account'

export const metadata: Metadata = { title: 'Wishlist', robots: { index: false } }

export default function WishlistPage() {
  return <Wishlist />
}
