import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import BoxFrame from './BoxFrame'
import { IconHeart, IconClose } from './Icons'
import { money, img } from '../lib/catalog'
import { useStore } from '../store/StoreProvider'
import { useGo, linkClick } from '../lib/useGo'
import { flyToBag } from '../lib/fly'
import { Reveal } from '../lib/hooks'

export function SizePicker({ p, value, onChange, labelKey }) {
  // Two-part sizes ("1-2 years / M") become one pick per part.
  return (
    <div className="chips" role="radiogroup" aria-label="Size">
      {p.variants.map((v) => (
        <button key={v.id} type="button" role="radio" aria-checked={value === v.id} disabled={v.stock <= 0}
          className={`chip ${value === v.id ? 'is-on' : ''}`} onClick={() => onChange(v.id)}>
          {labelKey ? labelKey(v) : v.size}
        </button>
      ))}
    </div>
  )
}

export default function ProductCard({ p, i = 0, tone, delay = 0, eager = false }) {
  const { addToCart, open, toggleWish, isWished } = useStore()
  const go = useGo()
  const [pick, setPick] = useState(false)
  const boxRef = useRef(null)
  const to = `/products/${p.handle}`
  const wished = isWished(p.handle)
  const soldOut = p.stock <= 0
  const t = tone || (i % 2 ? 'pink' : 'yellow')

  useEffect(() => {
    if (!pick) return
    const k = (e) => e.key === 'Escape' && setPick(false)
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [pick])

  const add = (v) => {
    if (addToCart(p.handle, v.id)) {
      flyToBag(boxRef.current, img(p.images[0]))
      setPick(false)
      setTimeout(() => open('cart'), 750)
    }
  }
  const onAdd = () => {
    if (soldOut) return
    if (p.variants.length === 1) add(p.variants[0])
    else setPick(true)
  }
  const mark = (e) => { e.currentTarget.closest('.pcard')?.querySelector('.box3d')?.style.setProperty('view-transition-name', 'pimg') }

  return (
    <Reveal as="article" className="pcard" delay={delay}>
      <div ref={boxRef} className="pcard__media">
        <Link to={to} onClick={linkClick(go, to, mark)} aria-label={p.title} tabIndex={-1} className="pcard__link">
          <BoxFrame title={p.title} theme={p.theme} src={p.images[0]} alt="" eager={eager} />
        </Link>
        <button type="button" className={`wish ${wished ? 'is-on' : ''}`} aria-pressed={wished} aria-label={wished ? `Remove ${p.title} from wishlist` : `Save ${p.title} to wishlist`} onClick={() => toggleWish(p.handle)}>
          <IconHeart />
        </button>
        {soldOut && <span className="pcard__flag">Sold out</span>}
        {pick && (
          <div className="quick" role="dialog" aria-label={`Choose a size for ${p.title}`}>
            <div className="quick__head"><strong>Pick a size</strong>
              <button type="button" className="icon-btn" onClick={() => setPick(false)} aria-label="Close size picker"><IconClose width={18} height={18} /></button>
            </div>
            <div className="chips">
              {p.variants.slice(0, 12).map((v) => (
                <button key={v.id} type="button" className="chip" disabled={v.stock <= 0} onClick={() => add(v)}>{v.size}</button>
              ))}
            </div>
            {p.variants.length > 12 && <Link to={to} className="quick__more" onClick={linkClick(go, to)}>More sizes on the product page</Link>}
          </div>
        )}
      </div>
      <h3 className="pcard__name"><Link to={to} onClick={linkClick(go, to, mark)}>{p.title}</Link></h3>
      <p className="pcard__price">
        {p.price !== p.maxPrice && <small>from </small>}{money(p.price)}
        {p.was && <s>{money(p.was)}</s>}
      </p>
      <button type="button" className={`btn btn--${t}`} onClick={onAdd} disabled={soldOut}>{soldOut ? 'Sold out' : 'Add to Bag'}</button>
    </Reveal>
  )
}
