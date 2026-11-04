// @ts-nocheck
// Checks the content rules and permissions with a throwaway Store manager. Cleans up after itself.
import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../src/payload.config'
import { mdToLexical } from '../src/lib/lexical'

async function main() {
  const payload = await getPayload({ config })
  const mgr = await payload.create({ collection: 'users', data: { email: 'content-check@snoozepleaase.test', password: 'Check-' + Math.random().toString(36).slice(2) + 'A1!', name: 'Content Check', role: 'manager' } })
  const as = { user: { ...mgr, collection: 'users' } as any, overrideAccess: false }
  const results: [string, string][] = []
  const created: { collection: string; id: number }[] = []
  const expectFail = async (name: string, fn: () => Promise<unknown>) => {
    try { await fn(); results.push([name, 'ALLOWED (bad)']) } catch (e: any) { results.push([name, 'blocked: ' + String(e.message).replace(/\s+/g, ' ').slice(0, 70)]) }
  }
  const expectOk = async (name: string, fn: () => Promise<any>) => {
    try { const r = await fn(); results.push([name, 'ok']); return r } catch (e: any) { results.push([name, 'FAILED (bad): ' + String(e.message).slice(0, 80)]) }
  }
  try {
    // Permissions
    await expectFail('manager edits Site settings', () => payload.updateGlobal({ slug: 'site-settings', data: { tagline: 'x' }, ...as }))
    const orig: any = await payload.findGlobal({ slug: 'announcement', depth: 0, draft: true })
    await expectOk('manager edits Announcement bar', () => payload.updateGlobal({ slug: 'announcement', data: { bar: { enabled: false, text: 'Check' } }, draft: true, ...as }))

    // Validation
    await expectFail('event ending before it starts', () => payload.create({ collection: 'events', data: { name: 'Bad Event', startsOn: '2027-03-05', endsOn: '2027-03-01', venue: 'V', city: 'C' }, ...as }))
    await expectFail('age stages with the same code', () => payload.updateGlobal({ slug: 'age-step', data: { heading: 'x', stages: [
      { label: 'A', plural: 'As', key: 'dup', agesLabel: '1–2', ageFrom: 1, ageTo: 2 }, { label: 'B', plural: 'Bs', key: 'dup', agesLabel: '3–4', ageFrom: 3, ageTo: 4 }] }, ...as }))
    await expectFail('age stage with from above to', () => payload.updateGlobal({ slug: 'age-step', data: { heading: 'x', stages: [
      { label: 'A', plural: 'As', key: 'a', agesLabel: '5–2', ageFrom: 5, ageTo: 2 }, { label: 'B', plural: 'Bs', key: 'b', agesLabel: '3–4', ageFrom: 3, ageTo: 4 }] }, ...as }))
    await expectFail('menu link without a slash or https', () => payload.updateGlobal({ slug: 'navigation', data: { header: [{ label: 'Oops', url: 'collections/all' }], footer: [] }, ...as }))
    const post: any = await expectOk('blog post saves as a draft', () => payload.create({ collection: 'posts', data: { title: 'Check Post Title' }, draft: true, ...as }))
    if (post) {
      created.push({ collection: 'posts', id: post.id })
      results.push(['  slug made from title', post.slug === 'check-post-title' ? 'ok' : `wrong: ${post.slug}`])
      await expectFail('publish a post with no cover image', () => payload.update({ collection: 'posts', id: post.id, data: { _status: 'published', excerpt: 'Summary' }, ...as }))
    }
    const faq: any = await expectOk('FAQ page saves as a draft with no questions', () => payload.create({ collection: 'pages', data: { title: 'Check FAQ', template: 'faq' }, draft: true, ...as }))
    if (faq) {
      created.push({ collection: 'pages', id: faq.id })
      await expectFail('publish an FAQ with no questions', () => payload.update({ collection: 'pages', id: faq.id, data: { _status: 'published' }, ...as }))
    }
    await expectFail('second page with an existing address', () => payload.create({ collection: 'pages', data: { title: 'Another', slug: 'about-us', template: 'standard', _status: 'published' }, ...as }))

    // Scheduled publish is configured
    const sched = (payload.config.collections.find((c) => c.slug === 'pages')?.versions as any)?.drafts?.schedulePublish
    results.push(['schedule publish enabled on pages', sched ? 'ok' : 'MISSING'])
    const jobs = (payload.config.jobs as any)?.autoRun
    results.push(['background job runner configured', jobs?.length ? 'ok' : 'MISSING'])

    // restore announcement draft
    await payload.updateGlobal({ slug: 'announcement', data: { bar: orig.bar }, draft: true })
  } finally {
    for (const c of created) await payload.delete({ collection: c.collection as any, id: c.id }).catch(() => {})
    await payload.delete({ collection: 'users', id: mgr.id })
  }
  for (const [k, v] of results) console.log(`${v.startsWith('ok') ? 'PASS' : v.startsWith('blocked') ? 'PASS' : 'FAIL'}  ${k}  ->  ${v}`)
  process.exit(0)
}
main().catch((e) => { console.error(e); process.exit(1) })
