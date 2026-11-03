let lenis = null
export const setLenis = (l) => { lenis = l }
export const lockScroll = () => lenis?.stop()
export const unlockScroll = () => lenis?.start()
export const scrollTop = () => (lenis ? lenis.scrollTo(0, { immediate: true, force: true }) : window.scrollTo(0, 0))
export const reducedMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
