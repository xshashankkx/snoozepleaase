import React from 'react'
import './styles.css'

export const metadata = {
  description: 'Snooze Pleaase: premium handcrafted cotton nightwear for little dreamers.',
  title: 'Snooze Pleaase',
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  const { children } = props

  return (
    <html lang="en">
      <body>
        <main>{children}</main>
      </body>
    </html>
  )
}
