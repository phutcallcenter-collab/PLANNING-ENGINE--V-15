'use client';

import type { RepresentativePerformanceShiftGroup } from '@/ui/reports/analysis-beta/types/dashboard.types';

function formatTarget(value: number) {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: value % 1 === 0 ? 0 : 1,
    maximumFractionDigits: value % 1 === 0 ? 0 : 1,
  });
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function getProgressTone(value: number) {
  if (value >= 100) {
    return {
      bar: '#65a30d',
      text: '#65a30d',
    };
  }

  if (value >= 75) {
    return {
      bar: '#f59e0b',
      text: '#f59e0b',
    };
  }

  return {
    bar: '#ef4444',
    text: '#ef4444',
  };
}

function getDeltaLabel(value: number | null, comparisonLabel: string) {
  if (value === null) {
    return '—';
  }

  if (value === 0) {
    return `= ${comparisonLabel}`;
  }

  return `${value > 0 ? '▲' : '▼'}${Math.abs(value).toLocaleString('en-US')}`;
}

function getDeltaColor(value: number | null) {
  if (value === null || value === 0) {
    return '#a8a29e';
  }

  return value > 0 ? '#65a30d' : '#ef4444';
}

type OperationalCompetitiveShiftLeaderboardProps = {
  comparisonEnabled: boolean;
  comparisonLabel: string;
  table: RepresentativePerformanceShiftGroup;
};

export function OperationalCompetitiveShiftLeaderboard({
  comparisonEnabled,
  comparisonLabel,
  table,
}: OperationalCompetitiveShiftLeaderboardProps) {
  const totalRepresentatives = table.groups.reduce(
    (total, group) => total + group.summary.representatives,
    0
  );
  const totalTransactions = table.groups.reduce(
    (total, group) => total + group.summary.validTransactions,
    0
  );
  const totalTarget = table.groups.reduce((total, group) => total + group.summary.target, 0);
  const totalProgress = totalTarget > 0 ? (totalTransactions / totalTarget) * 100 : 0;

  return (
    <section
      className="report-shift-section report-print-avoid-break"
      style={{
        borderRadius: '22px',
        border: '1px solid var(--shell-border)',
        background: 'var(--surface-raised)',
        color: 'var(--text-main)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <div className="report-print-only report-print-summary-strip text-slate-700">
        <span>{table.label}</span>
        <span>
          {totalRepresentatives} reps · {totalTransactions.toLocaleString('en-US')} txns
        </span>
      </div>

      <div
        style={{
          padding: '16px 18px 12px',
          borderBottom: '1px solid var(--shell-border)',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '10px',
          alignItems: 'baseline',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <span
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '999px',
              background: table.shift === 'DAY' ? 'var(--accent-warm)' : 'var(--accent)',
              boxShadow: '0 0 0 5px rgba(var(--accent-rgb),0.1)',
            }}
          />
          <h3
            style={{
              margin: 0,
              fontSize: '1.15rem',
              fontWeight: 800,
              letterSpacing: 0,
            }}
          >
            {table.label}
          </h3>
        </div>

        <div
          style={{
            color: 'var(--text-muted)',
            fontSize: '0.82rem',
            fontWeight: 700,
            display: 'flex',
            gap: '10px',
            flexWrap: 'wrap',
          }}
        >
          <span>{totalRepresentatives} representantes</span>
          <span>·</span>
          <span>{totalTransactions.toLocaleString('en-US')} transacciones</span>
          <span>·</span>
          <span>{formatPercent(totalProgress)} cumplimiento</span>
        </div>
      </div>

      <div style={{ padding: '14px 18px 18px', display: 'grid', gap: '16px' }}>
        {table.groups.map((group) => {
          const tone = getProgressTone(group.summary.progressPct);

          return (
            <div key={`${table.shift}:${group.segment}`} style={{ display: 'grid', gap: '12px' }}>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '8px',
                  alignItems: 'center',
                  borderBottom: '1px solid var(--shell-border)',
                  paddingBottom: '8px',
                }}
              >
                <span
                  style={{
                    color: 'var(--text-muted)',
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                  }}
                >
                  {group.label}
                </span>
                <span style={{ color: 'var(--text-faint)' }}>·</span>
                <span
                  style={{
                    color: 'var(--text-muted)',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                  }}
                >
                  Meta indiv.: {group.summary.monthlyTargetPerRepresentative === null
                    ? 'variable'
                    : formatTarget(group.summary.monthlyTargetPerRepresentative)}
                </span>
                <span style={{ color: 'var(--text-faint)' }}>·</span>
                <span
                  style={{
                    color: 'var(--text-muted)',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                  }}
                >
                  Meta bloque: {formatTarget(group.summary.target)}
                </span>
                <span style={{ color: 'var(--text-faint)' }}>·</span>
                <span
                  style={{
                    color: tone.text,
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    letterSpacing: '0.02em',
                    textTransform: 'uppercase',
                  }}
                >
                  {formatPercent(group.summary.progressPct)} cumplido
                </span>
              </div>

              {group.rows.length === 0 ? (
                <div
                  style={{
                    padding: '14px 0 2px',
                    color: 'var(--text-muted)',
                    fontSize: '0.95rem',
                  }}
                >
                  No hay representantes oficiales en este bloque para el período seleccionado.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table
                    style={{
                      width: '100%',
                      minWidth: comparisonEnabled ? '980px' : '860px',
                      borderCollapse: 'collapse',
                    }}
                  >
                    <thead>
                      <tr style={{ color: 'var(--text-muted)' }}>
                        {[
                          'Representante',
                          'Meta',
                          'Txns',
                          'Cumplimiento',
                          'Inc.',
                          'Err.',
                          'Aus.',
                          'Tard.',
                          ...(comparisonEnabled ? [`vs ${comparisonLabel}`] : []),
                        ].map((column) => (
                          <th
                            key={column}
                            style={{
                              padding: '6px 10px 8px',
                              textAlign: column === 'Representante' ? 'left' : 'right',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                            }}
                          >
                            {column}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {group.rows.map((row, index) => {
                        const rowTone = getProgressTone(row.progressPct);

                        return (
                          <tr
                            key={`${row.representativeId}:${row.shift}:${row.segment}`}
                            style={{
                              borderTop: '1px solid var(--shell-border)',
                            }}
                          >
                            <td style={{ padding: '12px 10px', textAlign: 'left' }}>
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '10px',
                                }}
                              >
                                <span
                                  style={{
                                    width: '28px',
                                    textAlign: 'center',
                                    color: index < 3 ? 'var(--accent-warm)' : 'var(--text-muted)',
                                    fontWeight: 800,
                                    fontSize: '0.95rem',
                                  }}
                                >
                                  {index + 1}
                                </span>
                                <div
                                  style={{
                                    width: '34px',
                                    height: '34px',
                                    borderRadius: '999px',
                                    background: 'rgba(var(--accent-rgb),0.12)',
                                    color: 'var(--accent-strong)',
                                    display: 'grid',
                                    placeItems: 'center',
                                    fontWeight: 800,
                                    fontSize: '0.78rem',
                                  }}
                                >
                                  {row.agente
                                    .split(' ')
                                    .slice(0, 2)
                                    .map((value) => value[0] ?? '')
                                    .join('')}
                                </div>
                                <div style={{ display: 'grid', gap: '4px' }}>
                                  <span
                                    style={{
                                      fontSize: '1rem',
                                      fontWeight: 800,
                                      color: 'var(--text-main)',
                                    }}
                                  >
                                    {row.agente}
                                  </span>
                                  <span
                                    style={{
                                      fontSize: '0.78rem',
                                      fontWeight: 700,
                                      color: 'var(--text-muted)',
                                      textTransform: 'uppercase',
                                      letterSpacing: '0.04em',
                                    }}
                                  >
                                    {group.label}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td
                              style={{
                                padding: '12px 10px',
                                textAlign: 'right',
                                fontSize: '0.88rem',
                                fontWeight: 700,
                                color: 'var(--text-muted)',
                              }}
                            >
                              {formatTarget(row.target)}
                            </td>
                            <td
                              style={{
                                padding: '12px 10px',
                                textAlign: 'right',
                                fontSize: '1rem',
                                fontWeight: 800,
                                color: 'var(--text-main)',
                              }}
                            >
                              {row.transacciones.toLocaleString('en-US')}
                            </td>
                            <td style={{ padding: '12px 10px', textAlign: 'right', width: '180px' }}>
                              <div
                                style={{
                                  display: 'grid',
                                  gap: '8px',
                                  justifyItems: 'end',
                                }}
                              >
                                <div
                                  className="report-progress-track"
                                  style={{
                                    width: '160px',
                                    height: '8px',
                                    borderRadius: '999px',
                                    background: 'rgba(var(--accent-rgb),0.12)',
                                    overflow: 'hidden',
                                  }}
                                >
                                  <div
                                    className="report-progress-fill"
                                    style={{
                                      width: `${Math.max(0, Math.min(row.progressPct, 100))}%`,
                                      height: '100%',
                                      borderRadius: '999px',
                                      background: rowTone.bar,
                                    }}
                                  />
                                </div>
                                <span
                                  style={{
                                    color: rowTone.text,
                                    fontWeight: 800,
                                    fontSize: '0.86rem',
                                  }}
                                >
                                  {formatPercent(row.progressPct)}
                                </span>
                              </div>
                            </td>
                            <td
                              style={{
                                padding: '12px 10px',
                                textAlign: 'right',
                                color: row.incidents > 0 ? 'var(--accent-warm)' : 'var(--text-muted)',
                                fontWeight: 700,
                                fontSize: '0.86rem',
                              }}
                            >
                              {row.incidents > 0 ? row.incidents.toLocaleString('en-US') : '—'}
                            </td>
                            <td
                              style={{
                                padding: '12px 10px',
                                textAlign: 'right',
                                color: row.errors > 0 ? '#ef4444' : 'var(--text-muted)',
                                fontWeight: 700,
                                fontSize: '0.86rem',
                              }}
                            >
                              {row.errors > 0 ? row.errors.toLocaleString('en-US') : '—'}
                            </td>
                            <td
                              style={{
                                padding: '12px 10px',
                                textAlign: 'right',
                                color: row.absences > 0 ? '#b91c1c' : 'var(--text-muted)',
                                fontWeight: 700,
                                fontSize: '0.86rem',
                              }}
                            >
                              {row.absences > 0 ? row.absences.toLocaleString('en-US') : '—'}
                            </td>
                            <td
                              style={{
                                padding: '12px 10px',
                                textAlign: 'right',
                                color: row.tardiness > 0 ? '#d97706' : 'var(--text-muted)',
                                fontWeight: 700,
                                fontSize: '0.86rem',
                              }}
                            >
                              {row.tardiness > 0 ? row.tardiness.toLocaleString('en-US') : '—'}
                            </td>
                            {comparisonEnabled ? (
                              <td
                                style={{
                                  padding: '12px 10px',
                                  textAlign: 'right',
                                  color: getDeltaColor(row.comparisonDelta),
                                  fontWeight: 800,
                                  fontSize: '0.86rem',
                                }}
                              >
                                {getDeltaLabel(row.comparisonDelta, comparisonLabel)}
                              </td>
                            ) : null}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
