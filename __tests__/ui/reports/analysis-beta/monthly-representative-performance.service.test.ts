import {
  buildMonthlyRepresentativePerformance,
} from '@/ui/reports/analysis-beta/services/monthly-representative-performance.service';
import type {
  CommercialGoal,
  Incident,
  Representative,
} from '@/domain/types';
import type {
  MonthlyOperationalSnapshot,
  Transaction,
} from '@/ui/reports/analysis-beta/types/dashboard.types';

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

function buildGoals(): CommercialGoal[] {
  return [
    { id: 'DAY:PART_TIME', shift: 'DAY', segment: 'PART_TIME', monthlyTarget: 0 },
    { id: 'DAY:FULL_TIME', shift: 'DAY', segment: 'FULL_TIME', monthlyTarget: 1000 },
    { id: 'DAY:MIXTO', shift: 'DAY', segment: 'MIXTO', monthlyTarget: 0 },
    { id: 'NIGHT:PART_TIME', shift: 'NIGHT', segment: 'PART_TIME', monthlyTarget: 0 },
    { id: 'NIGHT:FULL_TIME', shift: 'NIGHT', segment: 'FULL_TIME', monthlyTarget: 0 },
    { id: 'NIGHT:MIXTO', shift: 'NIGHT', segment: 'MIXTO', monthlyTarget: 0 },
  ];
}

function buildMonthSnapshot(): MonthlyOperationalSnapshot {
  return {
    monthKey: '2026-04',
    monthLabel: 'abril de 2026',
    startDate: '2026-04-01',
    endDate: '2026-04-30',
    loadedDays: 1,
    expectedDays: 30,
    loadedDates: ['2026-04-01'],
    kpis: {
      recibidas: 10,
      contestadas: 8,
      abandonadas: 2,
      nivelDeServicio: 80,
      conversion: 37.5,
      transaccionesCC: 3,
      ventasValidas: 300,
      ticketPromedio: 100,
    },
    shiftKpis: {
      Día: {
        recibidas: 10,
        contestadas: 8,
        trans: 3,
        conv: 37.5,
        abandonadas: 2,
        duplicadas: 0,
        lt20: 0,
        atencion: 80,
        abandonoPct: 20,
      },
      Noche: {
        recibidas: 0,
        contestadas: 0,
        trans: 0,
        conv: 0,
        abandonadas: 0,
        duplicadas: 0,
        lt20: 0,
        atencion: 0,
        abandonoPct: 0,
      },
    },
    operationalDetail: {
      day: [],
      night: [],
    },
  };
}

describe('buildMonthlyRepresentativePerformance', () => {
  const representatives: Representative[] = [
    {
      id: 'rep-1',
      name: 'Ana Dia',
      baseShift: 'DAY',
      role: 'SALES',
      employmentType: 'FULL_TIME',
      commercialEligible: true,
      baseSchedule: fullSchedule(),
      isActive: true,
      orderIndex: 0,
    },
    {
      id: 'rep-2',
      name: 'Beto Dia',
      baseShift: 'DAY',
      role: 'SALES',
      employmentType: 'FULL_TIME',
      commercialEligible: true,
      baseSchedule: fullSchedule(),
      isActive: true,
      orderIndex: 1,
    },
  ];
  const transactions: Transaction[] = [
    {
      id: 'tx-1',
      sucursal: 'S1',
      agente: 'Ana Dia',
      canalReal: 'CC',
      plataforma: 'Call center',
      plataformaCode: 'CC',
      fecha: '2026-04-01',
      hora: '10:00:00',
      estatus: 'N',
      valor: 100,
    },
    {
      id: 'tx-2',
      sucursal: 'S1',
      agente: 'Beto Dia',
      canalReal: 'CC',
      plataforma: 'Call center',
      plataformaCode: 'CC',
      fecha: '2026-04-01',
      hora: '10:30:00',
      estatus: 'N',
      valor: 100,
    },
    {
      id: 'tx-3',
      sucursal: 'S1',
      agente: 'Agente Pendiente',
      canalReal: 'CC',
      plataforma: 'Call center',
      plataformaCode: 'CC',
      fecha: '2026-04-01',
      hora: '11:00:00',
      estatus: 'N',
      valor: 100,
    },
  ];

  it('aligns its source total with the monthly call analysis snapshot', () => {
    const incident: Incident = {
      id: 'inc-1',
      representativeId: 'rep-1',
      type: 'ERROR',
      startDate: '2026-04-01',
      duration: 1,
      createdAt: '2026-04-01T12:00:00.000Z',
    };
    const result = buildMonthlyRepresentativePerformance({
      monthSnapshot: buildMonthSnapshot(),
      transactions,
      representatives,
      commercialGoals: buildGoals(),
      incidents: [incident],
      calendar: { specialDays: [] },
    });

    expect(result?.sourceValidTransactions).toBe(3);
    expect(result?.performanceReport.reconciliation.sourceValidTransactions).toBe(3);
    expect(result?.performanceReport.reconciliation.officialValidTransactions).toBe(2);
    expect(result?.performanceReport.reconciliation.excludedValidTransactions).toBe(1);
    expect(result?.performanceReport.globalSummary.incidents).toBe(1);
    expect(result?.performanceReport.globalSummary.validTransactions).toBe(2);
    expect(
      result?.performanceReport.byRepresentative.find((row) => row.representativeId === 'rep-1')
    ).toEqual(expect.objectContaining({ transacciones: 1, incidents: 1, errors: 1 }));
  });
});
