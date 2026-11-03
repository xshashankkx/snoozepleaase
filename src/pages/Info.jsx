import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Page, { Accordion } from '../components/Page'
import { Cloud, Moon, Star } from '../components/Doodles'
import { about, privacy, img, heroes, money } from '../lib/catalog'
import { SHOP } from '../lib/config'
import { IconPhone } from '../components/Icons'

function Md({ text }) {
  const out = []
  let list = []
  const flush = () => { if (list.length) { out.push(<ul key={out.length}>{list.map((l, i) => <li key={i}>{l}</li>)}</ul>); list = [] } }
  text.split('\n').forEach((raw) => {
    const line = raw.trim()
    if (!line) return flush()
    if (line.startsWith('## ')) { flush(); out.push(<h2 key={out.length}>{line.slice(3)}</h2>) }
    else if (/^[-*]\s/.test(line)) list.push(line.slice(2))
    else { flush(); out.push(<p key={out.length}>{line}</p>) }
  })
  flush()
  return <div className="prose">{out}</div>
}

const KID_SIZES = [
  ['1–2 years', '80–92', '51', '50'], ['2–3 years', '92–98', '52', '51'], ['3–4 years', '98–104', '54', '52'], ['4–5 years', '104–110', '56', '53'],
  ['5–6 years', '110–116', '58', '54'], ['6–7 years', '116–122', '60', '55'], ['7–8 years', '122–128', '62', '56'], ['8–9 years', '128–134', '64', '57'],
  ['9–10 years', '134–140', '67', '58'], ['10–11 years', '140–146', '70', '60'], ['11–12 years', '146–152', '73', '62'], ['12–13 years', '152–158', '76', '64'],
]

const FAQ = [
  { q: 'How do I pick the right size?', a: <p>Measure your child's height and chest, then match them on our <Link to="/pages/size-guide">size guide</Link>. If they are between sizes, choose the larger one. Our trousers have an elasticated waist, so there is room to grow.</p> },
  { q: 'What are the fabrics made of?', a: <p>Our nightsuits and co-ords are 100% hand-picked cotton in crisp poplin and percale. Towels and robes use soft waffle cotton. Each product page lists its fabric.</p> },
  { q: 'How do I wash them?', a: <p>Wash cold with similar colours, tumble dry low and skip the bleach. That keeps prints bright and the cotton soft.</p> },
  { q: 'How long does delivery take?', a: <p>Standard delivery takes {SHOP.shipping.standardDays} days and express takes {SHOP.shipping.expressDays} days. Shipping is free on standard orders over {money(SHOP.shipping.freeOver)}.</p> },
  { q: 'Can I pay on delivery?', a: <p>Yes. Cash on delivery, UPI and cards are all available at checkout.</p> },
  { q: 'Can I return or exchange something?', a: <p>Unworn items with tags can be returned within {SHOP.returnsDays} days. See <Link to="/pages/shipping-returns">shipping and returns</Link> for the steps.</p> },
  { q: 'What is the Dreamtime Sale?', a: <p>Right now {SHOP.sale.percent}% comes off your bag automatically at checkout. There is no code to enter.</p> },
]

function About() {
  return (
    <>
      <header className="doc__head">
        <h1 className="h1">About Snooze Pleaase</h1>
        <Moon className="doc__moon" />
      </header>
      <div className="about__grid">
        <div><Md text={about} /></div>
        <figure className="about__pics" aria-hidden="true">
          <img src={img(heroes[0])} alt="" loading="lazy" /><img src={img(heroes[2])} alt="" loading="lazy" />
        </figure>
      </div>
      <p><Link to="/collections/all" className="btn btn--yellow">Shop the collection</Link></p>
    </>
  )
}

function Contact() {
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
  return (
    <>
      <header className="doc__head"><h1 className="h1">Contact us</h1><Cloud className="doc__cloud" /></header>
      <div className="contact__grid">
        <div>
          <p className="lede">Questions about sizes, an order or a custom bulk gift? We read every message.</p>
          <ul className="contact__list">
            <li><IconPhone width={20} height={20} /> WhatsApp <a href={`https://wa.me/${SHOP.contact.whatsapp.replace(/\D/g, '')}`}>{SHOP.contact.whatsapp}</a></li>
            <li>Email <a href={`mailto:${SHOP.contact.email}`}>{SHOP.contact.email}</a></li>
            <li>Instagram <a href={`https://instagram.com/${SHOP.contact.instagram}`} target="_blank" rel="noreferrer">@{SHOP.contact.instagram}</a></li>
            <li>{SHOP.contact.hours}</li>
          </ul>
        </div>
        {sent ? (
          <div className="sent" role="status"><Star className="sent__star" /><h2 className="h3">Message sent</h2><p>Thank you, {f.name.split(' ')[0]}. We will reply to {f.email} soon.</p></div>
        ) : (
          <form onSubmit={submit} noValidate className="contact__form">
            <div className={`fld ${err.name ? 'has-err' : ''}`}><label htmlFor="c-name">Name</label><input id="c-name" value={f.name} onChange={set('name')} autoComplete="name" aria-invalid={!!err.name} />{err.name && <p className="field-err">{err.name}</p>}</div>
            <div className={`fld ${err.email ? 'has-err' : ''}`}><label htmlFor="c-email">Email</label><input id="c-email" type="email" value={f.email} onChange={set('email')} autoComplete="email" aria-invalid={!!err.email} />{err.email && <p className="field-err">{err.email}</p>}</div>
            <div className="fld"><label htmlFor="c-topic">Topic</label><select id="c-topic" value={f.topic} onChange={set('topic')}><option>Order help</option><option>Sizing</option><option>Returns</option><option>Bulk or gifting</option><option>Something else</option></select></div>
            <div className={`fld ${err.msg ? 'has-err' : ''}`}><label htmlFor="c-msg">Message</label><textarea id="c-msg" rows="5" value={f.msg} onChange={set('msg')} aria-invalid={!!err.msg} />{err.msg && <p className="field-err">{err.msg}</p>}</div>
            <button type="submit" className="btn btn--yellow btn--lg">Send message</button>
            <p className="muted small">Demo form: nothing is sent from this prototype.</p>
          </form>
        )}
      </div>
    </>
  )
}

function SizeGuide() {
  return (
    <>
      <header className="doc__head"><h1 className="h1">Size guide</h1></header>
      <p className="lede">Measure your child standing straight, then match height and chest to the closest row. Between sizes? Choose the larger one.</p>
      <div className="tablewrap" tabIndex={0} role="region" aria-label="Kids size chart" data-lenis-prevent-wheel>
        <table>
          <caption>Kids sizes, in centimetres (approximate)</caption>
          <thead><tr><th scope="col">Age</th><th scope="col">Height</th><th scope="col">Chest</th><th scope="col">Waist</th></tr></thead>
          <tbody>{KID_SIZES.map((r) => <tr key={r[0]}><th scope="row">{r[0]}</th><td>{r[1]}</td><td>{r[2]}</td><td>{r[3]}</td></tr>)}</tbody>
        </table>
      </div>
      <p className="muted">Mom &amp; Me sets use S to 3XL for grown-ups. Message us if you would like measurements for a specific piece.</p>
    </>
  )
}

function Shipping() {
  return (
    <>
      <header className="doc__head"><h1 className="h1">Shipping &amp; returns</h1></header>
      <div className="prose">
        <h2>Shipping</h2>
        <p>Standard delivery takes {SHOP.shipping.standardDays} days and costs {money(SHOP.shipping.standard)}. It is free when your bag is {money(SHOP.shipping.freeOver)} or more after the sale discount. Express delivery takes {SHOP.shipping.expressDays} days and costs {money(SHOP.shipping.express)}.</p>
        <p>We ship across India. Cash on delivery, UPI and card payments are accepted.</p>
        <h2>Returns</h2>
        <p>Unworn, unwashed items with their tags can be returned within {SHOP.returnsDays} days of delivery. Message us on WhatsApp or email with your order number and we will arrange the pickup.</p>
        <h2>Exchanges</h2>
        <p>Need a different size? Tell us within {SHOP.returnsDays} days and we will swap it if the size is in stock.</p>
      </div>
    </>
  )
}

const PAGES = {
  'about-us': { title: 'About us', C: About },
  contact: { title: 'Contact', C: Contact },
  faq: { title: 'FAQ', C: () => (<><header className="doc__head"><h1 className="h1">Questions, answered</h1></header><Accordion items={FAQ} /></>) },
  'size-guide': { title: 'Size guide', C: SizeGuide },
  'shipping-returns': { title: 'Shipping & returns', C: Shipping },
  'privacy-policy': { title: 'Privacy policy', C: () => (<><header className="doc__head"><h1 className="h1">Privacy policy</h1></header><Md text={privacy} /></>) },
}

export default function Info() {
  const { slug } = useParams()
  const pg = PAGES[slug]
  if (!pg) {
    return (
      <Page title="Not found">
        <div className="empty wrap"><Cloud className="empty__cloud" /><h1 className="h1">This page is off dreaming</h1><p>We could not find what you were looking for.</p><Link to="/" className="btn btn--yellow">Back home</Link></div>
      </Page>
    )
  }
  return (
    <Page title={pg.title}>
      <article className={`doc wrap doc--${slug}`}><pg.C /></article>
    </Page>
  )
}

export function NotFound() {
  return (
    <Page title="Page not found">
      <div className="empty wrap"><Cloud className="empty__cloud" /><h1 className="h1">This page is off dreaming</h1><p>The link may be old or mistyped.</p><Link to="/" className="btn btn--yellow">Back home</Link></div>
    </Page>
  )
}
