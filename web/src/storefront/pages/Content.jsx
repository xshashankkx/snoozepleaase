import Image from 'next/image'
import { RichText } from '@payloadcms/richtext-lexical/react'
import Page, { Accordion } from '../components/Page'
import ContactForm from '../components/ContactForm'
import { Moon, Cloud } from '../components/Doodles'
import { IconPhone } from '../components/Icons'
import { Link } from '../lib/router'

// Server-rendered content pages: CMS pages (by template), the blog and the events page.

const Rich = ({ data }) => (data ? <div className="prose"><RichText data={data} /></div> : null)
const photo = (m, sizes) => <Image src={m.large} alt={m.alt} width={m.width} height={m.height} sizes={sizes} />

function SizeChartTable({ chart }) {
  const unit = chart.unit === 'in' ? 'inches' : 'centimetres'
  return (
    <div className="tablewrap" tabIndex={0} role="region" aria-label={`${chart.title}, size chart`} data-lenis-prevent-wheel>
      <table>
        <caption>{chart.title}, in {unit}</caption>
        <thead><tr><th scope="col">Size</th><th scope="col">Height</th><th scope="col">Chest</th><th scope="col">Waist</th></tr></thead>
        <tbody>{(chart.rows || []).map((r) => <tr key={r.id || r.label}><th scope="row">{r.label}</th><td>{r.height}</td><td>{r.chest}</td><td>{r.waist}</td></tr>)}</tbody>
      </table>
      {chart.note && <p className="muted small" style={{ padding: '0 1.2rem 1rem' }}>{chart.note}</p>}
    </div>
  )
}

export function CmsPage({ page, settings }) {
  const t = page.template
  const wide = ['about', 'contact', 'size-guide'].includes(t)
  return (
    <Page title={page.title}>
      <article className={`doc wrap doc--${page.slug} ${wide ? 'doc--wide' : ''}`}>
        <header className="doc__head">
          <h1 className="h1">{page.title}</h1>
          {t === 'about' && <Moon className="doc__moon" />}
          {t === 'contact' && <Cloud className="doc__cloud" />}
        </header>
        {page.intro && t !== 'about' && <p className="lede">{page.intro}</p>}

        {t === 'about' && (
          <div className="about__grid">
            <div>{page.intro && <p className="lede">{page.intro}</p>}<Rich data={page.body} /></div>
            {page.photos.length > 0 && (
              <figure className="about__pics">
                {page.photos[0] && photo(page.photos[0], '(max-width: 860px) 60vw, 380px')}
                {page.photos[1] && photo(page.photos[1], '(max-width: 860px) 50vw, 320px')}
              </figure>
            )}
          </div>
        )}

        {t === 'faq' && <Accordion items={page.faqs.map((f) => ({ q: f.question, a: <RichText data={f.answer} /> }))} />}

        {t === 'size-guide' && (<>{page.sizeChart && <SizeChartTable chart={page.sizeChart} />}<Rich data={page.body} /></>)}

        {t === 'contact' && (
          <div className="contact__grid">
            <div>
              <ul className="contact__list">
                {settings.whatsapp && <li><IconPhone width={20} height={20} /> WhatsApp <a href={`https://wa.me/${settings.whatsapp.replace(/\D/g, '')}`}>{settings.whatsapp}</a></li>}
                {settings.email && <li>Email <a href={`mailto:${settings.email}`}>{settings.email}</a></li>}
                {settings.instagram && <li>Instagram <a href={`https://instagram.com/${settings.instagram}`} target="_blank" rel="noreferrer">@{settings.instagram}</a></li>}
                {settings.hours && <li>{settings.hours}</li>}
              </ul>
              <Rich data={page.body} />
            </div>
            <ContactForm />
          </div>
        )}

        {t === 'standard' && <Rich data={page.body} />}
      </article>
    </Page>
  )
}

const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })

export function BlogList({ posts }) {
  return (
    <Page title="Blog">
      <section className="doc wrap doc--wide">
        <header className="doc__head"><h1 className="h1">The Snooze Pleaase blog</h1></header>
        {posts.length === 0 ? <p className="lede">No posts yet. Check back soon.</p> : (
          <ul className="blog__list">
            {posts.map((p) => (
              <li key={p.slug}>
                <Link to={`/blog/${p.slug}`}>
                  {p.cover && <Image src={p.cover.card} alt={p.cover.alt} width={p.cover.width} height={p.cover.height} sizes="(max-width: 700px) 90vw, 360px" />}
                  <h2>{p.title}</h2>
                  <p>{p.excerpt}</p>
                  {p.publishedOn && <small>{fmtDate(p.publishedOn)}</small>}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Page>
  )
}

export function BlogPost({ post }) {
  return (
    <Page title={post.title}>
      <article className="doc wrap">
        <header className="doc__head">
          <h1 className="h1">{post.title}</h1>
          <p className="muted">{[post.author, post.publishedOn && fmtDate(post.publishedOn)].filter(Boolean).join(' · ')}</p>
        </header>
        {post.cover && <figure className="blog__cover">{photo(post.cover, '(max-width: 860px) 95vw, 860px')}</figure>}
        <Rich data={post.body} />
        <p><Link to="/blog" className="more">All posts</Link></p>
      </article>
    </Page>
  )
}

export function EventsList({ events }) {
  const today = new Date().toISOString().slice(0, 10)
  const upcoming = events.filter((e) => String(e.endsOn).slice(0, 10) >= today)
  const past = events.filter((e) => String(e.endsOn).slice(0, 10) < today).reverse()
  const card = (e) => (
    <li key={e.slug}>
      <div className="event__date"><strong>{fmtDate(e.startsOn)}</strong>{String(e.endsOn).slice(0, 10) !== String(e.startsOn).slice(0, 10) && <span>to {fmtDate(e.endsOn)}</span>}</div>
      <div>
        <h2>{e.name}</h2>
        <p>{e.venue}, {e.city}{e.stall ? ` · ${e.stall}` : ''}</p>
        {e.description && <p className="muted">{e.description}</p>}
        {e.link && <a className="more" href={e.link} target="_blank" rel="noreferrer">More details</a>}
      </div>
    </li>
  )
  return (
    <Page title="Find us at events">
      <section className="doc wrap">
        <header className="doc__head"><h1 className="h1">Find us at events</h1></header>
        <p className="lede">Come say hello, feel the fabric and try the sizes in person.</p>
        {upcoming.length === 0 ? <p>No events are planned right now. Follow us on Instagram for the next one.</p> : <ul className="event__list">{upcoming.map(card)}</ul>}
        {past.length > 0 && (<><h2 className="h3" style={{ marginTop: '2.5rem' }}>Past events</h2><ul className="event__list event__list--past">{past.map(card)}</ul></>)}
      </section>
    </Page>
  )
}
