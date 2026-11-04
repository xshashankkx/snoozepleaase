import { draftMode } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@payload-config'

// Opens the storefront showing saved drafts. Only signed-in staff can switch it on.
export async function GET(req: Request) {
  const path = new URL(req.url).searchParams.get('path') || '/'
  if (!path.startsWith('/') || path.startsWith('//')) return new Response('That address is not allowed.', { status: 400 })

  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: req.headers })
  if (!user) return new Response('Please sign in to the admin first, then open the preview again.', { status: 401 })

  ;(await draftMode()).enable()
  redirect(path)
}
