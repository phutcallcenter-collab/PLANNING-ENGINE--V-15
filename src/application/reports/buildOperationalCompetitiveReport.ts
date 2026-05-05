import type {
  CalendarState,
  CommercialGoal,
  Incident,
  Representative,
  SpecialSchedule,
} from '@/domain/types';
import type {
  OperationalCompetitiveComparisonPreset,
  OperationalCompetitiveReport,
  OperationalCompetitiveResolvedPeriod,
} from '@/domain/reports/operationalTypes';
import {
  buildRepresentativePerformanceReport,
} from '@/ui/reports/analysis-beta/services/representative-performance.service';
import type { ManualRepresentativeLink } from '@/ui/reports/analysis-beta/services/representative-link.service';
import type { Transaction } from '@/ui/reports/analysis-beta/types/dashboard.types';

type BuilderInput = {
  representatives: Representative[];
  incidents: Incident[];
  commercialGoals: CommercialGoal[];
  calendar?: CalendarState;
  specialSchedules?: SpecialSchedule[];
  currentPeriod: OperationalCompetitiveResolvedPeriod;
  currentTransactionDates?: string[];
  comparisonPreset?: OperationalCompetitiveComparisonPreset;
  comparisonPeriod?: OperationalCompetitiveResolvedPeriod | null;
  comparisonTransactionDates?: string[];
  currentTransactions: Transaction[];
  comparisonTransactions?: Transaction[];
  manualRepresentativeLinks?: ManualRepresentativeLink[];
};

export function buildOperationalCompetitiveReport({
  representatives,
  incidents,
  commercialGoals,
  calendar = { specialDays: [] },
  specialSchedules = [],
  currentPeriod,
  currentTransactionDates,
  comparisonPreset = 'NONE',
  comparisonPeriod = null,
  comparisonTransactionDates,
  currentTransactions,
  comparisonTransactions = [],
  manualRepresentativeLinks = [],
}: BuilderInput): OperationalCompetitiveReport {
  const performanceReport = buildRepresentativePerformanceReport({
    representatives,
    incidents,
    commercialGoals,
    calendar,
    specialSchedules,
    currentPeriod,
    currentTransactionDates,
    comparisonPreset,
    comparisonPeriod,
    comparisonTransactionDates,
    currentTransactions,
    comparisonTransactions,
    manualRepresentativeLinks,
  });

  return {
    currentPeriod,
    comparisonPreset,
    comparisonPeriod,
    tables: {
      DAY: {
        shift: 'DAY',
        label: performanceReport.shifts.DAY.label,
        segments: performanceReport.shifts.DAY.groups.map((group) => ({
          segment: group.segment,
          label: group.label,
          summary: {
            segment: group.segment,
            label: group.label,
            representatives: group.summary.representatives,
            target: group.summary.target,
            validTransactions: group.summary.validTransactions,
            cancelledTransactions: group.summary.cancelledTransactions,
            incidents: group.summary.incidents,
            errors: group.summary.errors,
            absences: group.summary.absences,
            tardiness: group.summary.tardiness,
            progressPct: group.summary.progressPct,
            comparisonDelta: group.summary.comparisonDelta,
          },
          rows: group.rows.map((row) => ({
            representativeId: row.representativeId,
            name: row.agente,
            shift: row.shift,
            segment: row.segment,
            target: row.target,
            validTransactions: row.transacciones,
            lastLoadedDayTransactions: row.lastLoadedDayTransactions,
            weeklyTransactions: row.weeklyTransactions,
            monthlyTransactions: row.monthlyTransactions,
            cancelledTransactions: row.cancelledTransactions,
            incidents: row.incidents,
            errors: row.errors,
            absences: row.absences,
            tardiness: row.tardiness,
            progressPct: row.progressPct,
            comparisonDelta: row.comparisonDelta,
            hasUnlinkedDataWarning:
              performanceReport.shifts.DAY.pendingAgentNames.length > 0 ||
              performanceReport.shifts.DAY.missingAgentRegistrations > 0,
          })),
        })),
        pendingAgentNames: performanceReport.shifts.DAY.pendingAgentNames,
        missingAgentRegistrations:
          performanceReport.shifts.DAY.missingAgentRegistrations,
      },
      NIGHT: {
        shift: 'NIGHT',
        label: performanceReport.shifts.NIGHT.label,
        segments: performanceReport.shifts.NIGHT.groups.map((group) => ({
          segment: group.segment,
          label: group.label,
          summary: {
            segment: group.segment,
            label: group.label,
            representatives: group.summary.representatives,
            target: group.summary.target,
            validTransactions: group.summary.validTransactions,
            cancelledTransactions: group.summary.cancelledTransactions,
            incidents: group.summary.incidents,
            errors: group.summary.errors,
            absences: group.summary.absences,
            tardiness: group.summary.tardiness,
            progressPct: group.summary.progressPct,
            comparisonDelta: group.summary.comparisonDelta,
          },
          rows: group.rows.map((row) => ({
            representativeId: row.representativeId,
            name: row.agente,
            shift: row.shift,
            segment: row.segment,
            target: row.target,
            validTransactions: row.transacciones,
            lastLoadedDayTransactions: row.lastLoadedDayTransactions,
            weeklyTransactions: row.weeklyTransactions,
            monthlyTransactions: row.monthlyTransactions,
            cancelledTransactions: row.cancelledTransactions,
            incidents: row.incidents,
            errors: row.errors,
            absences: row.absences,
            tardiness: row.tardiness,
            progressPct: row.progressPct,
            comparisonDelta: row.comparisonDelta,
            hasUnlinkedDataWarning:
              performanceReport.shifts.NIGHT.pendingAgentNames.length > 0 ||
              performanceReport.shifts.NIGHT.missingAgentRegistrations > 0,
          })),
        })),
        pendingAgentNames: performanceReport.shifts.NIGHT.pendingAgentNames,
        missingAgentRegistrations:
          performanceReport.shifts.NIGHT.missingAgentRegistrations,
      },
    },
    pendingAgentNames: performanceReport.pendingAgentNames,
    dataQualityWarnings: performanceReport.dataQualityWarnings,
  };
}
