
// src/hooks/useMonthlyDetail.ts
import { useMemo, useState, useEffect } from 'react'
import { addMonths, parseISO, format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { PersonMonthlySummary } from '@/domain/analytics/types'

type UseMonthlyDetailArgs = {
  personSummary: PersonMonthlySummary | null
  month: string // YYYY-MM format
}

/**
 * Hook to manage the state of the visible month in the detail modal.
 * It handles the base month, navigation offset, and provides formatted labels.
 */
export function useMonthlyDetail({ personSummary, month }: UseMonthlyDetailArgs) {
  // The base month is derived from the initial summary passed to the modal.
  const baseMonth = useMemo(() => {
    if (!month) return null
    // The month is in 'YYYY-MM' format, so we append '-01' to make it a valid ISO date.
    return parseISO(`${month}-01`)
  }, [month])

  // The offset is a simple number that represents how many months
  // the user has navigated away from the base month.
  const [offset, setOffset] = useState(0)

  // The currently visible month is calculated by applying the offset to the base month.
  const visibleMonth = useMemo(() => {
    if (!baseMonth) return null
    return addMonths(baseMonth, offset)
  }, [baseMonth, offset])

  // A formatted, human-readable label for the visible month.
  const monthLabel = useMemo(() => {
    if (!visibleMonth) return ''
    return format(visibleMonth, 'MMMM yyyy', { locale: es })
  }, [visibleMonth])

  // When the person being viewed changes, the offset must be reset to 0
  // to ensure the calendar starts at the correct base month.
  useEffect(() => {
    setOffset(0)
  }, [personSummary?.representativeId])

  return {
    month: visibleMonth,
    monthLabel,
    goPrev: () => setOffset(o => o - 1),
    goNext: () => setOffset(o => o + 1),
    reset: () => setOffset(0),
  }
}
