'use client'
import { useEffect, useMemo } from 'react'
import { Link, useSearchParams } from '../lib/router'
import Page, { Rail } from '../components/Page'
import ProductCard from '../components/ProductCard'
import AgeStep from './AgeStep'
import { Moon } from '../components/Doodles'
import { productFits } from '../lib/product'
import { useStore } from '../store/StoreProvider'
import { useSite } from '../lib/site'
import { Reveal } from '../lib/hooks'
import { scrollTop } from '../lib/scroll'

const PRICE = { u1000: [0, 1000], '1000-1500': [1000, 1500], o1500: [1500, 1e9] }
const SORTS = { featured: 'Featured', 'price-asc': 'Price, low to high', 'price-desc': 'Price, high to low', name: 'Name, A to Z' }
// Pages that ask for an age first.
const ASKS_AGE = ['kids-nightwear', 'co-ords', 'all']

// `coll` is { slug, label, blurb, items }. `picksByStage` maps a stage code to its hand-picked products.
export default function ShopView({ coll, mode = /** @type {string | undefined} */ (undefined), picksByStage = {}, initialAge = /** @type {string | null} */ (null) }) {
  const [sp, setSp] = useSearchParams()
  const { age: memAge, setAge } = useStore()
  const { age: ageCfg, categories } = useSite()
  const stageOf = (k) => ageCfg.stages.find((s) => s.key === k) || null
  const valid = (k) => k === 'all' || !!stageOf(k)
  const q = mode === 'search' ? coll.query || '' : ''
  const price = sp.get('price') || ''
  const sort = sp.get('sort') || 'featured'
  const stockOnly = sp.get('stock') === '1'
  const forceStep = sp.get('step') === '1'
  const ageParam = valid(sp.get('age')) ? sp.get('age') : null

  const asks = mode !== 'search' && ASKS_AGE.includes(coll.slug)
  const ageKey = ageParam ?? (valid(memAge) ? memAge : valid(initialAge) ? initialAge : null)
  const stage = asks ? stageOf(ageKey) : null
  const needsStep = asks && (forceStep || !ageKey)

  useEffect(() => { if (ageParam && ageParam !== memAge) setAge(ageParam) }, [ageParam])

  const items = useMemo(() => {
    let list = coll.items.filter((p) => {
      if (stage && !productFits(p, stage)) return false
      if (price && PRICE[price] && !(p.price >= PRICE[price][0] && p.price < PRICE[price][1])) return false
      if (stockOnly && p.stock <= 0) return false
      return true
    })
    if (sort === 'price-asc') list = [...list].sort((a, b) => a.price - b.price)
    if (sort === 'price-desc') list = [...list].sort((a, b) => b.price - a.price)
    if (sort === 'name') list = [...list].sort((a, b) => a.title.localeCompare(b.title))
    return list
  }, [coll, stage, price, sort, stockOnly])

  const picks = useMemo(() => {
    if (!stage) return []
    return (picksByStage[stage.key] || []).filter((p) => coll.slug === 'all' || p.cat === coll.slug)
  }, [stage, coll, picksByStage])

  const set = (k, v) => {
    const n = new URLSearchParams(sp)
    if (v) n.set(k, v); else n.delete(k)
    setSp(n, { replace: true })
  }
  const choose = (key) => {
    setAge(key)
    const n = new URLSearchParams(sp)
    n.delete('step')
    n.set('age', key)
    setSp(n, { replace: true })
    scrollTop()
  }

  if (needsStep) return <AgeStep coll={coll} current={stage?.key} onPick={choose} onSkip={() => choose('all')} age={ageCfg} />

  const clear = () => {
    const n = new URLSearchParams()
    if (ageKey) n.set('age', ageKey)
    setSp(n, { replace: true })
  }
  const filtered = price || stockOnly
  const changeAge = () => { const n = new URLSearchParams(sp); n.set('step', '1'); setSp(n); scrollTop() }
  const catLabel = categories.find((c) => c.slug === coll.slug)?.label

  return (
    <Page theme="blue" title={coll.label}>
      <div className="shop wrap">
        <header className="shop__head">
          <h1 className="h1">{coll.label}</h1>
          {coll.blurb && <p className="lede">{coll.blurb}</p>}
          {asks && (
            <p className="shopfor">
              {stage ? <>Shopping for <strong>{stage.label} · ages {stage.ages}</strong></> : <>Showing <strong>all ages</strong></>}
              <button type="button" className="link-btn" onClick={changeAge}>{stage ? 'Change' : 'Choose an age'}</button>
            </p>
          )}
        </header>

        {picks.length >= 2 && (
          <section className="picks-row" aria-label={`Picks for ${stage.plural}`}>
            <Reveal as="h2" className="h2 h2--sm">Picks for {stage.plural.toLowerCase()}</Reveal>
            <Rail label={`Picks for ${stage.plural}`}>
              {picks.map((p, i) => <div key={p.handle} className="rail__cell"><ProductCard p={p} i={i} /></div>)}
            </Rail>
          </section>
        )}

        <div className="shop__bar">
          {mode !== 'search' && (
            <nav className="cats" aria-label="Collections">
              <Link to="/collections/all" className={`chip chip--lg ${coll.slug === 'all' ? 'is-on' : ''}`}>All</Link>
              {categories.map((c) => <Link key={c.slug} to={`/collections/${c.slug}`} className={`chip chip--lg ${catLabel === c.label ? 'is-on' : ''}`}>{c.label}</Link>)}
              <Link to="/collections/best-sellers" className={`chip chip--lg ${coll.slug === 'best-sellers' ? 'is-on' : ''}`}>Best Sellers</Link>
            </nav>
          )}
          <div className="filters">
            <label>Price
              <select value={price} onChange={(e) => set('price', e.target.value)}>
                <option value="">Any price</option>
                <option value="u1000">Under ₹1,000</option><option value="1000-1500">₹1,000 to ₹1,500</option><option value="o1500">Over ₹1,500</option>
              </select>
            </label>
            <label>Sort
              <select value={sort} onChange={(e) => set('sort', e.target.value === 'featured' ? '' : e.target.value)}>
                {Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
            <label className="check check--inline"><input type="checkbox" checked={stockOnly} onChange={(e) => set('stock', e.target.checked ? '1' : '')} /><span>In stock only</span></label>
          </div>
          <p className="shop__count" aria-live="polite">
            {items.length} {items.length === 1 ? 'style' : 'styles'}{stage ? ` for ${stage.plural.toLowerCase()}` : ''}
            {filtered && <button type="button" className="link-btn" onClick={clear}>Clear filters</button>}
          </p>
        </div>

        {items.length === 0 ? (
          <Reveal className="empty">
            <Moon className="empty__moon" />
            <h2 className="h2">{mode === 'search' ? 'Nothing matches that search' : stage && !filtered ? `No ${coll.label.toLowerCase()} in ${stage.label.toLowerCase()} sizes yet` : 'No styles fit those filters'}</h2>
            <p>{mode === 'search' ? 'Try “elephant”, “co-ord” or “robe”.' : stage && !filtered ? 'Try another age or see everything.' : 'Loosen a filter and the dreams come back.'}</p>
            <div className="empty__acts">
              {filtered && <button type="button" className="btn btn--yellow" onClick={clear}>Clear filters</button>}
              {asks && <button type="button" className="btn btn--ghost" onClick={changeAge}>Choose another age</button>}
              {asks && stage && <button type="button" className="btn btn--ghost" onClick={() => choose('all')}>Show all ages</button>}
              {!asks && <Link to="/collections/all" className="btn btn--ghost">Browse everything</Link>}
            </div>
          </Reveal>
        ) : (
          <div className="grid grid--3">
            {items.map((p, i) => <ProductCard key={p.handle} p={p} i={i} delay={(i % 3) * 70} />)}
          </div>
        )}
      </div>
    </Page>
  )
}
