import { ISODate, DayInfo, DayKind, CalendarState } from './types'
import { getDay } from 'date-fns'

function getDayKind(dayOfWeek: number): DayKind {
  // En un call center, todos los días son potencialmente laborables.
  // Un feriado es una condición especial, no un día no laborable.
  return 'WORKING'
}

function deriveBaseDayInfo(date: ISODate): DayInfo {
  const [year, month, day] = date.split('-').map(Number)
  const dayOfWeek = getDay(new Date(year, month - 1, day))

  return {
    date,
    dayOfWeek,
    kind: getDayKind(dayOfWeek),
    isSpecial: false, // by default, no day is special
  }
}

function applyCalendarOverrides(
  monthDays: DayInfo[],
  calendarState: CalendarState
): DayInfo[] {
  const specialDaysMap = new Map(
    calendarState.specialDays.map(d => [d.date, d])
  )

  return monthDays.map(day => {
    const specialDay = specialDaysMap.get(day.date)
    if (!specialDay) {
      return day
    }

    // If a special day is found, its properties override the base day
    return {
      ...day,
      ...specialDay,
      isSpecial: true,
    }
  })
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

function buildISODate(year: number, month: number, day: number): ISODate {
  const pad = (v: number) => v.toString().padStart(2, '0')
  return `${year}-${pad(month)}-${pad(day)}`
}

export function generateMonthDays(
  year: number,
  month: number, // 1-12
  calendarState: CalendarState
): DayInfo[] {
  const totalDays = getDaysInMonth(year, month)
  const baseDays: DayInfo[] = []

  for (let day = 1; day <= totalDays; day++) {
    const date = buildISODate(year, month, day)
    baseDays.push(deriveBaseDayInfo(date))
  }

  // Apply the holidays and special days from the calendar state
  const finalDays = applyCalendarOverrides(baseDays, calendarState)

  return finalDays
}
