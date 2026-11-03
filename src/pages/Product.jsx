import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Page, { Crumbs, Accordion } from '../components/Page'
import BoxFrame from '../components/BoxFrame'
import ProductCard from '../components/ProductCard'
import { Cloud } from '../components/Doodles'
import { IconHeart, IconMinus, IconPlus, IconTruck, IconRuler, IconRefresh, IconCheck } from '../components/Icons'
import { byHandle, products, money, img, CATS, descParagraphs, stockLabel } from '../lib/catalog'
import { SHOP } from '../lib/config'
import { useStore } from '../store/StoreProvider'
import { flyToBag } from '../lib/fly'
import { Reveal } from '../lib/hooks'
import { sizeFits, sizeInside, stageByKey } from '../lib/age'

function Para({ t }) {
  const m = /^([^:\n]{3,42}):\s+([\s\S]+)/.exec(t)
  if (m && !/\.$/.test(m[1])) return <p><strong>{m[1]}.</strong> {m[2]}</p>
  return <p>{t}</p>
}

export default function Product() {
  const { handle } = useParams()
  const p = byHandle[handle]
  if (!p) {
    return (
      <Page title="Not found">
        <div className="empty wrap"><Cloud className="empty__cloud" /><h1 className="h1">This one is off dreaming</h1><p>We could not find that product.</p><Link to="/collections/all" className="btn btn--yellow">Browse everything</Link></div>
      </Page>
    )
  }
  return <Detail key={p.handle} p={p} />
}

function Detail({ p }) {
  const { addToCart, open, toggleWish, isWished, age } = useStore()
  const stage = stageByKey(age)
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

  const related = useMemo(() => products.filter((x) => x.cat === p.cat && x.handle !== p.handle).slice(0, 4), [p])
  const cat = CATS.find((c) => c.slug === p.cat)

  const add = (e) => {
    if (!variant) {
      setShake(true); setTimeout(() => setShake(false), 500)
      document.getElementById('size-group')?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      return
    }
    if (addToCart(p.handle, variant.id, qty)) {
      flyToBag(document.querySelector('.gallery__stage'), img(p.images[0]))
      setTimeout(() => open('cart'), 700)
    }
  }
  const checkPin = (e) => {
    e.preventDefault()
    if (!/^[1-9]\d{5}$/.test(pin)) return setPinMsg({ ok: false, t: 'Enter a valid 6-digit pincode.' })
    setPinMsg({ ok: true, t: `Delivery to ${pin} in ${SHOP.shipping.standardDays} days. Cash on delivery available.` })
  }

  const paras = descParagraphs(p.desc)

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
                <img key={slide} src={img(slides[slide])} alt={`${p.title}, photo ${slide}`} />
              )}
            </div>
            <div className="gallery__thumbs" role="tablist" aria-label="Product images">
              {slides.map((s, i) => (
                <button key={s + i} type="button" role="tab" aria-selected={slide === i} aria-label={i === 0 ? 'Gift box view' : `Photo ${i}`} className={slide === i ? 'is-on' : ''} onClick={() => setSlide(i)}>
                  {i === 0 ? <span className="thumb-box"><img src={img(p.images[0])} alt="" /></span> : <img src={img(s)} alt="" />}
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
            <p className="info__sale"><Star10 /> {SHOP.sale.label}: extra {SHOP.sale.percent}% off is taken off in your bag.</p>
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
              <li><IconTruck width={20} height={20} /> Free shipping over {money(SHOP.shipping.freeOver)}</li>
              <li><IconRefresh width={20} height={20} /> {SHOP.returnsDays}-day easy returns</li>
            </ul>

            <Accordion items={[
              { q: 'Details', a: <>{paras.map((t, i) => <Para key={i} t={t} />)}</> },
              { q: 'Fabric and care', a: <><p>{p.fabric ? `${p.fabric}. ` : ''}Soft, breathable cotton that keeps little sleepers comfortable all night.</p><p>Wash cold with similar colours, tumble dry low and skip the bleach to keep prints bright.</p></> },
              { q: 'Shipping and returns', a: <><p>Standard delivery takes {SHOP.shipping.standardDays} days and costs {money(SHOP.shipping.standard)}, or is free over {money(SHOP.shipping.freeOver)}. Express takes {SHOP.shipping.expressDays} days for {money(SHOP.shipping.express)}.</p><p>Unworn items with tags can be returned within {SHOP.returnsDays} days. <Link to="/pages/shipping-returns">Full policy</Link></p></> },
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
