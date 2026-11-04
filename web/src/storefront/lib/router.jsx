'use client'
// A thin adapter so the storefront components, written for React Router, run on the Next.js router.
import NextLink from 'next/link'
import { useCallback, useMemo } from 'react'
import { usePathname, useRouter, useParams, useSearchParams as useNextSearchParams } from 'next/navigation'

export function Link({ to, href, ...rest }) {
  return <NextLink href={to ?? href} {...rest} />
}

export function NavLink({ to, className = '', children, ...rest }) {
  const pathname = usePathname()
  const active = pathname === to || pathname.startsWith(to + '/')
  return (
    <NextLink href={to} className={`${className} ${active ? 'active' : ''}`.trim()} aria-current={active ? 'page' : undefined} {...rest}>
      {children}
    </NextLink>
  )
}

export function useNavigate() {
  const router = useRouter()
  return useCallback((to, opts) => (opts?.replace ? router.replace(to) : router.push(to)), [router])
}

export const useLocation = () => ({ pathname: usePathname() })

export { useParams }

// Same shape as React Router: [params, setParams(next, { replace })].
export function useSearchParams() {
  const sp = useNextSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const params = useMemo(() => new URLSearchParams(sp.toString()), [sp])
  const set = useCallback((next, opts) => {
    const q = (next instanceof URLSearchParams ? next : new URLSearchParams(next)).toString()
    const url = q ? `${pathname}?${q}` : pathname
    if (opts?.replace) router.replace(url, { scroll: false })
    else router.push(url, { scroll: false })
  }, [router, pathname])
  return [params, set]
}
