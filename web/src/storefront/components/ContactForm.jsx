'use client'
import { useState } from 'react'
import { Star } from './Doodles'

// The contact page form. It is a demo: nothing is sent until a support inbox is connected.
export default function ContactForm() {
  const [f, setF] = useState({ name: '', email: '', topic: 'Order help', msg: '' })
  const [err, setErr] = useState({})
  const [sent, setSent] = useState(false)
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }))
  const submit = (e) => {
    e.preventDefault()
    const v = {}
    if (f.name.trim().length < 2) v.name = 'Tell us your name.'
    if (!/^\S+@\S+\.\S+$/.test(f.email)) v.email = 'Enter an email like name@example.com.'
    if (f.msg.trim().length < 10) v.msg = 'Add a few words so we can help.'
    setErr(v)
    if (!Object.keys(v).length) setSent(true)
  }
  if (sent) {
    return <div className="sent" role="status"><Star className="sent__star" /><h2 className="h3">Message sent</h2><p>Thank you, {f.name.split(' ')[0]}. We will reply to {f.email} soon.</p></div>
  }
  return (
    <form onSubmit={submit} noValidate className="contact__form">
      <div className={`fld ${err.name ? 'has-err' : ''}`}><label htmlFor="c-name">Name</label><input id="c-name" value={f.name} onChange={set('name')} autoComplete="name" aria-invalid={!!err.name} />{err.name && <p className="field-err">{err.name}</p>}</div>
      <div className={`fld ${err.email ? 'has-err' : ''}`}><label htmlFor="c-email">Email</label><input id="c-email" type="email" value={f.email} onChange={set('email')} autoComplete="email" aria-invalid={!!err.email} />{err.email && <p className="field-err">{err.email}</p>}</div>
      <div className="fld"><label htmlFor="c-topic">Topic</label><select id="c-topic" value={f.topic} onChange={set('topic')}><option>Order help</option><option>Sizing</option><option>Returns</option><option>Bulk or gifting</option><option>Something else</option></select></div>
      <div className={`fld ${err.msg ? 'has-err' : ''}`}><label htmlFor="c-msg">Message</label><textarea id="c-msg" rows="5" value={f.msg} onChange={set('msg')} aria-invalid={!!err.msg} />{err.msg && <p className="field-err">{err.msg}</p>}</div>
      <button type="submit" className="btn btn--yellow btn--lg">Send message</button>
      <p className="muted small">Demo form: nothing is sent from this prototype.</p>
    </form>
  )
}
