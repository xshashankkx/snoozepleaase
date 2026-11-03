import React from 'react'

// Shows "Ready" or "Needs details" in the products list instead of true / false.
export const ReadyCell = ({ cellData }: { cellData?: boolean }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
    <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: '50%', background: cellData ? '#2e9d5b' : '#e0a800' }} />
    {cellData ? 'Ready' : 'Needs details'}
  </span>
)
