'use client'

import { useMemo } from 'react'
import {
  addWeeks,
  endOfWeek,
  format,
  eachDayOfInterval,
  isSameWeek,
  parseISO,
} from 'date-fns'
import { es } from 'date-fns/locale'
import { ISODate } from '../domain/types'
import { useAppStore } from '@/store/useAppStore'
import { deriveWeekDays, formatWeekRange } from '@/domain/calendar/week'

function toISODate(date: Date): ISODate {
  return format(date, 'yyyy-MM-dd')
}

/**
 * A pure hook that derives week-related data from a single anchor date.
 * It assumes the anchor date IS the start of the week (Monday).
 */
export function useWeekNavigator(anchorDateISO: ISODate, setAnchorDate: (date: ISODate) => void) {
  const { calendar } = useAppStore(s => ({
    calendar: s.calendar,
  }))

  const weekDays = useMemo(() => {
    return deriveWeekDays(anchorDateISO, calendar)
  }, [anchorDateISO, calendar])
  
  const label = useMemo(() => {
    return formatWeekRange(anchorDateISO)
  }, [anchorDateISO])
  
  const isCurrentWeek = useMemo(
    () => isSameWeek(new Date(), new Date(anchorDateISO + 'T12:00:00'), { weekStartsOn: 1 }),
    [anchorDateISO]
  )

  const handlePrevWeek = () => {
    const newAnchor = addWeeks(new Date(anchorDateISO + 'T12:00:00'), -1)
    setAnchorDate(toISODate(newAnchor))
  }

  const handleNextWeek = () => {
    const newAnchor = addWeeks(new Date(anchorDateISO + 'T12:00:00'), 1)
    setAnchorDate(toISODate(newAnchor))
  }

  const handleGoToday = () => {
    setAnchorDate(toISODate(new Date()))
  }

  return {
    weekStart: anchorDateISO,
    weekDays,
    label,
    isCurrentWeek,
    handlePrevWeek,
    handleNextWeek,
    handleGoToday,
  }
}
