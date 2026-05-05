import { buildOperationalCompetitiveReport } from './buildOperationalCompetitiveReport'
import type {
  CommercialGoal,
  Incident,
  Representative,
} from '@/domain/types'
import type { OperationalCompetitiveResolvedPeriod } from '@/domain/reports/operationalTypes'
import type { Transaction } from '@/ui/reports/analysis-beta/types/dashboard.types'

function buildPeriod(
  overrides: Partial<OperationalCompetitiveResolvedPeriod>
): OperationalCompetitiveResolvedPeriod {
  return {
    kind: 'DAY',
    anchorDate: '2026-04-09',
    label: '2026-04-09',
    from: '2026-04-09',
    to: '2026-04-09',
    loadedDays: 1,
    expectedDays: 30,
    loadedDates: ['2026-04-09'],
    isComplete: true,
    ...overrides,
  }
}

function buildCommercialGoals(): CommercialGoal[] {
  return [
    { id: 'DAY:PART_TIME', shift: 'DAY', segment: 'PART_TIME', monthlyTarget: 300 },
    { id: 'DAY:FULL_TIME', shift: 'DAY', segment: 'FULL_TIME', monthlyTarget: 600 },
    { id: 'DAY:MIXTO', shift: 'DAY', segment: 'MIXTO', monthlyTarget: 900 },
    { id: 'NIGHT:PART_TIME', shift: 'NIGHT', segment: 'PART_TIME', monthlyTarget: 200 },
    { id: 'NIGHT:FULL_TIME', shift: 'NIGHT', segment: 'FULL_TIME', monthlyTarget: 400 },
    { id: 'NIGHT:MIXTO', shift: 'NIGHT', segment: 'MIXTO', monthlyTarget: 500 },
  ]
}

describe('buildOperationalCompetitiveReport', () => {
  const representatives: Representative[] = [
    {
      id: 'rep-day-part',
      name: 'Ana Dia',
      baseShift: 'DAY',
      role: 'SALES',
      employmentType: 'PART_TIME',
      commercialEligible: true,
      baseSchedule: {},
      isActive: true,
      orderIndex: 0,
    },
    {
      id: 'rep-night-full',
      name: 'Nico Noche',
      baseShift: 'NIGHT',
      role: 'SALES',
      employmentType: 'FULL_TIME',
      commercialEligible: true,
      baseSchedule: {},
      isActive: true,
      orderIndex: 1,
    },
    {
      id: 'rep-mix',
      name: 'Mia Mixta',
      baseShift: 'DAY',
      role: 'SALES',
      employmentType: 'FULL_TIME',
      commercialEligible: true,
      mixProfile: { type: 'WEEKDAY' },
      baseSchedule: {},
      isActive: true,
      orderIndex: 2,
    },
    {
      id: 'rep-zero',
      name: 'Pedro Cero',
      baseShift: 'NIGHT',
      role: 'SALES',
      employmentType: 'PART_TIME',
      commercialEligible: true,
      baseSchedule: {},
      isActive: true,
      orderIndex: 3,
    },
    {
      id: 'rep-hidden',
      name: 'Fuera Ranking',
      baseShift: 'DAY',
      role: 'SALES',
      employmentType: 'FULL_TIME',
      commercialEligible: false,
      baseSchedule: {},
      isActive: true,
      orderIndex: 4,
    },
  ]

  const incidents: Incident[] = [
    {
      id: 'inc-night',
      representativeId: 'rep-night-full',
      type: 'ERROR',
      startDate: '2026-04-09',
      duration: 1,
      createdAt: '2026-04-09T10:00:00.000Z',
    },
    {
      id: 'inc-night-absence',
      representativeId: 'rep-night-full',
      type: 'AUSENCIA',
      startDate: '2026-04-09',
      duration: 1,
      createdAt: '2026-04-09T11:00:00.000Z',
    },
    {
      id: 'inc-night-late',
      representativeId: 'rep-night-full',
      type: 'TARDANZA',
      startDate: '2026-04-09',
      duration: 1,
      createdAt: '2026-04-09T12:00:00.000Z',
    },
  ]

  it('builds both shift tables, keeps zero-activity reps visible, and flags unlinked data', () => {
    const currentTransactions: Transaction[] = [
      {
        id: 'tx-1',
        sucursal: 'S1',
        agente: 'Ana Dia',
        canalReal: 'CC',
        plataforma: 'Call center',
        plataformaCode: 'CC',
        fecha: '2026-04-09',
        hora: '10:10:00',
        estatus: 'N',
        valor: 100,
      },
      {
        id: 'tx-2',
        sucursal: 'S1',
        agente: 'Ana Dia',
        canalReal: 'CC',
        plataforma: 'Call center',
        plataformaCode: 'CC',
        fecha: '2026-04-09',
        hora: '10:30:00',
        estatus: 'X',
        valor: 100,
      },
      {
        id: 'tx-3',
        sucursal: 'S1',
        agente: 'Luna Team',
        canalReal: 'CC',
        plataforma: 'Call center',
        plataformaCode: 'CC',
        fecha: '2026-04-09',
        hora: '17:10:00',
        estatus: 'N',
        valor: 110,
      },
      {
        id: 'tx-4',
        sucursal: 'S1',
        agente: 'Mia Mixta',
        canalReal: 'CC',
        plataforma: 'Call center',
        plataformaCode: 'CC',
        fecha: '2026-04-09',
        hora: '18:15:00',
        estatus: 'N',
        valor: 90,
      },
      {
        id: 'tx-5',
        sucursal: 'S1',
        agente: 'Agente Externo',
        canalReal: 'CC',
        plataforma: 'Call center',
        plataformaCode: 'CC',
        fecha: '2026-04-09',
        hora: '11:00:00',
        estatus: 'N',
        valor: 70,
      },
      {
        id: 'tx-6',
        sucursal: 'S1',
        agenteTipo: 'agente',
        canalReal: 'CC',
        plataforma: 'Call center',
        plataformaCode: 'CC',
        fecha: '2026-04-09',
        hora: '19:20:00',
        estatus: 'N',
        valor: 70,
      },
    ]

    const report = buildOperationalCompetitiveReport({
      representatives,
      incidents,
      commercialGoals: buildCommercialGoals(),
      currentPeriod: buildPeriod({}),
      currentTransactions,
      manualRepresentativeLinks: [
        { agentName: 'Luna Team', representativeName: 'Nico Noche' },
      ],
    })

    expect(report.tables.DAY.segments[0].rows[0]).toMatchObject({
      representativeId: 'rep-day-part',
      validTransactions: 1,
      cancelledTransactions: 1,
    })

    expect(
      report.tables.DAY.segments.every(segment =>
        segment.rows.every(row => row.representativeId !== 'rep-mix')
      )
    ).toBe(true)

    expect(report.tables.NIGHT.segments[0].rows[0]).toMatchObject({
      representativeId: 'rep-zero',
      validTransactions: 0,
    })

    expect(report.tables.NIGHT.segments[1].rows[0]).toMatchObject({
      representativeId: 'rep-night-full',
      validTransactions: 1,
      incidents: 3,
      errors: 1,
      absences: 1,
      tardiness: 1,
    })

    expect(report.tables.NIGHT.segments[1].summary).toMatchObject({
      incidents: 3,
      errors: 1,
      absences: 1,
      tardiness: 1,
    })

    expect(report.tables.NIGHT.segments[2].rows[0]).toMatchObject({
      representativeId: 'rep-mix',
      validTransactions: 1,
      segment: 'MIXTO',
    })

    expect(report.pendingAgentNames).toEqual(['Agente Externo'])
    expect(report.tables.NIGHT.missingAgentRegistrations).toBe(1)
    expect(report.dataQualityWarnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Turno Día'),
        expect.stringContaining('Turno Noche'),
      ])
    )
  })

  it('prorates monthly goals over loaded days and computes comparison delta', () => {
    const currentPeriod = buildPeriod({
      kind: 'WEEK',
      label: '2026-04-30 a 2026-05-03',
      from: '2026-04-28',
      to: '2026-05-04',
      loadedDays: 3,
      expectedDays: 7,
      loadedDates: ['2026-04-30', '2026-05-01', '2026-05-03'],
      isComplete: false,
    })
    const comparisonPeriod = buildPeriod({
      kind: 'WEEK',
      anchorDate: '2026-04-24',
      label: '2026-04-23 a 2026-04-26',
      from: '2026-04-21',
      to: '2026-04-27',
      loadedDays: 2,
      expectedDays: 7,
      loadedDates: ['2026-04-23', '2026-04-24'],
      isComplete: false,
    })

    const currentTransactions: Transaction[] = [
      {
        id: 'tx-current-1',
        sucursal: 'S1',
        agente: 'Nico Noche',
        canalReal: 'CC',
        plataforma: 'Call center',
        plataformaCode: 'CC',
        fecha: '2026-04-30',
        hora: '17:00:00',
        estatus: 'N',
        valor: 50,
      },
      {
        id: 'tx-current-2',
        sucursal: 'S1',
        agente: 'Nico Noche',
        canalReal: 'CC',
        plataforma: 'Call center',
        plataformaCode: 'CC',
        fecha: '2026-05-01',
        hora: '17:00:00',
        estatus: 'N',
        valor: 50,
      },
      {
        id: 'tx-current-3',
        sucursal: 'S1',
        agente: 'Nico Noche',
        canalReal: 'CC',
        plataforma: 'Call center',
        plataformaCode: 'CC',
        fecha: '2026-05-03',
        hora: '17:00:00',
        estatus: 'N',
        valor: 50,
      },
    ]
    const comparisonTransactions: Transaction[] = [
      {
        id: 'tx-previous-1',
        sucursal: 'S1',
        agente: 'Nico Noche',
        canalReal: 'CC',
        plataforma: 'Call center',
        plataformaCode: 'CC',
        fecha: '2026-04-23',
        hora: '17:00:00',
        estatus: 'N',
        valor: 50,
      },
    ]

    const report = buildOperationalCompetitiveReport({
      representatives,
      incidents: [],
      commercialGoals: buildCommercialGoals(),
      currentPeriod,
      comparisonPreset: 'WEEK_PREVIOUS',
      comparisonPeriod,
      currentTransactions,
      comparisonTransactions,
    })

    const nightFullRow = report.tables.NIGHT.segments[1].rows.find(
      row => row.representativeId === 'rep-night-full'
    )

    const currentTarget = 400 / 30 + 400 / 31 + 400 / 31
    const comparisonTarget = 400 / 30 + 400 / 30
    const currentProgressPct = (3 / currentTarget) * 100
    expect(nightFullRow?.target).toBeCloseTo(currentTarget, 5)
    expect(nightFullRow?.progressPct).toBeCloseTo(currentProgressPct, 5)
    expect(nightFullRow?.comparisonDelta).toBe(2)
  })

  it('prorates goals only over dates with transaction coverage when provided', () => {
    const currentPeriod = buildPeriod({
      kind: 'WEEK',
      label: '2026-04-30 a 2026-05-03',
      from: '2026-04-28',
      to: '2026-05-04',
      loadedDays: 3,
      expectedDays: 7,
      loadedDates: ['2026-04-30', '2026-05-01', '2026-05-03'],
      isComplete: false,
    })

    const report = buildOperationalCompetitiveReport({
      representatives,
      incidents: [],
      commercialGoals: buildCommercialGoals(),
      currentPeriod,
      currentTransactionDates: ['2026-04-30', '2026-05-03'],
      currentTransactions: [
        {
          id: 'tx-current-1',
          sucursal: 'S1',
          agente: 'Nico Noche',
          canalReal: 'CC',
          plataforma: 'Call center',
          plataformaCode: 'CC',
          fecha: '2026-04-30',
          hora: '17:00:00',
          estatus: 'N',
          valor: 50,
        },
        {
          id: 'tx-current-2',
          sucursal: 'S1',
          agente: 'Nico Noche',
          canalReal: 'CC',
          plataforma: 'Call center',
          plataformaCode: 'CC',
          fecha: '2026-05-03',
          hora: '17:00:00',
          estatus: 'N',
          valor: 50,
        },
      ],
    })

    const nightFullRow = report.tables.NIGHT.segments[1].rows.find(
      row => row.representativeId === 'rep-night-full'
    )

    const targetWithTransactionCoverageOnly = 400 / 30 + 400 / 31
    expect(nightFullRow?.target).toBeCloseTo(targetWithTransactionCoverageOnly, 5)
    expect(nightFullRow?.progressPct).toBeCloseTo(
      (2 / targetWithTransactionCoverageOnly) * 100,
      5
    )
  })
})
