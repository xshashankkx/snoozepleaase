// @ts-nocheck
// Checks the rules the admin enforces when someone sets up an offer. Cleans up after itself.
import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../src/payload.config'

async function main() {
  const payload = await getPayload({ config })
  const made: number[] = []
  let pass = 0, fail = 0
  const must = async (name: string, data: any, expect: 'ok' | RegExp) => {
    try {
      const d = await payload.create({ collection: 'discounts', data: { title: 'ZZ ' + name, method: 'automatic', type: 'percentage', value: 5, ...data } })
      made.push(d.id)
      const ok = expect === 'ok'
      ok ? pass++ : fail++
      console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : '  (was allowed)'}`)
      return d
    } catch (e: any) {
      const ok = expect !== 'ok' && expect.test(String(e.message))
      ok ? pass++ : fail++
      console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : '  -> ' + String(e.message).slice(0, 90)}`)
    }
  }
  try {
    await must('percentage over 100', { value: 150 }, /between 1 and 100/)
    await must('percentage of zero', { value: 0 }, /between 1 and 100/)
    await must('flat amount of zero', { type: 'flat', value: 0 }, /above 0/)
    await must('code offer with no code', { method: 'code' }, /code shoppers will type/)
    await must('categories offer with none chosen', { appliesTo: 'categories' }, /Choose at least one category/)
    await must('products offer with none chosen', { appliesTo: 'products' }, /Choose at least one product/)
    await must('ends before it starts', { startsAt: '2027-02-02T00:00:00Z', endsAt: '2027-02-01T00:00:00Z' }, /end date must be after/)
    await must('buy x get y with zero', { type: 'buy_x_get_y', buy: { buyQty: 0, getQty: 1, getPercent: 100 } }, /at least 1/)
    await must('buy x get y with 150% off', { type: 'buy_x_get_y', buy: { buyQty: 2, getQty: 1, getPercent: 150 } }, /between 1% and 100%/)
    await must('headline sale that needs a code', { method: 'code', code: 'ZZHEAD', headline: { showInHeader: true } }, /automatic offer/)
    await must('second headline sale while one is live', { active: true, headline: { showInHeader: true } }, /already the headline sale/)
    const a = await must('a good code, typed messily', { method: 'code', code: ' zz test1 ', active: false }, 'ok')
    if (a) console.log(`      stored as: ${a.code}`, a.code === 'ZZTEST1' ? '(PASS)' : '(FAIL)')
    await must('the same code twice', { method: 'code', code: 'zztest1' }, /unique|already|duplicate|invalid/i)
    const live = await must('a live offer reports Live', { active: true }, 'ok')
    const off = await must('a switched-off offer reports Off', { active: false }, 'ok')
    const future = await must('a future offer reports Scheduled', { active: true, startsAt: new Date(Date.now() + 864e5).toISOString() }, 'ok')
    const ended = await must('a finished offer reports Ended', { active: true, endsAt: new Date(Date.now() - 864e5).toISOString() }, 'ok')
    const status = async (d) => d && (await payload.findByID({ collection: 'discounts', id: d.id })).liveStatus
    const got = [await status(live), await status(off), await status(future), await status(ended)]
    const want = ['Live', 'Off', 'Scheduled', 'Ended']
    JSON.stringify(got) === JSON.stringify(want) ? pass++ : fail++
    console.log(`${JSON.stringify(got) === JSON.stringify(want) ? 'PASS' : 'FAIL'}  statuses ${got.join(', ')}`)
  } finally {
    for (const id of made) await payload.delete({ collection: 'discounts', id }).catch(() => {})
  }
  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
}
main().catch((e) => { console.error(e); process.exit(1) })
