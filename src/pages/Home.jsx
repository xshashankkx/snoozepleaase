import { useLayoutEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Page, { Rail, CTALink } from '../components/Page'
import ProductCard from '../components/ProductCard'
import BoxFrame from '../components/BoxFrame'
import { Moon, Cloud, Star, Rays, Sprig } from '../components/Doodles'
import { IconLeaf, IconShield } from '../components/Icons'
import { heroPicks, bestSellers, newArrivals, heroes, byHandle, CATS, img } from '../lib/catalog'
import { Reveal } from '../lib/hooks'
import { reducedMotion } from '../lib/scroll'
import { useGo, linkClick } from '../lib/useGo'

gsap.registerPlugin(ScrollTrigger)


const MARQUEE = ['100% hand-picked cotton', 'Poplin & percale', 'Free shipping over ₹1,999', 'Cash on delivery available', 'Ethically crafted', 'Sleep naturally, dream sustainably']

const BOXES = [
  { cat: 'kids-nightwear', pick: 'green-elephant-nightsuit' },
  { cat: 'co-ords', pick: 'florida-blue-co-ord-set' },
  { cat: 'bath-towels', pick: 'aviator-adventure-robe' },
  { cat: 'mom-me', pick: 'midnight-elegance-matching-nighsuit' },
]

export default function Home() {
  const root = useRef(null)
  const go = useGo()

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const setSky = (t) => document.documentElement.style.setProperty('--sky-t', t.toFixed(3))
      setSky(0)
      if (reducedMotion()) return
      gsap.from('.hero__title .w > span', { yPercent: 118, rotate: 5, duration: 1.1, ease: 'expo.out', stagger: 0.09, delay: 0.1 })
      gsap.from('.hero__rays', { scale: 0, opacity: 0, duration: 0.6, ease: 'back.out(2)', stagger: 0.15, delay: 0.7 })
      gsap.from('.hero__fade', { y: 24, opacity: 0, duration: 0.9, ease: 'expo.out', stagger: 0.1, delay: 0.7 })
      gsap.from('.hero__doodle', { scale: 0, rotate: -24, duration: 1, ease: 'back.out(1.6)', stagger: 0.1, delay: 0.35 })
      gsap.utils.toArray('[data-speed]').forEach((el) => {
        gsap.to(el, { y: () => -parseFloat(el.dataset.speed) * 160, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } })
      })
      const hero = root.current.querySelector('.hero')
      const qx = gsap.utils.toArray('[data-depth]').map((el) => ({ el, x: gsap.quickTo(el, 'x', { duration: 0.8, ease: 'power3' }) }))
      const mv = (e) => {
        const nx = e.clientX / innerWidth - 0.5
        qx.forEach((q) => { q.x(nx * 40 * parseFloat(q.el.dataset.depth)) })
      }
      hero.addEventListener('pointermove', mv)
      ScrollTrigger.create({ trigger: root.current, start: 'top top', end: 'bottom bottom', onUpdate: (s) => setSky(Math.min(1, s.progress * 1.5)) })
      gsap.to('.story__img--a', { yPercent: -10, ease: 'none', scrollTrigger: { trigger: '.story', start: 'top bottom', end: 'bottom top', scrub: true } })
      gsap.to('.story__img--b', { yPercent: 14, ease: 'none', scrollTrigger: { trigger: '.story', start: 'top bottom', end: 'bottom top', scrub: true } })
      gsap.from('.closer__moon', { rotate: -30, y: 60, ease: 'none', scrollTrigger: { trigger: '.closer', start: 'top bottom', end: 'center center', scrub: true } })
      return () => hero.removeEventListener('pointermove', mv)
    }, root)
    return () => { ctx.revert(); document.documentElement.style.setProperty('--sky-t', '0') }
  }, [])

  return (
    <Page theme="blue">
      <div ref={root}>
        <section className="hero">
          <Moon className="hero__doodle hero__moon" data-speed="0.35" data-depth="0.6" />
          <Cloud className="hero__doodle hero__cloud" data-speed="0.55" data-depth="-0.8" />
          <Cloud className="hero__doodle hero__cloud hero__cloud--s" data-speed="0.25" data-depth="0.5" face={false} />
          <Cloud className="hero__doodle hero__cloud hero__cloud--t" data-speed="0.4" data-depth="-0.4" face={false} />
          <Star className="hero__doodle hero__star hs1" data-speed="0.2" />
          <Star className="hero__doodle hero__star hs2" data-speed="0.5" />
          <Star className="hero__doodle hero__star hs3" data-speed="0.3" />
          <Star className="hero__doodle hero__star hs4" data-speed="0.6" />
          <Star className="hero__doodle hero__star hs5" data-speed="0.15" />
          <h1 className="hero__title" aria-label="Dream big, sleep cozy">
            <span className="line" aria-hidden="true"><span className="w"><span>Dream</span></span> <span className="w"><span>big,</span></span><Rays className="hero__rays hero__rays--l" /><Rays className="hero__rays hero__rays--r" flip /></span>
            <span className="line" aria-hidden="true"><span className="w"><span>sleep</span></span> <span className="w"><span>cozy</span></span></span>
          </h1>
          <p className="hero__sub hero__fade">Premium handcrafted nightwear designed for relaxation, elegance and better sleep.</p>
          <div className="hero__cta hero__fade">
            <CTALink to="/collections/all">Shop now</CTALink>
            <Link to="/collections/kids-nightwear" className="btn btn--ghost">Kids nightwear</Link>
          </div>
        </section>

        <section className="picks" aria-label="Featured sets">
          <div className="picks__grid">
            {heroPicks.map((p, i) => <ProductCard key={p.handle} p={p} tone={['yellow', 'pink', 'pink', 'yellow'][i]} delay={(i % 2) * 120} eager={i < 2} />)}
          </div>
        </section>

        <div className="tape" aria-hidden="true">
          <div className="tape__run">
            {[0, 1].map((k) => <div key={k} className="tape__set">{MARQUEE.map((m) => <span key={m + k}><Star className="tape__star" />{m}</span>)}</div>)}
          </div>
        </div>

        <section className="shelf wrap">
          <div className="shelf__head">
            <Reveal as="h2" className="h2">Best sellers</Reveal>
            <Link to="/collections/best-sellers" className="more">View all</Link>
          </div>
          <Rail label="Best sellers">
            {bestSellers.map((p, i) => <div key={p.handle} className="rail__cell"><ProductCard p={p} i={i + 1} /></div>)}
          </Rail>
        </section>

        <section className="boxes wrap">
          <Reveal as="h2" className="h2">Choose your box</Reveal>
          <div className="boxes__grid">
            {BOXES.map((b, i) => {
              const c = CATS.find((x) => x.slug === b.cat)
              const p = byHandle[b.pick]
              const to = `/collections/${c.slug}`
              return (
                <Reveal key={c.slug} delay={i * 80} className="boxes__item">
                  <Link to={to} onClick={linkClick(go, to)} aria-label={`Shop ${c.label}`}>
                    <BoxFrame title={c.label} theme={p.theme} src={p.images[1] || p.images[0]} alt="" />
                  </Link>
                  <p>{c.blurb}</p>
                  <Link to={to} className="more" onClick={linkClick(go, to)}>Shop {c.label}</Link>
                </Reveal>
              )
            })}
          </div>
        </section>

        <section className="story">
          <div className="story__in wrap">
            <div className="story__copy">
              <Reveal as="h2" className="h2 h2--xl">Luxury in every thread</Reveal>
              <Reveal as="p" className="lede" delay={80}>Based in India, Snooze Pleaase is a premium nightwear brand dedicated to the art of rest. We believe that true luxury lies in simplicity and superior comfort.</Reveal>
              <ul className="promises">
                <Reveal as="li" delay={60}><IconLeaf /><div><h3>Pure comfort</h3><p>100% hand-picked cotton, in crisp, breathable poplin and percale.</p></div></Reveal>
                <Reveal as="li" delay={120}><Star className="promises__star" /><div><h3>Curated designs</h3><p>Unique, hand-picked patterns and thoughtful details that blend timeless style with a modern touch.</p></div></Reveal>
                <Reveal as="li" delay={180}><IconShield /><div><h3>Ethically crafted</h3><p>Made with love and meticulous care, so every night can be a quiet one.</p></div></Reveal>
              </ul>
              <Link to="/pages/about-us" className="btn btn--ghost">Our story</Link>
            </div>
            <div className="story__pics" aria-hidden="true">
              <img className="story__img story__img--a" src={img(heroes[0])} alt="" loading="lazy" />
              <img className="story__img story__img--b" src={img(heroes[1])} alt="" loading="lazy" />
              <Moon className="story__moon" />
            </div>
          </div>
        </section>

        <section className="look wrap">
          <Reveal as="h2" className="h2">Bedtime, photographed</Reveal>
          <Rail label="Photo gallery">
            {['life-dino-kid', 'life-minnie-kid', 'life-redjungle-3', 'life-bathtowel', 'life-dino-fold', 'life-bluecow'].map((f, i) => (
              <figure key={f} className={`look__fig ${i % 2 ? 'is-low' : ''}`}><img src={img(f + '.webp')} alt="" loading="lazy" /></figure>
            ))}
          </Rail>
        </section>

        <section className="shelf wrap">
          <div className="shelf__head">
            <Reveal as="h2" className="h2">Just landed</Reveal>
            <Link to="/collections/new-arrivals" className="more">View all</Link>
          </div>
          <div className="grid grid--4">
            {newArrivals.map((p, i) => <ProductCard key={p.handle} p={p} i={i} delay={i * 70} />)}
          </div>
        </section>

        <section className="closer">
          <Moon className="closer__moon" />
          <Cloud className="closer__cloud" />
          <Sprig className="closer__sprig" />
          <Reveal as="h2" className="closer__title">Sleep naturally,<br />dream sustainably.</Reveal>
          <Reveal delay={100}><CTALink to="/collections/all">Shop everything</CTALink></Reveal>
        </section>
      </div>
    </Page>
  )
}
