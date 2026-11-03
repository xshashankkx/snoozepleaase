import { useId } from 'react'

const NAVY = '#101f5a'

export function Star({ className, style }) {
  return (
    <svg className={className} style={style} viewBox="0 0 100 100" aria-hidden="true">
      <path d="M50 8 L61.5 36 L92 38.5 L68.5 58 L76 88 L50 71.5 L24 88 L31.5 58 L8 38.5 L38.5 36 Z" fill="#ffe27a" stroke="#ffe27a" strokeWidth="9" strokeLinejoin="round" />
    </svg>
  )
}

export function Rays({ className, style, flip }) {
  return (
    <svg className={className} style={{ ...style, transform: flip ? 'scaleX(-1)' : undefined }} viewBox="0 0 60 60" aria-hidden="true">
      <g stroke="#ffe27a" strokeWidth="5" strokeLinecap="round" fill="none">
        <path d="M8 40 L30 34" /><path d="M14 18 L34 22" /><path d="M30 6 L38 14" />
      </g>
    </svg>
  )
}

export function Moon({ className, style, face = true }) {
  const id = useId()
  return (
    <svg className={className} style={style} viewBox="0 0 100 110" aria-hidden="true">
      <mask id={id}><rect width="100" height="110" fill="#fff" /><circle cx="78" cy="42" r="38" fill="#000" /></mask>
      <circle cx="46" cy="58" r="44" fill="#f7e49a" mask={`url(#${id})`} />
      <circle cx="46" cy="58" r="44" fill="none" stroke="#e9c96a" strokeWidth="2" strokeDasharray="3 7" mask={`url(#${id})`} opacity=".7" />
      {face && (
        <g fill="none" stroke={NAVY} strokeWidth="2.6" strokeLinecap="round">
          <path d="M20 64 q5 5 10 0" /><path d="M24 80 q6 5 12 -1" />
          <ellipse cx="20" cy="73" rx="5" ry="3" fill="#ffb3c1" stroke="none" />
        </g>
      )}
    </svg>
  )
}

export function Cloud({ className, style, face = true }) {
  return (
    <svg className={className} style={style} viewBox="0 0 140 90" aria-hidden="true">
      <path d="M34 78 C10 78 6 50 28 46 C26 22 58 12 70 32 C80 16 112 24 108 50 C130 50 134 78 108 78 Z" fill="#fff" stroke="#c4d3ff" strokeWidth="4" strokeLinejoin="round" />
      <path d="M40 70 C30 68 26 58 34 54 M92 40 C100 38 106 44 104 50" fill="none" stroke="#d9e4ff" strokeWidth="3" strokeLinecap="round" />
      {face && (
        <g fill="none" stroke="#2a3f9a" strokeWidth="2.6" strokeLinecap="round">
          <path d="M48 54 q6 6 12 0" /><path d="M78 54 q6 6 12 0" /><path d="M64 63 q6 6 12 0" />
          <ellipse cx="46" cy="64" rx="7" ry="4" fill="#ffb3c1" stroke="none" /><ellipse cx="94" cy="64" rx="7" ry="4" fill="#ffb3c1" stroke="none" />
        </g>
      )}
    </svg>
  )
}

export function Sun({ className, style }) {
  return (
    <svg className={className} style={style} viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="50" r="22" fill="#ffd23f" />
      <g stroke="#ffd23f" strokeWidth="6" strokeLinecap="round">
        {Array.from({ length: 10 }, (_, i) => {
          const a = (i / 10) * Math.PI * 2
          return <path key={i} d={`M${50 + Math.cos(a) * 31} ${50 + Math.sin(a) * 31} L${50 + Math.cos(a) * 44} ${50 + Math.sin(a) * 44}`} />
        })}
      </g>
    </svg>
  )
}

export function Wave({ className, style }) {
  return (
    <svg className={className} style={style} viewBox="0 0 400 60" preserveAspectRatio="none" aria-hidden="true">
      <path d="M0 30 Q25 4 50 30 T100 30 T150 30 T200 30 T250 30 T300 30 T350 30 T400 30 V60 H0 Z" fill="#2f6fe0" />
      <path d="M0 40 Q25 16 50 40 T100 40 T150 40 T200 40 T250 40 T300 40 T350 40 T400 40" fill="none" stroke="#bcd4ff" strokeWidth="3" strokeLinecap="round" />
      <path d="M0 30 Q25 4 50 30 T100 30 T150 30 T200 30 T250 30 T300 30 T350 30 T400 30" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity=".8" />
    </svg>
  )
}

export function Palm({ className, style }) {
  return (
    <svg className={className} style={style} viewBox="0 0 100 130" aria-hidden="true">
      <path d="M52 128 C48 100 54 70 46 40" fill="none" stroke="#8a5628" strokeWidth="7" strokeLinecap="round" />
      <g fill="#2f8f4e">
        <path d="M46 40 C30 18 8 24 2 40 C18 32 32 34 46 40 Z" />
        <path d="M46 40 C60 16 84 18 94 34 C78 30 62 34 46 40 Z" fill="#3fa862" />
        <path d="M46 40 C26 38 14 52 16 66 C26 52 36 46 46 40 Z" fill="#37a05a" />
        <path d="M46 40 C66 38 82 52 78 68 C70 54 58 46 46 40 Z" />
        <path d="M46 40 C42 22 50 8 62 4 C58 18 54 30 46 40 Z" fill="#3fa862" />
      </g>
      <circle cx="44" cy="46" r="4.5" fill="#7a4a1f" /><circle cx="52" cy="48" r="4.5" fill="#8a5628" />
    </svg>
  )
}

export function Sprig({ className, style, flip }) {
  const pairs = [18, 40, 62, 84, 106]
  return (
    <svg className={className} style={{ ...style, transform: flip ? 'scaleX(-1)' : undefined }} viewBox="0 0 60 140" aria-hidden="true">
      <path d="M30 138 C26 100 34 60 30 6" fill="none" stroke="#3b7d3a" strokeWidth="3" strokeLinecap="round" />
      {pairs.map((y, i) => (
        <g key={y}>
          <ellipse cx="17" cy={y + 6} rx="15" ry="6.5" transform={`rotate(-38 17 ${y + 6})`} fill={i % 2 ? '#2f8f4e' : '#4aa34f'} />
          <ellipse cx="43" cy={y - 4} rx="15" ry="6.5" transform={`rotate(38 43 ${y - 4})`} fill={i % 2 ? '#4aa34f' : '#2f8f4e'} />
        </g>
      ))}
      <ellipse cx="30" cy="8" rx="5" ry="11" fill="#4aa34f" />
    </svg>
  )
}

export function Mango({ className, style }) {
  return (
    <svg className={className} style={style} viewBox="0 0 80 90" aria-hidden="true">
      <path d="M40 16 C62 12 78 36 70 58 C64 78 40 88 24 76 C8 64 14 24 40 16 Z" fill="#f9a825" />
      <ellipse cx="30" cy="42" rx="7" ry="14" transform="rotate(18 30 42)" fill="#ffd166" opacity=".8" />
      <path d="M40 16 C46 6 58 4 66 8 C60 16 50 18 40 16 Z" fill="#3d9142" />
      <path d="M40 16 C40 12 41 9 43 6" stroke="#6b4a22" strokeWidth="3" strokeLinecap="round" fill="none" />
    </svg>
  )
}

export function Plane({ className, style }) {
  return (
    <svg className={className} style={style} viewBox="0 0 120 60" aria-hidden="true">
      <path d="M22 32 L8 12 L32 24 Z" fill="#c43328" />
      <path d="M18 34 C18 22 50 20 86 26 C102 28 108 34 100 40 C84 46 40 48 18 34 Z" fill="#e0453a" />
      <path d="M52 36 L36 54 L74 46 Z" fill="#f4f6ff" stroke="#9db4e0" strokeWidth="1.5" />
      <path d="M54 28 L70 8 L86 26 Z" fill="#fff" stroke="#9db4e0" strokeWidth="1.5" />
      <circle cx="70" cy="29" r="6" fill="#bfe3ff" stroke="#2a3f9a" strokeWidth="1.5" />
      <ellipse cx="106" cy="34" rx="3" ry="14" fill="#333" opacity=".55" />
    </svg>
  )
}

export function Sailboat({ className, style }) {
  return (
    <svg className={className} style={style} viewBox="0 0 80 90" aria-hidden="true">
      <path d="M8 72 H72 L62 86 H18 Z" fill="#1d3a8a" />
      <path d="M38 8 V66 H10 Z" fill="#fff" stroke="#1d3a8a" strokeWidth="2" strokeLinejoin="round" />
      <path d="M42 24 V66 H70 Z" fill="#ffe27a" stroke="#1d3a8a" strokeWidth="2" strokeLinejoin="round" />
      <path d="M40 4 V72" stroke="#1d3a8a" strokeWidth="2.5" />
    </svg>
  )
}

export function Elephant({ className, style }) {
  return (
    <svg className={className} style={style} viewBox="0 0 140 120" aria-hidden="true">
      <g fill="#8f9bc8">
        <rect x="46" y="86" width="14" height="26" rx="6" /><rect x="78" y="86" width="14" height="26" rx="6" />
        <ellipse cx="72" cy="70" rx="46" ry="34" />
        <circle cx="36" cy="58" r="25" />
        <path d="M18 66 C4 74 8 98 20 102 C26 104 30 98 25 94 C20 88 22 80 30 74 Z" />
        <path d="M116 64 C128 62 132 76 126 88" fill="none" stroke="#8f9bc8" strokeWidth="6" strokeLinecap="round" />
      </g>
      <circle cx="52" cy="56" r="17" fill="#a9b4dc" />
      <circle cx="30" cy="50" r="2.8" fill={NAVY} />
      <ellipse cx="24" cy="62" rx="5" ry="3" fill="#ffb3c1" />
    </svg>
  )
}

const SIDE = {
  sea: ['Sunny', 'dreams', 'softer', 'tomorrows'],
  jungle: ['Little', 'dreamers', 'brighter', 'days'],
  fruit: ['Sweet', 'dreams', 'brighter', 'tomorrows'],
  sky: ['Big', 'adventures', 'bigger', 'bedtimes'],
  night: ['Sleep', 'tight', 'dream', 'bright'],
}
export const sideText = (t) => SIDE[t] || SIDE.night

// Box art per theme: [Component, position/size]. Sizes are % of the box width.
const ART = {
  sea: [
    [Palm, { left: '3%', top: '13%', width: '21%' }],
    [Sun, { right: '5%', top: '12%', width: '14%' }],
    [Wave, { left: 0, bottom: 0, width: '100%', height: '11%' }],
    [Sailboat, { right: '6%', bottom: '7%', width: '13%' }],
    [Star, { left: '8%', bottom: '14%', width: '5%' }],
  ],
  jungle: [
    [Sprig, { left: '2%', top: '9%', width: '12%' }],
    [Sprig, { right: '2%', top: '6%', width: '12%', transform: 'scaleX(-1) rotate(-6deg)' }],
    [Sprig, { left: '3%', bottom: '2%', width: '11%', transform: 'rotate(18deg)' }],
    [Elephant, { right: '4%', bottom: '3%', width: '24%' }],
    [Star, { right: '5%', top: '48%', width: '5%' }],
  ],
  fruit: [
    [Sprig, { left: '1%', top: '8%', width: '12%', transform: 'rotate(-10deg)' }],
    [Mango, { right: '5%', top: '7%', width: '14%', transform: 'rotate(12deg)' }],
    [Mango, { left: '3%', bottom: '3%', width: '17%', transform: 'rotate(-12deg)' }],
    [Sprig, { right: '2%', bottom: '3%', width: '10%', transform: 'scaleX(-1) rotate(12deg)' }],
    [Star, { right: '4%', top: '50%', width: '5%' }],
  ],
  sky: [
    [Cloud, { left: '3%', top: '5%', width: '19%', transform: 'rotate(-6deg)' }],
    [Cloud, { right: '3%', top: '9%', width: '13%', transform: 'rotate(6deg)' }],
    [Plane, { left: '2%', bottom: '4%', width: '19%', transform: 'rotate(-8deg)' }],
    [Cloud, { right: '8%', bottom: '2%', width: '19%' }],
    [Star, { left: '5%', top: '44%', width: '5%' }],
    [Star, { right: '4%', top: '78%', width: '5%' }],
  ],
  night: [
    [Moon, { left: '4%', top: '6%', width: '14%' }],
    [Cloud, { right: '4%', top: '9%', width: '17%' }],
    [Star, { left: '6%', bottom: '8%', width: '7%' }],
    [Star, { right: '7%', bottom: '10%', width: '6%' }],
    [Star, { right: '5%', top: '48%', width: '4%' }],
  ],
}

export function BoxArt({ theme }) {
  const art = ART[theme] || ART.night
  return art.map(([C, st], i) => <C key={i} className="box__art" style={st} />)
}
