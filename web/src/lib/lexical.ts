// Tiny Markdown to Lexical converter, used only to load existing text into the CMS.
// Supports "## heading", "- bullet", paragraphs, **bold** and [text](url).

const base = { version: 1, direction: 'ltr' as const, format: '' as const, indent: 0 }
const text = (t: string, bold = false) => ({ type: 'text', version: 1, text: t, detail: 0, format: bold ? 1 : 0, mode: 'normal', style: '' })

function inline(src: string) {
  const out: any[] = []
  const re = /\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)]+)\)/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(src))) {
    if (m.index > last) out.push(text(src.slice(last, m.index)))
    if (m[1]) out.push(text(m[1], true))
    else out.push({ type: 'link', ...base, version: 3, fields: { linkType: 'custom', url: m[3], newTab: false }, children: [text(m[2])] })
    last = m.index + m[0].length
  }
  if (last < src.length) out.push(text(src.slice(last)))
  return out.length ? out : [text('')]
}

const paragraph = (s: string) => ({ type: 'paragraph', ...base, textFormat: 0, textStyle: '', children: inline(s) })

export function mdToLexical(md: string) {
  const blocks: any[] = []
  let bullets: any[] = []
  const flush = () => {
    if (!bullets.length) return
    blocks.push({ type: 'list', ...base, listType: 'bullet', start: 1, tag: 'ul', children: bullets })
    bullets = []
  }
  for (const raw of md.split('\n')) {
    const line = raw.trim()
    if (!line) { flush(); continue }
    if (line.startsWith('## ')) { flush(); blocks.push({ type: 'heading', ...base, tag: 'h2', children: inline(line.slice(3)) }) }
    else if (/^[-*]\s/.test(line)) bullets.push({ type: 'listitem', ...base, value: bullets.length + 1, children: inline(line.slice(2)) })
    else { flush(); blocks.push(paragraph(line)) }
  }
  flush()
  return { root: { type: 'root', ...base, children: blocks.length ? blocks : [paragraph('')] } }
}
