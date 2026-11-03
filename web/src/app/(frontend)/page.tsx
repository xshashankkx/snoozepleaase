import Link from 'next/link'
import React from 'react'

// Placeholder until slice 3 moves the storefront over to Next.js.
export default function HomePage() {
  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '70vh', textAlign: 'center', gap: '1rem', padding: '2rem' }}>
      <h1 style={{ fontSize: '2.2rem', margin: 0 }}>Snooze Pleaase CMS</h1>
      <p style={{ maxWidth: '38ch', margin: 0 }}>The storefront moves into this project in a later step. For now, open the admin to manage products.</p>
      <Link href="/admin" style={{ background: '#ffd83d', color: '#101f5a', padding: '0.8rem 1.6rem', borderRadius: 999, fontWeight: 700, textDecoration: 'none' }}>
        Open the admin
      </Link>
    </div>
  )
}
