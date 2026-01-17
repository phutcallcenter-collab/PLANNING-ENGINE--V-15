'use client'

import React from 'react'
import type { DayInfo } from '../../domain/types'

export function CalendarDayEditor({
  day,
  onEdit,
}: {
  day: DayInfo
  onEdit: (day: DayInfo) => void
}) {
  const isHoliday = day.kind === 'HOLIDAY'

  return (
    <div
      onClick={() => onEdit(day)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        minHeight: '50px',
        cursor: 'pointer',
        padding: '4px',
        borderRadius: '6px',
        transition: 'background 0.2s ease',
      }}
      className="day-editor-hover"
    >
      <div
        className="day-label"
        style={{
          fontWeight: 600,
          color: isHoliday ? 'hsl(50, 20%, 25%)' : 'white',
        }}
      >
        {new Date(day.date + 'T12:00:00Z').toLocaleDateString('es-ES', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        })}
      </div>
      <div
        style={{
          fontSize: '11px',
          color: day.isSpecial
            ? isHoliday
              ? 'hsl(50, 20%, 25%)'
              : 'hsl(280, 50%, 40%)'
            : '#ccc',
          minHeight: '14px',
          fontWeight: day.isSpecial ? 600 : 400,
        }}
      >
        {day.label ?? ''}
      </div>
      <div
        style={{
          marginTop: 'auto',
          fontSize: '10px',
          color: '#888',
          opacity: 0,
        }}
        className="edit-label"
      >
        Editar
      </div>
      <style jsx>{`
        .day-editor-hover {
          color: #333;
        }
        .day-editor-hover .day-label {
          /* Default color for light backgrounds, overridden by parent */
          color: #333;
        }
        div:global(.dark-header) .day-editor-hover .day-label {
          color: white;
        }
        div:global(.dark-header) .day-editor-hover {
          color: #eee;
        }

        .day-editor-hover:hover {
          background: rgba(255, 255, 255, 0.1);
        }
        .day-editor-hover:hover .edit-label {
          opacity: 1;
        }
      `}</style>
    </div>
  )
}
