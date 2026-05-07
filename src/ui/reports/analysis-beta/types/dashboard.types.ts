import type { CommercialGoalSegment, ShiftType } from '@/domain/types';

export type AnsweredCall = {
  id: string;
  dst: string;
  agente: string;
  fecha: string;
  periodo: string;
  hora: string;
  llamadas: number;
  conexion: number;
  calidad?: number;
  turno: Shift | 'fuera';
};

export type AbandonedCall = {
  id: string;
  telefono: string;
  fecha: string;
  hora: string;
  conexion: number;
  periodo: string;
  turno: Shift | 'fuera';
  disposition: string;
  isDuplicate?: boolean;
  isLT20?: boolean;
};

export type Transaction = {
  id: string;
  sucursal: string;
  agente?: string;
  agenteTipo?: 'agente' | 'plataforma' | 'sin_registro';
  agenteCodigo?: string;
  canalReal: string;
  plataforma: string;
  plataformaCode: string;
  fecha: string;
  hora: string;
  estatus: string;
  valor: number;
};

export type KPIs = {
  recibidas: number;
  contestadas: number;
  abandonadas: number;
  nivelDeServicio: number;
  conversion: number;
  transaccionesCC: number;
  ventasValidas: number;
  ticketPromedio: number;
};

export type SourceCoverage = {
  answeredLoaded: boolean;
  abandonedLoaded: boolean;
  transactionsLoaded: boolean;
  loadedSources: number;
  isComplete: boolean;
};

export type DailySnapshot = {
  date: string;
  updatedAt: string;
  kpis: KPIs;
  shiftKpis: {
    Día: ShiftKPIs;
    Noche: ShiftKPIs;
  };
  operationalDetail: {
    day: TimeSlotKpi[];
    night: TimeSlotKpi[];
  };
  records: {
    answeredCalls: number;
    abandonedCalls: number;
    transactions: number;
  };
  coverage: SourceCoverage;
};

export type Shift = 'Día' | 'Noche';

export type ShiftKPIs = {
  recibidas: number;
  contestadas: number;
  trans: number;
  conv: number;
  abandonadas: number;
  duplicadas: number;
  lt20: number;
  atencion: number;
  abandonoPct: number;
};

export type TimeSlotKpi = {
  hora: string;
  recibidas: number;
  contestadas: number;
  transacciones: number;
  conexionSum: number;
  conexionAvg: number;
  pctAtencion: number;
  abandonadas: number;
  abandConnSum: number;
  abandAvg: number;
  pctAband: number;
  conversionRate: number;
};

export type AgentKPIs = {
  agente: string;
  tipo: 'agente' | 'plataforma' | 'sin_registro';
  codigo?: string;
  transacciones: number;
  ventas: number;
  ticketPromedio: number;
};

export type RepresentativePerformanceAssignmentRow = AgentKPIs & {
  representativeId: string;
  shift: ShiftType;
  segment: CommercialGoalSegment;
  target: number;
  monthlyTargetPerRepresentative: number;
  progressPct: number;
  cancelledTransactions: number;
  lastLoadedDayTransactions: number;
  weeklyTransactions: number;
  monthlyTransactions: number;
  incidents: number;
  errors: number;
  absences: number;
  tardiness: number;
  comparisonDelta: number | null;
  plannedDates: string[];
  hasCoverageGap: boolean;
};

export type RepresentativePerformanceRow = AgentKPIs & {
  representativeId: string;
  target: number;
  monthlyTargetPerRepresentative: number | null;
  progressPct: number;
  cancelledTransactions: number;
  lastLoadedDayTransactions: number;
  weeklyTransactions: number;
  monthlyTransactions: number;
  incidents: number;
  errors: number;
  absences: number;
  tardiness: number;
  comparisonDelta: number | null;
  shifts: ShiftType[];
  segments: CommercialGoalSegment[];
  breakdown: RepresentativePerformanceAssignmentRow[];
};

export type RepresentativeGoalSummary = {
  representatives: number;
  monthlyTargetPerRepresentative: number | null;
  target: number;
  validTransactions: number;
  cancelledTransactions: number;
  progressPct: number;
};

export type RepresentativePerformanceGroup = {
  shift: ShiftType;
  segment: CommercialGoalSegment;
  label: string;
  summary: RepresentativeGoalSummary & {
    incidents: number;
    errors: number;
    absences: number;
    tardiness: number;
    comparisonDelta: number | null;
  };
  rows: RepresentativePerformanceAssignmentRow[];
};

export type RepresentativePerformanceShiftGroup = {
  shift: ShiftType;
  label: string;
  groups: RepresentativePerformanceGroup[];
  pendingAgentNames: string[];
  missingAgentRegistrations: number;
};

export type RepresentativePerformanceReconciliationReason =
  | 'manual_omit'
  | 'unlinked_agent'
  | 'missing_agent';

export type RepresentativeReconciliationItem = {
  key: string;
  reason: RepresentativePerformanceReconciliationReason;
  shift: ShiftType | null;
  agentName: string | null;
  validTransactions: number;
  cancelledTransactions: number;
};

export type RepresentativeReconciliationSummary = {
  sourceValidTransactions: number;
  sourceCancelledTransactions: number;
  officialValidTransactions: number;
  officialCancelledTransactions: number;
  excludedValidTransactions: number;
  excludedCancelledTransactions: number;
  importedRepresentativeValidTransactions: number;
  importedRepresentativeCancelledTransactions: number;
  items: RepresentativeReconciliationItem[];
};

export type RepresentativePerformanceReport = {
  byRepresentative: RepresentativePerformanceRow[];
  byAssignment: RepresentativePerformanceAssignmentRow[];
  shifts: Record<ShiftType, RepresentativePerformanceShiftGroup>;
  globalSummary: RepresentativeGoalSummary & {
    activeRepresentatives: number;
    incidents: number;
    errors: number;
    absences: number;
    tardiness: number;
    comparisonDelta: number | null;
  };
  reconciliation: RepresentativeReconciliationSummary;
  pendingAgentNames: string[];
  dataQualityWarnings: string[];
};

export type SourceManifestEntry = {
  source: 'answered' | 'abandoned' | 'transactions';
  fileName: string;
  rows: number;
  dateStart: string | null;
  dateEnd: string | null;
  importedAt: string;
  saturatedLegacyXls: boolean;
};

export type MonthlyCumulativeRow = {
  date: string;
  recibidas: number;
  contestadas: number;
  abandonadas: number;
  transaccionesCC: number;
  ventasValidas: number;
};

export type MonthlyPlatformSnapshotRow = {
  plataforma: string;
  plataformaCode?: string;
  transacciones: number;
  ventas: number;
  ticketPromedio: number;
};

export type MonthlyBranchSnapshotRow = {
  sucursal: string;
  transacciones: number;
};

export type WorkspaceView = 'executive' | 'operation' | 'analysis';

export type CommercialView = 'day' | 'month';

export type ComparisonPreset =
  | 'manual'
  | 'day_previous'
  | 'week_previous'
  | 'month_previous'
  | 'quarter_previous';

export type DataQualityLevel = 'ok' | 'warning' | 'critical';

export type DataQualitySummary = {
  level: DataQualityLevel;
  label: string;
  detail: string;
  issues: string[];
};

export type KPIDelta = {
  key: keyof KPIs | 'abandonoPct';
  label: string;
  currentValue: number;
  previousValue: number | null;
  delta: number | null;
  deltaPct: number | null;
  direction: 'up' | 'down' | 'equal' | 'none';
  format: 'number' | 'percent' | 'currency';
};

export type ExecutiveFinding = {
  id: string;
  title: string;
  detail: string;
  tone: 'critical' | 'warning' | 'positive' | 'neutral';
};

export type ComparisonPeriodMode =
  | 'full_day'
  | 'shift'
  | 'custom_range'
  | 'week'
  | 'month'
  | 'quarter';

export type ComparisonConfig = {
  baseDate: string | null;
  targetDate: string | null;
  periodMode: ComparisonPeriodMode;
  shift: Shift;
  startTime: string;
  endTime: string;
};

export type ComparisonMetric = {
  label: string;
  baseValue: number;
  targetValue: number;
  delta: number;
  deltaPct: number | null;
  direction: 'up' | 'down' | 'equal';
};

export type ComparisonPeriodSummary = {
  label: string;
  start: string;
  end: string;
  loadedDays: number;
  expectedDays: number;
  isComplete: boolean;
};

export type ComparisonResult = {
  generatedAt: string;
  config: ComparisonConfig;
  basePeriod: ComparisonPeriodSummary;
  targetPeriod: ComparisonPeriodSummary;
  metrics: ComparisonMetric[];
  slotDeltas: Array<{
    hora: string;
    baseContestadas: number;
    targetContestadas: number;
    baseConversion: number;
    targetConversion: number;
  }>;
};

export type MonthlyOperationalSnapshot = {
  monthKey: string;
  monthLabel: string;
  startDate: string;
  endDate: string;
  loadedDays: number;
  expectedDays: number;
  loadedDates: string[];
  kpis: KPIs;
  shiftKpis: {
    Día: ShiftKPIs;
    Noche: ShiftKPIs;
  };
  operationalDetail: {
    day: TimeSlotKpi[];
    night: TimeSlotKpi[];
  };
};

export type MonthlyReportSnapshot = MonthlyOperationalSnapshot & {
  snapshotVersion: number;
  sourceHash: string;
  sourceManifest: SourceManifestEntry[];
  coverage: SourceCoverage;
  dailyCumulative: MonthlyCumulativeRow[];
  representatives: AgentKPIs[];
  platforms: MonthlyPlatformSnapshotRow[];
  branches: MonthlyBranchSnapshotRow[];
  updatedAt: string;
};

export type ReportMonthlySnapshotSyncRow = {
  user_id: string;
  month_key: string;
  month_label: string;
  snapshot_version: number;
  source_hash: string;
  source_manifest: SourceManifestEntry[];
  loaded_dates: string[];
  coverage: SourceCoverage;
  kpis: KPIs;
  shift_kpis: MonthlyReportSnapshot['shiftKpis'];
  operational_detail: MonthlyReportSnapshot['operationalDetail'];
  daily_cumulative: MonthlyCumulativeRow[];
  representatives: AgentKPIs[];
  platforms: MonthlyPlatformSnapshotRow[];
  branches: MonthlyBranchSnapshotRow[];
  updated_at: string;
};

export type ReportGlobalKpiSyncRow = {
  user_id: string;
  report_date: string;
  recibidas: number;
  contestadas: number;
  abandonadas: number;
  nivel_servicio: number;
  abandono_pct: number;
  transacciones_cc: number;
  conversion_pct: number;
  ventas_validas: number;
  ticket_promedio: number;
  answered_loaded: boolean;
  abandoned_loaded: boolean;
  transactions_loaded: boolean;
  loaded_sources: number;
  is_complete: boolean;
  source_updated_at: string;
};

export type ReportShiftKpiSyncRow = {
  user_id: string;
  report_date: string;
  shift: 'DAY' | 'NIGHT';
  recibidas: number;
  contestadas: number;
  transacciones_cc: number;
  conversion_pct: number;
  abandonadas: number;
  duplicadas: number;
  lt20: number;
  nivel_servicio: number;
  abandono_pct: number;
};

export type ReportOperationalDetailSyncRow = {
  user_id: string;
  report_date: string;
  shift: 'DAY' | 'NIGHT';
  slot_start: string;
  recibidas: number;
  contestadas: number;
  transacciones_cc: number;
  conexion_sum: number;
  conexion_avg: number;
  pct_atencion: number;
  abandonadas: number;
  aband_conn_sum: number;
  aband_avg: number;
  pct_abandono: number;
  conversion_pct: number;
};
