import type {
  AnsweredCall,
  AbandonedCall,
  Transaction,
  KPIs,
  DailySnapshot,
  Shift,
  ShiftKPIs,
  TimeSlotKpi,
  AgentKPIs,
} from '@/ui/reports/analysis-beta/types/dashboard.types';
import { getShift } from './shift.service';

export function calculateGlobalKpis(
  answeredCalls: AnsweredCall[],
  abandonedCalls: AbandonedCall[], // Cleaned list
  transactions: Transaction[]
): KPIs {
  const contestadas = answeredCalls.reduce(
    (sum, call) => sum + call.llamadas,
    0
  );
  const abandonadas = abandonedCalls.length;
  const recibidas = contestadas + abandonadas;

  const nivelDeServicio = recibidas > 0 ? (contestadas / recibidas) * 100 : 0;
  const transaccionesCC = transactions.filter(
    (t) => t.plataforma === 'Call center'
  ).length;
  const ventasValidas = transactions.reduce((sum, transaction) => sum + transaction.valor, 0);
  const ticketPromedio = transactions.length > 0 ? ventasValidas / transactions.length : 0;
  const conversion =
    contestadas > 0 ? (transaccionesCC / contestadas) * 100 : 0;

  return {
    recibidas,
    contestadas,
    abandonadas,
    nivelDeServicio,
    conversion,
    transaccionesCC,
    ventasValidas,
    ticketPromedio,
  };
}

export function calculateKPIsByShift(
  answered: AnsweredCall[],
  rawAbandoned: AbandonedCall[],
  transactions: Transaction[]
): { Día: ShiftKPIs; Noche: ShiftKPIs } {
  const shifts: Shift[] = ['Día', 'Noche'];
  const result: { Día: ShiftKPIs; Noche: ShiftKPIs } = {
    Día: {} as ShiftKPIs,
    Noche: {} as ShiftKPIs,
  };

  shifts.forEach((shift) => {
    const answeredInShift = answered.filter((call) => call.turno === shift);
    const abandonedInShift = rawAbandoned.filter((call) => call.turno === shift);
    const transactionsInShift = transactions.filter(
      (tx) => getShift(tx.hora) === shift
    );

    const contestadas = answeredInShift.reduce(
      (sum, call) => sum + call.llamadas,
      0
    );
    const abandonadasLimpias = abandonedInShift.filter(
      (c) => !c.isDuplicate && !c.isLT20
    ).length;
    const recibidas = contestadas + abandonadasLimpias;
    const atencion = recibidas > 0 ? (contestadas / recibidas) * 100 : 0;

    const trans = transactionsInShift.filter(
      (t) => t.plataforma === 'Call center'
    ).length;
    const conv = contestadas > 0 ? (trans / contestadas) * 100 : 0;

    result[shift] = {
      recibidas: recibidas,
      contestadas: contestadas,
      trans: trans,
      conv: conv,
      abandonadas: abandonadasLimpias,
      duplicadas: abandonedInShift.filter((c) => c.isDuplicate).length,
      lt20: abandonedInShift.filter((c) => !c.isDuplicate && c.isLT20).length,
      atencion: atencion,
      abandonoPct: recibidas > 0 ? (abandonadasLimpias / recibidas) * 100 : 0,
    };
  });

  return result;
}

export function buildDailySnapshot(params: {
  date: string;
  answered: AnsweredCall[];
  abandoned: AbandonedCall[];
  rawAbandoned: AbandonedCall[];
  transactions: Transaction[];
  rawTransactions?: Transaction[];
}): DailySnapshot {
  const {
    date,
    answered,
    abandoned,
    rawAbandoned,
    transactions,
    rawTransactions = transactions,
  } = params;
  const kpis = calculateGlobalKpis(answered, abandoned, transactions);
  const shiftKpis = calculateKPIsByShift(answered, rawAbandoned, transactions);
  const operationalDetail = aggregateByTimeSlot(answered, abandoned, transactions);
  const coverage = {
    answeredLoaded: answered.length > 0,
    abandonedLoaded: rawAbandoned.length > 0 || abandoned.length > 0,
    transactionsLoaded: rawTransactions.length > 0 || transactions.length > 0,
    loadedSources: 0,
    isComplete: false,
  };

  coverage.loadedSources = [
    coverage.answeredLoaded,
    coverage.abandonedLoaded,
    coverage.transactionsLoaded,
  ].filter(Boolean).length;
  coverage.isComplete = coverage.loadedSources === 3;

  return {
    date,
    updatedAt: new Date().toISOString(),
    kpis,
    shiftKpis,
    operationalDetail,
    records: {
      answeredCalls: answered.length,
      abandonedCalls: abandoned.length,
      transactions: transactions.length,
    },
    coverage,
  };
}

function periodo30(hhmmss: string): string {
  if (!hhmmss) return '00:00';
  const [hh, mm] = hhmmss.split(':').map(Number);
  return mm < 30
    ? `${String(hh).padStart(2, '0')}:00`
    : `${String(hh).padStart(2, '0')}:30`;
}

const OFFICIAL_SYSTEM_AGENT_SALES_DISCOUNT_RATE = 0.18696279;
export const OFFICIAL_SYSTEM_AGENT_SALES_FACTOR =
  1 - OFFICIAL_SYSTEM_AGENT_SALES_DISCOUNT_RATE;

export function adjustOfficialSystemAgentSales(value: number): number {
  return value * OFFICIAL_SYSTEM_AGENT_SALES_FACTOR;
}

export function aggregateByAgent(
  transactions: Transaction[]
): AgentKPIs[] {
  const agg = new Map<
    string,
    {
      agente: string;
      tipo: AgentKPIs['tipo'];
      codigo?: string;
      transacciones: number;
      ventas: number;
    }
  >();

  transactions.forEach((tx) => {
    if (tx.estatus !== 'N') return;

    const tipo =
      tx.agenteTipo ??
      (tx.agente
        ? tx.plataformaCode && tx.plataformaCode !== 'CC'
          ? 'plataforma'
          : 'agente'
        : 'sin_registro');
    const agent =
      tx.agente ||
      (tipo === 'plataforma'
        ? tx.plataforma || tx.plataformaCode || 'Plataforma digital'
        : 'Sin registro');
    const codigo =
      tx.agenteCodigo ||
      (tipo === 'plataforma' && tx.plataformaCode ? tx.plataformaCode : undefined);
    const key = `${tipo}:${codigo || agent.toLowerCase()}`;

    if (!agg.has(key)) {
      agg.set(key, {
        agente: agent,
        tipo,
        codigo,
        transacciones: 0,
        ventas: 0,
      });
    }
    const b = agg.get(key)!;
    b.transacciones += 1;
    b.ventas += tx.valor || 0;
  });

  return Array.from(agg.values()).map((data) => {
    const adjustedSales =
      data.tipo === 'agente'
        ? adjustOfficialSystemAgentSales(data.ventas)
        : data.ventas;

    return {
      agente: data.agente,
      tipo: data.tipo,
      codigo: data.codigo,
      transacciones: data.transacciones,
      ventas: adjustedSales,
      ticketPromedio: data.transacciones > 0 ? adjustedSales / data.transacciones : 0,
    };
  });
}

export function buildMonthlyRepresentativeSnapshot(
  transactions: Transaction[],
  referenceDate: string | null
): {
  monthLabel: string;
  loadedDays: number;
  expectedDays: number;
  rows: AgentKPIs[];
} | null {
  if (!referenceDate) {
    return null;
  }

  const monthKey = referenceDate.slice(0, 7);
  const monthlyTransactions = transactions.filter((tx) =>
    tx.fecha.startsWith(`${monthKey}-`)
  );
  const loadedDays = new Set(monthlyTransactions.map((tx) => tx.fecha)).size;
  const [year, month] = monthKey.split('-').map(Number);
  const expectedDays = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const monthLabel = new Intl.DateTimeFormat('es-DO', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, 1)));
  const rows = aggregateByAgent(monthlyTransactions).filter(
    (item) => item.tipo === 'agente'
  );

  return {
    monthLabel,
    loadedDays,
    expectedDays,
    rows,
  };
}

export function aggregateByTimeSlot(
  answered: AnsweredCall[],
  abandoned: AbandonedCall[], // Clean list
  transactions: Transaction[]
): { day: TimeSlotKpi[]; night: TimeSlotKpi[] } {
  const agg = new Map<
    string,
    {
      c: number;
      connSum: number;
      w: number;
      a: number;
      aConnSum: number;
      t: number;
    }
  >();

  const bucket = (slot: string) => {
    if (!agg.has(slot)) {
      agg.set(slot, { c: 0, connSum: 0, w: 0, a: 0, aConnSum: 0, t: 0 });
    }
    return agg.get(slot)!;
  };

  answered.forEach((call) => {
    const slot = call.periodo
      ? call.periodo.split('-')[0].trim()
      : periodo30(call.hora);
    const b = bucket(slot);
    b.c += call.llamadas;
    b.connSum += call.conexion;
    b.w += call.llamadas;
  });

  abandoned.forEach((call) => {
    const slot = call.periodo; // Already in HH:MM format from parser
    const b = bucket(slot);
    b.a += 1;
    b.aConnSum += call.conexion;
  });

  transactions.forEach((tx) => {
    if (tx.plataforma === 'Call center') {
      const slot = periodo30(tx.hora);
      const b = bucket(slot);
      b.t += 1;
    }
  });

  const daySlots = [
    '09:00',
    '09:30',
    '10:00',
    '10:30',
    '11:00',
    '11:30',
    '12:00',
    '12:30',
    '13:00',
    '13:30',
    '14:00',
    '14:30',
    '15:00',
    '15:30',
  ];
  const nightSlots: string[] = [];
  for (let h = 16; h < 24; h++) {
    nightSlots.push(String(h).padStart(2, '0') + ':00');
    nightSlots.push(String(h).padStart(2, '0') + ':30');
  }

  const row = (slot: string): TimeSlotKpi => {
    const x =
      agg.get(slot) || { c: 0, connSum: 0, w: 0, a: 0, aConnSum: 0, t: 0 };
    const contestadas = x.c;
    const abandonadas = x.a;
    const recibidas = contestadas + abandonadas;
    const pctAtencion = recibidas > 0 ? (contestadas / recibidas) * 100 : 0;
    const pctAband = recibidas > 0 ? (abandonadas / recibidas) * 100 : 0;

    const conexionAvg = x.w > 0 ? x.connSum / x.w : 0;
    const abandAvg = abandonadas > 0 ? x.aConnSum / abandonadas : 0;

    const transactionsInSlot = x.t;
    const conversionRate =
      contestadas > 0 ? (transactionsInSlot / contestadas) * 100 : 0;

    return {
      hora: slot,
      recibidas,
      contestadas,
      transacciones: transactionsInSlot,
      conexionSum: x.connSum,
      conexionAvg: conexionAvg,
      pctAtencion,
      abandonadas,
      abandConnSum: x.aConnSum,
      abandAvg: abandAvg,
      pctAband,
      conversionRate,
    };
  };

  const day = daySlots.map(row);
  const night = nightSlots.map(row);

  return { day, night };
}
