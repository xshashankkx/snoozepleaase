import { useEffect, useRef, useState } from 'react'
import Page from '../components/Page'
import { Moon, Cloud, Star } from '../components/Doodles'
import { IconCheck } from '../components/Icons'
import { STAGES, productFits } from '../lib/age'
import { reducedMotion } from '../lib/scroll'

const RULER = Array.from({ length: 13 }, (_, i) => 13 - i)

function Pencil() {
  return (
    <svg className="chart__pencil-svg" viewBox="0 0 120 36" aria-hidden="true">
      <path d="M4 18 L26 6 H98 V30 H26 Z" fill="#ffd83d" stroke="#101f5a" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M4 18 L26 6 V30 Z" fill="#f2d3a5" stroke="#101f5a" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M4 18 L12 14 V22 Z" fill="#3b2a1a" />
      <path d="M26 14 H98 M26 22 H98" stroke="#e0a800" strokeWidth="2" />
      <rect x="98" y="6" width="8" height="24" fill="#c9ccd6" stroke="#101f5a" strokeWidth="2.5" />
      <path d="M106 6 H114 Q118 6 118 10 V26 Q118 30 114 30 H106 Z" fill="#ff9fb8" stroke="#101f5a" strokeWidth="2.5" strokeLinejoin="round" />
    </svg>
  )
}

// A kids' wall growth chart. Tapping a stage slides the pencil up and marks it.
export default function AgeStep({ coll, current, onPick, onSkip }) {
  const counts = Object.fromEntries(STAGES.map((s) => [s.key, coll.items.filter((p) => productFits(p, s)).length]))
  const start = current && counts[current] > 0 ? current : null
  const [active, setActive] = useState(start)
  const [chosen, setChosen] = useState(null)
  const timer = useRef(0)
  useEffect(() => () => clearTimeout(timer.current), [])
  const act = STAGES.find((s) => s.key === (chosen || active))

  const pick = (s) => {
    if (chosen) return
    if (reducedMotion()) return onPick(s.key)
    setActive(s.key)
    setChosen(s.key)
    timer.current = setTimeout(() => onPick(s.key), 760)
  }

  return (
    <Page theme="blue" title="Choose an age">
      <section className="agestep">
        <header className="agestep__head wrap">
          <h1 className="h1">Who are you shopping for?</h1>
          <p className="lede">Browsing {coll.label}. Pick an age and we will show the sizes that fit.</p>
        </header>

        <div className="chart">
          <Moon className="chart__deco chart__moon" />
          <Cloud className="chart__deco chart__cloud" />
          <Star className="chart__deco chart__star cs1" />
          <Star className="chart__deco chart__star cs2" />
          <div className="chart__board" onPointerLeave={() => !chosen && setActive(start)}>
            <span className="chart__tape chart__tape--l" aria-hidden="true" />
            <span className="chart__tape chart__tape--r" aria-hidden="true" />
            <ol className="chart__ruler" aria-hidden="true">
              {RULER.map((n) => <li key={n}><b>{n}</b></li>)}
            </ol>
            <div className="chart__stages" role="group" aria-label="Age groups">
              {[...STAGES].reverse().map((s) => {
                const n = counts[s.key]
                return (
                  <button key={s.key} type="button" disabled={n === 0 || !!chosen}
                    className={`stage ${active === s.key ? 'is-active' : ''} ${chosen === s.key ? 'is-chosen' : ''}`}
                    style={{ '--units': s.units }} aria-label={`${s.label}, ages ${s.ages}, ${n} styles`}
                    onPointerEnter={() => !chosen && n > 0 && setActive(s.key)} onFocus={() => !chosen && setActive(s.key)} onClick={() => pick(s)}>
                    <span className="stage__bar" aria-hidden="true" />
                    <span className="stage__name">{s.label}</span>
                    <span className="stage__age">Ages {s.ages}</span>
                    <span className="stage__count">{n === 0 ? `No ${coll.slug === 'all' ? 'styles' : coll.label.toLowerCase()} yet` : `${n} styles`}</span>
                    {chosen === s.key && <IconCheck className="stage__check" width={28} height={28} />}
                  </button>
                )
              })}
              <div className={`chart__pencil ${act ? 'is-on' : ''}`} style={{ '--start': act ? act.mid - act.units / 2 : 13.8 }} aria-hidden="true"><Pencil /></div>
            </div>
          </div>
        </div>

        <p className="chart__skip"><button type="button" className="link-btn" onClick={onSkip}>Show me everything</button></p>
      </section>
    </Page>
  )
}
