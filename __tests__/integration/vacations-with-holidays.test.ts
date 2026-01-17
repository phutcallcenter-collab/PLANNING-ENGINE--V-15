/**
 * Test de Integración: Vacaciones con Feriados
 * 
 * Este test verifica el flujo completo:
 * 1. Se marca un día como feriado desde el planner
 * 2. Se crea una incidencia de VACACIONES
 * 3. Las vacaciones deben excluir el día feriado del conteo
 */

import { resolveIncidentDates } from '@/domain/incidents/resolveIncidentDates'
import { generateMonthDays } from '@/domain/calendar/state'
import { Incident, Representative, CalendarState } from '@/domain/types'

describe('Integration: Vacaciones con Feriados Marcados desde UI', () => {
  const mockRep: Representative = {
    id: 'rep-1',
    name: 'Juan Pérez',
    baseSchedule: {
      0: 'OFF', // Domingo OFF
      1: 'WORKING',
      2: 'WORKING',
      3: 'WORKING',
      4: 'WORKING',
      5: 'WORKING',
      6: 'WORKING',
    },
    baseShift: 'DAY',
  }

  it('Flujo completo: Marcar feriado en UI y calcular vacaciones', () => {
    // PASO 1: Estado inicial del calendario (sin feriados)
    const calendarState: CalendarState = {
      specialDays: []
    }

    // PASO 2: Usuario marca el 15 de enero como feriado desde el planner
    const feriadoAgregado = { 
      date: '2025-01-15', 
      kind: 'HOLIDAY' as const, 
      label: 'Día de MLK' 
    }
    
    // Simular la acción addOrUpdateSpecialDay
    calendarState.specialDays.push(feriadoAgregado)

    // PASO 3: El sistema regenera los días del calendario con el feriado
    const allCalendarDays = [
      ...generateMonthDays(2025, 1, calendarState),
      ...generateMonthDays(2025, 2, calendarState),
    ]

    // Verificar que el feriado está marcado correctamente
    const feriadoDay = allCalendarDays.find(d => d.date === '2025-01-15')
    expect(feriadoDay).toBeDefined()
    expect(feriadoDay?.kind).toBe('HOLIDAY')
    expect(feriadoDay?.isSpecial).toBe(true)
    expect(feriadoDay?.label).toBe('Día de MLK')

    // PASO 4: Se crea una incidencia de vacaciones
    const vacacionesIncident: Incident = {
      id: 'vac-1',
      representativeId: 'rep-1',
      type: 'VACACIONES',
      startDate: '2025-01-10', // Viernes
      duration: 14, // Este valor se ignora para VACACIONES
      createdAt: '2025-01-08T00:00:00Z',
    }

    // PASO 5: El sistema calcula las fechas de las vacaciones
    const result = resolveIncidentDates(
      vacacionesIncident, 
      allCalendarDays, 
      mockRep
    )

    console.log('=== Resultado del Cálculo de Vacaciones ===')
    console.log('Fecha inicio:', result.start)
    console.log('Fecha fin:', result.end)
    console.log('Total días:', result.dates.length)
    console.log('Fechas:', result.dates)

    // VALIDACIONES

    // 1. Debe tener exactamente 14 días laborales
    expect(result.dates.length).toBe(14)

    // 2. NO debe incluir el feriado (2025-01-15)
    expect(result.dates).not.toContain('2025-01-15')
    console.log('✓ El feriado 2025-01-15 fue EXCLUIDO correctamente')

    // 3. NO debe incluir domingos (días base OFF)
    const domingosIncluidos = result.dates.filter(date => {
      const d = new Date(date + 'T00:00:00Z')
      return d.getUTCDay() === 0
    })
    expect(domingosIncluidos.length).toBe(0)
    console.log('✓ Los domingos fueron EXCLUIDOS correctamente')

    // 4. Verificar que la duración calendario es mayor que 14 días
    // porque se saltaron el feriado y los domingos
    const daysDuration = result.dates.length > 0 
      ? Math.ceil(
          (new Date(result.end + 'T00:00:00Z').getTime() - 
           new Date(result.start + 'T00:00:00Z').getTime()) / 
          (1000 * 60 * 60 * 24)
        ) + 1
      : 0
    
    expect(daysDuration).toBeGreaterThan(14)
    console.log(`✓ Duración calendario: ${daysDuration} días (mayor que 14 días laborales)`)
  })

  it('Múltiples feriados: El sistema debe excluir todos los feriados marcados', () => {
    // Usuario marca 3 días como feriados
    const calendarState: CalendarState = {
      specialDays: [
        { date: '2025-01-15', kind: 'HOLIDAY', label: 'Feriado 1' },
        { date: '2025-01-20', kind: 'HOLIDAY', label: 'Feriado 2' },
        { date: '2025-01-27', kind: 'HOLIDAY', label: 'Feriado 3' },
      ]
    }

    const allCalendarDays = [
      ...generateMonthDays(2025, 1, calendarState),
      ...generateMonthDays(2025, 2, calendarState),
    ]

    // Verificar que los 3 feriados están marcados
    const feriados = allCalendarDays.filter(d => d.kind === 'HOLIDAY')
    expect(feriados.length).toBeGreaterThanOrEqual(3)

    const vacacionesIncident: Incident = {
      id: 'vac-2',
      representativeId: 'rep-1',
      type: 'VACACIONES',
      startDate: '2025-01-10',
      duration: 14,
      createdAt: '2025-01-08T00:00:00Z',
    }

    const result = resolveIncidentDates(
      vacacionesIncident,
      allCalendarDays,
      mockRep
    )

    console.log('Fechas de vacaciones con 3 feriados:', result.dates)

    // Debe tener exactamente 14 días laborales
    expect(result.dates.length).toBe(14)

    // NO debe incluir ninguno de los 3 feriados
    expect(result.dates).not.toContain('2025-01-15')
    expect(result.dates).not.toContain('2025-01-20')
    expect(result.dates).not.toContain('2025-01-27')

    console.log('✓ Los 3 feriados fueron EXCLUIDOS correctamente')
  })

  it('Feriado en medio de vacaciones: Se salta y continúa contando', () => {
    // Usuario marca el día 15 como feriado
    const calendarState: CalendarState = {
      specialDays: [
        { date: '2025-02-14', kind: 'HOLIDAY', label: 'San Valentín (feriado especial)' }
      ]
    }

    const allCalendarDays = [
      ...generateMonthDays(2025, 2, calendarState),
      ...generateMonthDays(2025, 3, calendarState),
    ]

    const vacacionesIncident: Incident = {
      id: 'vac-3',
      representativeId: 'rep-1',
      type: 'VACACIONES',
      startDate: '2025-02-10', // Lunes
      duration: 14,
      createdAt: '2025-02-08T00:00:00Z',
    }

    const result = resolveIncidentDates(
      vacacionesIncident,
      allCalendarDays,
      mockRep
    )

    console.log('Vacaciones con feriado en medio:')
    console.log('Inicio:', result.start)
    console.log('Fin:', result.end)
    console.log('Fechas:', result.dates)

    // Verificar que el feriado NO está incluido
    expect(result.dates).not.toContain('2025-02-14')

    // Verificar que el conteo continúa después del feriado
    expect(result.dates.length).toBe(14)

    // Verificar que hay días después del 14 de febrero
    const diasDespues = result.dates.filter(d => d > '2025-02-14')
    expect(diasDespues.length).toBeGreaterThan(0)

    console.log('✓ El feriado fue saltado y el conteo continuó correctamente')
  })

  it('Sin feriados configurados: Comportamiento normal', () => {
    // Calendario sin feriados
    const calendarState: CalendarState = {
      specialDays: []
    }

    const allCalendarDays = [
      ...generateMonthDays(2025, 3, calendarState),
      ...generateMonthDays(2025, 4, calendarState),
    ]

    const vacacionesIncident: Incident = {
      id: 'vac-4',
      representativeId: 'rep-1',
      type: 'VACACIONES',
      startDate: '2025-03-10',
      duration: 14,
      createdAt: '2025-03-08T00:00:00Z',
    }

    const result = resolveIncidentDates(
      vacacionesIncident,
      allCalendarDays,
      mockRep
    )

    // Sin feriados, las vacaciones solo excluyen domingos
    expect(result.dates.length).toBe(14)

    // No debe haber domingos
    const domingos = result.dates.filter(date => {
      const d = new Date(date + 'T00:00:00Z')
      return d.getUTCDay() === 0
    })
    expect(domingos.length).toBe(0)

    console.log('✓ Sin feriados, solo se excluyen los días base OFF (domingos)')
  })
})
