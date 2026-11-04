import Link from 'next/link'
import Page from '@/storefront/components/Page'
import { Cloud } from '@/storefront/components/Doodles'

export default function NotFound() {
  return (
    <Page title="Page not found">
      <div className="empty wrap">
        <Cloud className="empty__cloud" style={undefined} />
        <h1 className="h1">This page is off dreaming</h1>
        <p>The link may be old or mistyped.</p>
        <Link href="/" className="btn btn--yellow">Back home</Link>
      </div>
    </Page>
  )
}
