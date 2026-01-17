
import { ISODate, DayInfo, CalendarState } from './types'
import { startOfWeek, endOfWeek, addDays, format, getYear, getMonth } from 'date-fns'
import { es } from 'date-fns/locale'
import { generateMonthDays } from './state'

function getMonday(date: ISODate | Date): Date {
  // Use T12:00:00Z to ensure we don't shift day due to timezone on midnight parsing
  const baseDate = typeof date === 'string' ? new Date(date + 'T12:00:00Z') : date
  return startOfWeek(baseDate, { weekStartsOn: 1 }) // 1 = Monday
}

/**
 * Formats a week range into a human-readable string.
 * Handles month and year changes gracefully.
 * e.g., "Semana del 2 al 8 de enero de 2026"
 * e.g., "Semana del 29 de dic al 4 de ene de 2026"
 */
export function formatWeekRange(anchorDate: ISODate): string {
  const date = new Date(anchorDate + 'T12:00:00Z')
  const start = startOfWeek(date, { weekStartsOn: 1 })
  const end = endOfWeek(date, { weekStartsOn: 1 })

  const startMonth = format(start, 'MMMM', { locale: es })
  const endMonth = format(end, 'MMMM', { locale: es })

  if (startMonth === endMonth) {
    const startDay = format(start, 'd')
    const endLabel = format(end, "d 'de' MMMM 'de' yyyy", { locale: es })
    return `Semana del ${startDay} al ${endLabel}`
  } else {
    const startLabel = format(start, "d 'de' MMMM", { locale: es })
    const endLabel = format(end, "d 'de' MMMM 'de' yyyy", { locale: es })
    return `Semana del ${startLabel} al ${endLabel}`
  }
}

export function deriveWeekDays(
  anchorDate: ISODate,
  calendarState: CalendarState
): DayInfo[] {
  const monday = getMonday(anchorDate)
  const year = getYear(monday)
  // getMonth is 0-indexed, so we add 1 for our 1-indexed generateMonthDays
  const month = getMonth(monday) + 1

  // Generate all days for the month containing the anchor date's Monday
  const monthDays = generateMonthDays(year, month, calendarState)

  // If the week spans across two months, we need days from the next month too
  const lastDayOfWeek = addDays(monday, 6)
  if (getMonth(lastDayOfWeek) !== getMonth(monday)) {
    const nextMonthYear = getYear(lastDayOfWeek)
    const nextMonth = getMonth(lastDayOfWeek) + 1
    const nextMonthDays = generateMonthDays(nextMonthYear, nextMonth, calendarState)
    monthDays.push(...nextMonthDays)
  }

  const monthDaysMap = new Map(monthDays.map(d => [d.date, d]))
  const weekDays: DayInfo[] = []

  for (let i = 0; i < 7; i++) {
    const date = addDays(monday, i)
    const isoDate = format(date, 'yyyy-MM-dd')
    const dayInfo = monthDaysMap.get(isoDate)
    if (dayInfo) {
      weekDays.push(dayInfo)
    } else {
      // This should ideally not happen if logic is correct
      console.warn(`Could not find day info for ${isoDate}`)
      // Fallback to deriving base info, though this lacks calendar context
      const fallbackDayInfo: DayInfo = {
        date: isoDate,
        dayOfWeek: date.getDay(),
        kind: 'WORKING', // Safe but potentially incorrect assumption
        isSpecial: false,
      };
      weekDays.push(fallbackDayInfo);
    }
  }

  return weekDays
}

export function getPreviousWeek(anchorDate: ISODate): ISODate {
  const monday = getMonday(anchorDate)
  const prevMonday = addDays(monday, -7)
  return format(prevMonday, 'yyyy-MM-dd')
}

export function getNextWeek(anchorDate: ISODate): ISODate {
  const monday = getMonday(anchorDate)
  const nextMonday = addDays(monday, 7)
  return format(nextMonday, 'yyyy-MM-dd')
}
