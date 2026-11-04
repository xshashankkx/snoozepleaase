'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import Page from '../components/Page'
import { Moon, Cloud, Star } from '../components/Doodles'
import { IconCheck } from '../components/Icons'
import { productFits } from '../lib/product'
import { reducedMotion } from '../lib/scroll'

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

// Lays the stages out on the chart: the ruler counts the ages, and each stage covers the ages
// from its own start up to where the next stage begins (the oldest runs to the top of the ruler).
function layoutStages(stages) {
  const sorted = [...stages].sort((a, b) => a.ageFrom - b.ageFrom)
  const low = Math.max(1, Math.min(...sorted.map((s) => s.ageFrom)))
  const high = Math.max(...sorted.map((s) => Math.min(s.ageTo, 13)), low)
  const spans = sorted.map((s, i) => {
    const to = i < sorted.length - 1 ? sorted[i + 1].ageFrom - 1 : high
    return { ...s, units: Math.max(1, to - Math.max(low, s.ageFrom) + 1) }
  })
  let start = 0
  const topDown = [...spans].reverse().map((s) => { const out = { ...s, start }; start += s.units; return out })
  return { stages: topDown, ruler: Array.from({ length: high - low + 1 }, (_, i) => high - i), total: start }
}

// A kids' wall growth chart. Tapping a stage slides the pencil up and marks it.
export default function AgeStep({ coll, current, onPick, onSkip, age }) {
  const { stages, ruler, total } = useMemo(() => layoutStages(age.stages), [age.stages])
  const counts = Object.fromEntries(stages.map((s) => [s.key, coll.items.filter((p) => productFits(p, s)).length]))
  const start = current && counts[current] > 0 ? current : null
  const [active, setActive] = useState(start)
  const [chosen, setChosen] = useState(null)
  const timer = useRef(0)
  useEffect(() => () => clearTimeout(timer.current), [])
  const act = stages.find((s) => s.key === (chosen || active))

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
          <h1 className="h1">{age.heading}</h1>
          <p className="lede">Browsing {coll.label}. {age.intro}</p>
        </header>

        <div className="chart" style={{ '--n': total }}>
          <Moon className="chart__deco chart__moon" />
          <Cloud className="chart__deco chart__cloud" />
          <Star className="chart__deco chart__star cs1" />
          <Star className="chart__deco chart__star cs2" />
          <div className="chart__board" onPointerLeave={() => !chosen && setActive(start)}>
            <span className="chart__tape chart__tape--l" aria-hidden="true" />
            <span className="chart__tape chart__tape--r" aria-hidden="true" />
            <ol className="chart__ruler" aria-hidden="true">
              {ruler.map((n) => <li key={n}><b>{n}</b></li>)}
            </ol>
            <div className="chart__stages" role="group" aria-label="Age groups">
              {stages.map((s) => {
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
              <div className={`chart__pencil ${act ? 'is-on' : ''}`} style={{ '--start': act ? act.start : total + 0.8 }} aria-hidden="true"><Pencil /></div>
            </div>
          </div>
        </div>

        <p className="chart__skip"><button type="button" className="link-btn" onClick={onSkip}>{age.skipLabel}</button></p>
      </section>
    </Page>
  )
}
