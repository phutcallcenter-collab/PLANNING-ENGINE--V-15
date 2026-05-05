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
import { Button } from '@/ui/reports/analysis-beta/ui/button';
import {
  BriefcaseBusiness,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Receipt,
  DollarSign,
  ShoppingCart,
  CalendarRange,
  Copy,
  Star,
} from 'lucide-react';
import { useDashboardStore } from '@/ui/reports/analysis-beta/store/dashboard.store';
import type { RepresentativePerformanceRow } from '@/ui/reports/analysis-beta/types/dashboard.types';
import { cn } from '@/ui/reports/analysis-beta/lib/utils';
import { useToast } from '@/ui/reports/analysis-beta/hooks/use-toast';
import { useAppStore } from '@/store/useAppStore';
import {
  buildRepresentativePerformanceReport,
} from '@/ui/reports/analysis-beta/services/representative-performance.service';
import { MANUAL_REPRESENTATIVE_LINKS } from '@/ui/reports/analysis-beta/config/manualRepresentativeLinks';

type SortConfig = {
  key: keyof RepresentativePerformanceRow;
  direction: 'asc' | 'desc';
} | null;

type MonthlyRepresentativeTableProps = {
  embedded?: boolean;
};

function getMonthEnd(monthKey: string) {
  const [year, month] = monthKey.split('-').map(Number);
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
}

function getExpectedDays(monthKey: string) {
  const [year, month] = monthKey.split('-').map(Number);
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export default function MonthlyRepresentativeTable({
  embedded = false,
}: MonthlyRepresentativeTableProps) {
  const transactions = useDashboardStore((state) => state.rawTransactions);
  const selectedMonthKey = useDashboardStore((state) => state.selectedMonthKey);
  const monthlySnapshots = useDashboardStore((state) => state.monthlySnapshots);
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
  const { toast } = useToast();
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

  const monthlySnapshot = useMemo(
    () => (selectedMonthKey ? monthlySnapshots[selectedMonthKey] ?? null : null),
    [monthlySnapshots, selectedMonthKey]
  );

  const performanceReport = useMemo(() => {
    if (!selectedMonthKey) {
      return null;
    }

    const monthTransactions = transactions.filter((transaction) =>
      transaction.fecha.startsWith(`${selectedMonthKey}-`)
    );
    const loadedDates = [
      ...new Set(
        (monthlySnapshot?.loadedDates ?? monthTransactions.map((transaction) => transaction.fecha))
          .filter((date) => date.startsWith(`${selectedMonthKey}-`))
      ),
    ].sort();

    if (loadedDates.length === 0 || monthTransactions.length === 0) {
      return null;
    }

    return buildRepresentativePerformanceReport({
      representatives,
      commercialGoals,
      incidents,
      calendar,
      specialSchedules,
      currentPeriod: {
        kind: 'MONTH',
        anchorDate: `${selectedMonthKey}-01`,
        label: monthlySnapshot?.monthLabel ?? selectedMonthKey,
        from: `${selectedMonthKey}-01`,
        to: getMonthEnd(selectedMonthKey),
        loadedDays: loadedDates.length,
        expectedDays: getExpectedDays(selectedMonthKey),
        loadedDates,
        isComplete: loadedDates.length === getExpectedDays(selectedMonthKey),
      },
      currentTransactions: monthTransactions,
      currentTransactionDates: loadedDates,
      manualRepresentativeLinks: [
        ...MANUAL_REPRESENTATIVE_LINKS,
        ...manualRepresentativeLinks,
      ],
    });
  }, [
    calendar,
    commercialGoals,
    incidents,
    manualRepresentativeLinks,
    monthlySnapshot,
    representatives,
    selectedMonthKey,
    specialSchedules,
    transactions,
  ]);

  const baseRows = useMemo(() => {
    if (performanceReport) {
      return performanceReport.byRepresentative.filter((row) => row.transacciones > 0);
    }

    return [];
  }, [performanceReport]);

  const handleSort = (key: keyof RepresentativePerformanceRow) => {
    let direction: 'asc' | 'desc' = 'desc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  const filteredAndSortedData = useMemo(() => {
    let result = [...baseRows];

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
  }, [baseRows, searchTerm, sortConfig]);

  const featuredRepresentative = useMemo(() => {
    if (baseRows.length === 0) {
      return null;
    }

    return [...baseRows].sort((left, right) =>
      right.ventas === left.ventas
        ? right.transacciones - left.transacciones
        : right.ventas - left.ventas
    )[0];
  }, [baseRows]);

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

  if (!selectedMonthKey || baseRows.length === 0) {
    return null;
  }

  const handleCopyForExcel = async () => {
    const rows = filteredAndSortedData.length > 0 ? filteredAndSortedData : baseRows;
    const header = ['Representante', 'Transacciones', 'Ventas', 'Ticket Promedio'];
    const lines = rows.map((agent) => [
      agent.agente,
      agent.transacciones.toString(),
      agent.ventas.toFixed(2),
      agent.ticketPromedio.toFixed(2),
    ]);
    const text = [header, ...lines].map((row) => row.join('\t')).join('\n');

    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: 'Tabla copiada',
        description: 'Ya puedes pegar la tabla mensual oficial directamente en Excel.',
      });
    } catch {
      toast({
        variant: 'destructive',
        title: 'No se pudo copiar',
        description: 'Intenta nuevamente o copia manualmente desde la tabla.',
      });
    }
  };

  const table = (
    <Card className="overflow-hidden rounded-2xl border-slate-200 shadow-sm">
      <CardHeader className="border-b border-slate-200 bg-slate-50 p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-900">
              <BriefcaseBusiness size={14} className="text-red-600" />
              Representantes del mes
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
              <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 shadow-sm">
                <CalendarRange className="h-3.5 w-3.5 text-slate-400" />
                {monthlySnapshot?.monthLabel ?? selectedMonthKey}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-red-700">
                {(monthlySnapshot?.loadedDays ?? performanceReport?.byAssignment.length ?? 0)}/
                {monthlySnapshot?.expectedDays ?? getExpectedDays(selectedMonthKey)} dias cargados
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-amber-700">
                {performanceReport?.reconciliation.excludedValidTransactions.toLocaleString('en-US') ?? '0'} fuera de lo oficial
              </span>
            </div>
          </div>

          <div className="flex w-full flex-col gap-3 md:w-auto md:min-w-[320px]">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Buscar representante..."
                className="rounded-xl border-slate-200 bg-white pl-9 pr-24 text-xs font-bold focus-visible:ring-red-600"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-xl border-slate-200 bg-white text-[10px] font-black uppercase tracking-[0.16em]"
              onClick={handleCopyForExcel}
            >
              <Copy className="h-4 w-4 text-slate-500" />
              Copiar para Excel
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {featuredRepresentative ? (
          <div className="border-b border-slate-200 bg-emerald-50/60 px-4 py-4">
            <div className="rounded-2xl border border-emerald-200 bg-white/80 px-4 py-4 shadow-sm">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-1">
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-emerald-700">
                    <Star className="h-3.5 w-3.5" />
                    Representante destacado
                  </span>
                  <h3 className="text-lg font-black text-slate-900">
                    {featuredRepresentative.agente}
                  </h3>
                  <p className="text-sm text-slate-600">
                    {featuredRepresentative.transacciones.toLocaleString('en-US')} transacciones ·{' '}
                    {formatCurrency(featuredRepresentative.ventas)} en ventas válidas ·{' '}
                    {formatCurrency(featuredRepresentative.ticketPromedio)} de ticket promedio.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : null}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="border-b border-slate-200 hover:bg-transparent">
                <TableHead
                  className="cursor-pointer py-4 transition-colors hover:text-red-600"
                  onClick={() => handleSort('agente')}
                >
                  <div className="flex items-center text-[10px] font-black uppercase tracking-widest">
                    Representante <SortIcon columnKey="agente" />
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer py-4 text-center transition-colors hover:text-red-600"
                  onClick={() => handleSort('transacciones')}
                >
                  <div className="flex items-center justify-center text-[10px] font-black uppercase tracking-widest">
                    <ShoppingCart size={12} className="mr-1" /> Transacciones
                    <SortIcon columnKey="transacciones" />
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer py-4 text-center transition-colors hover:text-red-600"
                  onClick={() => handleSort('ventas')}
                >
                  <div className="flex items-center justify-center text-[10px] font-black uppercase tracking-widest">
                    <DollarSign size={12} className="mr-1" /> Ventas
                    <SortIcon columnKey="ventas" />
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer py-4 text-center transition-colors hover:text-red-600"
                  onClick={() => handleSort('ticketPromedio')}
                >
                  <div className="flex items-center justify-center text-[10px] font-black uppercase tracking-widest">
                    <Receipt size={12} className="mr-1" /> Ticket Prom.
                    <SortIcon columnKey="ticketPromedio" />
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
                      <BriefcaseBusiness size={24} className="opacity-20" />
                      <p className="text-xs font-bold uppercase tracking-widest">
                        No se encontraron representantes
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
          Acumulado mensual por representante
        </h2>
      </div>
      {table}
    </div>
  );
}
