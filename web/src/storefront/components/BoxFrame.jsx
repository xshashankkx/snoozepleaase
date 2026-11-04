'use client'
import { useRef } from 'react'
import { BoxArt, sideText } from './Doodles'
import Image from 'next/image'

const SIDE_POS = { sea: 'left', jungle: 'right', fruit: 'left', sky: 'right', night: 'left' }

// The kraft gift box from the mockup: title on the lid, product behind the cut-out window.
export default function BoxFrame({ title, theme = 'night', src, alt = '', side = 'left', tilt = true, eager = false, className = '', style, children }) {
  const ref = useRef(null)
  const frame = useRef(0)

  const move = (e) => {
    if (!tilt || e.pointerType === 'touch') return
    const el = ref.current
    const r = el.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width - 0.5
    const y = (e.clientY - r.top) / r.height - 0.5
    cancelAnimationFrame(frame.current)
    frame.current = requestAnimationFrame(() => {
      el.style.setProperty('--ry', `${x * 9}deg`)
      el.style.setProperty('--rx', `${-y * 7}deg`)
      el.style.setProperty('--gx', `${(x + 0.5) * 100}%`)
    })
  }
  const leave = () => {
    cancelAnimationFrame(frame.current)
    const el = ref.current
    el.style.setProperty('--ry', '0deg')
    el.style.setProperty('--rx', '0deg')
  }

  return (
    <div className={`box3d ${className}`} style={style} onPointerMove={move} onPointerLeave={leave}>
      <div ref={ref} className="box" data-theme={theme} data-side={SIDE_POS[theme] || side}>
        <BoxArt theme={theme} />
        <div className="box__side" aria-hidden="true">{sideText(theme).map((w) => <span key={w}>{w}</span>)}</div>
        {title && <p className={`box__title ${title.length > 24 ? 'is-long' : ''}`}>{title}</p>}
        <div className="box__window">
          {src && <Image src={src.url} alt={alt || src.alt || ''} fill sizes="(max-width: 720px) 90vw, 520px" priority={eager} draggable={false} />}
          <span className="box__glare" aria-hidden="true" />
        </div>
        {children}
      </div>
      <span className="box3d__shadow" aria-hidden="true" />
    </div>
  )
}
