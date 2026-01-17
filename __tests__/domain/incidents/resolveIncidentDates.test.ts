import { resolveIncidentDates } from '@/domain/incidents/resolveIncidentDates'
import { Incident, Representative, DayInfo } from '@/domain/types'

describe('resolveIncidentDates - Holiday Handling', () => {
  const mockRep: Representative = {
    id: 'rep-1',
    name: 'Test Rep',
    baseSchedule: {
      0: 'OFF', // Sunday OFF
      1: 'WORKING',
      2: 'WORKING',
      3: 'WORKING',
      4: 'WORKING',
      5: 'WORKING',
      6: 'WORKING',
    },
    baseShift: 'DAY',
  }

  const createCalendarDays = (startDate: string, count: number, holidays: string[] = []): DayInfo[] => {
    const days: DayInfo[] = []
    const start = new Date(startDate + 'T00:00:00Z')
    
    for (let i = 0; i < count; i++) {
      const date = new Date(start)
      date.setUTCDate(start.getUTCDate() + i)
      const isoDate = date.toISOString().split('T')[0]
      
      days.push({
        date: isoDate,
        dayOfWeek: date.getUTCDay(),
        kind: holidays.includes(isoDate) ? 'HOLIDAY' : 'WORKING',
        isSpecial: holidays.includes(isoDate),
      })
    }
    
    return days
  }

  it('VACACIONES debe saltar días feriados', () => {
    // Crear calendario con 30 días, incluyendo 2 feriados
    const holidays = ['2025-01-15', '2025-01-20']
    const calendarDays = createCalendarDays('2025-01-10', 30, holidays)
    
    const incident: Incident = {
      id: 'vac-1',
      representativeId: 'rep-1',
      type: 'VACACIONES',
      startDate: '2025-01-10', // Viernes
      duration: 14, // This value should be ignored for VACACIONES
      createdAt: '2025-01-01T00:00:00Z',
    }

    const result = resolveIncidentDates(incident, calendarDays, mockRep)

    console.log('Fechas resultantes:', result.dates)
    console.log('Total de días:', result.dates.length)
    console.log('Fecha inicio:', result.start)
    console.log('Fecha fin:', result.end)
    
    // VACACIONES debe contar 14 días LABORALES
    // Saltando: Domingos (día base OFF) y feriados
    expect(result.dates.length).toBe(14)
    
    // Verificar que NO incluye los feriados
    expect(result.dates).not.toContain('2025-01-15')
    expect(result.dates).not.toContain('2025-01-20')
    
    // Verificar que NO incluye los domingos (día base OFF)
    expect(result.dates).not.toContain('2025-01-12') // Domingo
    expect(result.dates).not.toContain('2025-01-19') // Domingo
  })

  it('VACACIONES debe contar solo días que NO sean feriados ni días base OFF', () => {
    const holidays = ['2025-02-01', '2025-02-05'] // 2 feriados
    const calendarDays = createCalendarDays('2025-02-01', 30, holidays)
    
    const incident: Incident = {
      id: 'vac-2',
      representativeId: 'rep-1',
      type: 'VACACIONES',
      startDate: '2025-02-01', // Sábado (día laboral para este rep)
      duration: 14,
      createdAt: '2025-01-01T00:00:00Z',
    }

    const result = resolveIncidentDates(incident, calendarDays, mockRep)
    
    console.log('Fechas de vacaciones:', result.dates)
    
    // Debe tener exactamente 14 días laborales
    expect(result.dates.length).toBe(14)
    
    // No debe incluir los feriados
    expect(result.dates).not.toContain('2025-02-01') // Feriado
    expect(result.dates).not.toContain('2025-02-05') // Feriado
    
    // No debe incluir domingos (día base OFF)
    const domingos = result.dates.filter(date => {
      const d = new Date(date + 'T00:00:00Z')
      return d.getUTCDay() === 0
    })
    expect(domingos.length).toBe(0)
  })

  it('LICENCIA debe contar TODOS los días calendario (incluyendo feriados)', () => {
    const holidays = ['2025-03-05']
    const calendarDays = createCalendarDays('2025-03-01', 30, holidays)
    
    const incident: Incident = {
      id: 'lic-1',
      representativeId: 'rep-1',
      type: 'LICENCIA',
      startDate: '2025-03-01',
      duration: 7,
      createdAt: '2025-01-01T00:00:00Z',
    }

    const result = resolveIncidentDates(incident, calendarDays, mockRep)
    
    // LICENCIA debe contar 7 días consecutivos, sin importar si son feriados
    expect(result.dates.length).toBe(7)
    
    // DEBE incluir el feriado
    expect(result.dates).toContain('2025-03-05')
  })

  it('VACACIONES - Caso real con feriados dominicanos 2025', () => {
    // Crear calendario con feriados reales de República Dominicana
    const holidays = [
      '2025-01-01', // Año Nuevo
      '2025-01-06', // Reyes Magos
      '2025-01-21', // Altagracia
      '2025-01-26', // Duarte
    ]
    const calendarDays = createCalendarDays('2025-01-02', 60, holidays)
    
    const incident: Incident = {
      id: 'vac-real',
      representativeId: 'rep-1',
      type: 'VACACIONES',
      startDate: '2025-01-02', // Jueves
      duration: 14,
      createdAt: '2025-01-01T00:00:00Z',
    }

    const result = resolveIncidentDates(incident, calendarDays, mockRep)
    
    console.log('Caso real - Fechas de vacaciones:', result.dates)
    console.log('Caso real - Inicio:', result.start, 'Fin:', result.end)
    
    // Debe tener exactamente 14 días laborales
    expect(result.dates.length).toBe(14)
    
    // NO debe incluir feriados
    expect(result.dates).not.toContain('2025-01-06')  // Reyes Magos
    expect(result.dates).not.toContain('2025-01-21') // Altagracia
    expect(result.dates).not.toContain('2025-01-26') // Duarte
    
    // NO debe incluir domingos (días base OFF)
    const domingos = result.dates.filter(date => {
      const d = new Date(date + 'T00:00:00Z')
      return d.getUTCDay() === 0
    })
    expect(domingos.length).toBe(0)
    
    // Verificar que la fecha final es posterior a startDate + 14 días
    // (porque se saltaron feriados y domingos)
    const startDate = new Date('2025-01-02T00:00:00Z')
    const endDate = new Date(result.end + 'T00:00:00Z')
    const daysDifference = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    
    // Debe ser mayor a 14 porque se saltaron días
    expect(daysDifference).toBeGreaterThan(14)
  })
})
