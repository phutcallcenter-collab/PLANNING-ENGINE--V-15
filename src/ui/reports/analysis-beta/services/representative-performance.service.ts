import { getPlannedAgentsForDay } from '@/application/ui-adapters/getPlannedAgentsForDay';
import { getEffectiveSchedule } from '@/application/scheduling/specialScheduleAdapter';
import { generateMonthDays } from '@/domain/calendar/state';
import { getCommercialGoalTarget } from '@/domain/commercialGoals/defaults';
import { resolveIncidentDates } from '@/domain/incidents/resolveIncidentDates';
import type {
  CalendarState,
  CommercialGoal,
  CommercialGoalSegment,
  Incident,
  Representative,
  ShiftType,
  SpecialSchedule,
} from '@/domain/types';
import type {
  OperationalCompetitiveComparisonPreset,
  OperationalCompetitiveResolvedPeriod,
} from '@/domain/reports/operationalTypes';
import {
  adjustOfficialSystemAgentSales,
} from '@/ui/reports/analysis-beta/services/kpi.service';
import {
  createRepresentativeLinkResolver,
  type ManualRepresentativeLink,
} from '@/ui/reports/analysis-beta/services/representative-link.service';
import { getShift } from '@/ui/reports/analysis-beta/services/shift.service';
import type {
  RepresentativeGoalSummary,
  RepresentativePerformanceAssignmentRow,
  RepresentativePerformanceGroup,
  RepresentativePerformanceReconciliationReason,
  RepresentativePerformanceReport,
  RepresentativePerformanceRow,
  RepresentativePerformanceShiftGroup,
  RepresentativeReconciliationItem,
  Transaction,
} from '@/ui/reports/analysis-beta/types/dashboard.types';

const SHIFT_LABELS: Record<ShiftType, string> = {
  DAY: 'Turno Día',
  NIGHT: 'Turno Noche',
};

const SEGMENT_LABELS: Record<CommercialGoalSegment, string> = {
  PART_TIME: 'Part Time',
  FULL_TIME: 'Full Time',
  MIXTO: 'Mixto',
};

type AssignmentAccumulator = {
  representativeId: string;
  agente: string;
  tipo: 'agente';
  codigo: string;
  shift: ShiftType;
  segment: CommercialGoalSegment;
  transacciones: number;
  ventas: number;
  ticketPromedio: number;
  target: number;
  monthlyTargetPerRepresentative: number;
  cancelledTransactions: number;
  lastLoadedDayTransactions: number;
  weeklyTransactions: number;
  monthlyTransactions: number;
  incidents: number;
  errors: number;
  absences: number;
  tardiness: number;
  comparisonDelta: number | null;
  plannedDates: Set<string>;
  comparisonValidTransactions: number;
};

type ReconciliationAccumulator = RepresentativeReconciliationItem;

type TransactionProcessingResult = {
  assignmentStats: Map<string, AssignmentAccumulator>;
  validTransactionsByRepresentative: Map<string, number>;
  validTransactionsByAssignment: Map<string, number>;
  activityShiftsByRepresentativeDate: Map<string, Set<ShiftType>>;
  pendingAgentNames: Record<ShiftType, Set<string>>;
  missingAgentRegistrations: Record<ShiftType, number>;
  reconciliation: Map<string, ReconciliationAccumulator>;
  sourceValidTransactions: number;
  sourceCancelledTransactions: number;
  officialValidTransactions: number;
  officialCancelledTransactions: number;
  excludedValidTransactions: number;
  excludedCancelledTransactions: number;
};

type TargetAccumulator = {
  target: number;
  monthlyTargetPerRepresentative: number;
  plannedDates: Set<string>;
};

type IncidentAccumulator = {
  incidents: number;
  errors: number;
  absences: number;
  tardiness: number;
};

type BuildRepresentativePerformanceReportInput = {
  representatives: Representative[];
  incidents: Incident[];
  commercialGoals: CommercialGoal[];
  calendar: CalendarState;
  specialSchedules?: SpecialSchedule[];
  currentPeriod: OperationalCompetitiveResolvedPeriod;
  currentTransactions: Transaction[];
  currentTransactionDates?: string[];
  comparisonPreset?: OperationalCompetitiveComparisonPreset;
  comparisonPeriod?: OperationalCompetitiveResolvedPeriod | null;
  comparisonTransactions?: Transaction[];
  comparisonTransactionDates?: string[];
  manualRepresentativeLinks?: ManualRepresentativeLink[];
};

function buildAssignmentKey(
  representativeId: string,
  shift: ShiftType,
  segment: CommercialGoalSegment
) {
  return `${representativeId}:${shift}:${segment}`;
}

function buildRepresentativeDateKey(representativeId: string, date: string) {
  return `${representativeId}:${date}`;
}

function resolveTransactionShift(time: string): ShiftType | null {
  const shift = getShift(time);

  if (shift === 'Día') {
    return 'DAY';
  }

  if (shift === 'Noche') {
    return 'NIGHT';
  }

  return null;
}

function isCallCenterRepresentativeTransaction(transaction: Transaction): boolean {
  const normalizedPlatformCode = String(transaction.plataformaCode || '')
    .trim()
    .toUpperCase();
  const normalizedPlatform = String(transaction.plataforma || '').trim().toLowerCase();

  if (normalizedPlatformCode && normalizedPlatformCode !== 'CC') {
    return false;
  }

  if (normalizedPlatform && normalizedPlatform !== 'call center') {
    return false;
  }

  if (transaction.agenteTipo) {
    return transaction.agenteTipo !== 'plataforma';
  }

  return true;
}

function isCallCenterSourceTransaction(transaction: Transaction): boolean {
  return transaction.plataforma === 'Call center';
}

function daysInMonthFromIso(date: string): number {
  const [year, month] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function addDays(date: string, days: number) {
  const [year, month, day] = date.split('-').map(Number);
  const nextDate = new Date(Date.UTC(year, (month || 1) - 1, day || 1));
  nextDate.setUTCDate(nextDate.getUTCDate() + days);
  return nextDate.toISOString().slice(0, 10);
}

function isSameMonth(date: string, monthReference: string) {
  return date.slice(0, 7) === monthReference.slice(0, 7);
}

function createCalendarDaysForDates(
  dates: string[],
  calendar: CalendarState
) {
  const uniqueMonthKeys = [...new Set(dates.map((date) => date.slice(0, 7)).filter(Boolean))];
  const allDays = new Map<string, ReturnType<typeof generateMonthDays>[number]>();

  uniqueMonthKeys.forEach((monthKey) => {
    const [year, month] = monthKey.split('-').map(Number);

    generateMonthDays(year, month, calendar).forEach((day) => {
      allDays.set(day.date, day);
    });
  });

  return [...allDays.values()].sort((left, right) => left.date.localeCompare(right.date));
}

function getRepresentativeSegment(
  representative: Representative,
  date: string,
  specialSchedules: SpecialSchedule[] = []
): CommercialGoalSegment {
  const effective = getEffectiveSchedule({
    representative,
    dateStr: date,
    baseSchedule: representative.baseSchedule,
    specialSchedules,
  });

  if (effective.type === 'MIXTO') {
    return 'MIXTO';
  }

  return representative.employmentType === 'PART_TIME' ? 'PART_TIME' : 'FULL_TIME';
}

function ensureAssignmentAccumulator(
  map: Map<string, AssignmentAccumulator>,
  representative: Representative,
  shift: ShiftType,
  segment: CommercialGoalSegment
) {
  const key = buildAssignmentKey(representative.id, shift, segment);
  const current = map.get(key);

  if (current) {
    return current;
  }

  const next: AssignmentAccumulator = {
    representativeId: representative.id,
    agente: representative.name,
    tipo: 'agente',
    codigo: representative.id,
    shift,
    segment,
    transacciones: 0,
    ventas: 0,
    ticketPromedio: 0,
    target: 0,
    monthlyTargetPerRepresentative: 0,
    cancelledTransactions: 0,
    lastLoadedDayTransactions: 0,
    weeklyTransactions: 0,
    monthlyTransactions: 0,
    incidents: 0,
    errors: 0,
    absences: 0,
    tardiness: 0,
    comparisonDelta: null,
    plannedDates: new Set<string>(),
    comparisonValidTransactions: 0,
  };

  map.set(key, next);
  return next;
}

function addShiftActivity(
  map: Map<string, Set<ShiftType>>,
  representativeId: string,
  date: string,
  shift: ShiftType
) {
  const key = buildRepresentativeDateKey(representativeId, date);
  const current = map.get(key) ?? new Set<ShiftType>();
  current.add(shift);
  map.set(key, current);
}

function addReconciliationRecord(
  map: Map<string, ReconciliationAccumulator>,
  params: {
    reason: RepresentativePerformanceReconciliationReason;
    shift: ShiftType | null;
    agentName: string | null;
    isValidTransaction: boolean;
  }
) {
  const key = [
    params.reason,
    params.shift ?? 'NO_SHIFT',
    params.agentName ?? 'NO_AGENT',
  ].join('|');
  const current = map.get(key) ?? {
    key,
    reason: params.reason,
    shift: params.shift,
    agentName: params.agentName,
    validTransactions: 0,
    cancelledTransactions: 0,
  };

  if (params.isValidTransaction) {
    current.validTransactions += 1;
  } else {
    current.cancelledTransactions += 1;
  }

  map.set(key, current);
}

function sortAssignmentRows(rows: RepresentativePerformanceAssignmentRow[]) {
  return [...rows].sort((left, right) => {
    if (right.transacciones !== left.transacciones) {
      return right.transacciones - left.transacciones;
    }

    if (right.progressPct !== left.progressPct) {
      return right.progressPct - left.progressPct;
    }

    if (left.incidents !== right.incidents) {
      return left.incidents - right.incidents;
    }

    if (left.cancelledTransactions !== right.cancelledTransactions) {
      return left.cancelledTransactions - right.cancelledTransactions;
    }

    return left.agente.localeCompare(right.agente, 'es');
  });
}

function sortRepresentativeRows(rows: RepresentativePerformanceRow[]) {
  return [...rows].sort((left, right) => {
    if (right.transacciones !== left.transacciones) {
      return right.transacciones - left.transacciones;
    }

    if (right.ventas !== left.ventas) {
      return right.ventas - left.ventas;
    }

    return left.agente.localeCompare(right.agente, 'es');
  });
}

function buildPlannedShiftMap(params: {
  representatives: Representative[];
  incidents: Incident[];
  dates: string[];
  allCalendarDays: ReturnType<typeof createCalendarDaysForDates>;
  specialSchedules: SpecialSchedule[];
  activityShiftsByRepresentativeDate: Map<string, Set<ShiftType>>;
}) {
  const planned = new Map<string, ShiftType[]>();

  params.dates.forEach((date) => {
    const dayIds = new Set(
      getPlannedAgentsForDay(
        params.representatives,
        params.incidents,
        date,
        'DAY',
        params.allCalendarDays,
        params.specialSchedules
      ).map((item) => item.representativeId)
    );
    const nightIds = new Set(
      getPlannedAgentsForDay(
        params.representatives,
        params.incidents,
        date,
        'NIGHT',
        params.allCalendarDays,
        params.specialSchedules
      ).map((item) => item.representativeId)
    );

    params.representatives.forEach((representative) => {
      const shifts: ShiftType[] = [];

      if (dayIds.has(representative.id)) {
        shifts.push('DAY');
      }

      if (nightIds.has(representative.id)) {
        shifts.push('NIGHT');
      }

      if (shifts.length === 0) {
        return;
      }

      if (shifts.length === 1) {
        planned.set(buildRepresentativeDateKey(representative.id, date), shifts);
        return;
      }

      const activityShifts = params.activityShiftsByRepresentativeDate.get(
        buildRepresentativeDateKey(representative.id, date)
      );
      const resolvedShifts = activityShifts
        ? shifts.filter((shift) => activityShifts.has(shift))
        : [];

      planned.set(
        buildRepresentativeDateKey(representative.id, date),
        resolvedShifts.length > 0 ? resolvedShifts : [representative.baseShift]
      );
    });
  });

  return planned;
}

function buildTargetMap(params: {
  representatives: Representative[];
  incidents: Incident[];
  commercialGoals: CommercialGoal[];
  periodKind: OperationalCompetitiveResolvedPeriod['kind'];
  dates: string[];
  allCalendarDays: ReturnType<typeof createCalendarDaysForDates>;
  specialSchedules: SpecialSchedule[];
  activityShiftsByRepresentativeDate: Map<string, Set<ShiftType>>;
}) {
  const targetMap = new Map<string, TargetAccumulator>();
  const plannedShiftMap = buildPlannedShiftMap(params);
  const monthlyTargetKeys = new Set<string>();

  params.dates.forEach((date) => {
    params.representatives.forEach((representative) => {
      const shifts =
        plannedShiftMap.get(buildRepresentativeDateKey(representative.id, date)) ?? [];

      shifts.forEach((shift) => {
        const segment = getRepresentativeSegment(
          representative,
          date,
          params.specialSchedules
        );
        const key = buildAssignmentKey(representative.id, shift, segment);
        const monthlyTargetPerRepresentative = getCommercialGoalTarget(
          params.commercialGoals,
          shift,
          segment
        );
        const current = targetMap.get(key) ?? {
          target: 0,
          monthlyTargetPerRepresentative,
          plannedDates: new Set<string>(),
        };

        current.monthlyTargetPerRepresentative = monthlyTargetPerRepresentative;
        if (params.periodKind === 'MONTH') {
          if (!monthlyTargetKeys.has(key)) {
            current.target += monthlyTargetPerRepresentative;
            monthlyTargetKeys.add(key);
          }
        } else {
          current.target += monthlyTargetPerRepresentative / daysInMonthFromIso(date);
        }
        current.plannedDates.add(date);
        targetMap.set(key, current);
      });
    });
  });

  return targetMap;
}

function buildIncidentMap(params: {
  representativesById: Map<string, Representative>;
  incidents: Incident[];
  period: OperationalCompetitiveResolvedPeriod;
  allCalendarDays: ReturnType<typeof createCalendarDaysForDates>;
  specialSchedules: SpecialSchedule[];
}) {
  const incidentMap = new Map<string, IncidentAccumulator>();
  const periodDateSet = new Set(params.period.loadedDates);

  params.incidents.forEach((incident) => {
    if (!['ERROR', 'AUSENCIA', 'TARDANZA'].includes(incident.type)) {
      return;
    }

    const representative = params.representativesById.get(incident.representativeId);

    if (!representative) {
      return;
    }

    const resolvedDates = resolveIncidentDates(
      incident,
      params.allCalendarDays,
      representative
    ).dates.filter((date) => periodDateSet.has(date));

    if (resolvedDates.length === 0) {
      return;
    }

    const shift =
      incident.assignment?.type === 'SINGLE'
        ? incident.assignment.shift
        : representative.baseShift;

    resolvedDates.forEach((date) => {
      const segment = getRepresentativeSegment(
        representative,
        date,
        params.specialSchedules
      );
      const key = buildAssignmentKey(representative.id, shift, segment);
      const current = incidentMap.get(key) ?? {
        incidents: 0,
        errors: 0,
        absences: 0,
        tardiness: 0,
      };

      current.incidents += 1;

      if (incident.type === 'ERROR') {
        current.errors += 1;
      }

      if (incident.type === 'AUSENCIA') {
        current.absences += 1;
      }

      if (incident.type === 'TARDANZA') {
        current.tardiness += 1;
      }

      incidentMap.set(key, current);
    });
  });

  return incidentMap;
}

function processRepresentativeTransactions(params: {
  transactions: Transaction[];
  representatives: Representative[];
  manualRepresentativeLinks: ManualRepresentativeLink[];
  period: OperationalCompetitiveResolvedPeriod;
  specialSchedules: SpecialSchedule[];
  collectWarnings: boolean;
}) {
  const assignmentStats = new Map<string, AssignmentAccumulator>();
  const validTransactionsByRepresentative = new Map<string, number>();
  const validTransactionsByAssignment = new Map<string, number>();
  const activityShiftsByRepresentativeDate = new Map<string, Set<ShiftType>>();
  const pendingAgentNames: Record<ShiftType, Set<string>> = {
    DAY: new Set<string>(),
    NIGHT: new Set<string>(),
  };
  const missingAgentRegistrations: Record<ShiftType, number> = {
    DAY: 0,
    NIGHT: 0,
  };
  const reconciliation = new Map<string, ReconciliationAccumulator>();
  const periodDateSet = new Set(params.period.loadedDates);
  const periodTransactions = params.transactions.filter((transaction) =>
    periodDateSet.has(transaction.fecha)
  );
  const lastLoadedDate =
    [...new Set(periodTransactions.map((transaction) => transaction.fecha))].sort().at(-1) ??
    null;
  const weekWindowStart =
    params.period.kind === 'DAY'
      ? lastLoadedDate
        ? addDays(lastLoadedDate, -6)
        : null
      : params.period.from;
  const monthReference = params.period.anchorDate;
  const resolveRepresentative = createRepresentativeLinkResolver(
    params.representatives,
    params.manualRepresentativeLinks
  );
  let sourceValidTransactions = 0;
  let sourceCancelledTransactions = 0;
  let officialValidTransactions = 0;
  let officialCancelledTransactions = 0;
  let excludedValidTransactions = 0;
  let excludedCancelledTransactions = 0;

  periodTransactions.forEach((transaction) => {
    if (isCallCenterSourceTransaction(transaction)) {
      if (transaction.estatus === 'N') {
        sourceValidTransactions += 1;
      } else {
        sourceCancelledTransactions += 1;
      }
    }

    const shift = resolveTransactionShift(transaction.hora);

    if (!shift || !isCallCenterRepresentativeTransaction(transaction)) {
      return;
    }

    const isValidTransaction = transaction.estatus === 'N';
    const rawAgentName = String(transaction.agente ?? '').trim();

    if (!rawAgentName) {
      if (params.collectWarnings) {
        missingAgentRegistrations[shift] += 1;
      }

      addReconciliationRecord(reconciliation, {
        reason: 'missing_agent',
        shift,
        agentName: null,
        isValidTransaction,
      });

      if (isValidTransaction) {
        excludedValidTransactions += 1;
      } else {
        excludedCancelledTransactions += 1;
      }

      return;
    }

    const resolution = resolveRepresentative(rawAgentName);

    if (resolution.status === 'omitted') {
      addReconciliationRecord(reconciliation, {
        reason: 'manual_omit',
        shift,
        agentName: rawAgentName,
        isValidTransaction,
      });

      if (isValidTransaction) {
        excludedValidTransactions += 1;
      } else {
        excludedCancelledTransactions += 1;
      }

      return;
    }

    if (resolution.status === 'unlinked') {
      if (params.collectWarnings) {
        pendingAgentNames[shift].add(rawAgentName);
      }

      addReconciliationRecord(reconciliation, {
        reason: 'unlinked_agent',
        shift,
        agentName: rawAgentName,
        isValidTransaction,
      });

      if (isValidTransaction) {
        excludedValidTransactions += 1;
      } else {
        excludedCancelledTransactions += 1;
      }

      return;
    }

    const representative = resolution.representative;
    const segment = getRepresentativeSegment(
      representative,
      transaction.fecha,
      params.specialSchedules
    );
    const current = ensureAssignmentAccumulator(
      assignmentStats,
      representative,
      shift,
      segment
    );

    addShiftActivity(
      activityShiftsByRepresentativeDate,
      representative.id,
      transaction.fecha,
      shift
    );

    if (isValidTransaction) {
      current.transacciones += 1;
      current.ventas += adjustOfficialSystemAgentSales(transaction.valor || 0);
      current.ticketPromedio =
        current.transacciones > 0 ? current.ventas / current.transacciones : 0;
      current.plannedDates.add(transaction.fecha);

      if (lastLoadedDate && transaction.fecha === lastLoadedDate) {
        current.lastLoadedDayTransactions += 1;
      }

      if (weekWindowStart && transaction.fecha >= weekWindowStart) {
        current.weeklyTransactions += 1;
      }

      if (monthReference && isSameMonth(transaction.fecha, monthReference)) {
        current.monthlyTransactions += 1;
      }

      validTransactionsByRepresentative.set(
        representative.id,
        (validTransactionsByRepresentative.get(representative.id) ?? 0) + 1
      );
      validTransactionsByAssignment.set(
        buildAssignmentKey(representative.id, shift, segment),
        (validTransactionsByAssignment.get(
          buildAssignmentKey(representative.id, shift, segment)
        ) ?? 0) + 1
      );
      officialValidTransactions += 1;
    } else {
      current.cancelledTransactions += 1;
      officialCancelledTransactions += 1;
    }
  });

  return {
    assignmentStats,
    validTransactionsByRepresentative,
    validTransactionsByAssignment,
    activityShiftsByRepresentativeDate,
    pendingAgentNames,
    missingAgentRegistrations,
    reconciliation,
    sourceValidTransactions,
    sourceCancelledTransactions,
    officialValidTransactions,
    officialCancelledTransactions,
    excludedValidTransactions,
    excludedCancelledTransactions,
  } satisfies TransactionProcessingResult;
}

function finalizeGoalSummary(rows: RepresentativePerformanceAssignmentRow[]): RepresentativeGoalSummary {
  const representatives = rows.length;
  const uniqueMonthlyTargets = [...new Set(rows.map((row) => row.monthlyTargetPerRepresentative))];
  const target = rows.reduce((total, row) => total + row.target, 0);
  const validTransactions = rows.reduce((total, row) => total + row.transacciones, 0);
  const cancelledTransactions = rows.reduce(
    (total, row) => total + row.cancelledTransactions,
    0
  );

  return {
    representatives,
    monthlyTargetPerRepresentative:
      uniqueMonthlyTargets.length === 1 ? uniqueMonthlyTargets[0] : null,
    target,
    validTransactions,
    cancelledTransactions,
    progressPct: target > 0 ? (validTransactions / target) * 100 : 0,
  };
}

export function buildRepresentativePerformanceReport({
  representatives,
  incidents,
  commercialGoals,
  calendar,
  specialSchedules = [],
  currentPeriod,
  currentTransactions,
  currentTransactionDates,
  comparisonPreset = 'NONE',
  comparisonPeriod = null,
  comparisonTransactions = [],
  comparisonTransactionDates,
  manualRepresentativeLinks = [],
}: BuildRepresentativePerformanceReportInput): RepresentativePerformanceReport {
  const eligibleRepresentatives = representatives.filter(
    (representative) =>
      representative.isActive !== false && representative.commercialEligible === true
  );
  const representativesById = new Map(
    eligibleRepresentatives.map((representative) => [representative.id, representative])
  );
  const relevantDates = [
    ...currentPeriod.loadedDates,
    ...(currentTransactionDates ?? []),
    ...(comparisonPeriod?.loadedDates ?? []),
    ...(comparisonTransactionDates ?? []),
  ];
  const allCalendarDays = createCalendarDaysForDates(relevantDates, calendar);
  const currentState = processRepresentativeTransactions({
    transactions: currentTransactions,
    representatives: eligibleRepresentatives,
    manualRepresentativeLinks,
    period: currentPeriod,
    specialSchedules,
    collectWarnings: true,
  });
  const comparisonState = comparisonPeriod
    ? processRepresentativeTransactions({
        transactions: comparisonTransactions,
        representatives: eligibleRepresentatives,
        manualRepresentativeLinks,
        period: comparisonPeriod,
        specialSchedules,
        collectWarnings: false,
      })
    : null;
  const currentTargetMap = buildTargetMap({
    representatives: eligibleRepresentatives,
    incidents,
    commercialGoals,
    periodKind: currentPeriod.kind,
    dates: [...new Set((currentTransactionDates ?? currentPeriod.loadedDates).filter(Boolean))].sort(),
    allCalendarDays,
    specialSchedules,
    activityShiftsByRepresentativeDate: currentState.activityShiftsByRepresentativeDate,
  });
  const incidentMap = buildIncidentMap({
    representativesById,
    incidents,
    period: currentPeriod,
    allCalendarDays,
    specialSchedules,
  });
  const visibleKeys = [
    ...new Set([
      ...currentState.assignmentStats.keys(),
      ...currentTargetMap.keys(),
      ...incidentMap.keys(),
    ]),
  ];
  const assignmentRows = visibleKeys
    .map((key) => {
      const base = currentState.assignmentStats.get(key);
      const targetState = currentTargetMap.get(key);
      const incidentState = incidentMap.get(key);

      if (!base && !targetState && !incidentState) {
        return null;
      }

      const [representativeId, shift, segment] = key.split(':') as [
        string,
        ShiftType,
        CommercialGoalSegment,
      ];
      const representative = representativesById.get(representativeId);

      if (!representative) {
        return null;
      }

      const currentValidTransactions = base?.transacciones ?? 0;
      const target = targetState?.target ?? 0;
      const row: RepresentativePerformanceAssignmentRow = {
        representativeId,
        agente: representative.name,
        tipo: 'agente',
        codigo: representative.id,
        shift,
        segment,
        transacciones: currentValidTransactions,
        ventas: base?.ventas ?? 0,
        ticketPromedio:
          currentValidTransactions > 0 ? (base?.ventas ?? 0) / currentValidTransactions : 0,
        target,
        monthlyTargetPerRepresentative:
          targetState?.monthlyTargetPerRepresentative ??
          getCommercialGoalTarget(commercialGoals, shift, segment),
        progressPct: target > 0 ? (currentValidTransactions / target) * 100 : 0,
        cancelledTransactions: base?.cancelledTransactions ?? 0,
        lastLoadedDayTransactions: base?.lastLoadedDayTransactions ?? 0,
        weeklyTransactions: base?.weeklyTransactions ?? 0,
        monthlyTransactions: base?.monthlyTransactions ?? 0,
        incidents: incidentState?.incidents ?? 0,
        errors: incidentState?.errors ?? 0,
        absences: incidentState?.absences ?? 0,
        tardiness: incidentState?.tardiness ?? 0,
        comparisonDelta:
          comparisonPreset === 'NONE'
            ? null
            : currentValidTransactions -
              (comparisonState?.validTransactionsByAssignment.get(key) ?? 0),
        plannedDates: [...(targetState?.plannedDates ?? new Set<string>())].sort(),
        hasCoverageGap: false,
      };

      if (
        row.transacciones === 0 &&
        row.cancelledTransactions === 0 &&
        row.target === 0 &&
        row.incidents === 0
      ) {
        return null;
      }

      return row;
    })
    .filter((row): row is RepresentativePerformanceAssignmentRow => Boolean(row));

  const groupedShifts = (['DAY', 'NIGHT'] as const).reduce<
    Record<ShiftType, RepresentativePerformanceShiftGroup>
  >(
    (accumulator, shift) => {
      const groups = (['PART_TIME', 'FULL_TIME', 'MIXTO'] as const).map((segment) => {
        const rows = sortAssignmentRows(
          assignmentRows.filter((row) => row.shift === shift && row.segment === segment)
        );
        const goalSummary = finalizeGoalSummary(rows);
        const incidentsTotal = rows.reduce((total, row) => total + row.incidents, 0);
        const errorsTotal = rows.reduce((total, row) => total + row.errors, 0);
        const absencesTotal = rows.reduce((total, row) => total + row.absences, 0);
        const tardinessTotal = rows.reduce((total, row) => total + row.tardiness, 0);
        const comparisonDelta =
          comparisonPreset === 'NONE'
            ? null
            : rows.reduce((total, row) => total + (row.comparisonDelta ?? 0), 0);

        return {
          shift,
          segment,
          label: SEGMENT_LABELS[segment],
          summary: {
            ...goalSummary,
            incidents: incidentsTotal,
            errors: errorsTotal,
            absences: absencesTotal,
            tardiness: tardinessTotal,
            comparisonDelta,
          },
          rows,
        } satisfies RepresentativePerformanceGroup;
      });

      accumulator[shift] = {
        shift,
        label: SHIFT_LABELS[shift],
        groups,
        pendingAgentNames: [...currentState.pendingAgentNames[shift]].sort((left, right) =>
          left.localeCompare(right, 'es')
        ),
        missingAgentRegistrations: currentState.missingAgentRegistrations[shift],
      };

      return accumulator;
    },
    {
      DAY: {
        shift: 'DAY',
        label: SHIFT_LABELS.DAY,
        groups: [],
        pendingAgentNames: [],
        missingAgentRegistrations: 0,
      },
      NIGHT: {
        shift: 'NIGHT',
        label: SHIFT_LABELS.NIGHT,
        groups: [],
        pendingAgentNames: [],
        missingAgentRegistrations: 0,
      },
    }
  );

  const byRepresentative = sortRepresentativeRows(
    [...assignmentRows.reduce<Map<string, RepresentativePerformanceRow>>((accumulator, row) => {
      const current = accumulator.get(row.representativeId);

      if (!current) {
        accumulator.set(row.representativeId, {
          representativeId: row.representativeId,
          agente: row.agente,
          tipo: 'agente',
          codigo: row.codigo,
          transacciones: row.transacciones,
          ventas: row.ventas,
          ticketPromedio: row.ticketPromedio,
          target: row.target,
          monthlyTargetPerRepresentative: row.monthlyTargetPerRepresentative,
          progressPct: row.target > 0 ? (row.transacciones / row.target) * 100 : 0,
          cancelledTransactions: row.cancelledTransactions,
          lastLoadedDayTransactions: row.lastLoadedDayTransactions,
          weeklyTransactions: row.weeklyTransactions,
          monthlyTransactions: row.monthlyTransactions,
          incidents: row.incidents,
          errors: row.errors,
          absences: row.absences,
          tardiness: row.tardiness,
          comparisonDelta: row.comparisonDelta,
          shifts: [row.shift],
          segments: [row.segment],
          breakdown: [row],
        });
        return accumulator;
      }

      current.transacciones += row.transacciones;
      current.ventas += row.ventas;
      current.ticketPromedio =
        current.transacciones > 0 ? current.ventas / current.transacciones : 0;
      current.target += row.target;
      current.progressPct =
        current.target > 0 ? (current.transacciones / current.target) * 100 : 0;
      current.cancelledTransactions += row.cancelledTransactions;
      current.lastLoadedDayTransactions += row.lastLoadedDayTransactions;
      current.weeklyTransactions += row.weeklyTransactions;
      current.monthlyTransactions += row.monthlyTransactions;
      current.incidents += row.incidents;
      current.errors += row.errors;
      current.absences += row.absences;
      current.tardiness += row.tardiness;
      current.comparisonDelta =
        comparisonPreset === 'NONE'
          ? null
          : (current.comparisonDelta ?? 0) + (row.comparisonDelta ?? 0);
      current.shifts = [...new Set([...current.shifts, row.shift])];
      current.segments = [...new Set([...current.segments, row.segment])];
      current.breakdown = sortAssignmentRows([...current.breakdown, row]);
      current.monthlyTargetPerRepresentative =
        current.monthlyTargetPerRepresentative === row.monthlyTargetPerRepresentative
          ? current.monthlyTargetPerRepresentative
          : null;

      return accumulator;
    }, new Map()).values()]
  );

  const globalGoalSummary = finalizeGoalSummary(assignmentRows);
  const pendingAgentNames = [
    ...new Set([
      ...groupedShifts.DAY.pendingAgentNames,
      ...groupedShifts.NIGHT.pendingAgentNames,
    ]),
  ].sort((left, right) => left.localeCompare(right, 'es'));
  const dataQualityWarnings: string[] = [];

  (['DAY', 'NIGHT'] as const).forEach((shift) => {
    if (groupedShifts[shift].pendingAgentNames.length > 0) {
      dataQualityWarnings.push(
        `${SHIFT_LABELS[shift]}: ${groupedShifts[shift].pendingAgentNames.length} agente(s) sin enlace manual.`
      );
    }

    if (groupedShifts[shift].missingAgentRegistrations > 0) {
      dataQualityWarnings.push(
        `${SHIFT_LABELS[shift]}: ${groupedShifts[shift].missingAgentRegistrations} transacción(es) sin agente identificado.`
      );
    }
  });

  return {
    byRepresentative,
    byAssignment: assignmentRows,
    shifts: groupedShifts,
    globalSummary: {
      ...globalGoalSummary,
      activeRepresentatives: byRepresentative.length,
      incidents: assignmentRows.reduce((total, row) => total + row.incidents, 0),
      errors: assignmentRows.reduce((total, row) => total + row.errors, 0),
      absences: assignmentRows.reduce((total, row) => total + row.absences, 0),
      tardiness: assignmentRows.reduce((total, row) => total + row.tardiness, 0),
      comparisonDelta:
        comparisonPreset === 'NONE'
          ? null
          : assignmentRows.reduce((total, row) => total + (row.comparisonDelta ?? 0), 0),
    },
    reconciliation: {
      sourceValidTransactions: currentState.sourceValidTransactions,
      sourceCancelledTransactions: currentState.sourceCancelledTransactions,
      officialValidTransactions: currentState.officialValidTransactions,
      officialCancelledTransactions: currentState.officialCancelledTransactions,
      excludedValidTransactions: currentState.excludedValidTransactions,
      excludedCancelledTransactions: currentState.excludedCancelledTransactions,
      importedRepresentativeValidTransactions:
        currentState.officialValidTransactions + currentState.excludedValidTransactions,
      importedRepresentativeCancelledTransactions:
        currentState.officialCancelledTransactions +
        currentState.excludedCancelledTransactions,
      items: [...currentState.reconciliation.values()].sort((left, right) => {
        if (right.validTransactions !== left.validTransactions) {
          return right.validTransactions - left.validTransactions;
        }

        if (right.cancelledTransactions !== left.cancelledTransactions) {
          return right.cancelledTransactions - left.cancelledTransactions;
        }

        return String(left.agentName ?? '').localeCompare(String(right.agentName ?? ''), 'es');
      }),
    },
    pendingAgentNames,
    dataQualityWarnings,
  };
}
