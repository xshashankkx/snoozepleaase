'use client'
import { useState } from 'react'
import { useStore } from '../store/StoreProvider'
import { money } from '../lib/product'

// The "Have a code?" box and the offers applied to the bag. Used in the bag drawer and at checkout.
export function CodeBox({ quote, loading }) {
  const { code, setCode } = useStore()
  const [v, setV] = useState('')
  const apply = (e) => {
    e?.preventDefault()
    const c = v.trim()
    if (c) { setCode(c); setV('') }
  }
  const st = quote.code
  if (code) {
    const good = st.status === 'applied'
    return (
      <div className={`codebox ${good ? 'is-good' : 'is-bad'}`} role="status">
        <p><strong>{code.toUpperCase()}</strong> {loading && !st.message ? 'Checking…' : st.message || ''}</p>
        <button type="button" className="link-btn" onClick={() => setCode('')}>Remove</button>
      </div>
    )
  }
  // Not a <form>: at checkout this sits inside the checkout form, and forms cannot be nested.
  return (
    <div className="codebox" role="group" aria-label="Discount code">
      <label htmlFor="code-in" className="sr">Discount code</label>
      <input id="code-in" value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && apply(e)} placeholder="Discount code" autoComplete="off" autoCapitalize="characters" />
      <button type="button" className="btn btn--small" onClick={apply}>Apply</button>
    </div>
  )
}

// One row per offer taken off the items, plus the shipping row with any shipping offer's name.
export function SumRows({ quote, free = 'Free' }) {
  const items = quote.applied.filter((a) => a.kind === 'items')
  const shipOffer = quote.applied.find((a) => a.kind === 'shipping')
  return (
    <>
      <div><dt>Subtotal</dt><dd>{money(quote.subtotal)}</dd></div>
      {items.map((a) => <div key={a.id} className="sale"><dt>{a.title}</dt><dd>−{money(a.amount)}</dd></div>)}
      <div><dt>Shipping{shipOffer ? ` · ${shipOffer.title}` : ''}</dt><dd>{quote.shipping === 0 ? free : money(quote.shipping)}</dd></div>
    </>
  )
}
