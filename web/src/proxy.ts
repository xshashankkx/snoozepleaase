import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// payload-totp needs the current path to avoid an endless redirect during two-factor setup.
export function proxy(request: NextRequest) {
  const response = NextResponse.next()
  response.headers.append('x-pathname', request.nextUrl.pathname)
  return response
}
