import type { Metadata } from 'next'
import { EventsList } from '@/storefront/pages/Content'
import { getEvents, isPreview } from '@/lib/cms'

export const metadata: Metadata = { title: 'Find us at events', description: 'Meet Snooze Pleaase at fairs and pop-ups near you.' }

export default async function EventsPage() {
  return <EventsList events={await getEvents(await isPreview())} />
}
