import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import { get, set, del } from 'idb-keyval';
import { READ_ONLY_ACTION_MESSAGE } from '@/lib/access/access';
import { canCurrentUserEditData } from '@/store/useAccessStore';
import type {
  AnsweredCall,
  AbandonedCall,
  Transaction,
  KPIs,
  ShiftKPIs,
  Shift,
  DailySnapshot,
  ComparisonConfig,
  ComparisonResult,
  CommercialView,
  ComparisonPreset,
  WorkspaceView,
  MonthlyOperationalSnapshot,
  MonthlyReportSnapshot,
  SourceManifestEntry,
} from '@/ui/reports/analysis-beta/types/dashboard.types';
import { buildDailySnapshot } from '@/ui/reports/analysis-beta/services/kpi.service';
import { buildComparisonResult } from '@/ui/reports/analysis-beta/services/comparison.service';
import {
  normalizeRepresentativeLinkName,
  type ManualRepresentativeLink,
} from '@/ui/reports/analysis-beta/services/representative-link.service';
import { buildMonthlyOperationalHistory } from '@/ui/reports/analysis-beta/services/monthly-report.service';
import {
  buildMonthlyOperationalHistoryFromReportSnapshots,
  buildMonthlyReportSnapshot,
  mergeMonthlyReportSnapshots,
} from '@/ui/reports/analysis-beta/services/monthly-snapshot.service';
import {
  clearCachedDailySources,
  deleteCachedDailySource,
  flattenCachedDailySources,
  loadCachedSourcesForMonth,
  patchCachedDailySources,
  seedCachedDailySources,
  type CachedDailySourceData,
} from '@/ui/reports/analysis-beta/services/report-source-cache.service';

// Custom storage for IndexedDB using idb-keyval
const idbStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    if (typeof window === 'undefined') return null;
    return (await get(name)) || null;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    if (typeof window === 'undefined') return;
    await set(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    if (typeof window === 'undefined') return;
    await del(name);
  },
};

type DashboardState = {
  // All historical data
  answeredCalls: AnsweredCall[];
  abandonedCalls: AbandonedCall[];
  rawAbandonedCalls: AbandonedCall[];
  transactions: Transaction[];
  rawTransactions: Transaction[];
  
  // Derived / Calculated state (not persisted)
  kpis: KPIs;
  kpisByShift: {
    Día: ShiftKPIs;
    Noche: ShiftKPIs;
  };

  // Actions to add data (with de-duplication by date)
  addAnsweredCalls: (
    data: AnsweredCall[],
    dates: string[],
    sourceManifest?: SourceManifestEntry[]
  ) => Promise<void>;
  addAbandonedCalls: (
    data: { clean: AbandonedCall[]; raw: AbandonedCall[] },
    dates: string[],
    sourceManifest?: SourceManifestEntry[]
  ) => Promise<void>;
  addTransactions: (
    data: { clean: Transaction[]; raw: Transaction[] },
    dates: string[],
    sourceManifest?: SourceManifestEntry[]
  ) => Promise<void>;
  
  setKPIs: (kpis: KPIs) => void;
  setKPIsByShift: (kpisByShift: { Día: ShiftKPIs; Noche: ShiftKPIs }) => void;
  
  // Chart state
  hourlyChartShift: Shift;
  salesChartMode: 'agg' | 'plat';
  aovChartMode: 'agg' | 'plat';
  setHourlyChartShift: (shift: Shift) => void;
  setSalesChartMode: (mode: 'agg' | 'plat') => void;
  setAovChartMode: (mode: 'agg' | 'plat') => void;
  
  // Filter state
  selectedHour: string | null;
  setSelectedHour: (hour: string | null) => void;
  
  // Audit state
  isAuditVisible: boolean;
  toggleAudit: () => void;
  
  // Date state
  dataDate: string | null; // The currently viewed date
  availableDates: string[]; // List of all dates with data
  dailyHistory: Record<string, DailySnapshot>;
  monthlyHistory: Record<string, MonthlyOperationalSnapshot>;
  monthlySnapshots: Record<string, MonthlyReportSnapshot>;
  sourceManifestEntries: SourceManifestEntry[];
  selectedMonthKey: string | null;
  setDataDate: (date: string | null) => void;
  setSelectedMonthKey: (monthKey: string | null) => void;
  rebuildMonthlySnapshotsForDates: (dates: string[]) => Promise<void>;
  setRemoteHistory: (history: Record<string, DailySnapshot>) => void;
  setRemoteMonthlySnapshots: (
    snapshots: Record<string, MonthlyReportSnapshot>
  ) => void;
  setRemoteSourceData: (payload: {
    answeredCalls: AnsweredCall[];
    rawAbandonedCalls: AbandonedCall[];
    rawTransactions: Transaction[];
  }) => void;
  setRemoteManualRepresentativeLinks: (links: ManualRepresentativeLink[]) => void;
  comparisonConfig: ComparisonConfig;
  comparisonResult: ComparisonResult | null;
  comparisonPreset: ComparisonPreset;
  setComparisonConfig: (config: Partial<ComparisonConfig>) => void;
  setComparisonPreset: (preset: ComparisonPreset) => void;
  runComparison: () => void;
  clearComparison: () => void;

  activeWorkspaceView: WorkspaceView;
  commercialView: CommercialView;
  manualRepresentativeLinks: ManualRepresentativeLink[];
  setActiveWorkspaceView: (view: WorkspaceView) => void;
  setCommercialView: (view: CommercialView) => void;
  upsertManualRepresentativeLink: (link: ManualRepresentativeLink) => void;
  removeManualRepresentativeLink: (agentName: string) => void;
  
  clearCurrentView: () => void;
  clearAllData: () => void;
  removeHistoryDate: (date: string) => void;
  
  // Hydration state
  activeSourceMonthKey: string | null;
  isSourceWindowLoading: boolean;
  isImportingBatch: boolean;
  _hasHydrated: boolean;
  hydrateSourceWindow: (monthKey: string | null) => Promise<void>;
  setIsImportingBatch: (state: boolean) => void;
  setHasHydrated: (state: boolean) => void;
};

const initialShiftKPIs: ShiftKPIs = {
  recibidas: 0,
  contestadas: 0,
  trans: 0,
  conv: 0,
  abandonadas: 0,
  duplicadas: 0,
  lt20: 0,
  atencion: 0,
  abandonoPct: 0,
};

const initialKpis: KPIs = {
  recibidas: 0,
  contestadas: 0,
  abandonadas: 0,
  nivelDeServicio: 0,
  conversion: 0,
  transaccionesCC: 0,
  ventasValidas: 0,
  ticketPromedio: 0,
};

const initialComparisonConfig: ComparisonConfig = {
  baseDate: null,
  targetDate: null,
  periodMode: 'full_day',
  shift: 'Día',
  startTime: '09:00',
  endTime: '23:30',
};

function getLatestMonthKey(monthlyHistory: Record<string, MonthlyOperationalSnapshot>): string | null {
  const monthKeys = Object.keys(monthlyHistory).sort();
  return monthKeys[monthKeys.length - 1] ?? null;
}

function getLatestLoadedDate(dates: string[]): string | null {
  const orderedDates = [...dates].sort();
  return orderedDates[orderedDates.length - 1] ?? null;
}

function resolveSelectedMonthKey(params: {
  preferredMonthKey?: string | null;
  dataDate?: string | null;
  monthlyHistory: Record<string, MonthlyOperationalSnapshot>;
}): string | null {
  const { preferredMonthKey, dataDate, monthlyHistory } = params;

  if (preferredMonthKey && monthlyHistory[preferredMonthKey]) {
    return preferredMonthKey;
  }

  const dataMonthKey = dataDate?.slice(0, 7) ?? null;

  if (dataMonthKey && monthlyHistory[dataMonthKey]) {
    return dataMonthKey;
  }

  return getLatestMonthKey(monthlyHistory);
}

function sanitizeComparisonConfig(
  config: ComparisonConfig,
  availableDates: string[]
): ComparisonConfig {
  return {
    ...config,
    baseDate:
      config.baseDate && availableDates.includes(config.baseDate)
        ? config.baseDate
        : null,
    targetDate:
      config.targetDate && availableDates.includes(config.targetDate)
        ? config.targetDate
        : null,
  };
}

function groupRecordsByDate<T extends { fecha: string }>(records: T[]): Map<string, T[]> {
  return records.reduce<Map<string, T[]>>((groups, record) => {
    const current = groups.get(record.fecha) ?? [];

    current.push(record);
    groups.set(record.fecha, current);
    return groups;
  }, new Map());
}

function getRecordsForDate<T>(groups: Map<string, T[]>, date: string): T[] {
  return groups.get(date) ?? [];
}

function buildMonthlyHistory(
  dailyHistory: Record<string, DailySnapshot>,
  monthlySnapshots: Record<string, MonthlyReportSnapshot> = {}
): Record<string, MonthlyOperationalSnapshot> {
  return {
    ...buildMonthlyOperationalHistoryFromReportSnapshots(monthlySnapshots),
    ...buildMonthlyOperationalHistory(dailyHistory),
  };
}

function getMonthKeysFromDates(dates: string[]): string[] {
  return [...new Set(dates.map((date) => date.slice(0, 7)).filter(Boolean))].sort();
}

function mergeSourceManifestEntries(
  current: SourceManifestEntry[],
  incoming: SourceManifestEntry[] = []
): SourceManifestEntry[] {
  const entries = new Map<string, SourceManifestEntry>();

  [...current, ...incoming].forEach((entry) => {
    const key = [
      entry.source,
      entry.fileName,
      entry.dateStart ?? '',
      entry.dateEnd ?? '',
      entry.importedAt,
    ].join('|');
    entries.set(key, entry);
  });

  return [...entries.values()].sort((left, right) =>
    left.importedAt === right.importedAt
      ? left.fileName.localeCompare(right.fileName, 'es')
      : left.importedAt.localeCompare(right.importedAt)
  );
}

async function buildMonthlyReportSnapshotsForDates(params: {
  dates: string[];
  dailyHistory: Record<string, DailySnapshot>;
  availableDates: string[];
  sourceManifestEntries: SourceManifestEntry[];
  currentSnapshots: Record<string, MonthlyReportSnapshot>;
}): Promise<Record<string, MonthlyReportSnapshot>> {
  const monthKeys = getMonthKeysFromDates(params.dates);
  const nextSnapshots = { ...params.currentSnapshots };

  await Promise.all(
    monthKeys.map(async (monthKey) => {
      const sources = await loadCachedSourcesForMonth(
        monthKey,
        params.availableDates
      );
      const snapshot = buildMonthlyReportSnapshot({
        monthKey,
        dailyHistory: params.dailyHistory,
        sources,
        sourceManifest: params.sourceManifestEntries,
      });

      if (snapshot) {
        nextSnapshots[monthKey] = snapshot;
      } else {
        delete nextSnapshots[monthKey];
      }
    })
  );

  return nextSnapshots;
}

function buildDerivedStateFromSources(params: {
  answeredCalls: AnsweredCall[];
  rawAbandonedCalls: AbandonedCall[];
  rawTransactions: Transaction[];
  inheritedHistory?: Record<string, DailySnapshot>;
}): Pick<
  DashboardState,
  | 'answeredCalls'
  | 'abandonedCalls'
  | 'rawAbandonedCalls'
  | 'transactions'
  | 'rawTransactions'
  | 'availableDates'
  | 'dailyHistory'
  | 'monthlyHistory'
> {
  const answeredCalls = params.answeredCalls;
  const rawAbandonedCalls = params.rawAbandonedCalls;
  const rawTransactions = params.rawTransactions;
  const abandonedCalls = rawAbandonedCalls.filter(
    (record) => !record.isDuplicate && !record.isLT20
  );
  const transactions = rawTransactions.filter((record) => record.estatus === 'N');
  const answeredByDate = groupRecordsByDate(answeredCalls);
  const abandonedByDate = groupRecordsByDate(abandonedCalls);
  const rawAbandonedByDate = groupRecordsByDate(rawAbandonedCalls);
  const transactionsByDate = groupRecordsByDate(transactions);
  const rawTransactionsByDate = groupRecordsByDate(rawTransactions);
  const sourceDates = [
    ...new Set([
      ...answeredByDate.keys(),
      ...rawAbandonedByDate.keys(),
      ...rawTransactionsByDate.keys(),
    ]),
  ].sort();
  const nextHistory = { ...(params.inheritedHistory ?? {}) };

  sourceDates.forEach((date) => {
    nextHistory[date] = buildDailySnapshot({
      date,
      answered: getRecordsForDate(answeredByDate, date),
      abandoned: getRecordsForDate(abandonedByDate, date),
      rawAbandoned: getRecordsForDate(rawAbandonedByDate, date),
      transactions: getRecordsForDate(transactionsByDate, date),
      rawTransactions: getRecordsForDate(rawTransactionsByDate, date),
    });
  });

  const availableDates = [...new Set([...Object.keys(nextHistory), ...sourceDates])].sort();

  return {
    answeredCalls,
    abandonedCalls,
    rawAbandonedCalls,
    transactions,
    rawTransactions,
    availableDates,
    dailyHistory: nextHistory,
    monthlyHistory: buildMonthlyHistory(nextHistory),
  };
}

function buildSnapshotFromCachedSource(source: CachedDailySourceData): DailySnapshot {
  const abandonedCalls = source.rawAbandonedCalls.filter(
    (record) => !record.isDuplicate && !record.isLT20
  );
  const transactions = source.rawTransactions.filter(
    (record) => record.estatus === 'N'
  );

  return buildDailySnapshot({
    date: source.date,
    answered: source.answeredCalls,
    abandoned: abandonedCalls,
    rawAbandoned: source.rawAbandonedCalls,
    transactions,
    rawTransactions: source.rawTransactions,
  });
}

function mergeDailyHistoryWithSources(params: {
  dailyHistory: Record<string, DailySnapshot>;
  sources: CachedDailySourceData[];
}): Record<string, DailySnapshot> {
  const nextHistory = { ...params.dailyHistory };

  params.sources.forEach((source) => {
    nextHistory[source.date] = buildSnapshotFromCachedSource(source);
  });

  return nextHistory;
}

function mergeSourceRecordsByDate<T extends { fecha: string }>(
  localRecords: T[],
  remoteRecords: T[]
): T[] {
  const localDates = new Set(localRecords.map((record) => record.fecha));
  const remoteOnlyRecords = remoteRecords.filter(
    (record) => !localDates.has(record.fecha)
  );

  return [...remoteOnlyRecords, ...localRecords];
}

function mergeManualRepresentativeLinks(
  localLinks: ManualRepresentativeLink[],
  remoteLinks: ManualRepresentativeLink[]
): ManualRepresentativeLink[] {
  const localAgentNames = new Set(
    localLinks.map((link) => normalizeRepresentativeLinkName(link.agentName))
  );
  const remoteOnlyLinks = remoteLinks.filter(
    (link) => !localAgentNames.has(normalizeRepresentativeLinkName(link.agentName))
  );

  return [...remoteOnlyLinks, ...localLinks].sort((left, right) =>
    left.agentName.localeCompare(right.agentName, 'es')
  );
}

function canMutateDashboardData(): boolean {
  return canCurrentUserEditData();
}

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set, getStore) => ({
      answeredCalls: [],
      abandonedCalls: [],
      rawAbandonedCalls: [],
      transactions: [],
      rawTransactions: [],
      availableDates: [],
      dailyHistory: {},
      monthlyHistory: {},
      monthlySnapshots: {},
      sourceManifestEntries: [],
      
      kpis: initialKpis,
      kpisByShift: {
        Día: initialShiftKPIs,
        Noche: initialShiftKPIs,
      },
      
      dataDate: null,
      comparisonConfig: initialComparisonConfig,
      comparisonResult: null,
      selectedHour: null,
      hourlyChartShift: 'Día',
      salesChartMode: 'agg',
      aovChartMode: 'agg',
      comparisonPreset: 'manual',
      activeWorkspaceView: 'executive',
      commercialView: 'day',
      selectedMonthKey: null,
      manualRepresentativeLinks: [],
      isAuditVisible: false,
      activeSourceMonthKey: null,
      isSourceWindowLoading: false,
      isImportingBatch: false,
      _hasHydrated: false,

      addAnsweredCalls: async (newData, dates, sourceManifest = []) => {
        if (!canMutateDashboardData()) {
          console.warn('[Access] addAnsweredCalls bloqueado:', READ_ONLY_ACTION_MESSAGE);
          return;
        }

        const affectedDates = [...new Set(dates)].sort();
        const updatedSources = await patchCachedDailySources({
          dates: affectedDates,
          patch: { source: 'answered', records: newData },
        });
        const nextHistory = mergeDailyHistoryWithSources({
          dailyHistory: getStore().dailyHistory,
          sources: updatedSources,
        });
        const allDates = Object.keys(nextHistory).sort();
        const nextDataDate = getLatestLoadedDate(affectedDates) ?? getStore().dataDate;
        const nextSourceManifestEntries = mergeSourceManifestEntries(
          getStore().sourceManifestEntries,
          sourceManifest
        );
        const nextMonthlySnapshots = await buildMonthlyReportSnapshotsForDates({
          dates: affectedDates,
          dailyHistory: nextHistory,
          availableDates: allDates,
          sourceManifestEntries: nextSourceManifestEntries,
          currentSnapshots: getStore().monthlySnapshots,
        });
        const nextMonthlyHistory = buildMonthlyHistory(
          nextHistory,
          nextMonthlySnapshots
        );
        const nextMonthKey = nextDataDate?.slice(0, 7) ?? getStore().selectedMonthKey;

        set({ 
          availableDates: allDates,
          dailyHistory: nextHistory,
          monthlyHistory: nextMonthlyHistory,
          monthlySnapshots: nextMonthlySnapshots,
          sourceManifestEntries: nextSourceManifestEntries,
          dataDate: nextDataDate,
          comparisonConfig: sanitizeComparisonConfig(
            getStore().comparisonConfig,
            allDates
          ),
          selectedMonthKey: resolveSelectedMonthKey({
            preferredMonthKey: getStore().selectedMonthKey,
            dataDate: nextDataDate,
            monthlyHistory: nextMonthlyHistory,
          }),
        });

        await getStore().hydrateSourceWindow(nextMonthKey);
      },

      addAbandonedCalls: async (data, dates, sourceManifest = []) => {
        if (!canMutateDashboardData()) {
          console.warn('[Access] addAbandonedCalls bloqueado:', READ_ONLY_ACTION_MESSAGE);
          return;
        }

        const affectedDates = [...new Set(dates)].sort();
        const updatedSources = await patchCachedDailySources({
          dates: affectedDates,
          patch: { source: 'abandoned', records: data.raw },
        });
        const nextHistory = mergeDailyHistoryWithSources({
          dailyHistory: getStore().dailyHistory,
          sources: updatedSources,
        });
        const allDates = Object.keys(nextHistory).sort();
        const nextDataDate = getLatestLoadedDate(affectedDates) ?? getStore().dataDate;
        const nextSourceManifestEntries = mergeSourceManifestEntries(
          getStore().sourceManifestEntries,
          sourceManifest
        );
        const nextMonthlySnapshots = await buildMonthlyReportSnapshotsForDates({
          dates: affectedDates,
          dailyHistory: nextHistory,
          availableDates: allDates,
          sourceManifestEntries: nextSourceManifestEntries,
          currentSnapshots: getStore().monthlySnapshots,
        });
        const nextMonthlyHistory = buildMonthlyHistory(
          nextHistory,
          nextMonthlySnapshots
        );
        const nextMonthKey = nextDataDate?.slice(0, 7) ?? getStore().selectedMonthKey;

        set({ 
          availableDates: allDates,
          dailyHistory: nextHistory,
          monthlyHistory: nextMonthlyHistory,
          monthlySnapshots: nextMonthlySnapshots,
          sourceManifestEntries: nextSourceManifestEntries,
          dataDate: nextDataDate,
          comparisonConfig: sanitizeComparisonConfig(
            getStore().comparisonConfig,
            allDates
          ),
          selectedMonthKey: resolveSelectedMonthKey({
            preferredMonthKey: getStore().selectedMonthKey,
            dataDate: nextDataDate,
            monthlyHistory: nextMonthlyHistory,
          }),
        });

        await getStore().hydrateSourceWindow(nextMonthKey);
      },

      addTransactions: async (data, dates, sourceManifest = []) => {
        if (!canMutateDashboardData()) {
          console.warn('[Access] addTransactions bloqueado:', READ_ONLY_ACTION_MESSAGE);
          return;
        }

        const affectedDates = [...new Set(dates)].sort();
        const updatedSources = await patchCachedDailySources({
          dates: affectedDates,
          patch: { source: 'transactions', records: data.raw },
        });
        const nextHistory = mergeDailyHistoryWithSources({
          dailyHistory: getStore().dailyHistory,
          sources: updatedSources,
        });
        const allDates = Object.keys(nextHistory).sort();
        const nextDataDate = getLatestLoadedDate(affectedDates) ?? getStore().dataDate;
        const nextSourceManifestEntries = mergeSourceManifestEntries(
          getStore().sourceManifestEntries,
          sourceManifest
        );
        const nextMonthlySnapshots = await buildMonthlyReportSnapshotsForDates({
          dates: affectedDates,
          dailyHistory: nextHistory,
          availableDates: allDates,
          sourceManifestEntries: nextSourceManifestEntries,
          currentSnapshots: getStore().monthlySnapshots,
        });
        const nextMonthlyHistory = buildMonthlyHistory(
          nextHistory,
          nextMonthlySnapshots
        );
        const nextMonthKey = nextDataDate?.slice(0, 7) ?? getStore().selectedMonthKey;

        set({ 
          availableDates: allDates,
          dailyHistory: nextHistory,
          monthlyHistory: nextMonthlyHistory,
          monthlySnapshots: nextMonthlySnapshots,
          sourceManifestEntries: nextSourceManifestEntries,
          dataDate: nextDataDate,
          comparisonConfig: sanitizeComparisonConfig(
            getStore().comparisonConfig,
            allDates
          ),
          selectedMonthKey: resolveSelectedMonthKey({
            preferredMonthKey: getStore().selectedMonthKey,
            dataDate: nextDataDate,
            monthlyHistory: nextMonthlyHistory,
          }),
        });

        await getStore().hydrateSourceWindow(nextMonthKey);
      },

      hydrateSourceWindow: async (monthKey) => {
        const currentState = getStore();

        if (!monthKey) {
          set({
            answeredCalls: [],
            abandonedCalls: [],
            rawAbandonedCalls: [],
            transactions: [],
            rawTransactions: [],
            activeSourceMonthKey: null,
            isSourceWindowLoading: false,
          });
          return;
        }

        set({ isSourceWindowLoading: true });

        try {
          const sources = await loadCachedSourcesForMonth(
            monthKey,
            currentState.availableDates
          );
          const flattened = flattenCachedDailySources(sources);
          const nextState = buildDerivedStateFromSources({
            ...flattened,
            inheritedHistory: getStore().dailyHistory,
          });
          const nextMonthlyHistory = buildMonthlyHistory(
            nextState.dailyHistory,
            getStore().monthlySnapshots
          );

          set({
            ...nextState,
            monthlyHistory: nextMonthlyHistory,
            activeSourceMonthKey: monthKey,
            selectedMonthKey: resolveSelectedMonthKey({
              preferredMonthKey: monthKey,
              dataDate: getStore().dataDate,
              monthlyHistory: nextMonthlyHistory,
            }),
            comparisonConfig: sanitizeComparisonConfig(
              getStore().comparisonConfig,
              nextState.availableDates
            ),
            isSourceWindowLoading: false,
          });
        } catch (error) {
          console.warn(
            '[Call Center Storage] No se pudo hidratar la ventana activa.',
            error
          );
          set({ isSourceWindowLoading: false });
        }
      },

      setKPIs: (kpis) => set({ kpis }),
      setKPIsByShift: (kpis) => set({ kpisByShift: kpis }),
      setHourlyChartShift: (shift) => set({ hourlyChartShift: shift }),
      setSalesChartMode: (mode) => set({ salesChartMode: mode }),
      setAovChartMode: (mode) => set({ aovChartMode: mode }),
      setSelectedHour: (hour) => set({ selectedHour: hour }),
      toggleAudit: () => set((state) => ({ isAuditVisible: !state.isAuditVisible })),
      setDataDate: (date) => {
        set((state) => ({
          dataDate: date,
          selectedMonthKey:
            date?.slice(0, 7) ??
            resolveSelectedMonthKey({
              preferredMonthKey: state.selectedMonthKey,
              monthlyHistory: state.monthlyHistory,
            }),
        }));

        void getStore().hydrateSourceWindow(date?.slice(0, 7) ?? null);
      },
      setSelectedMonthKey: (monthKey) => {
        const resolvedMonthKey = resolveSelectedMonthKey({
          preferredMonthKey: monthKey,
          dataDate: getStore().dataDate,
          monthlyHistory: getStore().monthlyHistory,
        });

        set((state) => ({
          selectedMonthKey: resolvedMonthKey,
          dataDate:
            state.dataDate && resolvedMonthKey && state.dataDate.startsWith(`${resolvedMonthKey}-`)
              ? state.dataDate
              : state.monthlyHistory[resolvedMonthKey ?? '']?.loadedDates[0] ?? state.dataDate,
        }));

        void getStore().hydrateSourceWindow(resolvedMonthKey);
      },
      rebuildMonthlySnapshotsForDates: async (dates) => {
        const affectedDates = [...new Set(dates)].filter(Boolean).sort();

        if (affectedDates.length === 0) {
          return;
        }

        const nextMonthlySnapshots = await buildMonthlyReportSnapshotsForDates({
          dates: affectedDates,
          dailyHistory: getStore().dailyHistory,
          availableDates: getStore().availableDates,
          sourceManifestEntries: getStore().sourceManifestEntries,
          currentSnapshots: getStore().monthlySnapshots,
        });
        const monthlyHistory = buildMonthlyHistory(
          getStore().dailyHistory,
          nextMonthlySnapshots
        );

        set({
          monthlySnapshots: nextMonthlySnapshots,
          monthlyHistory,
          selectedMonthKey: resolveSelectedMonthKey({
            preferredMonthKey: getStore().selectedMonthKey,
            dataDate: getStore().dataDate,
            monthlyHistory,
          }),
        });
      },
      setRemoteHistory: (history) => {
        const currentHistory = getStore().dailyHistory;
        const mergedHistory = {
          ...history,
          ...currentHistory,
        };
        const snapshotDates = Object.values(getStore().monthlySnapshots)
          .flatMap((snapshot) => snapshot.loadedDates);
        const availableDates = [
          ...new Set([...Object.keys(mergedHistory), ...snapshotDates]),
        ].sort();
        const currentDate = getStore().dataDate;
        const monthlyHistory = buildMonthlyHistory(
          mergedHistory,
          getStore().monthlySnapshots
        );

        set({
          dailyHistory: mergedHistory,
          monthlyHistory,
          availableDates,
          dataDate:
            currentDate && availableDates.includes(currentDate)
              ? currentDate
              : availableDates[availableDates.length - 1] ?? null,
          selectedMonthKey: resolveSelectedMonthKey({
            preferredMonthKey: getStore().selectedMonthKey,
            dataDate:
              currentDate && availableDates.includes(currentDate)
                ? currentDate
                : availableDates[availableDates.length - 1] ?? null,
            monthlyHistory,
          }),
          comparisonConfig: sanitizeComparisonConfig(
            getStore().comparisonConfig,
            availableDates
          ),
          comparisonResult: null,
          comparisonPreset: 'manual',
        });
      },
      setRemoteMonthlySnapshots: (snapshots) => {
        const monthlySnapshots = mergeMonthlyReportSnapshots({
          local: getStore().monthlySnapshots,
          remote: snapshots,
        });
        const dailyHistory = getStore().dailyHistory;
        const availableDates = [
          ...new Set([
            ...Object.keys(dailyHistory),
            ...Object.values(monthlySnapshots).flatMap(
              (snapshot) => snapshot.loadedDates
            ),
          ]),
        ].sort();
        const currentDate = getStore().dataDate;
        const nextDataDate =
          currentDate && availableDates.includes(currentDate)
            ? currentDate
            : availableDates[availableDates.length - 1] ?? null;
        const monthlyHistory = buildMonthlyHistory(dailyHistory, monthlySnapshots);

        set({
          monthlySnapshots,
          monthlyHistory,
          availableDates,
          dataDate: nextDataDate,
          selectedMonthKey: resolveSelectedMonthKey({
            preferredMonthKey: getStore().selectedMonthKey,
            dataDate: nextDataDate,
            monthlyHistory,
          }),
          comparisonConfig: sanitizeComparisonConfig(
            getStore().comparisonConfig,
            availableDates
          ),
          comparisonResult: null,
          comparisonPreset: 'manual',
        });
      },
      setRemoteSourceData: (payload) => {
        void (async () => {
          const sources = await seedCachedDailySources(payload);

          if (sources.length === 0) {
            return;
          }

          const currentState = getStore();
          const nextHistory = mergeDailyHistoryWithSources({
            dailyHistory: currentState.dailyHistory,
            sources,
          });
          const availableDates = Object.keys(nextHistory).sort();
          const monthlyHistory = buildMonthlyHistory(
            nextHistory,
            currentState.monthlySnapshots
          );
          const nextDataDate =
            currentState.dataDate && availableDates.includes(currentState.dataDate)
              ? currentState.dataDate
              : availableDates[availableDates.length - 1] ?? null;
          const nextMonthKey =
            currentState.selectedMonthKey ??
            nextDataDate?.slice(0, 7) ??
            getLatestMonthKey(monthlyHistory);

          set({
            dailyHistory: nextHistory,
            monthlyHistory,
            availableDates,
            dataDate: nextDataDate,
            selectedMonthKey: resolveSelectedMonthKey({
              preferredMonthKey: nextMonthKey,
              dataDate: nextDataDate,
              monthlyHistory,
            }),
            comparisonConfig: sanitizeComparisonConfig(
              currentState.comparisonConfig,
              availableDates
            ),
            comparisonResult: null,
            comparisonPreset: 'manual',
          });

          await getStore().hydrateSourceWindow(nextMonthKey);
        })();
      },
      setRemoteManualRepresentativeLinks: (links) => {
        const currentLinks = getStore().manualRepresentativeLinks;

        set({
          manualRepresentativeLinks: mergeManualRepresentativeLinks(
            currentLinks,
            links
          ),
        });
      },
      setComparisonConfig: (config) =>
        set((state) => ({ comparisonConfig: { ...state.comparisonConfig, ...config } })),
      setComparisonPreset: (preset) => set({ comparisonPreset: preset }),
      runComparison: () => {
        const state = getStore();
        const result = buildComparisonResult({
          config: state.comparisonConfig,
          allAnswered: state.answeredCalls,
          allAbandoned: state.abandonedCalls,
          allTransactions: state.transactions,
          dailyHistory: state.dailyHistory,
        });
        set({ comparisonResult: result });
      },
      clearComparison: () => set({ comparisonResult: null }),
      setActiveWorkspaceView: (view) => set({ activeWorkspaceView: view }),
      setCommercialView: (view) => set({ commercialView: view }),
      upsertManualRepresentativeLink: (link) => {
        if (!canMutateDashboardData()) {
          console.warn('[Access] upsertManualRepresentativeLink bloqueado:', READ_ONLY_ACTION_MESSAGE);
          return;
        }

        set((state) => ({
          manualRepresentativeLinks: [
            ...state.manualRepresentativeLinks.filter(
              (item) =>
                normalizeRepresentativeLinkName(item.agentName) !==
                normalizeRepresentativeLinkName(link.agentName)
            ),
            link,
          ],
        }));
      },
      removeManualRepresentativeLink: (agentName) => {
        if (!canMutateDashboardData()) {
          console.warn('[Access] removeManualRepresentativeLink bloqueado:', READ_ONLY_ACTION_MESSAGE);
          return;
        }

        set((state) => ({
          manualRepresentativeLinks: state.manualRepresentativeLinks.filter(
            (item) =>
              normalizeRepresentativeLinkName(item.agentName) !==
              normalizeRepresentativeLinkName(agentName)
          ),
        }));
      },

      clearCurrentView: () => {
        if (!canMutateDashboardData()) {
          console.warn('[Access] clearCurrentView bloqueado:', READ_ONLY_ACTION_MESSAGE);
          return;
        }

        set({
          dataDate: null,
          comparisonConfig: initialComparisonConfig,
          comparisonResult: null,
          comparisonPreset: 'manual',
          selectedHour: null,
          isAuditVisible: false,
          kpis: initialKpis,
          kpisByShift: { Día: initialShiftKPIs, Noche: initialShiftKPIs },
        });
      },
      
      clearAllData: () => {
        if (!canMutateDashboardData()) {
          console.warn('[Access] clearAllData bloqueado:', READ_ONLY_ACTION_MESSAGE);
          return;
        }

        void clearCachedDailySources();

        set({
          answeredCalls: [],
          abandonedCalls: [],
          rawAbandonedCalls: [],
          transactions: [],
          rawTransactions: [],
          availableDates: [],
          dailyHistory: {},
          monthlyHistory: {},
          monthlySnapshots: {},
          sourceManifestEntries: [],
          dataDate: null,
          comparisonConfig: initialComparisonConfig,
          comparisonResult: null,
          comparisonPreset: 'manual',
          selectedHour: null,
          activeWorkspaceView: 'executive',
          commercialView: 'day',
          selectedMonthKey: null,
          isAuditVisible: false,
          activeSourceMonthKey: null,
          isSourceWindowLoading: false,
          kpis: initialKpis,
          kpisByShift: { Día: initialShiftKPIs, Noche: initialShiftKPIs },
        });
      },

      removeHistoryDate: (date) => {
        if (!canMutateDashboardData()) {
          console.warn('[Access] removeHistoryDate bloqueado:', READ_ONLY_ACTION_MESSAGE);
          return;
        }

        if (!date) return;

        void (async () => {
          await deleteCachedDailySource(date);
          const remainingMonthDates = getStore().availableDates.filter(
            (item) => item.startsWith(`${date.slice(0, 7)}-`)
          );
          await getStore().rebuildMonthlySnapshotsForDates(remainingMonthDates);
        })();
        
        const filteredAns = getStore().answeredCalls.filter(r => r.fecha !== date);
        const filteredAbn = getStore().abandonedCalls.filter(r => r.fecha !== date);
        const filteredAbnRaw = getStore().rawAbandonedCalls.filter(r => r.fecha !== date);
        const filteredTrx = getStore().transactions.filter(r => r.fecha !== date);
        const filteredTrxRaw = getStore().rawTransactions.filter(r => r.fecha !== date);
        
        const remainingDates = getStore().availableDates.filter(d => d !== date);
        const nextHistory = { ...getStore().dailyHistory };
        const currentDate = getStore().dataDate;
        const nextComparisonConfig = sanitizeComparisonConfig(
          getStore().comparisonConfig,
          remainingDates
        );
        delete nextHistory[date];
        const nextMonthlySnapshots = { ...getStore().monthlySnapshots };
        delete nextMonthlySnapshots[date.slice(0, 7)];
        const nextMonthlyHistory = buildMonthlyHistory(
          nextHistory,
          nextMonthlySnapshots
        );
        const nextDataDate =
          currentDate === date ? getLatestLoadedDate(remainingDates) : currentDate;
        
        set({
          answeredCalls: filteredAns,
          abandonedCalls: filteredAbn,
          rawAbandonedCalls: filteredAbnRaw,
          transactions: filteredTrx,
          rawTransactions: filteredTrxRaw,
          dailyHistory: nextHistory,
          monthlyHistory: nextMonthlyHistory,
          monthlySnapshots: nextMonthlySnapshots,
          availableDates: remainingDates,
          dataDate: nextDataDate,
          selectedMonthKey: resolveSelectedMonthKey({
            preferredMonthKey: getStore().selectedMonthKey,
            dataDate: nextDataDate,
            monthlyHistory: nextMonthlyHistory,
          }),
          comparisonConfig: nextComparisonConfig,
          comparisonResult: null,
          comparisonPreset: 'manual',
          selectedHour: null,
          activeSourceMonthKey:
            nextDataDate?.slice(0, 7) === getStore().activeSourceMonthKey
              ? getStore().activeSourceMonthKey
              : null,
        });

        if (nextDataDate) {
          void getStore().hydrateSourceWindow(nextDataDate.slice(0, 7));
        }
      },

      setIsImportingBatch: (state) => set({ isImportingBatch: state }),
      setHasHydrated: (state) => set({ _hasHydrated: state }),
    }),
    {
      name: 'dashboard-storage-idb',
      storage: createJSONStorage(() => idbStorage),
      onRehydrateStorage: () => (state) => {
        if (!state) {
          useDashboardStore.setState({ _hasHydrated: true });
          return;
        }

        void (async () => {
          const legacyAnsweredCalls = state.answeredCalls ?? [];
          const legacyRawAbandonedCalls =
            state.rawAbandonedCalls?.length > 0
              ? state.rawAbandonedCalls
              : state.abandonedCalls ?? [];
          const legacyRawTransactions =
            state.rawTransactions?.length > 0
              ? state.rawTransactions
              : state.transactions ?? [];
          const hasLegacySources =
            legacyAnsweredCalls.length > 0 ||
            legacyRawAbandonedCalls.length > 0 ||
            legacyRawTransactions.length > 0;
          const legacySources = hasLegacySources
            ? await seedCachedDailySources({
                answeredCalls: legacyAnsweredCalls,
                rawAbandonedCalls: legacyRawAbandonedCalls,
                rawTransactions: legacyRawTransactions,
              })
            : [];
          const persistedHistory = state.dailyHistory ?? {};
          const nextHistory =
            legacySources.length > 0
              ? mergeDailyHistoryWithSources({
                  dailyHistory: persistedHistory,
                  sources: legacySources,
                })
              : persistedHistory;
          const sourceManifestEntries = state.sourceManifestEntries ?? [];
          const monthlySnapshots =
            legacySources.length > 0
              ? await buildMonthlyReportSnapshotsForDates({
                  dates: legacySources.map((source) => source.date),
                  dailyHistory: nextHistory,
                  availableDates: Object.keys(nextHistory).sort(),
                  sourceManifestEntries,
                  currentSnapshots: state.monthlySnapshots ?? {},
                })
              : state.monthlySnapshots ?? {};
          const monthlyHistory = buildMonthlyHistory(nextHistory, monthlySnapshots);
          const availableDates = [
            ...new Set([
              ...Object.keys(nextHistory),
              ...Object.values(monthlySnapshots).flatMap(
                (snapshot) => snapshot.loadedDates
              ),
            ]),
          ].sort();
          const nextDataDate =
            state.dataDate && availableDates.includes(state.dataDate)
              ? state.dataDate
              : getLatestLoadedDate(availableDates);
          const nextMonthKey = resolveSelectedMonthKey({
            preferredMonthKey: state.selectedMonthKey ?? null,
            dataDate: nextDataDate,
            monthlyHistory,
          });

          useDashboardStore.setState({
            answeredCalls: [],
            abandonedCalls: [],
            rawAbandonedCalls: [],
            transactions: [],
            rawTransactions: [],
            dailyHistory: nextHistory,
            monthlyHistory,
            monthlySnapshots,
            sourceManifestEntries,
            availableDates,
            dataDate: nextDataDate,
            comparisonConfig: sanitizeComparisonConfig(
              state.comparisonConfig ?? initialComparisonConfig,
              availableDates
            ),
            comparisonPreset: state.comparisonPreset ?? 'manual',
            activeWorkspaceView: state.activeWorkspaceView ?? 'executive',
            commercialView: state.commercialView ?? 'day',
            selectedMonthKey: nextMonthKey,
            activeSourceMonthKey: null,
            isSourceWindowLoading: false,
            isImportingBatch: false,
          });

          await useDashboardStore.getState().hydrateSourceWindow(nextMonthKey);
          useDashboardStore.setState({ _hasHydrated: true });
        })();
      },
      partialize: (state) => ({
        availableDates: state.availableDates,
        dailyHistory: state.dailyHistory,
        monthlySnapshots: state.monthlySnapshots,
        sourceManifestEntries: state.sourceManifestEntries,
        dataDate: state.dataDate,
        selectedMonthKey: state.selectedMonthKey,
        comparisonConfig: state.comparisonConfig,
        comparisonPreset: state.comparisonPreset,
        hourlyChartShift: state.hourlyChartShift,
        salesChartMode: state.salesChartMode,
        aovChartMode: state.aovChartMode,
        activeWorkspaceView: state.activeWorkspaceView,
        commercialView: state.commercialView,
        manualRepresentativeLinks: state.manualRepresentativeLinks,
      }),
    }
  )
);
