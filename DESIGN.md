# Design

## Color
- Royal blue `#0e3dc4` carries Home and Shop (Drenched). It deepens toward midnight `#06185a` as you scroll the home page (`--sky-t`).
- Kraft `#d8b07a` (boxes, tape, tags), cream `#fbf4e4` (paper pages), navy `#101f5a` (ink on kraft, button outlines).
- Accents: yellow `#ffd83d` (primary action), pink `#ffa3ba` (alternate action, tags). Secondary text on blue is `#d4e0ff`.

## Type
- Display: Grandstander (variable, 800–900) for headings.
- Hand: Patrick Hand for box titles, nav, prices and tags.
- Body: Nunito (variable). Self-hosted via @fontsource.

## Components
- **Box** (`BoxFrame`): kraft gift box sized in container-query units; title on the lid, product behind a cut-out window, per-theme doodles (sea, jungle, fruit, sky, night), pointer tilt.
- **Buttons**: pill, 2.5px navy outline, soft shadow, hover lifts and tilts. Yellow and pink alternate down a grid.
- **Chips**: pill outlines; selected is yellow on blue pages and blue on paper pages.
- **Drawer, search, menu**: cream panels over a navy scrim; the mobile menu opens with a circular clip.

## Motion
One authored world: hero words rise, doodles pop and drift with scroll and pointer, the sky darkens with scroll, boxes tilt, a photo tile flies into the bag, and a View Transition carries the box into the product page. Reduced motion turns it all off.
