import { buildWeeklySchedule } from './buildWeeklySchedule'
import type { DayInfo, Representative, Incident } from '../types'

describe('buildWeeklySchedule – reglas de planificación', () => {
  const baseAgents: Representative[] = [
    {
      id: 'a1',
      name: 'Ana',
      baseShift: 'DAY',
      baseSchedule: { 1: 'WORKING' }, // Works Monday
    },
    {
      id: 'a2',
      name: 'Luis',
      baseShift: 'DAY',
      baseSchedule: { 1: 'WORKING' }, // Works Monday
    },
    {
      id: 'a3',
      name: 'Eva',
      baseShift: 'DAY',
      baseSchedule: { 1: 'WORKING' }, // Works Monday
    },
  ]

  const monday: DayInfo = {
    date: '2024-04-01',
    dayOfWeek: 1, // Monday
    kind: 'WORKING',
    isSpecial: false,
  }

  const saturday: DayInfo = {
    date: '2024-04-06',
    dayOfWeek: 6, // Saturday
    kind: 'WORKING',
    isSpecial: false,
  }

  const week = [
    monday,
    { date: '2024-04-02', dayOfWeek: 2, kind: 'WORKING', isSpecial: false },
    { date: '2024-04-03', dayOfWeek: 3, kind: 'WORKING', isSpecial: false },
    { date: '2024-04-04', dayOfWeek: 4, kind: 'WORKING', isSpecial: false },
    { date: '2024-04-05', dayOfWeek: 5, kind: 'WORKING', isSpecial: false },
    saturday,
    { date: '2024-04-07', dayOfWeek: 0, kind: 'WORKING', isSpecial: false },
  ]
  const fullCalendar = week

  it('[HARDENING] AUSENCIA no debe cambiar el status de WORKING a OFF', () => {
    const incidents: Incident[] = [
      {
        id: 'i1',
        representativeId: 'a1',
        type: 'AUSENCIA',
        startDate: '2024-04-01',
        duration: 1,
        createdAt: new Date().toISOString(),
      },
    ]

    const result = buildWeeklySchedule(baseAgents, incidents, [], week, fullCalendar)
    const agentPlan = result.agents.find(a => a.representativeId === 'a1')
    const day = agentPlan!.days['2024-04-01']

    expect(day.status).toBe('WORKING') // Sigue contando para la cobertura
    expect(day.type).toBe('AUSENCIA') // Pero está marcado como ausencia
    expect(day.source).toBe('INCIDENT')
  })

  it('[HARDENING] VACACIONES debe forzar el status a OFF', () => {
    const incidents: Incident[] = [
      {
        id: 'i1',
        representativeId: 'a2',
        type: 'VACACIONES',
        startDate: '2024-04-01',
        duration: 1,
        createdAt: new Date().toISOString(),
      },
    ]

    const result = buildWeeklySchedule(baseAgents, incidents, [], week, fullCalendar)
    const agentPlan = result.agents.find(a => a.representativeId === 'a2')
    const day = agentPlan!.days['2024-04-01']

    expect(day.status).toBe('OFF') // No cuenta para cobertura
    expect(day.type).toBe('VACACIONES')
    expect(day.source).toBe('INCIDENT')
  })

  it('[HARDENING] OVERRIDE debe cambiar OFF a WORKING en un día de descanso base (Sábado)', () => {
    // a1 no tiene el día 6 (Sábado) en su baseSchedule, por lo que su estado base es OFF.
    const incidents: Incident[] = [
      {
        id: 'ov1',
        representativeId: 'a1',
        type: 'OVERRIDE',
        startDate: '2024-04-06',
        duration: 1,
        createdAt: new Date().toISOString(),
        assignment: { type: 'SINGLE', shift: 'DAY' },
      },
    ]

    const result = buildWeeklySchedule(baseAgents, incidents, [], week, fullCalendar)
    const agentPlan = result.agents.find(a => a.representativeId === 'a1')
    const day = agentPlan!.days['2024-04-06'] // Sábado

    // El override debe forzar el estado a WORKING.
    expect(day.status).toBe('WORKING')
    expect(day.source).toBe('OVERRIDE')
    expect(day.assignment).toEqual({ type: 'SINGLE', shift: 'DAY' })
  })

  it('[HARDENING] OVERRIDE debe cambiar WORKING a OFF en un día laboral base (Lunes)', () => {
    // a1 tiene el día 1 (Lunes) como WORKING en su baseSchedule.
    const incidents: Incident[] = [
      {
        id: 'ov2',
        representativeId: 'a1',
        type: 'OVERRIDE',
        startDate: '2024-04-01',
        duration: 1,
        createdAt: new Date().toISOString(),
        assignment: { type: 'NONE' },
      },
    ]

    const result = buildWeeklySchedule(baseAgents, incidents, [], week, fullCalendar)
    const agentPlan = result.agents.find(a => a.representativeId === 'a1')
    const day = agentPlan!.days['2024-04-01'] // Lunes

    // El override debe forzar el estado a OFF.
    expect(day.status).toBe('OFF')
    expect(day.source).toBe('OVERRIDE')
    expect(day.assignment).toEqual({ type: 'NONE' })
  })
})
