'use client'
import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { Link } from '../lib/router'
import Page, { Crumbs, Accordion } from '../components/Page'
import BoxFrame from '../components/BoxFrame'
import ProductCard from '../components/ProductCard'
import { IconHeart, IconMinus, IconPlus, IconTruck, IconRuler, IconRefresh, IconCheck } from '../components/Icons'
import { money, stockLabel, sizeFits, sizeInside } from '../lib/product'
import { useSite, SALE_PERCENT } from '../lib/site'
import { useStore } from '../store/StoreProvider'
import { flyToBag } from '../lib/fly'
import { Reveal } from '../lib/hooks'

function Para({ t }) {
  const m = /^([^:\n]{3,42}):\s+([\s\S]+)/.exec(t)
  if (m && !/\.$/.test(m[1])) return <p><strong>{m[1]}.</strong> {m[2]}</p>
  return <p>{t}</p>
}

export default function Product({ p, related = /** @type {any[]} */ ([]) }) {
  const { addToCart, open, toggleWish, isWished, age } = useStore()
  const { settings, announcement, categories, age: ageCfg } = useSite()
  const stage = ageCfg.stages.find((s) => s.key === age) || null
  const fits = (size) => !!stage && sizeFits(size, stage)
  const [slide, setSlide] = useState(0)
  const [qty, setQty] = useState(1)
  const [pin, setPin] = useState('')
  const [pinMsg, setPinMsg] = useState(null)
  const [shake, setShake] = useState(false)
  const ctaRef = useRef(null)
  const [stuck, setStuck] = useState(false)

  const parts = p.paired ? p.variants.map((v) => v.size.split(' / ')) : null
  const aOpts = parts ? [...new Set(parts.map((x) => x[0]))] : []
  const bOpts = parts ? [...new Set(parts.map((x) => x[1]))] : []
  const first = p.variants.find((v) => v.stock > 0) || p.variants[0]
  const [sel, setSel] = useState(p.variants.length === 1 ? first.id : (stage && !p.paired ? ((p.variants.find((v) => stage && sizeInside(v.size, stage) && v.stock > 0) || p.variants.find((v) => fits(v.size) && v.stock > 0))?.id ?? null) : null))
  const [pa, setPa] = useState(stage && p.paired ? (aOpts.find((a) => fits(a)) ?? null) : null)
  const [pb, setPb] = useState(null)
  // The remembered age arrives just after the page appears, so choose the fitting size then.
  useEffect(() => {
    if (!stage) return
    if (p.paired) setPa((cur) => cur ?? (aOpts.find((a) => fits(a)) ?? null))
    else setSel((cur) => cur ?? ((p.variants.find((v) => sizeInside(v.size, stage) && v.stock > 0) || p.variants.find((v) => fits(v.size) && v.stock > 0))?.id ?? null))
  }, [stage?.key])
  const variant = p.paired ? p.variants.find((v) => v.size === `${pa} / ${pb}`) : p.variants.find((v) => v.id === sel)
  const wished = isWished(p.handle)
  const slides = ['box', ...p.images]
  const total = p.stock

  useEffect(() => {
    const el = ctaRef.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setStuck(!e.isIntersecting && e.boundingClientRect.top < 0), { threshold: 0 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const cat = categories.find((c) => c.slug === p.cat) || { slug: p.cat, label: 'Shop' }

  const add = (e) => {
    if (!variant) {
      setShake(true); setTimeout(() => setShake(false), 500)
      document.getElementById('size-group')?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      return
    }
    if (addToCart(p, variant, qty)) {
      flyToBag(document.querySelector('.gallery__stage'), p.images[0]?.thumb)
      setTimeout(() => open('cart'), 700)
    }
  }
  const checkPin = (e) => {
    e.preventDefault()
    if (!/^[1-9]\d{5}$/.test(pin)) return setPinMsg({ ok: false, t: 'Enter a valid 6-digit pincode.' })
    setPinMsg({ ok: true, t: `Delivery to ${pin} in ${settings.standardDays} days. Cash on delivery available.` })
  }

  const paras = p.desc

  return (
    <Page theme="paper" title={p.title}>
      <div className="pdp wrap">
        <Crumbs items={[{ label: 'Home', to: '/' }, { label: cat.label, to: `/collections/${cat.slug}` }, { label: p.title }]} />
        <div className="pdp__grid">
          <div className="gallery">
            <div className="gallery__stage">
              {slide === 0 ? (
                <BoxFrame className="gallery__box" style={{ viewTransitionName: 'pimg' }} title={p.title} theme={p.theme} src={p.images[0]} alt={`${p.title} in its gift box`} eager />
              ) : (
                <Image key={slide} src={slides[slide].large} alt={slides[slide].alt || `${p.title}, photo ${slide}`} fill sizes="(max-width: 880px) 90vw, 560px" />
              )}
            </div>
            <div className="gallery__thumbs" role="tablist" aria-label="Product images">
              {slides.map((s, i) => (
                <button key={i} type="button" role="tab" aria-selected={slide === i} aria-label={i === 0 ? 'Gift box view' : `Photo ${i}`} className={slide === i ? 'is-on' : ''} onClick={() => setSlide(i)}>
                  {i === 0 ? <span className="thumb-box"><img src={p.images[0]?.thumb} alt="" /></span> : <img src={s.thumb} alt="" />}
                </button>
              ))}
            </div>
          </div>

          <div className="info">
            <h1 className="h1 h1--pdp">{p.title}</h1>
            <p className="info__price">
              <strong>{variant ? money(variant.price) : (p.price !== p.maxPrice ? `From ${money(p.price)}` : money(p.price))}</strong>
              {(variant?.was || p.was) && <s>{money(variant?.was || p.was)}</s>}
              {p.off > 0 && <span className="tag">{p.off}% off</span>}
            </p>
            <p className="info__sale"><Star10 /> {announcement.saleTag?.name || 'Sale'}: extra {SALE_PERCENT}% off is taken off in your bag.</p>
            {p.fabric && <p className="info__fabric"><IconCheck width={18} height={18} /> {p.fabric}</p>}

            <div id="size-group" className={shake ? 'shake' : ''}>
              {p.paired ? (
                <>
                  <fieldset className="opt"><legend>Child size</legend>
                    <div className="chips">{aOpts.map((a) => <button key={a} type="button" className={`chip ${pa === a ? 'is-on' : ''} ${fits(a) ? 'is-fit' : ''}`} aria-pressed={pa === a} onClick={() => setPa(a)}>{a}</button>)}</div>
                  </fieldset>
                  <fieldset className="opt"><legend>Adult size</legend>
                    <div className="chips">{bOpts.map((b) => {
                      const v = p.variants.find((x) => x.size === `${pa || aOpts[0]} / ${b}`)
                      return <button key={b} type="button" disabled={!v || v.stock <= 0} className={`chip ${pb === b ? 'is-on' : ''}`} aria-pressed={pb === b} onClick={() => setPb(b)}>{b}</button>
                    })}</div>
                  </fieldset>
                </>
              ) : (
                <fieldset className="opt"><legend>Size {!variant && <em className="req">choose one</em>}</legend>
                  <div className="chips" role="radiogroup" aria-label="Size">
                    {p.variants.map((v) => (
                      <button key={v.id} type="button" role="radio" aria-checked={sel === v.id} disabled={v.stock <= 0} className={`chip ${sel === v.id ? 'is-on' : ''} ${fits(v.size) ? 'is-fit' : ''}`} onClick={() => setSel(v.id)}>{v.size}</button>
                    ))}
                  </div>
                </fieldset>
              )}
              {stage && p.variants.some((v) => fits(v.size)) && <p className="fit-note">Fits {stage.label} (ages {stage.ages}): highlighted sizes.</p>}
              <p className={`stock ${variant && variant.stock <= 5 ? 'is-low' : ''}`} aria-live="polite">
                {variant ? stockLabel(variant.stock) : total <= 0 ? 'Sold out' : 'Choose a size to see stock'}
              </p>
              <Link to="/pages/size-guide" className="textlink"><IconRuler width={18} height={18} /> Size guide</Link>
            </div>

            <div className="buy" ref={ctaRef}>
              <div className="stepper stepper--lg" role="group" aria-label="Quantity">
                <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease quantity"><IconMinus width={18} height={18} /></button>
                <output>{qty}</output>
                <button type="button" onClick={() => setQty((q) => Math.min(variant?.stock || 10, q + 1))} aria-label="Increase quantity"><IconPlus width={18} height={18} /></button>
              </div>
              <button type="button" className="btn btn--yellow btn--lg buy__add" onClick={add} disabled={total <= 0}>{total <= 0 ? 'Sold out' : 'Add to Bag'}</button>
              <button type="button" className={`wish wish--paper ${wished ? 'is-on' : ''}`} aria-pressed={wished} aria-label={wished ? 'Remove from wishlist' : 'Save to wishlist'} onClick={() => toggleWish(p.handle)}><IconHeart /></button>
            </div>

            <form className="pin" onSubmit={checkPin} noValidate>
              <label htmlFor="pin"><IconTruck width={20} height={20} /> Check delivery</label>
              <div>
                <input id="pin" inputMode="numeric" maxLength={6} placeholder="Pincode" value={pin} onChange={(e) => { setPin(e.target.value.replace(/\D/g, '')); setPinMsg(null) }} aria-invalid={pinMsg && !pinMsg.ok} />
                <button type="submit" className="btn btn--small">Check</button>
              </div>
              {pinMsg && <p className={pinMsg.ok ? 'pin__ok' : 'field-err'} role="status">{pinMsg.t}</p>}
            </form>

            <ul className="perks">
              <li><IconTruck width={20} height={20} /> Free shipping over {money(settings.freeShippingOver)}</li>
              <li><IconRefresh width={20} height={20} /> {settings.returnsDays}-day easy returns</li>
            </ul>

            <Accordion items={[
              { q: 'Details', a: <>{paras.map((t, i) => <Para key={i} t={t} />)}</> },
              { q: 'Fabric and care', a: <><p>{p.fabric ? `${p.fabric}. ` : ''}Soft, breathable cotton that keeps little sleepers comfortable all night.</p><p>Wash cold with similar colours, tumble dry low and skip the bleach to keep prints bright.</p></> },
              { q: 'Shipping and returns', a: <><p>Standard delivery takes {settings.standardDays} days and costs {money(settings.standardShipping)}, or is free over {money(settings.freeShippingOver)}. Express takes {settings.expressDays} days for {money(settings.expressShipping)}.</p><p>Unworn items with tags can be returned within {settings.returnsDays} days. <Link to="/pages/shipping-returns">Full policy</Link></p></> },
            ]} />
          </div>
        </div>

        {related.length > 0 && (
          <section className="related">
            <Reveal as="h2" className="h2">More dreams to try</Reveal>
            <div className="grid grid--4">{related.map((r, i) => <ProductCard key={r.handle} p={r} i={i} delay={i * 70} />)}</div>
          </section>
        )}
      </div>

      <div className={`sticky-buy ${stuck ? 'is-on' : ''}`} aria-hidden={!stuck}>
        <div><strong>{p.title}</strong><span>{variant ? `${variant.size} · ${money(variant.price)}` : `From ${money(p.price)}`}</span></div>
        <button type="button" className="btn btn--yellow" onClick={add} tabIndex={stuck ? 0 : -1}>{variant ? 'Add to Bag' : 'Choose size'}</button>
      </div>
    </Page>
  )
}

function Star10() {
  return <svg viewBox="0 0 100 100" width="16" height="16" aria-hidden="true"><path d="M50 8 L61.500 36 L92 38.500 L68.500 58 L76 88 L50 71.500 L24 88 L31.500 58 L8 38.500 L38.500 36 Z" fill="#e0a800" stroke="#e0a800" strokeWidth="9" strokeLinejoin="round" /></svg>
}
