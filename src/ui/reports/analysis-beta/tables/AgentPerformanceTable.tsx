'use client';

import { useMemo, useState } from 'react';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/ui/reports/analysis-beta/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/reports/analysis-beta/ui/card';
import { Input } from '@/ui/reports/analysis-beta/ui/input';
import {
  Users,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Receipt,
  DollarSign,
  ShoppingCart,
} from 'lucide-react';
import { useDashboardStore } from '@/ui/reports/analysis-beta/store/dashboard.store';
import { cn } from '@/ui/reports/analysis-beta/lib/utils';
import { useAppStore } from '@/store/useAppStore';
import {
  buildRepresentativePerformanceReport,
} from '@/ui/reports/analysis-beta/services/representative-performance.service';
import type {
  RepresentativePerformanceReconciliationReason,
  RepresentativePerformanceRow,
} from '@/ui/reports/analysis-beta/types/dashboard.types';
import { MANUAL_REPRESENTATIVE_LINKS } from '@/ui/reports/analysis-beta/config/manualRepresentativeLinks';

type SortConfig = {
  key: keyof RepresentativePerformanceRow;
  direction: 'asc' | 'desc';
} | null;

type AgentPerformanceTableProps = {
  title?: string;
  subtitle?: string;
  searchPlaceholder?: string;
  embedded?: boolean;
};

const RECONCILIATION_REASON_LABELS: Record<
  RepresentativePerformanceReconciliationReason,
  string
> = {
  manual_omit: 'Omitidos manualmente',
  unlinked_agent: 'Sin vínculo',
  missing_agent: 'Sin agente identificado',
};

function getMonthEnd(monthKey: string) {
  const [year, month] = monthKey.split('-').map(Number);
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
}

export default function AgentPerformanceTable({
  title = 'Representantes del día',
  subtitle = 'Fuente oficial: análisis de llamadas / Call Center',
  searchPlaceholder = 'Buscar representante...',
  embedded = false,
}: AgentPerformanceTableProps) {
  const transactions = useDashboardStore((state) => state.rawTransactions);
  const dataDate = useDashboardStore((state) => state.dataDate);
  const manualRepresentativeLinks = useDashboardStore(
    (state) => state.manualRepresentativeLinks
  );
  const {
    representatives,
    commercialGoals,
    incidents,
    calendar,
    specialSchedules,
  } = useAppStore((state) => ({
    representatives: state.representatives,
    commercialGoals: state.commercialGoals,
    incidents: state.incidents,
    calendar: state.calendar,
    specialSchedules: state.specialSchedules,
  }));
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: 'ventas',
    direction: 'desc',
  });
  const formatCount = (value: number) => value.toLocaleString('en-US');
  const formatCurrency = (value: number) =>
    `RD$ ${value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const performanceReport = useMemo(() => {
    if (!dataDate) {
      return null;
    }

    const dailyTransactions = transactions.filter((transaction) => transaction.fecha === dataDate);

    return buildRepresentativePerformanceReport({
      representatives,
      commercialGoals,
      incidents,
      calendar,
      specialSchedules,
      currentPeriod: {
        kind: 'DAY',
        anchorDate: dataDate,
        label: dataDate,
        from: dataDate,
        to: dataDate,
        loadedDays: 1,
        expectedDays: 1,
        loadedDates: [dataDate],
        isComplete: true,
      },
      currentTransactions: dailyTransactions,
      currentTransactionDates: [dataDate],
      manualRepresentativeLinks: [
        ...MANUAL_REPRESENTATIVE_LINKS,
        ...manualRepresentativeLinks,
      ],
    });
  }, [
    calendar,
    commercialGoals,
    dataDate,
    incidents,
    manualRepresentativeLinks,
    representatives,
    specialSchedules,
    transactions,
  ]);

  const agentData = useMemo(
    () =>
      (performanceReport?.byRepresentative ?? []).filter(
        (row) => row.transacciones > 0 || row.cancelledTransactions > 0
      ),
    [performanceReport]
  );

  const handleSort = (key: keyof RepresentativePerformanceRow) => {
    let direction: 'asc' | 'desc' = 'desc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  const filteredAndSortedData = useMemo(() => {
    let result = [...agentData];

    if (searchTerm) {
      result = result.filter((agent) =>
        agent.agente.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (sortConfig) {
      result.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sortConfig.direction === 'asc'
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }

        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
        }

        return 0;
      });
    }

    return result;
  }, [agentData, searchTerm, sortConfig]);

  const reconciliationSummary = useMemo(() => {
    if (!performanceReport) {
      return [];
    }

    return Object.entries(
      performanceReport.reconciliation.items.reduce<
        Record<RepresentativePerformanceReconciliationReason, number>
      >(
        (accumulator, item) => {
          accumulator[item.reason] += item.validTransactions;
          return accumulator;
        },
        {
          manual_omit: 0,
          unlinked_agent: 0,
          missing_agent: 0,
        }
      )
    )
      .filter(([, total]) => total > 0)
      .map(([reason, total]) => ({
        reason: reason as RepresentativePerformanceReconciliationReason,
        total,
      }));
  }, [performanceReport]);

  const SortIcon = ({ columnKey }: { columnKey: keyof RepresentativePerformanceRow }) => {
    if (sortConfig?.key !== columnKey) {
      return <ArrowUpDown size={12} className="ml-1 opacity-50" />;
    }

    return sortConfig.direction === 'asc' ? (
      <ArrowUp size={12} className="ml-1 text-red-600" />
    ) : (
      <ArrowDown size={12} className="ml-1 text-red-600" />
    );
  };

  if (!performanceReport || agentData.length === 0) return null;

  const table = (
    <Card className="overflow-hidden rounded-2xl border-slate-200 shadow-sm">
      <CardHeader className="border-b border-slate-200 bg-slate-50 p-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-900">
                <Users size={14} className="text-red-600" />
                {title}
              </CardTitle>
              <p className="text-sm text-slate-500">{subtitle}</p>
            </div>

            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder={searchPlaceholder}
                className="rounded-xl border-slate-200 bg-white pl-9 text-xs font-bold focus-visible:ring-red-600"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                Representantes oficiales
              </div>
              <div className="mt-1 text-xl font-black text-slate-900">
                {performanceReport.byRepresentative.length.toLocaleString('en-US')}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                Solo filas vinculadas al roster oficial.
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                Transacciones oficiales
              </div>
              <div className="mt-1 text-xl font-black text-slate-900">
                {performanceReport.reconciliation.officialValidTransactions.toLocaleString('en-US')}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                Cuadra con la tabla y con el ranking.
              </div>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-3">
              <div className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-700">
                Pendientes de conciliación
              </div>
              <div className="mt-1 text-xl font-black text-amber-900">
                {performanceReport.reconciliation.excludedValidTransactions.toLocaleString('en-US')}
              </div>
              <div className="mt-1 text-xs text-amber-800">
                No desaparecen: quedan separados de lo oficial.
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                Meta real del día
              </div>
              <div className="mt-1 text-xl font-black text-slate-900">
                {performanceReport.globalSummary.target.toLocaleString('en-US', {
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 1,
                })}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                Prorrateada por cobertura real.
              </div>
            </div>
          </div>

          {reconciliationSummary.length > 0 ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
              <div className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-700">
                Banda de conciliación
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {reconciliationSummary.map((item) => (
                  <span
                    key={item.reason}
                    className="inline-flex rounded-full border border-amber-200 bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-amber-800"
                  >
                    {RECONCILIATION_REASON_LABELS[item.reason]}: {item.total.toLocaleString('en-US')}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="border-b border-slate-200 hover:bg-transparent">
                <TableHead className="cursor-pointer py-4 transition-colors hover:text-red-600" onClick={() => handleSort('agente')}>
                  <div className="flex items-center text-[10px] font-black uppercase tracking-widest">
                    Representante <SortIcon columnKey="agente" />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer py-4 text-center transition-colors hover:text-red-600" onClick={() => handleSort('transacciones')}>
                  <div className="flex items-center justify-center text-[10px] font-black uppercase tracking-widest">
                    <ShoppingCart size={12} className="mr-1" /> Transacciones <SortIcon columnKey="transacciones" />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer py-4 text-center transition-colors hover:text-red-600" onClick={() => handleSort('ventas')}>
                  <div className="flex items-center justify-center text-[10px] font-black uppercase tracking-widest">
                    <DollarSign size={12} className="mr-1" /> Ventas <SortIcon columnKey="ventas" />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer py-4 text-center transition-colors hover:text-red-600" onClick={() => handleSort('ticketPromedio')}>
                  <div className="flex items-center justify-center text-[10px] font-black uppercase tracking-widest">
                    <Receipt size={12} className="mr-1" /> Ticket Prom. <SortIcon columnKey="ticketPromedio" />
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedData.length > 0 ? (
                filteredAndSortedData.map((agent, idx) => (
                  <TableRow
                    key={agent.representativeId}
                    className={cn(
                      idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30',
                      'transition-colors hover:bg-slate-100'
                    )}
                  >
                    <TableCell className="py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-[10px] font-black uppercase text-red-600">
                          {agent.agente.substring(0, 2)}
                        </div>
                        <div className="min-w-0">
                          <span className="block truncate text-xs font-black text-slate-900">
                            {agent.agente}
                          </span>
                          <span className="mt-1 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.1em] text-slate-600">
                            {agent.shifts.join(' / ')} · {agent.segments.join(' / ')}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-3 text-center">
                      <span className="text-xs font-bold text-slate-600">
                        {formatCount(agent.transacciones)}
                      </span>
                    </TableCell>
                    <TableCell className="py-3 text-center">
                      <span className="text-xs font-bold text-slate-600">
                        {formatCurrency(agent.ventas)}
                      </span>
                    </TableCell>
                    <TableCell className="py-3 text-center">
                      <span className="text-xs font-bold text-slate-600">
                        {formatCurrency(agent.ticketPromedio)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <Users size={24} className="opacity-20" />
                      <p className="text-xs font-bold uppercase tracking-widest">
                        No se encontraron registros
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );

  if (embedded) {
    return table;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="h-4 w-1 rounded-full bg-red-600" />
        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
          Bloque comercial
        </h2>
      </div>
      {table}
    </div>
  );
}
