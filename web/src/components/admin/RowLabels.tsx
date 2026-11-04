'use client'
import React from 'react'
import { useRowLabel } from '@payloadcms/ui'

// Show a meaningful name on each collapsed row instead of "Item 01".
const make = (field: string, fallback: string) => {
  const Label = () => {
    const { data, rowNumber } = useRowLabel<Record<string, unknown>>()
    const v = data?.[field]
    return <span>{typeof v === 'string' && v.trim() ? v : `${fallback} ${String((rowNumber ?? 0) + 1)}`}</span>
  }
  return Label
}

export const StageLabel = make('label', 'Stage')
export const QuestionLabel = make('question', 'Question')
export const LinkLabel = make('label', 'Link')
export const ColumnLabel = make('heading', 'Column')
export const PromiseLabel = make('title', 'Promise')
export const MessageLabel = make('text', 'Message')
