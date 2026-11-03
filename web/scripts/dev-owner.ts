// Local testing only: creates an Owner account from DEV_OWNER_EMAIL and DEV_OWNER_PASSWORD.
// In real use the first person to open /admin creates the Owner account on screen.
import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../src/payload.config'

async function main() {
  const email = process.env.DEV_OWNER_EMAIL
  const password = process.env.DEV_OWNER_PASSWORD
  if (!email || !password) throw new Error('Set DEV_OWNER_EMAIL and DEV_OWNER_PASSWORD first.')
  const payload = await getPayload({ config })
  const found = await payload.find({ collection: 'users', where: { email: { equals: email } }, limit: 1 })
  if (found.docs[0]) { console.log('Owner already exists.'); process.exit(0) }
  await payload.create({ collection: 'users', data: { email, password, name: 'Test Owner', role: 'owner' } })
  console.log('Test owner created.')
  process.exit(0)
}
main().catch((e) => { console.error(e); process.exit(1) })
