import type {
  CalendarState,
  CommercialGoal,
  Incident,
  Representative,
  SpecialSchedule,
} from '@/domain/types';
import type { OperationalCompetitiveResolvedPeriod } from '@/domain/reports/operationalTypes';
import type {
  MonthlyOperationalSnapshot,
  RepresentativePerformanceReport,
  Transaction,
} from '@/ui/reports/analysis-beta/types/dashboard.types';
import {
  buildRepresentativePerformanceReport,
} from '@/ui/reports/analysis-beta/services/representative-performance.service';
import type { ManualRepresentativeLink } from '@/ui/reports/analysis-beta/services/representative-link.service';

type BuildMonthlyRepresentativePerformanceInput = {
  monthSnapshot: MonthlyOperationalSnapshot;
  transactions: Transaction[];
  representatives: Representative[];
  commercialGoals: CommercialGoal[];
  incidents: Incident[];
  calendar: CalendarState;
  specialSchedules?: SpecialSchedule[];
  manualRepresentativeLinks?: ManualRepresentativeLink[];
  comparisonPeriod?: OperationalCompetitiveResolvedPeriod | null;
  comparisonTransactions?: Transaction[];
  comparisonTransactionDates?: string[];
};

export type MonthlyRepresentativePerformanceResult = {
  period: OperationalCompetitiveResolvedPeriod;
  performanceReport: RepresentativePerformanceReport;
  sourceValidTransactions: number;
  sourceCancelledTransactions: number;
};

function isCallCenterTransaction(transaction: Transaction) {
  return transaction.plataforma === 'Call center';
}

export function buildMonthlyRepresentativePerformance({
  monthSnapshot,
  transactions,
  representatives,
  commercialGoals,
  incidents,
  calendar,
  specialSchedules = [],
  manualRepresentativeLinks = [],
  comparisonPeriod = null,
  comparisonTransactions = [],
  comparisonTransactionDates,
}: BuildMonthlyRepresentativePerformanceInput): MonthlyRepresentativePerformanceResult | null {
  const loadedDates = [...new Set(monthSnapshot.loadedDates)].sort();

  if (loadedDates.length === 0) {
    return null;
  }

  const loadedDateSet = new Set(loadedDates);
  const periodTransactions = transactions.filter((transaction) =>
    loadedDateSet.has(transaction.fecha)
  );
  const period: OperationalCompetitiveResolvedPeriod = {
    kind: 'MONTH',
    anchorDate: monthSnapshot.startDate,
    label: monthSnapshot.monthLabel,
    from: monthSnapshot.startDate,
    to: monthSnapshot.endDate,
    loadedDays: monthSnapshot.loadedDays,
    expectedDays: monthSnapshot.expectedDays,
    loadedDates,
    isComplete: monthSnapshot.loadedDays >= monthSnapshot.expectedDays,
  };

  return {
    period,
    sourceValidTransactions: monthSnapshot.kpis.transaccionesCC,
    sourceCancelledTransactions: periodTransactions.filter(
      (transaction) =>
        isCallCenterTransaction(transaction) && transaction.estatus !== 'N'
    ).length,
    performanceReport: buildRepresentativePerformanceReport({
      representatives,
      commercialGoals,
      incidents,
      calendar,
      specialSchedules,
      currentPeriod: period,
      currentTransactions: periodTransactions,
      currentTransactionDates: loadedDates,
      comparisonPreset: comparisonPeriod ? 'MONTH_PREVIOUS' : 'NONE',
      comparisonPeriod,
      comparisonTransactions,
      comparisonTransactionDates,
      manualRepresentativeLinks,
    }),
  };
}
