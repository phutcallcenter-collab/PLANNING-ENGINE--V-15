import {
  buildRepresentativePerformanceReport,
} from '@/ui/reports/analysis-beta/services/representative-performance.service';
import type {
  CommercialGoal,
  Incident,
  Representative,
} from '@/domain/types';
import type { OperationalCompetitiveResolvedPeriod } from '@/domain/reports/operationalTypes';
import type { Transaction } from '@/ui/reports/analysis-beta/types/dashboard.types';

function buildPeriod(
  anchorDate: string,
  overrides: Partial<OperationalCompetitiveResolvedPeriod> = {}
): OperationalCompetitiveResolvedPeriod {
  return {
    kind: 'DAY',
    anchorDate,
    label: anchorDate,
    from: anchorDate,
    to: anchorDate,
    loadedDays: 1,
    expectedDays: 1,
    loadedDates: [anchorDate],
    isComplete: true,
    ...overrides,
  };
}

function fullSchedule() {
  return {
    0: 'WORKING',
    1: 'WORKING',
    2: 'WORKING',
    3: 'WORKING',
    4: 'WORKING',
    5: 'WORKING',
    6: 'WORKING',
  } as const;
}

function buildCommercialGoals(): CommercialGoal[] {
  return [
    { id: 'DAY:PART_TIME', shift: 'DAY', segment: 'PART_TIME', monthlyTarget: 300 },
    { id: 'DAY:FULL_TIME', shift: 'DAY', segment: 'FULL_TIME', monthlyTarget: 600 },
    { id: 'DAY:MIXTO', shift: 'DAY', segment: 'MIXTO', monthlyTarget: 900 },
    { id: 'NIGHT:PART_TIME', shift: 'NIGHT', segment: 'PART_TIME', monthlyTarget: 200 },
    { id: 'NIGHT:FULL_TIME', shift: 'NIGHT', segment: 'FULL_TIME', monthlyTarget: 400 },
    { id: 'NIGHT:MIXTO', shift: 'NIGHT', segment: 'MIXTO', monthlyTarget: 500 },
  ];
}

describe('buildRepresentativePerformanceReport', () => {
  const representatives: Representative[] = [
    {
      id: 'rep-day-part',
      name: 'Ana Dia',
      baseShift: 'DAY',
      role: 'SALES',
      employmentType: 'PART_TIME',
      commercialEligible: true,
      baseSchedule: fullSchedule(),
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
      baseSchedule: fullSchedule(),
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
      baseSchedule: fullSchedule(),
      isActive: true,
      orderIndex: 2,
    },
  ];

  it('keeps flat official totals aligned with the grouped ranking totals', () => {
    const report = buildRepresentativePerformanceReport({
      representatives,
      commercialGoals: buildCommercialGoals(),
      incidents: [],
      calendar: { specialDays: [] },
      currentPeriod: buildPeriod('2026-04-09'),
      currentTransactions: [
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
          agente: 'Mia Mixta',
          canalReal: 'CC',
          plataforma: 'Call center',
          plataformaCode: 'CC',
          fecha: '2026-04-09',
          hora: '19:15:00',
          estatus: 'N',
          valor: 90,
        },
      ],
      currentTransactionDates: ['2026-04-09'],
      manualRepresentativeLinks: [],
    });

    const flatTotal = report.byRepresentative.reduce(
      (total, row) => total + row.transacciones,
      0
    );
    const groupedTotal = report.byAssignment.reduce(
      (total, row) => total + row.transacciones,
      0
    );

    expect(flatTotal).toBe(groupedTotal);
    expect(groupedTotal).toBe(report.reconciliation.officialValidTransactions);
  });

  it('separates unlinked, omitted, and missing-agent transactions from the official table', () => {
    const report = buildRepresentativePerformanceReport({
      representatives,
      commercialGoals: buildCommercialGoals(),
      incidents: [],
      calendar: { specialDays: [] },
      currentPeriod: buildPeriod('2026-04-09'),
      currentTransactions: [
        {
          id: 'tx-linked',
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
          id: 'tx-omit',
          sucursal: 'S1',
          agente: 'Supervisor Externo',
          canalReal: 'CC',
          plataforma: 'Call center',
          plataformaCode: 'CC',
          fecha: '2026-04-09',
          hora: '11:10:00',
          estatus: 'N',
          valor: 100,
        },
        {
          id: 'tx-unlinked',
          sucursal: 'S1',
          agente: 'Agente Desconocido',
          canalReal: 'CC',
          plataforma: 'Call center',
          plataformaCode: 'CC',
          fecha: '2026-04-09',
          hora: '18:10:00',
          estatus: 'N',
          valor: 100,
        },
        {
          id: 'tx-missing',
          sucursal: 'S1',
          canalReal: 'CC',
          plataforma: 'Call center',
          plataformaCode: 'CC',
          fecha: '2026-04-09',
          hora: '18:40:00',
          estatus: 'N',
          valor: 100,
        },
      ],
      currentTransactionDates: ['2026-04-09'],
      manualRepresentativeLinks: [
        {
          agentName: 'Supervisor Externo',
          representativeName: '__OMITIR__',
        },
      ],
    });

    expect(report.reconciliation.sourceValidTransactions).toBe(4);
    expect(report.reconciliation.officialValidTransactions).toBe(1);
    expect(report.reconciliation.excludedValidTransactions).toBe(3);
    expect(report.pendingAgentNames).toEqual(['Agente Desconocido']);
    expect(report.shifts.NIGHT.missingAgentRegistrations).toBe(1);
    expect(report.reconciliation.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ reason: 'manual_omit', validTransactions: 1 }),
        expect.objectContaining({ reason: 'unlinked_agent', validTransactions: 1 }),
        expect.objectContaining({ reason: 'missing_agent', validTransactions: 1 }),
      ])
    );
  });

  it('uses planned staffing to convert per-representative goals into real block totals', () => {
    const vacation: Incident = {
      id: 'vac-1',
      representativeId: 'rep-night-full',
      type: 'VACACIONES',
      startDate: '2026-04-09',
      duration: 1,
      createdAt: '2026-04-01T00:00:00.000Z',
    };

    const report = buildRepresentativePerformanceReport({
      representatives,
      commercialGoals: buildCommercialGoals(),
      incidents: [vacation],
      calendar: { specialDays: [] },
      currentPeriod: buildPeriod('2026-04-09'),
      currentTransactions: [],
      currentTransactionDates: ['2026-04-09'],
      manualRepresentativeLinks: [],
    });

    const dayPartTarget = 300 / 30;
    const dayMixTarget = 900 / 30;

    expect(report.shifts.DAY.groups.find((group) => group.segment === 'PART_TIME')?.summary.target)
      .toBeCloseTo(dayPartTarget, 5);
    expect(report.shifts.DAY.groups.find((group) => group.segment === 'MIXTO')?.summary.target)
      .toBeCloseTo(dayMixTarget, 5);
    expect(report.shifts.NIGHT.groups.find((group) => group.segment === 'FULL_TIME')?.summary.target)
      .toBe(0);
    expect(report.globalSummary.target).toBeCloseTo(dayPartTarget + dayMixTarget, 5);
  });

  it('uses full individual monthly goals for every representative in monthly mode', () => {
    const monthlyRepresentatives: Representative[] = Array.from({ length: 12 }, (_, index) => ({
      id: `rep-month-${index + 1}`,
      name: `Agente Mes ${index + 1}`,
      baseShift: 'DAY',
      role: 'SALES',
      employmentType: 'FULL_TIME',
      commercialEligible: true,
      baseSchedule: fullSchedule(),
      isActive: true,
      orderIndex: index,
    }));
    const monthlyGoals: CommercialGoal[] = [
      { id: 'DAY:PART_TIME', shift: 'DAY', segment: 'PART_TIME', monthlyTarget: 0 },
      { id: 'DAY:FULL_TIME', shift: 'DAY', segment: 'FULL_TIME', monthlyTarget: 1000 },
      { id: 'DAY:MIXTO', shift: 'DAY', segment: 'MIXTO', monthlyTarget: 0 },
      { id: 'NIGHT:PART_TIME', shift: 'NIGHT', segment: 'PART_TIME', monthlyTarget: 0 },
      { id: 'NIGHT:FULL_TIME', shift: 'NIGHT', segment: 'FULL_TIME', monthlyTarget: 0 },
      { id: 'NIGHT:MIXTO', shift: 'NIGHT', segment: 'MIXTO', monthlyTarget: 0 },
    ];

    const report = buildRepresentativePerformanceReport({
      representatives: monthlyRepresentatives,
      commercialGoals: monthlyGoals,
      incidents: [],
      calendar: { specialDays: [] },
      currentPeriod: buildPeriod('2026-04-01', {
        kind: 'MONTH',
        label: 'abril de 2026',
        from: '2026-04-01',
        to: '2026-04-30',
        loadedDays: 1,
        expectedDays: 30,
        loadedDates: ['2026-04-01'],
        isComplete: false,
      }),
      currentTransactions: [],
      currentTransactionDates: ['2026-04-01'],
      manualRepresentativeLinks: [],
    });

    const fullTimeGroup = report.shifts.DAY.groups.find(
      (group) => group.segment === 'FULL_TIME'
    );

    expect(fullTimeGroup?.summary.representatives).toBe(12);
    expect(fullTimeGroup?.summary.target).toBe(12000);
    expect(fullTimeGroup?.rows).toHaveLength(12);
    expect(fullTimeGroup?.rows.every((row) => row.target === 1000)).toBe(true);
  });

  it('does not duplicate a mixed representative across shifts when activity only exists in one shift', () => {
    const report = buildRepresentativePerformanceReport({
      representatives,
      commercialGoals: buildCommercialGoals(),
      incidents: [],
      calendar: { specialDays: [] },
      currentPeriod: buildPeriod('2026-04-09'),
      currentTransactions: [
        {
          id: 'tx-1',
          sucursal: 'S1',
          agente: 'Mia Mixta',
          canalReal: 'CC',
          plataforma: 'Call center',
          plataformaCode: 'CC',
          fecha: '2026-04-09',
          hora: '19:10:00',
          estatus: 'N',
          valor: 100,
        },
      ],
      currentTransactionDates: ['2026-04-09'],
      manualRepresentativeLinks: [],
    });

    expect(
      report.byAssignment.filter((row) => row.representativeId === 'rep-mix')
    ).toHaveLength(1);
    expect(
      report.shifts.DAY.groups.every((group) =>
        group.rows.every((row) => row.representativeId !== 'rep-mix')
      )
    ).toBe(true);
    expect(
      report.shifts.NIGHT.groups.find((group) => group.segment === 'MIXTO')?.rows[0]
    ).toEqual(
      expect.objectContaining({
        representativeId: 'rep-mix',
        transacciones: 1,
      })
    );
  });
});
