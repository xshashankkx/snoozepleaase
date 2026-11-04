'use client'
import { Fragment, useLayoutEffect, useRef } from 'react'
import Image from 'next/image'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Link } from '../lib/router'
import Page, { Rail, CTALink } from '../components/Page'
import ProductCard from '../components/ProductCard'
import BoxFrame from '../components/BoxFrame'
import { Moon, Cloud, Star, Rays, Sprig } from '../components/Doodles'
import { IconLeaf, IconShield } from '../components/Icons'
import { Reveal } from '../lib/hooks'
import { reducedMotion } from '../lib/scroll'
import { useGo, linkClick } from '../lib/useGo'

gsap.registerPlugin(ScrollTrigger)

const ICONS = { leaf: <IconLeaf />, star: <Star className="promises__star" />, shield: <IconShield /> }

// `home` is the Home page from the CMS; the product lists arrive already resolved by the server.
export default function Home({ home, featured, bestSellers, newArrivals, boxes }) {
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

  const [l1, l2] = home.headline
  const words = (line) => String(line || '').split(' ').filter(Boolean)
  const tones = ['yellow', 'pink', 'pink', 'yellow']
  const closing = String(home.closingTitle || '').split('\n')

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
          <h1 className="hero__title" aria-label={`${l1} ${l2}`}>
            {[l1, l2].map((line, li) => (
              <span key={li} className="line" aria-hidden="true">
                {words(line).map((w, wi, arr) => (
                  <Fragment key={wi}>
                    <span className="w"><span>{w}</span></span>{wi < arr.length - 1 ? ' ' : ''}
                  </Fragment>
                ))}
                {li === 0 && <><Rays className="hero__rays hero__rays--l" /><Rays className="hero__rays hero__rays--r" flip /></>}
              </span>
            ))}
          </h1>
          {home.subline && <p className="hero__sub hero__fade">{home.subline}</p>}
          <div className="hero__cta hero__fade">
            {home.primary && <CTALink to={home.primary.url}>{home.primary.label}</CTALink>}
            {home.secondary && <Link to={home.secondary.url} className="btn btn--ghost">{home.secondary.label}</Link>}
          </div>
        </section>

        <section className="picks" aria-label="Featured sets">
          <div className="picks__grid">
            {featured.map((p, i) => <ProductCard key={p.handle} p={p} tone={tones[i % 4]} delay={(i % 2) * 120} eager={i < 2} />)}
          </div>
        </section>

        {home.ticker.length > 0 && (
          <div className="tape" aria-hidden="true">
            <div className="tape__run">
              {[0, 1].map((k) => <div key={k} className="tape__set">{home.ticker.map((m) => <span key={m + k}><Star className="tape__star" />{m}</span>)}</div>)}
            </div>
          </div>
        )}

        {bestSellers.length > 0 && (
          <section className="shelf wrap">
            <div className="shelf__head">
              <Reveal as="h2" className="h2">{home.bestSellersHeading}</Reveal>
              <Link to="/collections/best-sellers" className="more">View all</Link>
            </div>
            <Rail label={home.bestSellersHeading}>
              {bestSellers.map((p, i) => <div key={p.handle} className="rail__cell"><ProductCard p={p} i={i + 1} /></div>)}
            </Rail>
          </section>
        )}

        {boxes.length > 0 && (
          <section className="boxes wrap">
            <Reveal as="h2" className="h2">{home.boxesHeading}</Reveal>
            <div className="boxes__grid">
              {boxes.map((b, i) => {
                const to = `/collections/${b.slug}`
                return (
                  <Reveal key={b.slug} delay={i * 80} className="boxes__item">
                    <Link to={to} onClick={linkClick(go, to)} aria-label={`Shop ${b.label}`}>
                      <BoxFrame title={b.label} theme={b.product.theme} src={b.product.images[1] || b.product.images[0]} alt="" />
                    </Link>
                    <p>{b.blurb}</p>
                    <Link to={to} className="more" onClick={linkClick(go, to)}>Shop {b.label}</Link>
                  </Reveal>
                )
              })}
            </div>
          </section>
        )}

        <section className="story">
          <div className="story__in wrap">
            <div className="story__copy">
              <Reveal as="h2" className="h2 h2--xl">{home.storyHeading}</Reveal>
              {home.storyLede && <Reveal as="p" className="lede" delay={80}>{home.storyLede}</Reveal>}
              <ul className="promises">
                {home.promises.map((pr, i) => (
                  <Reveal key={pr.title} as="li" delay={60 + i * 60}>{ICONS[pr.icon] || ICONS.star}<div><h3>{pr.title}</h3><p>{pr.text}</p></div></Reveal>
                ))}
              </ul>
              {home.storyButton && <Link to={home.storyButton.url} className="btn btn--ghost">{home.storyButton.label}</Link>}
            </div>
            <div className="story__pics">
              {home.storyImages[0] && <Image className="story__img story__img--a" src={home.storyImages[0].large} alt={home.storyImages[0].alt} width={home.storyImages[0].width} height={home.storyImages[0].height} sizes="(max-width: 860px) 70vw, 400px" />}
              {home.storyImages[1] && <Image className="story__img story__img--b" src={home.storyImages[1].large} alt={home.storyImages[1].alt} width={home.storyImages[1].width} height={home.storyImages[1].height} sizes="(max-width: 860px) 60vw, 340px" />}
              <Moon className="story__moon" />
            </div>
          </div>
        </section>

        {home.strip.length > 0 && (
          <section className="look wrap">
            <Reveal as="h2" className="h2">{home.stripHeading}</Reveal>
            <Rail label="Photo gallery">
              {home.strip.map((m, i) => (
                <figure key={m.url} className={`look__fig ${i % 2 ? 'is-low' : ''}`}><Image src={m.card} alt={m.alt} width={m.width} height={m.height} sizes="300px" /></figure>
              ))}
            </Rail>
          </section>
        )}

        {newArrivals.length > 0 && (
          <section className="shelf wrap">
            <div className="shelf__head">
              <Reveal as="h2" className="h2">{home.newHeading}</Reveal>
              <Link to="/collections/new-arrivals" className="more">View all</Link>
            </div>
            <div className="grid grid--4">
              {newArrivals.slice(0, 4).map((p, i) => <ProductCard key={p.handle} p={p} i={i} delay={i * 70} />)}
            </div>
          </section>
        )}

        <section className="closer">
          <Moon className="closer__moon" />
          <Cloud className="closer__cloud" />
          <Sprig className="closer__sprig" />
          <Reveal as="h2" className="closer__title">{closing.map((ln, i) => <Fragment key={i}>{i > 0 && <br />}{ln}</Fragment>)}</Reveal>
          {home.closingButton && <Reveal delay={100}><CTALink to={home.closingButton.url}>{home.closingButton.label}</CTALink></Reveal>}
        </section>
      </div>
    </Page>
  )
}
