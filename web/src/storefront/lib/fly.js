import gsap from 'gsap'
import { reducedMotion } from './scroll'

// Sends a little photo tile from where the shopper tapped into the bag button.
export function flyToBag(fromEl, src) {
  const bag = document.getElementById('bag-btn')
  if (bag) {
    bag.classList.remove('bump')
    void bag.offsetWidth
    bag.classList.add('bump')
  }
  if (!fromEl || !bag || reducedMotion()) return
  const a = fromEl.getBoundingClientRect()
  const b = bag.getBoundingClientRect()
  const tile = document.createElement('div')
  tile.className = 'fly-tile'
  tile.style.backgroundImage = `url(${src})`
  Object.assign(tile.style, { left: a.left + a.width / 2 - 28 + 'px', top: a.top + a.height / 2 - 28 + 'px' })
  document.body.appendChild(tile)
  const dx = b.left + b.width / 2 - (a.left + a.width / 2)
  const dy = b.top + b.height / 2 - (a.top + a.height / 2)
  gsap.timeline({ onComplete: () => tile.remove() })
    .fromTo(tile, { scale: 0.4, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.18, ease: 'power2.out' })
    .to(tile, { x: dx, duration: 0.8, ease: 'power1.inOut' }, 0.1)
    .to(tile, { y: dy - 90, duration: 0.35, ease: 'power2.out' }, 0.1)
    .to(tile, { y: dy, duration: 0.45, ease: 'power2.in' }, 0.45)
    .to(tile, { scale: 0.25, rotate: 25, duration: 0.8, ease: 'power1.in' }, 0.1)
    .to(tile, { opacity: 0, duration: 0.15 }, 0.78)
}
