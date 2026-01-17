'use client'

import {
  format,
  startOfMonth,
  getDay,
  getDaysInMonth,
  isSameDay,
} from 'date-fns'
import clsx from 'clsx'
import React from 'react'

export type DayVisualType =
  | 'ABSENT'
  | 'VACATION'
  | 'LICENSE'
  | 'HOLIDAY'
  | 'SHIFT_CHANGE'
  | 'NORMAL'

export type CalendarDay = {
  date: Date
  state: 'normal' | 'warning' | 'danger' | 'disabled'
  visualType?: DayVisualType // New: visual hierarchy layer
}

export type CalendarProps = {
  month: Date
  days: CalendarDay[]
  selected?: Date | null
  onSelect: (date: Date) => void
}

export function CalendarGrid({
  month,
  days,
  selected,
  onSelect,
}: CalendarProps) {
  const start = startOfMonth(month)
  const daysInMonth = getDaysInMonth(month)

  const offset = (getDay(start) + 6) % 7 // Monday = 0
  const totalCells = Math.ceil((offset + daysInMonth) / 7) * 7

  const map = new Map(days.map(d => [format(d.date, 'yyyy-MM-dd'), d]))

  return (
    <>
      <style jsx>{`
        .calendar {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .calendar-header,
        .calendar-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 6px;
        }
        
        .day-label {
          text-align: center;
          padding: 8px 0;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          color: #6b7280;
        }

        .day {
          text-align: center;
          padding: 8px 0;
          border-radius: 8px;
          font-size: 14px;
          background: #f9fafb;
          cursor: pointer;
          border: 1px solid transparent;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s ease;
        }

        .day:hover {
          background: #f1f5f9;
        }

        /* Visual hierarchy layers (priority order) */
        .day[data-visual="ABSENT"] {
          background: hsl(0, 85%, 90%);
          color: hsl(0, 60%, 30%);
          font-weight: 600;
        }

        .day[data-visual="VACATION"] {
          background: hsl(195, 70%, 94%);
          color: hsl(195, 40%, 30%);
        }

        .day[data-visual="LICENSE"] {
          background: hsl(260, 55%, 95%);
          color: hsl(260, 35%, 35%);
        }

        .day[data-visual="HOLIDAY"] {
          background: hsl(45, 90%, 92%);
          color: hsl(45, 50%, 30%);
        }

        .day[data-visual="SHIFT_CHANGE"] {
          border-bottom: 2px solid hsl(220, 15%, 75%);
        }

        .day[data-visual="NORMAL"] {
          background: transparent;
          color: hsl(220, 15%, 35%);
        }

        /* Legacy states (fallback) */
        .day.warning {
          background: #fff7d6;
          color: #92400e;
        }

        .day.danger {
          background: #fee2e2;
          color: #991b1b;
        }

        .day.disabled {
          background: #f3f4f6;
          color: #d1d5db;
          cursor: default;
          opacity: 0.5;
        }

        .day.selected {
          outline: 2px solid #2563eb;
          border-color: #2563eb;
        }

        .day.empty {
          background: transparent;
          pointer-events: none;
        }
      `}</style>
      <div className="calendar">
        <div className="calendar-header">
          {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => (
            <div key={d} className="day-label">
              {d}
            </div>
          ))}
        </div>

        <div className="calendar-grid">
          {Array.from({ length: totalCells }).map((_, i) => {
            const dayIndex = i - offset + 1
            if (dayIndex < 1 || dayIndex > daysInMonth)
              return <div key={i} className="day empty" />

            const date = new Date(
              month.getFullYear(),
              month.getMonth(),
              dayIndex
            )

            const key = format(date, 'yyyy-MM-dd')
            const data = map.get(key)

            return (
              <button
                key={key}
                className={clsx(
                  'day',
                  data?.state,
                  selected && isSameDay(selected, date) && 'selected'
                )}
                data-visual={data?.visualType || 'NORMAL'}
                onClick={() => onSelect(date)}
              >
                {dayIndex}
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
}
