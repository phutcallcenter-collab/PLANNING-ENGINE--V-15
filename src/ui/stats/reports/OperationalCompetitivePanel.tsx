'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Download,
  Link2,
  Printer,
  Trash2,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useDashboardStore } from '@/ui/reports/analysis-beta/store/dashboard.store';
import {
  buildComparisonPeriodSummary,
  buildComparisonSelectionOptions,
  resolveComparisonRange,
} from '@/ui/reports/analysis-beta/services/comparison.service';
import { loadCachedDailySources } from '@/ui/reports/analysis-beta/services/report-source-cache.service';
import type {
  OperationalCompetitiveComparisonPreset,
  OperationalCompetitivePeriodKind,
  OperationalCompetitiveResolvedPeriod,
} from '@/domain/reports/operationalTypes';
import { OperationalCompetitiveShiftLeaderboard } from './OperationalCompetitiveShiftLeaderboard';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/ui/reports/analysis-beta/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/reports/analysis-beta/ui/select';
import type {
  MonthlyOperationalSnapshot,
  Transaction,
} from '@/ui/reports/analysis-beta/types/dashboard.types';
import { downloadElementAsImage } from '@/ui/lib/downloadElementAsImage';
import {
  buildRepresentativePerformanceReport,
} from '@/ui/reports/analysis-beta/services/representative-performance.service';
import {
  buildMonthlyRepresentativePerformance,
} from '@/ui/reports/analysis-beta/services/monthly-representative-performance.service';
import {
  normalizeRepresentativeLinkName,
  OMIT_REPRESENTATIVE_LINK,
} from '@/ui/reports/analysis-beta/services/representative-link.service';

type ComparisonMode = 'full_day' | 'week' | 'month';

function getComparisonMode(kind: OperationalCompetitivePeriodKind): ComparisonMode {
  if (kind === 'WEEK') {
    return 'week';
  }

  if (kind === 'MONTH') {
    return 'month';
  }

  return 'full_day';
}

function getComparisonPreset(
  kind: OperationalCompetitivePeriodKind
): OperationalCompetitiveComparisonPreset {
  if (kind === 'WEEK') {
    return 'WEEK_PREVIOUS';
  }

  if (kind === 'MONTH') {
    return 'MONTH_PREVIOUS';
  }

  return 'DAY_PREVIOUS';
}

function shiftUtcDate(dateStr: string, days: number) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(year, (month || 1) - 1, day || 1));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function shiftUtcMonth(dateStr: string, months: number) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(year, (month || 1) - 1, day || 1));
  date.setUTCMonth(date.getUTCMonth() + months);
  return date.toISOString().slice(0, 10);
}

function groupTransactionsByDate(transactions: Transaction[]) {
  return transactions.reduce<Map<string, Transaction[]>>((accumulator, transaction) => {
    const current = accumulator.get(transaction.fecha) ?? [];
    current.push(transaction);
    accumulator.set(transaction.fecha, current);
    return accumulator;
  }, new Map());
}

function mergeTransactionsForDates(params: {
  dates: string[];
  sourcesByDate: Map<
    string,
    {
      rawTransactions: Transaction[];
    }
  >;
  fallbackTransactionsByDate: Map<string, Transaction[]>;
  allowFallback?: boolean;
}) {
  const transactionsById = new Map<string, Transaction>();

  params.dates.forEach((date) => {
    const cachedTransactions = params.sourcesByDate.get(date)?.rawTransactions ?? [];
    const fallbackTransactions = params.allowFallback === false
      ? []
      : params.fallbackTransactionsByDate.get(date) ?? [];

    [...cachedTransactions, ...fallbackTransactions].forEach((transaction) => {
      transactionsById.set(transaction.id, transaction);
    });
  });

  return [...transactionsById.values()];
}

function resolveTransactionCoverageDates(
  dates: string[],
  dailyHistory: Record<
    string,
    | {
        coverage?: {
          transactionsLoaded?: boolean;
        };
      }
    | undefined
  >
) {
  return dates.reduce(
    (accumulator, date) => {
      if (dailyHistory[date]?.coverage?.transactionsLoaded) {
        accumulator.readyDates.push(date);
      } else {
        accumulator.missingDates.push(date);
      }

      return accumulator;
    },
    {
      readyDates: [] as string[],
      missingDates: [] as string[],
    }
  );
}

function buildResolvedPeriod(params: {
  anchorDate: string;
  kind: OperationalCompetitivePeriodKind;
  availableDates: string[];
}): OperationalCompetitiveResolvedPeriod {
  const periodMode = getComparisonMode(params.kind);
  const summary = buildComparisonPeriodSummary({
    anchorDate: params.anchorDate,
    periodMode,
    loadedDates: params.availableDates,
  });
  const range = resolveComparisonRange(params.anchorDate, periodMode);

  return {
    kind: params.kind,
    anchorDate: params.anchorDate,
    label: summary.label,
    from: range.start,
    to: range.end,
    loadedDays: summary.loadedDays,
    expectedDays: summary.expectedDays,
    loadedDates: params.availableDates.filter(
      (date) => date >= range.start && date <= range.end
    ),
    isComplete: summary.isComplete,
  };
}

function buildResolvedMonthlyPeriod(
  snapshot: MonthlyOperationalSnapshot
): OperationalCompetitiveResolvedPeriod {
  return {
    kind: 'MONTH',
    anchorDate: snapshot.startDate,
    label: snapshot.monthLabel,
    from: snapshot.startDate,
    to: snapshot.endDate,
    loadedDays: snapshot.loadedDays,
    expectedDays: snapshot.expectedDays,
    loadedDates: [...new Set(snapshot.loadedDates)].sort(),
    isComplete: snapshot.loadedDays >= snapshot.expectedDays,
  };
}

type OperationalCompetitivePanelProps = {
  onOpenCallCenter: () => void;
};

type SurfaceProps = {
  performanceReport: ReturnType<typeof buildRepresentativePerformanceReport>;
  currentPeriod: OperationalCompetitiveResolvedPeriod;
  comparisonEnabled: boolean;
  comparisonLabel: string;
  comparisonPeriod: OperationalCompetitiveResolvedPeriod | null;
  periodKind: OperationalCompetitivePeriodKind;
  currentTransactionCoverage: { readyDates: string[]; missingDates: string[] };
  sourceValidTransactions: number;
  onManageLinks: () => void;
};

function OperationalCompetitiveSurface({
  performanceReport,
  currentPeriod,
  comparisonEnabled,
  comparisonLabel,
  comparisonPeriod,
  periodKind,
  currentTransactionCoverage,
  sourceValidTransactions,
  onManageLinks,
}: SurfaceProps) {
  const pendingUnlinkedAgents = performanceReport.reconciliation.items.filter(
    (item) => item.reason === 'unlinked_agent' && item.agentName
  );
  const excludedTransactionCount = performanceReport.reconciliation.excludedValidTransactions;
  const systemIncidents = performanceReport.globalSummary.incidents;

  return (
    <div
      style={{
        display: 'grid',
        gap: '22px',
      }}
    >
      <section
        className="report-print-avoid-break"
        style={{
          borderRadius: '24px',
          background:
            'linear-gradient(180deg, var(--surface-raised) 0%, var(--surface-tint) 100%)',
          color: 'var(--text-main)',
          padding: '20px',
          border: '1px solid var(--shell-border)',
          boxShadow: 'var(--shadow-sm)',
          display: 'grid',
          gap: '16px',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: '20px',
            flexWrap: 'wrap',
            alignItems: 'flex-start',
          }}
        >
          <div style={{ display: 'grid', gap: '6px', maxWidth: '780px' }}>
            <div
              style={{
                fontSize: '0.72rem',
                fontWeight: 800,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'var(--accent)',
              }}
            >
              Ranking operativo
            </div>
            <h2
              style={{
                margin: 0,
                fontSize: '1.35rem',
                fontWeight: 800,
                letterSpacing: 0,
              }}
            >
              Transacciones del acumulado mensual · incidencias del sistema
            </h2>
            <p
              style={{
                margin: 0,
                color: 'var(--text-muted)',
                lineHeight: 1.55,
                fontSize: '0.9rem',
              }}
            >
              Fuente transaccional única: análisis de llamadas / Call Center. La vista de{' '}
              {periodKind === 'DAY' ? 'día' : periodKind === 'WEEK' ? 'semana' : 'mes'} usa
              el mismo acumulado operativo; las incidencias se leen del sistema.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gap: '10px',
              minWidth: '260px',
            }}
          >
            <div
              style={{
                borderRadius: '18px',
                border: '1px solid var(--shell-border)',
                background: 'rgba(255,255,255,0.48)',
                padding: '12px 14px',
              }}
            >
              <div
                style={{
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'var(--text-faint)',
                }}
              >
                Período
              </div>
              <div style={{ marginTop: '4px', fontSize: '1rem', fontWeight: 800 }}>
                {currentPeriod.label}
              </div>
              <div style={{ marginTop: '4px', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                {comparisonEnabled && comparisonPeriod
                  ? `Comparado con ${comparisonPeriod.label}.`
                  : 'Sin comparación previa.'}
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gap: '14px',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          }}
        >
          {[
            {
              label: 'Representantes activos',
              value: performanceReport.globalSummary.activeRepresentatives.toLocaleString('en-US'),
              note: 'en seguimiento operativo',
            },
            {
              label: periodKind === 'MONTH' ? 'Transacciones CC mensual' : 'Transacciones CC',
              value: sourceValidTransactions.toLocaleString('en-US'),
              note: 'total del análisis de llamadas',
            },
            {
              label: 'Oficial en ranking',
              value: performanceReport.reconciliation.officialValidTransactions.toLocaleString('en-US'),
              note: 'con representante enlazado',
            },
            {
              label: 'Cumplimiento promedio',
              value: formatPercent(performanceReport.globalSummary.progressPct),
              note: 'meta individual por representante',
            },
            {
              label: 'Incidencias sistema',
              value: systemIncidents.toLocaleString('en-US'),
              note: 'errores, ausencias y tardanzas',
            },
          ].map((card) => (
            <div
              key={card.label}
              style={{
                borderRadius: '16px',
                border: '1px solid var(--shell-border)',
                background: 'rgba(255,255,255,0.5)',
                padding: '14px',
              }}
            >
              <div
                style={{
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                }}
              >
                {card.label}
              </div>
              <div style={{ marginTop: '6px', fontSize: '1.45rem', fontWeight: 800 }}>
                {card.value}
              </div>
              <div style={{ marginTop: '4px', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                {card.note}
              </div>
            </div>
          ))}
        </div>
      </section>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
          gap: '18px',
        }}
      >
        <OperationalCompetitiveShiftLeaderboard
          comparisonEnabled={comparisonEnabled}
          comparisonLabel={comparisonLabel}
          table={performanceReport.shifts.DAY}
        />
        <OperationalCompetitiveShiftLeaderboard
          comparisonEnabled={comparisonEnabled}
          comparisonLabel={comparisonLabel}
          table={performanceReport.shifts.NIGHT}
        />
      </div>

      {(excludedTransactionCount > 0 || currentTransactionCoverage.missingDates.length > 0) ? (
        <section
          className="report-print-avoid-break"
          style={{
            borderRadius: '28px',
            border: '1px solid rgba(245, 158, 11, 0.18)',
            background: '#fff7ed',
            padding: '20px 22px',
            display: 'grid',
            gap: '14px',
          }}
        >
          <div
            style={{
              display: 'flex',
              gap: '12px',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '14px',
                  background: 'white',
                  display: 'grid',
                  placeItems: 'center',
                  color: '#d97706',
                  border: '1px solid rgba(245, 158, 11, 0.24)',
                }}
              >
                <AlertTriangle size={18} />
              </div>
              <div>
                <div
                  style={{
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: '#b45309',
                  }}
                >
                  Banda de conciliación
                </div>
                <p
                  style={{
                    margin: '6px 0 0',
                    color: '#92400e',
                    fontSize: '0.95rem',
                    lineHeight: 1.7,
                    maxWidth: '72ch',
                  }}
                >
                  El ranking separa transacciones omitidas, sin enlace o sin agente para que
                  el total siga cuadrando contra el acumulado mensual del análisis de llamadas.
                </p>
              </div>
            </div>

            {pendingUnlinkedAgents.length > 0 ? (
              <button
                type="button"
                onClick={onManageLinks}
                style={{
                  padding: '10px 13px',
                  borderRadius: '14px',
                  border: '1px solid rgba(245, 158, 11, 0.22)',
                  background: 'white',
                  color: '#92400e',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                Enlazar representantes
                <Link2 size={15} />
              </button>
            ) : null}
          </div>

          <div
            style={{
              display: 'grid',
              gap: '10px',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            }}
          >
            <div
              style={{
                borderRadius: '18px',
                border: '1px solid rgba(245, 158, 11, 0.16)',
                background: 'white',
                padding: '14px 16px',
              }}
            >
              <div className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-700">
                Transacciones fuera del ranking
              </div>
              <div className="mt-2 text-2xl font-black text-amber-950">
                {excludedTransactionCount.toLocaleString('en-US')}
              </div>
            </div>

            <div
              style={{
                borderRadius: '18px',
                border: '1px solid rgba(245, 158, 11, 0.16)',
                background: 'white',
                padding: '14px 16px',
              }}
            >
              <div className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-700">
                Fechas sin cobertura transaccional
              </div>
              <div className="mt-2 text-2xl font-black text-amber-950">
                {currentTransactionCoverage.missingDates.length.toLocaleString('en-US')}
              </div>
            </div>
          </div>

          {pendingUnlinkedAgents.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {pendingUnlinkedAgents.map((item) => (
                <span
                  key={item.key}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '999px',
                    background: 'white',
                    border: '1px solid rgba(245, 158, 11, 0.18)',
                    color: '#92400e',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                  }}
                >
                  {item.agentName}
                </span>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

export function OperationalCompetitivePanel({
  onOpenCallCenter,
}: OperationalCompetitivePanelProps) {
  const {
    representatives,
    commercialGoals,
    incidents,
    calendar,
    specialSchedules,
  } = useAppStore((state) => ({
    representatives: state.representatives ?? [],
    commercialGoals: state.commercialGoals ?? [],
    incidents: state.incidents ?? [],
    calendar: state.calendar,
    specialSchedules: state.specialSchedules ?? [],
  }));
  const availableDates = useDashboardStore((state) => state.availableDates);
  const dailyHistory = useDashboardStore((state) => state.dailyHistory);
  const monthlyHistory = useDashboardStore((state) => state.monthlyHistory);
  const monthlySnapshots = useDashboardStore((state) => state.monthlySnapshots);
  const selectedMonthKey = useDashboardStore((state) => state.selectedMonthKey);
  const setSelectedMonthKey = useDashboardStore((state) => state.setSelectedMonthKey);
  const rawTransactions = useDashboardStore((state) => state.rawTransactions);
  const manualRepresentativeLinks = useDashboardStore(
    (state) => state.manualRepresentativeLinks
  );
  const upsertManualRepresentativeLink = useDashboardStore(
    (state) => state.upsertManualRepresentativeLink
  );
  const removeManualRepresentativeLink = useDashboardStore(
    (state) => state.removeManualRepresentativeLink
  );
  const hasHydrated = useDashboardStore((state) => state._hasHydrated);
  const [periodKind, setPeriodKind] = useState<OperationalCompetitivePeriodKind>('DAY');
  const [selectedAnchorDate, setSelectedAnchorDate] = useState<string | null>(null);
  const [comparisonEnabled, setComparisonEnabled] = useState(true);
  const [isLinkManagerOpen, setIsLinkManagerOpen] = useState(false);
  const [isExportingImage, setIsExportingImage] = useState(false);
  const [selectedAgentName, setSelectedAgentName] = useState('');
  const [selectedRepresentativeName, setSelectedRepresentativeName] = useState('');
  const exportImageRef = useRef<HTMLDivElement | null>(null);
  const [sourceData, setSourceData] = useState<{
    isLoading: boolean;
    currentTransactions: Transaction[];
    comparisonTransactions: Transaction[];
  }>({
    isLoading: false,
    currentTransactions: [],
    comparisonTransactions: [],
  });

  const transactionAvailableDates = useMemo(
    () => [...new Set(rawTransactions.map((transaction) => transaction.fecha))].sort(),
    [rawTransactions]
  );
  const fallbackTransactionsByDate = useMemo(
    () => groupTransactionsByDate(rawTransactions),
    [rawTransactions]
  );

  const latestCompleteDate = useMemo(() => {
    return [...availableDates]
      .sort()
      .reverse()
      .find((date) => dailyHistory[date]?.coverage.isComplete) ??
      transactionAvailableDates.at(-1) ??
      null;
  }, [availableDates, dailyHistory, transactionAvailableDates]);

  const monthlyPeriodOptions = useMemo(() => {
    const monthlySource =
      Object.keys(monthlySnapshots).length > 0
        ? Object.values(monthlySnapshots)
        : Object.values(monthlyHistory);

    return monthlySource
      .sort((left, right) => right.monthKey.localeCompare(left.monthKey))
      .map((snapshot) => ({
        value: snapshot.startDate,
        label: `${snapshot.monthLabel} · ${snapshot.loadedDays}/${snapshot.expectedDays} dias`,
        summary: {
          label: snapshot.monthLabel,
          start: snapshot.startDate,
          end: snapshot.endDate,
          loadedDays: snapshot.loadedDays,
          expectedDays: snapshot.expectedDays,
          isComplete: snapshot.loadedDays >= snapshot.expectedDays,
        },
      }));
  }, [monthlyHistory, monthlySnapshots]);

  const periodOptions = useMemo(() => {
    if (periodKind === 'MONTH') {
      return monthlyPeriodOptions;
    }

    if (transactionAvailableDates.length === 0) {
      return [];
    }

    return buildComparisonSelectionOptions({
      availableDates: transactionAvailableDates,
      periodMode: getComparisonMode(periodKind),
    });
  }, [monthlyPeriodOptions, periodKind, transactionAvailableDates]);

  useEffect(() => {
    if (periodOptions.length === 0) {
      setSelectedAnchorDate(null);
      return;
    }

    const selectedMonthOption =
      periodKind === 'MONTH' && selectedMonthKey
        ? periodOptions.find((option) => option.value.startsWith(`${selectedMonthKey}-`))
        : undefined;
    const fallbackAnchorDate =
      periodKind === 'DAY'
        ? latestCompleteDate ?? periodOptions[0]?.value ?? null
        : selectedMonthOption?.value ?? periodOptions[0]?.value ?? null;

    if (!selectedAnchorDate) {
      setSelectedAnchorDate(fallbackAnchorDate);
      return;
    }

    const periodMode = getComparisonMode(periodKind);
    const selectedRange = resolveComparisonRange(selectedAnchorDate, periodMode);
    const matchingOption = periodOptions.find(
      (option) =>
        option.summary.start === selectedRange.start &&
        option.summary.end === selectedRange.end
    );

    if (!matchingOption) {
      setSelectedAnchorDate(fallbackAnchorDate);
      return;
    }

    if (matchingOption.value !== selectedAnchorDate) {
      setSelectedAnchorDate(matchingOption.value);
    }
  }, [latestCompleteDate, periodKind, periodOptions, selectedAnchorDate, selectedMonthKey]);

  useEffect(() => {
    if (periodKind !== 'MONTH' || !selectedAnchorDate) {
      return;
    }

    const monthKey = selectedAnchorDate.slice(0, 7);

    if (monthKey !== selectedMonthKey) {
      setSelectedMonthKey(monthKey);
    }
  }, [periodKind, selectedAnchorDate, selectedMonthKey, setSelectedMonthKey]);

  const activeMonthKey =
    periodKind === 'MONTH'
      ? selectedAnchorDate?.slice(0, 7) ?? selectedMonthKey
      : null;
  const activeMonthlySnapshot = useMemo(
    () =>
      activeMonthKey
        ? monthlySnapshots[activeMonthKey] ?? monthlyHistory[activeMonthKey] ?? null
        : null,
    [activeMonthKey, monthlyHistory, monthlySnapshots]
  );

  const currentPeriod = useMemo(() => {
    if (!selectedAnchorDate) {
      return null;
    }

    if (periodKind === 'MONTH') {
      return activeMonthlySnapshot
        ? buildResolvedMonthlyPeriod(activeMonthlySnapshot)
        : null;
    }

    return buildResolvedPeriod({
      anchorDate: selectedAnchorDate,
      kind: periodKind,
      availableDates: transactionAvailableDates,
    });
  }, [activeMonthlySnapshot, periodKind, selectedAnchorDate, transactionAvailableDates]);

  const comparisonPeriod = useMemo(() => {
    if (!comparisonEnabled || !selectedAnchorDate) {
      return null;
    }

    const comparisonAnchorDate =
      periodKind === 'MONTH'
        ? shiftUtcMonth(selectedAnchorDate, -1)
        : shiftUtcDate(selectedAnchorDate, periodKind === 'WEEK' ? -7 : -1);

    if (periodKind === 'MONTH') {
      const comparisonMonthKey = comparisonAnchorDate.slice(0, 7);
      const comparisonSnapshot =
        monthlySnapshots[comparisonMonthKey] ?? monthlyHistory[comparisonMonthKey] ?? null;

      return comparisonSnapshot
        ? buildResolvedMonthlyPeriod(comparisonSnapshot)
        : null;
    }

    return buildResolvedPeriod({
      anchorDate: comparisonAnchorDate,
      kind: periodKind,
      availableDates: transactionAvailableDates,
    });
  }, [
    comparisonEnabled,
    monthlyHistory,
    monthlySnapshots,
    periodKind,
    selectedAnchorDate,
    transactionAvailableDates,
  ]);

  useEffect(() => {
    let cancelled = false;

    if (!currentPeriod) {
      setSourceData({
        isLoading: false,
        currentTransactions: [],
        comparisonTransactions: [],
      });
      return;
    }

    if (periodKind === 'MONTH' && selectedAnchorDate) {
      const monthKey = selectedAnchorDate.slice(0, 7);
      const comparisonMonthKey = comparisonPeriod
        ? shiftUtcMonth(selectedAnchorDate, -1).slice(0, 7)
        : null;

      const filterByMonth = (transactions: Transaction[], key: string) =>
        transactions.filter((transaction) => transaction.fecha.slice(0, 7) === key);

      setSourceData({
        isLoading: false,
        currentTransactions: filterByMonth(rawTransactions, monthKey),
        comparisonTransactions: comparisonMonthKey
          ? filterByMonth(rawTransactions, comparisonMonthKey)
          : [],
      });
      return;
    }

    const currentDates = currentPeriod.loadedDates;
    const comparisonDates = comparisonPeriod?.loadedDates ?? [];
    const datesToLoad = [...new Set([...currentDates, ...comparisonDates])].sort();

    if (datesToLoad.length === 0) {
      setSourceData({
        isLoading: false,
        currentTransactions: [],
        comparisonTransactions: [],
      });
      return;
    }

    setSourceData((current) => ({
      ...current,
      isLoading: true,
    }));

    void (async () => {
      const sources = await loadCachedDailySources(datesToLoad);

      if (cancelled) {
        return;
      }

      const sourcesByDate = new Map(sources.map((source) => [source.date, source]));

      setSourceData({
        isLoading: false,
        currentTransactions: mergeTransactionsForDates({
          dates: currentDates,
          sourcesByDate,
          fallbackTransactionsByDate,
          allowFallback: true,
        }),
        comparisonTransactions: mergeTransactionsForDates({
          dates: comparisonDates,
          sourcesByDate,
          fallbackTransactionsByDate,
          allowFallback: true,
        }),
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [
    comparisonPeriod,
    currentPeriod,
    fallbackTransactionsByDate,
    periodKind,
    rawTransactions,
    selectedAnchorDate,
  ]);

  const currentTransactionCoverage = useMemo(() => {
    if (!currentPeriod) {
      return { readyDates: [], missingDates: [] };
    }

    return resolveTransactionCoverageDates(currentPeriod.loadedDates, dailyHistory);
  }, [currentPeriod, dailyHistory]);

  const comparisonTransactionCoverage = useMemo(() => {
    if (!comparisonPeriod) {
      return { readyDates: [], missingDates: [] };
    }

    return resolveTransactionCoverageDates(comparisonPeriod.loadedDates, dailyHistory);
  }, [comparisonPeriod, dailyHistory]);

  const performanceReport = useMemo(() => {
    if (!currentPeriod) {
      return null;
    }

    if (periodKind === 'MONTH') {
      if (!activeMonthlySnapshot) {
        return null;
      }

      return buildMonthlyRepresentativePerformance({
        monthSnapshot: activeMonthlySnapshot,
        transactions: sourceData.currentTransactions,
        representatives,
        commercialGoals,
        incidents,
        calendar,
        specialSchedules,
        comparisonPeriod: comparisonEnabled ? comparisonPeriod : null,
        comparisonTransactions: sourceData.comparisonTransactions,
        comparisonTransactionDates: comparisonTransactionCoverage.readyDates,
        manualRepresentativeLinks,
      })?.performanceReport ?? null;
    }

    return buildRepresentativePerformanceReport({
      representatives,
      commercialGoals,
      incidents,
      calendar,
      specialSchedules,
      currentPeriod,
      currentTransactionDates: currentTransactionCoverage.readyDates,
      comparisonPreset: comparisonEnabled ? getComparisonPreset(periodKind) : 'NONE',
      comparisonPeriod: comparisonEnabled ? comparisonPeriod : null,
      comparisonTransactionDates: comparisonTransactionCoverage.readyDates,
      currentTransactions: sourceData.currentTransactions,
      comparisonTransactions: sourceData.comparisonTransactions,
      manualRepresentativeLinks,
    });
  }, [
    activeMonthlySnapshot,
    calendar,
    commercialGoals,
    comparisonEnabled,
    comparisonPeriod,
    comparisonTransactionCoverage.readyDates,
    currentPeriod,
    currentTransactionCoverage.readyDates,
    incidents,
    manualRepresentativeLinks,
    periodKind,
    representatives,
    sourceData.comparisonTransactions,
    sourceData.currentTransactions,
    specialSchedules,
  ]);

  const activeRepresentatives = useMemo(
    () =>
      representatives
        .filter((representative) => representative.isActive)
        .sort((left, right) => left.name.localeCompare(right.name, 'es')),
    [representatives]
  );

  const unresolvedAgentNames = useMemo(
    () =>
      [
        ...new Set(
          (performanceReport?.reconciliation.items ?? [])
            .filter((item) => item.reason === 'unlinked_agent' && item.agentName)
            .map((item) => item.agentName as string)
        ),
      ].sort((left, right) => left.localeCompare(right, 'es')),
    [performanceReport]
  );

  const linkedAgentNames = useMemo(
    () =>
      new Set(
        manualRepresentativeLinks.map((link) =>
          normalizeRepresentativeLinkName(link.agentName)
        )
      ),
    [manualRepresentativeLinks]
  );

  const pendingAgentPills = useMemo(
    () =>
      unresolvedAgentNames.filter(
        (agentName) => !linkedAgentNames.has(normalizeRepresentativeLinkName(agentName))
      ),
    [linkedAgentNames, unresolvedAgentNames]
  );

  const comparisonLabel =
    periodKind === 'DAY'
      ? 'ayer'
      : periodKind === 'WEEK'
        ? 'la semana pasada'
        : 'el mes pasado';
  const sourceValidTransactions =
    periodKind === 'MONTH' && activeMonthlySnapshot
      ? activeMonthlySnapshot.kpis.transaccionesCC
      : performanceReport?.reconciliation.sourceValidTransactions ?? 0;
  const hasNoSourceTransactions =
    periodKind === 'MONTH'
      ? sourceValidTransactions === 0
      : currentTransactionCoverage.readyDates.length === 0;

  const handleSaveManualLink = () => {
    if (!selectedAgentName || !selectedRepresentativeName) {
      return;
    }

    upsertManualRepresentativeLink({
      agentName: selectedAgentName,
      representativeName: selectedRepresentativeName,
    });
    setSelectedAgentName('');
    setSelectedRepresentativeName('');
  };

  const handleDownloadImage = async () => {
    if (!exportImageRef.current || !currentPeriod) {
      return;
    }

    setIsExportingImage(true);

    try {
      await downloadElementAsImage({
        element: exportImageRef.current,
        fileName: `Ranking_Operativo_${currentPeriod.from}_${currentPeriod.to}.png`,
      });
    } catch (error) {
      console.error(error);
      window.alert('No se pudo generar la imagen para compartir. Intenta de nuevo.');
    } finally {
      setIsExportingImage(false);
    }
  };

  if (!hasHydrated) {
    return (
      <section
        style={{
          borderRadius: '28px',
          padding: '24px',
          background: 'var(--surface-raised)',
          color: 'var(--text-main)',
        }}
      >
        <div className="app-shell-loading">Preparando historial de Call Center...</div>
      </section>
    );
  }

  if (transactionAvailableDates.length === 0 && monthlyPeriodOptions.length === 0) {
    return (
      <section
        style={{
          borderRadius: '24px',
          background: 'var(--surface-raised)',
          color: 'var(--text-main)',
          padding: '22px',
          border: '1px solid var(--shell-border)',
          display: 'grid',
          gap: '14px',
        }}
      >
        <div>
          <div className="text-[12px] font-black uppercase tracking-[0.16em] text-slate-500">
            Ranking operativo
          </div>
          <h2 className="mt-2 text-xl font-black tracking-normal">
            Falta cargar historial de Call Center
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            En cuanto haya jornadas cargadas, aquí se arma automáticamente el ranking
            diario, semanal y mensual usando el acumulado del análisis de llamadas.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenCallCenter}
          style={{
            width: 'fit-content',
            padding: '11px 14px',
            borderRadius: '14px',
            border: '1px solid var(--shell-border)',
            background: 'var(--surface-tint)',
            color: 'var(--text-main)',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          Abrir Call Center
          <ArrowRight size={16} />
        </button>
      </section>
    );
  }

  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      <section
        style={{
          borderRadius: '28px',
          border: '1px solid rgba(15,23,42,0.08)',
          background: 'white',
          padding: '18px',
          boxShadow: '0 18px 40px rgba(15, 23, 42, 0.05)',
          display: 'grid',
          gap: '16px',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div className="flex flex-wrap gap-2 rounded-2xl bg-slate-100 p-1.5">
            {([
              { kind: 'DAY', label: 'Día' },
              { kind: 'WEEK', label: 'Semana' },
              { kind: 'MONTH', label: 'Mes' },
            ] as const).map((option) => (
              <button
                key={option.kind}
                type="button"
                onClick={() => setPeriodKind(option.kind)}
                className={periodKind === option.kind ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}
                style={{
                  borderRadius: '14px',
                  padding: '10px 16px',
                  fontWeight: 800,
                  fontSize: '0.9rem',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={selectedAnchorDate ?? undefined}
              onValueChange={(value) => {
                setSelectedAnchorDate(value);

                if (periodKind === 'MONTH') {
                  setSelectedMonthKey(value.slice(0, 7));
                }
              }}
            >
              <SelectTrigger className="min-w-[280px] rounded-xl border-slate-200 bg-white">
                <SelectValue placeholder="Selecciona período..." />
              </SelectTrigger>
              <SelectContent>
                {periodOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <button
              type="button"
              onClick={() => setComparisonEnabled((current) => !current)}
              style={{
                borderRadius: '14px',
                padding: '10px 14px',
                border: '1px solid rgba(148,163,184,0.22)',
                background: comparisonEnabled ? '#111827' : 'white',
                color: comparisonEnabled ? 'white' : '#334155',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              {comparisonEnabled ? 'Comparando' : 'Sin comparar'}
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              style={{
                borderRadius: '14px',
                padding: '10px 14px',
                border: '1px solid rgba(148,163,184,0.22)',
                background: 'white',
                color: '#334155',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Printer size={16} />
              Imprimir
            </button>

            <button
              type="button"
              onClick={handleDownloadImage}
              disabled={isExportingImage || !performanceReport}
              style={{
                borderRadius: '14px',
                padding: '10px 14px',
                border: '1px solid rgba(148,163,184,0.22)',
                background: 'white',
                color: '#334155',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                opacity: isExportingImage ? 0.6 : 1,
              }}
            >
              <Download size={16} />
              {isExportingImage ? 'Generando...' : 'Exportar imagen'}
            </button>
          </div>
        </div>

        {currentPeriod ? (
          <div className="flex flex-wrap gap-2 text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
            <span className="rounded-full bg-slate-100 px-3 py-2">
              {currentPeriod.label}
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-2">
              {currentPeriod.loadedDays}/{currentPeriod.expectedDays} dias cargados
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-2">
              {periodKind === 'MONTH'
                ? `${sourceValidTransactions.toLocaleString('en-US')} txns acumuladas`
                : `${currentTransactionCoverage.readyDates.length}/${currentPeriod.loadedDates.length} dias con transacciones`}
            </span>
          </div>
        ) : null}
      </section>

      {!sourceData.isLoading && currentPeriod && hasNoSourceTransactions ? (
        <section
          style={{
            borderRadius: '28px',
            padding: '24px',
            background: 'white',
            border: '1px solid rgba(15,23,42,0.08)',
            color: '#64748b',
          }}
        >
          Todavía no hay transacciones cargadas para este período.
        </section>
      ) : sourceData.isLoading ? (
        <div className="app-shell-loading">Cargando fuentes competitivas...</div>
      ) : performanceReport && currentPeriod ? (
        <>
          <OperationalCompetitiveSurface
            performanceReport={performanceReport}
            currentPeriod={currentPeriod}
            comparisonEnabled={comparisonEnabled}
            comparisonLabel={comparisonLabel}
            comparisonPeriod={comparisonPeriod}
            periodKind={periodKind}
            currentTransactionCoverage={currentTransactionCoverage}
            sourceValidTransactions={sourceValidTransactions}
            onManageLinks={() => setIsLinkManagerOpen(true)}
          />

          <div
            ref={exportImageRef}
            aria-hidden="true"
            style={{
              position: 'fixed',
              left: '-10000px',
              top: 0,
              width: '1680px',
              padding: '32px',
              background: '#f8fafc',
            }}
          >
            <OperationalCompetitiveSurface
              performanceReport={performanceReport}
              currentPeriod={currentPeriod}
              comparisonEnabled={comparisonEnabled}
              comparisonLabel={comparisonLabel}
              comparisonPeriod={comparisonPeriod}
              periodKind={periodKind}
              currentTransactionCoverage={currentTransactionCoverage}
              sourceValidTransactions={sourceValidTransactions}
              onManageLinks={() => undefined}
            />
          </div>
        </>
      ) : (
        <section
          style={{
            borderRadius: '28px',
            padding: '24px',
            background: 'white',
            border: '1px solid rgba(15,23,42,0.08)',
            color: '#64748b',
          }}
        >
          No hay suficientes datos para construir el ranking operativo.
        </section>
      )}

      <Dialog open={isLinkManagerOpen} onOpenChange={setIsLinkManagerOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Enlaces de representantes</DialogTitle>
            <DialogDescription>
              Resuelve aquí los agentes del reporte que todavía no coinciden con el
              roster oficial, o márcalos para excluirlos del ranking.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Select value={selectedAgentName} onValueChange={setSelectedAgentName}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona agente del reporte" />
              </SelectTrigger>
              <SelectContent>
                {pendingAgentPills.map((agentName) => (
                  <SelectItem key={agentName} value={agentName}>
                    {agentName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={selectedRepresentativeName}
              onValueChange={setSelectedRepresentativeName}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona representante del sistema" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={OMIT_REPRESENTATIVE_LINK}>
                  Omitir de lo oficial (supervisión / apoyo)
                </SelectItem>
                {activeRepresentatives.map((representative) => (
                  <SelectItem key={representative.id} value={representative.name}>
                    {representative.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="max-h-56 overflow-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.1em] text-slate-500">
                <tr>
                  <th className="px-3 py-2">Agente reporte</th>
                  <th className="px-3 py-2">Representante</th>
                  <th className="px-3 py-2 text-right">Acción</th>
                </tr>
              </thead>
              <tbody>
                {manualRepresentativeLinks.map((link) => (
                  <tr key={link.agentName} className="border-t border-slate-100">
                    <td className="px-3 py-2">{link.agentName}</td>
                    <td className="px-3 py-2">
                      {link.representativeName === OMIT_REPRESENTATIVE_LINK
                        ? 'Omitido de lo oficial'
                        : link.representativeName}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => removeManualRepresentativeLink(link.agentName)}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-red-600"
                        title="Eliminar enlace manual"
                        aria-label="Eliminar enlace manual"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {manualRepresentativeLinks.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-3 py-6 text-center text-sm text-slate-500">
                      No hay enlaces manuales guardados todavía.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <DialogFooter>
            <button
              type="button"
              onClick={handleSaveManualLink}
              disabled={!selectedAgentName || !selectedRepresentativeName}
              className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
            >
              Guardar enlace
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}
