import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Sky } from './Shell'
import { IconChevron, IconArrow } from './Icons'
import { useTitle } from '../lib/hooks'

export default function Page({ theme = 'paper', title, children, className = '' }) {
  useTitle(title)
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    if (theme !== 'blue') document.documentElement.style.setProperty('--sky-t', '0')
  }, [theme])
  return (
    <div className={`page page--${theme} ${className}`}>
      {theme === 'blue' && <Sky />}
      {children}
    </div>
  )
}

export function Rail({ children, label }) {
  const ref = useRef(null)
  const [edge, setEdge] = useState({ l: true, r: false })
  const upd = () => {
    const el = ref.current
    if (!el) return
    setEdge({ l: el.scrollLeft < 8, r: el.scrollLeft + el.clientWidth >= el.scrollWidth - 8 })
  }
  useEffect(() => { upd() }, [])
  const by = (d) => ref.current.scrollBy({ left: d * ref.current.clientWidth * 0.8, behavior: 'smooth' })
  return (
    <div className="rail">
      <div className="rail__btns">
        <button type="button" className="icon-btn icon-btn--round" onClick={() => by(-1)} disabled={edge.l} aria-label={`Scroll ${label} back`}><IconChevron style={{ transform: 'rotate(90deg)' }} /></button>
        <button type="button" className="icon-btn icon-btn--round" onClick={() => by(1)} disabled={edge.r} aria-label={`Scroll ${label} forward`}><IconChevron style={{ transform: 'rotate(-90deg)' }} /></button>
      </div>
      <div className="rail__track" ref={ref} onScroll={upd} tabIndex={0} role="group" aria-label={label} data-lenis-prevent-wheel>{children}</div>
    </div>
  )
}

export function Crumbs({ items }) {
  return (
    <nav className="crumbs" aria-label="Breadcrumb">
      {items.map((c, i) => (c.to ? <span key={c.label}><Link to={c.to}>{c.label}</Link><i aria-hidden="true">/</i></span> : <span key={c.label} aria-current="page">{c.label}</span>))}
    </nav>
  )
}

export function Accordion({ items }) {
  const [openIdx, setOpen] = useState(0)
  return (
    <div className="acc">
      {items.map((it, i) => (
        <div key={it.q} className={`acc__item ${openIdx === i ? 'is-open' : ''}`}>
          <h3>
            <button type="button" aria-expanded={openIdx === i} aria-controls={`acc-${i}`} id={`accb-${i}`} onClick={() => setOpen(openIdx === i ? -1 : i)}>
              {it.q}<IconChevron />
            </button>
          </h3>
          <div id={`acc-${i}`} role="region" aria-labelledby={`accb-${i}`} className="acc__panel"><div>{it.a}</div></div>
        </div>
      ))}
    </div>
  )
}

export function CTALink({ to, children, tone = 'yellow', ...rest }) {
  return <Link to={to} className={`btn btn--${tone}`} {...rest}>{children}<IconArrow width={18} height={18} /></Link>
}
