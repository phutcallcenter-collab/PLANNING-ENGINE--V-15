
import { buildWeeklySchedule } from '../../../src/domain/planning/buildWeeklySchedule'
import type { Representative, Incident } from '../../../src/domain/types'
import { DayInfo, DayKind } from '@/domain/calendar/types'
import { ShiftAssignment } from '../../../src/domain/planning/shiftAssignment'

describe('buildWeeklySchedule – reglas de planificación', () => {
  const baseAgents: Representative[] = [
    {
      id: 'a1',
      name: 'Ana',
      baseShift: 'DAY',
      role: 'SALES',
      isActive: true,
      orderIndex: 0,
      baseSchedule: { 1: 'WORKING' }, // Works Monday
    },
    {
      id: 'a2',
      name: 'Luis',
      baseShift: 'DAY',
      role: 'SALES',
      isActive: true,
      orderIndex: 0,
      baseSchedule: { 1: 'WORKING' }, // Works Monday
    },
    {
      id: 'a3',
      name: 'Eva',
      baseShift: 'DAY',
      role: 'SALES',
      isActive: true,
      orderIndex: 0,
      baseSchedule: { 1: 'WORKING' }, // Works Monday
    },
  ]

  const monday: DayInfo = {
    date: '2024-04-01',
    dayOfWeek: 1, // Monday
    kind: 'WORKING' as DayKind,
    isSpecial: false,
  }

  const saturday: DayInfo = {
    date: '2024-04-06',
    dayOfWeek: 6, // Saturday
    kind: 'WORKING' as DayKind,
    isSpecial: false,
  }

  const week = [
    monday,
    { date: '2024-04-02', dayOfWeek: 2, kind: 'WORKING' as DayKind, isSpecial: false },
    { date: '2024-04-03', dayOfWeek: 3, kind: 'WORKING' as DayKind, isSpecial: false },
    { date: '2024-04-04', dayOfWeek: 4, kind: 'WORKING' as DayKind, isSpecial: false },
    { date: '2024-04-05', dayOfWeek: 5, kind: 'WORKING' as DayKind, isSpecial: false },
    saturday,
    { date: '2024-04-07', dayOfWeek: 0, kind: 'WORKING' as DayKind, isSpecial: false },
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
    expect(day.assignment).toEqual({ type: 'NONE' })
  })

  it('[HARDENING] OVERRIDE (toggle) debe cambiar OFF a WORKING en un día de descanso base (Sábado)', () => {
    // a1 no tiene el día 6 (Sábado) en su baseSchedule, por lo que su estado base es OFF.
    const incidents: Incident[] = [
      {
        id: 'ov1',
        representativeId: 'a1',
        type: 'OVERRIDE',
        startDate: '2024-04-06',
        duration: 1,
        createdAt: new Date().toISOString(),
        assignment: { type: 'SINGLE', shift: 'DAY' }
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

  it('[HARDENING] OVERRIDE (toggle) debe cambiar WORKING a OFF en un día laboral base (Lunes)', () => {
    // a1 tiene el día 1 (Lunes) como WORKING en su baseSchedule.
    const incidents: Incident[] = [
      {
        id: 'ov2',
        representativeId: 'a1',
        type: 'OVERRIDE',
        startDate: '2024-04-01',
        duration: 1,
        createdAt: new Date().toISOString(),
        assignment: { type: 'NONE' }
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

describe('buildWeeklySchedule – Lógica de Turnos Mixtos (HARDENED)', () => {
  const week: DayInfo[] = [
    { date: '2024-04-01', dayOfWeek: 1, kind: 'WORKING' as DayKind, isSpecial: false }, // Mon
    { date: '2024-04-02', dayOfWeek: 2, kind: 'WORKING' as DayKind, isSpecial: false }, // Tue
    { date: '2024-04-03', dayOfWeek: 3, kind: 'WORKING' as DayKind, isSpecial: false }, // Wed
    { date: '2024-04-04', dayOfWeek: 4, kind: 'WORKING' as DayKind, isSpecial: false }, // Thu
    { date: '2024-04-05', dayOfWeek: 5, kind: 'WORKING' as DayKind, isSpecial: false }, // Fri
    { date: '2024-04-06', dayOfWeek: 6, kind: 'WORKING' as DayKind, isSpecial: false }, // Sat
    { date: '2024-04-07', dayOfWeek: 0, kind: 'WORKING' as DayKind, isSpecial: false }, // Sun
  ]

  const fullCalendar = week

  it('[MIXED] MIX_WEEKDAY trabaja BOTH de lunes a jueves', () => {
    const reps: Representative[] = [
      {
        id: 'r1',
        name: 'Juan',
        baseShift: 'DAY',
        role: 'SALES',
        isActive: true,
        orderIndex: 0,
        baseSchedule: {
          1: 'WORKING',
          2: 'WORKING',
          3: 'WORKING',
          4: 'WORKING',
          5: 'WORKING',
        },
        mixProfile: { type: 'WEEKDAY' },
      },
    ]

    const plan = buildWeeklySchedule(reps, [], [], week, fullCalendar)
    const days = plan.agents[0].days

    expect(days['2024-04-01'].assignment).toEqual({ type: 'BOTH' })
    expect(days['2024-04-02'].assignment).toEqual({ type: 'BOTH' })
    expect(days['2024-04-03'].assignment).toEqual({ type: 'BOTH' })
    expect(days['2024-04-04'].assignment).toEqual({ type: 'BOTH' })
  })

  it('[MIXED] MIX_WEEKDAY vuelve a SINGLE(baseShift) viernes a domingo', () => {
    const reps: Representative[] = [
      {
        id: 'r1',
        name: 'Juan',
        baseShift: 'DAY',
        role: 'SALES',
        isActive: true,
        orderIndex: 0,
        baseSchedule: { 5: 'WORKING', 6: 'WORKING', 0: 'WORKING' },
        mixProfile: { type: 'WEEKDAY' },
      },
    ]

    const plan = buildWeeklySchedule(reps, [], [], week, fullCalendar)
    const days = plan.agents[0].days

    expect(days['2024-04-05'].assignment).toEqual({
      type: 'SINGLE',
      shift: 'DAY',
    })
    expect(days['2024-04-06'].assignment).toEqual({
      type: 'SINGLE',
      shift: 'DAY',
    })
    expect(days['2024-04-07'].assignment).toEqual({
      type: 'SINGLE',
      shift: 'DAY',
    })
  })

  it('[MIXED] baseSchedule OFF anula día mixto', () => {
    const reps: Representative[] = [
      {
        id: 'r1',
        name: 'Juan',
        baseShift: 'DAY',
        role: 'SALES',
        isActive: true,
        orderIndex: 0,
        baseSchedule: { 1: 'OFF' }, // Monday OFF
        mixProfile: { type: 'WEEKDAY' },
      },
    ]

    const plan = buildWeeklySchedule(reps, [], [], week, fullCalendar)
    const monday = plan.agents[0].days['2024-04-01']

    expect(monday.status).toBe('OFF')
    expect(monday.assignment).toEqual({ type: 'NONE' })
  })

  it('[MIXED][OVERRIDE] OVERRIDE que pone en OFF a un dia BOTH funciona', () => {
    const reps: Representative[] = [
      {
        id: 'r1',
        name: 'Juan',
        baseShift: 'DAY',
        role: 'SALES',
        isActive: true,
        orderIndex: 0,
        baseSchedule: { 1: 'WORKING' },
        mixProfile: { type: 'WEEKDAY' },
      },
    ]

    const incidents: Incident[] = [
      {
        id: 'ov1',
        representativeId: 'r1',
        type: 'OVERRIDE',
        startDate: '2024-04-01',
        duration: 1,
        createdAt: new Date().toISOString(),
        assignment: { type: 'NONE' }
      },
    ]

    const plan = buildWeeklySchedule(reps, incidents, [], week, fullCalendar)
    const monday = plan.agents[0].days['2024-04-01']

    expect(monday.source).toBe('OVERRIDE')
    expect(monday.status).toBe('OFF')
    expect(monday.assignment).toEqual({ type: 'NONE' })
  })

  it('[MIXED][OVERRIDE] OVERRIDE fuerza SINGLE(NIGHT) en día BOTH', () => {
    const reps: Representative[] = [{
      id: 'r1',
      name: 'Juan',
      baseShift: 'DAY',
      role: 'SALES',
      isActive: true,
      orderIndex: 0,
      baseSchedule: { 1: 'WORKING' },
      mixProfile: { type: 'WEEKDAY' },
    }]

    const forcedAssignment: ShiftAssignment = { type: 'SINGLE', shift: 'NIGHT' };
    const incidents: Incident[] = [{
      id: 'ov1',
      representativeId: 'r1',
      type: 'OVERRIDE',
      startDate: '2024-04-01',
      duration: 1,
      createdAt: new Date().toISOString(),
      assignment: forcedAssignment,
    }]

    const plan = buildWeeklySchedule(reps, incidents, [], week, fullCalendar)
    const monday = plan.agents[0].days['2024-04-01']

    expect(monday.source).toBe('OVERRIDE')
    expect(monday.status).toBe('WORKING')
    expect(monday.assignment).toEqual(forcedAssignment)
  })


  it('[MIXED] VACACIONES anula cualquier asignación mixta', () => {
    const reps: Representative[] = [
      {
        id: 'r1',
        name: 'Juan',
        baseShift: 'DAY',
        role: 'SALES',
        isActive: true,
        orderIndex: 0,
        baseSchedule: { 1: 'WORKING' },
        mixProfile: { type: 'WEEKDAY' },
      },
    ]

    const incidents: Incident[] = [
      {
        id: 'v1',
        representativeId: 'r1',
        type: 'VACACIONES',
        startDate: '2024-04-01',
        duration: 5,
        createdAt: new Date().toISOString(),
      },
    ]

    const plan = buildWeeklySchedule(reps, incidents, [], week, fullCalendar)
    const monday = plan.agents[0].days['2024-04-01']

    expect(monday.status).toBe('OFF')
    expect(monday.assignment).toEqual({ type: 'NONE' })
  })

  it('[CONTRACT] permite override en un día no-mixto de un representante mixto', () => {
    const reps: Representative[] = [
      {
        id: 'r1',
        name: 'Juan (Mix)',
        baseShift: 'DAY',
        role: 'SALES',
        isActive: true,
        orderIndex: 0,
        baseSchedule: { 1: 'WORKING', 5: 'WORKING' }, // Trabaja Lunes, Viernes
        mixProfile: { type: 'WEEKDAY' }, // Mixto Lun-Jue
      },
    ]

    // Viernes no es un día mixto para este rep, su estado base es SINGLE(DAY)
    const incidents: Incident[] = [
      {
        id: 'ov1',
        representativeId: 'r1',
        type: 'OVERRIDE',
        startDate: '2024-04-05', // Viernes
        duration: 1,
        createdAt: new Date().toISOString(),
        assignment: { type: 'SINGLE', shift: 'NIGHT' }, // Forzar turno noche
      },
    ]

    const plan = buildWeeklySchedule(reps, incidents, [], week, fullCalendar);
    const friday = plan.agents[0].days['2024-04-05']

    expect(friday.source).toBe('OVERRIDE')
    expect(friday.status).toBe('WORKING')
    expect(friday.assignment).toEqual({ type: 'SINGLE', shift: 'NIGHT' })
  })

  it('[CONTRACT] ignora un override cuando existe una LICENCIA', () => {
    const reps: Representative[] = [{
      id: 'r1',
      name: 'Rep Con Licencia',
      baseShift: 'DAY',
      role: 'SALES',
      isActive: true,
      orderIndex: 0,
      baseSchedule: { 1: 'WORKING' },
    }]

    const incidents: Incident[] = [
      // Licencia tiene prioridad
      {
        id: 'lic1',
        representativeId: 'r1',
        type: 'LICENCIA',
        startDate: '2024-04-01',
        duration: 1,
        createdAt: new Date().toISOString(),
      },
      // Este override debería ser ignorado
      {
        id: 'ov1',
        representativeId: 'r1',
        type: 'OVERRIDE',
        startDate: '2024-04-01',
        duration: 1,
        createdAt: new Date().toISOString(),
        assignment: { type: 'SINGLE', shift: 'DAY' },
      },
    ]

    const plan = buildWeeklySchedule(reps, incidents, [], week, fullCalendar);
    const day = plan.agents[0].days['2024-04-01']

    expect(day.source).toBe('INCIDENT')
    expect(day.type).toBe('LICENCIA')
    expect(day.status).toBe('OFF')
    expect(day.assignment).toEqual({ type: 'NONE' })
  })

  it('[CONTRACT] allows a mixed WEEKEND agent to be forced BOTH on a weekday via override', () => {
    const reps: Representative[] = [
      {
        id: 'irene',
        name: 'Irene (Mix WE)',
        baseShift: 'NIGHT',
        role: 'SALES',
        isActive: true,
        orderIndex: 0,
        baseSchedule: { 0: 'WORKING', 1: 'WORKING', 2: 'WORKING', 3: 'WORKING', 4: 'WORKING', 5: 'WORKING', 6: 'WORKING' },
        mixProfile: { type: 'WEEKEND' }, // Mix Fri-Sun
      },
    ]

    const wednesday: DayInfo = { date: '2024-04-03', dayOfWeek: 3, kind: 'WORKING' as DayKind, isSpecial: false }

    const incidents: Incident[] = [
      {
        id: 'ovr-irene',
        representativeId: 'irene',
        type: 'OVERRIDE',
        startDate: wednesday.date, // Wednesday
        duration: 1,
        createdAt: new Date().toISOString(),
        assignment: { type: 'BOTH' },
      },
    ]

    const plan = buildWeeklySchedule(reps, incidents, [], week, fullCalendar);
    const day = plan.agents[0].days[wednesday.date]

    expect(day.source).toBe('OVERRIDE')
    expect(day.assignment).toEqual({ type: 'BOTH' })
    expect(day.status).toBe('WORKING')
  });

  it('[CONTRACT][SCENARIO] allows a mixed WEEKEND agent (base NIGHT) to be forced SINGLE(DAY) on a weekday', () => {
    const reps: Representative[] = [
      {
        id: 'irene',
        name: 'Irene (Mix WE)',
        baseShift: 'NIGHT',
        role: 'SALES',
        isActive: true,
        orderIndex: 0,
        baseSchedule: { 0: 'WORKING', 1: 'WORKING', 2: 'WORKING', 3: 'WORKING', 4: 'WORKING', 5: 'WORKING', 6: 'WORKING' },
        mixProfile: { type: 'WEEKEND' }, // Mix Fri-Sun
      },
    ];

    const mondayDate = '2024-04-01'; // Lunes

    const incidents: Incident[] = [
      {
        id: 'ovr-irene-day',
        representativeId: 'irene',
        type: 'OVERRIDE',
        startDate: mondayDate,
        duration: 1,
        createdAt: new Date().toISOString(),
        assignment: { type: 'SINGLE', shift: 'DAY' },
      },
    ];

    const plan = buildWeeklySchedule(reps, incidents, [], week, fullCalendar);;
    const day = plan.agents.find(a => a.representativeId === 'irene')?.days[mondayDate];

    expect(day).toBeDefined();
    if (!day) throw new Error('Day not found');
    expect(day.source).toBe('OVERRIDE');
    expect(day.assignment).toEqual({ type: 'SINGLE', shift: 'DAY' });
    expect(day.status).toBe('WORKING');
  });

})
