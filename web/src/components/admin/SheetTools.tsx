'use client'
import React, { useRef, useState } from 'react'

type Result = { rows?: number; productsUpdated?: number; errors?: string[]; moreErrors?: number; error?: string }

// Export every size to a spreadsheet, fill in the gaps, and import it back.
export const SheetTools = () => {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [res, setRes] = useState<Result | null>(null)

  const upload = async (file: File) => {
    setBusy(true)
    setRes(null)
    try {
      const r = await fetch('/api/products/import-sheet', { method: 'POST', credentials: 'include', body: await file.text() })
      setRes(await r.json())
    } catch {
      setRes({ error: 'The upload failed. Check your connection and try again.' })
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }

  const btn: React.CSSProperties = {
    display: 'inline-block', padding: '0.55rem 1.1rem', borderRadius: 999, border: '2px solid var(--theme-elevation-800)',
    background: 'transparent', color: 'var(--theme-text)', fontWeight: 700, cursor: 'pointer', textDecoration: 'none', font: 'inherit',
  }

  return (
    <div style={{ margin: '0 0 1.5rem', padding: '1rem 1.2rem', border: '1px dashed var(--theme-elevation-300)', borderRadius: 12 }}>
      <strong style={{ display: 'block', marginBottom: 4 }}>Fill in SKUs, barcodes, weights and box sizes in bulk</strong>
      <p style={{ margin: '0 0 0.8rem', maxWidth: '70ch' }}>
        Export every size as a spreadsheet, fill in the blanks in Excel or Google Sheets, then import it back. Blank cells are left as they are.
      </p>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <a href="/api/products/export-sheet" style={btn} download>Download spreadsheet</a>
        <button type="button" style={btn} disabled={busy} onClick={() => input.current?.click()}>{busy ? 'Importing…' : 'Import spreadsheet'}</button>
        <input ref={input} type="file" accept=".csv,text/csv" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
      </div>
      {res && (
        <div role="status" style={{ marginTop: '0.9rem' }}>
          {res.error ? <p style={{ color: 'var(--theme-error-500)' }}>{res.error}</p> : (
            <p><strong>{res.productsUpdated}</strong> products updated from {res.rows} rows. Changes are saved as drafts.</p>
          )}
          {!!res.errors?.length && (
            <ul style={{ color: 'var(--theme-error-500)', margin: 0, paddingLeft: '1.2rem' }}>
              {res.errors.map((e) => <li key={e}>{e}</li>)}
              {!!res.moreErrors && <li>…and {res.moreErrors} more.</li>}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
