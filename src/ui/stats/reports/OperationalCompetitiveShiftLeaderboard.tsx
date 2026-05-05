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
        borderRadius: '30px',
        border: '1px solid rgba(255,255,255,0.08)',
        background: '#23211f',
        color: '#f5f5f4',
        overflow: 'hidden',
        boxShadow: '0 28px 64px rgba(0,0,0,0.18)',
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
          padding: '24px 28px 18px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '14px',
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
              background: table.shift === 'DAY' ? '#f59e0b' : '#38bdf8',
              boxShadow: '0 0 0 6px rgba(255,255,255,0.04)',
            }}
          />
          <h3
            style={{
              margin: 0,
              fontSize: '1.8rem',
              fontWeight: 800,
              letterSpacing: '-0.04em',
            }}
          >
            {table.label}
          </h3>
        </div>

        <div
          style={{
            color: 'rgba(245,245,244,0.72)',
            fontSize: '1rem',
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

      <div style={{ padding: '20px 28px 26px', display: 'grid', gap: '20px' }}>
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
                  borderBottom: '1px solid rgba(255,255,255,0.08)',
                  paddingBottom: '10px',
                }}
              >
                <span
                  style={{
                    color: 'rgba(245,245,244,0.56)',
                    fontSize: '1.05rem',
                    fontWeight: 800,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                  }}
                >
                  {group.label}
                </span>
                <span style={{ color: 'rgba(245,245,244,0.38)' }}>·</span>
                <span
                  style={{
                    color: 'rgba(245,245,244,0.76)',
                    fontSize: '1.02rem',
                    fontWeight: 700,
                  }}
                >
                  Meta bloque: {formatTarget(group.summary.target)}
                </span>
                <span style={{ color: 'rgba(245,245,244,0.38)' }}>·</span>
                <span
                  style={{
                    color: tone.text,
                    fontSize: '1.02rem',
                    fontWeight: 800,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                  }}
                >
                  {formatPercent(group.summary.progressPct)} cumplido
                </span>
              </div>

              {group.rows.length === 0 ? (
                <div
                  style={{
                    padding: '18px 0 4px',
                    color: 'rgba(245,245,244,0.54)',
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
                      minWidth: comparisonEnabled ? '860px' : '740px',
                      borderCollapse: 'collapse',
                    }}
                  >
                    <thead>
                      <tr style={{ color: 'rgba(245,245,244,0.56)' }}>
                        {[
                          'Representante',
                          'Meta',
                          'Txns',
                          'Cumplimiento',
                          'Err.',
                          ...(comparisonEnabled ? [`vs ${comparisonLabel}`] : []),
                        ].map((column) => (
                          <th
                            key={column}
                            style={{
                              padding: '6px 12px 10px',
                              textAlign: column === 'Representante' ? 'left' : 'right',
                              fontSize: '0.92rem',
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
                              borderTop: '1px solid rgba(255,255,255,0.06)',
                            }}
                          >
                            <td style={{ padding: '16px 12px', textAlign: 'left' }}>
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '12px',
                                }}
                              >
                                <span
                                  style={{
                                    width: '28px',
                                    textAlign: 'center',
                                    color: index < 3 ? '#f59e0b' : 'rgba(245,245,244,0.7)',
                                    fontWeight: 800,
                                    fontSize: '1.15rem',
                                  }}
                                >
                                  {index + 1}
                                </span>
                                <div
                                  style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '999px',
                                    background: '#f5f5f4',
                                    color: '#1f2937',
                                    display: 'grid',
                                    placeItems: 'center',
                                    fontWeight: 800,
                                    fontSize: '0.9rem',
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
                                      color: '#fafaf9',
                                    }}
                                  >
                                    {row.agente}
                                  </span>
                                  <span
                                    style={{
                                      fontSize: '0.78rem',
                                      fontWeight: 700,
                                      color: 'rgba(245,245,244,0.5)',
                                      textTransform: 'uppercase',
                                      letterSpacing: '0.06em',
                                    }}
                                  >
                                    {group.label}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td
                              style={{
                                padding: '16px 12px',
                                textAlign: 'right',
                                fontSize: '1rem',
                                fontWeight: 700,
                                color: 'rgba(245,245,244,0.78)',
                              }}
                            >
                              {formatTarget(row.target)}
                            </td>
                            <td
                              style={{
                                padding: '16px 12px',
                                textAlign: 'right',
                                fontSize: '1.2rem',
                                fontWeight: 800,
                                color: '#fafaf9',
                              }}
                            >
                              {row.transacciones.toLocaleString('en-US')}
                            </td>
                            <td style={{ padding: '16px 12px', textAlign: 'right', width: '220px' }}>
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
                                    height: '10px',
                                    borderRadius: '999px',
                                    background: 'rgba(255,255,255,0.06)',
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
                                    fontSize: '1rem',
                                  }}
                                >
                                  {formatPercent(row.progressPct)}
                                </span>
                              </div>
                            </td>
                            <td
                              style={{
                                padding: '16px 12px',
                                textAlign: 'right',
                                color: row.errors > 0 ? '#ef4444' : 'rgba(245,245,244,0.68)',
                                fontWeight: 700,
                                fontSize: '1rem',
                              }}
                            >
                              {row.errors > 0 ? row.errors.toLocaleString('en-US') : '—'}
                            </td>
                            {comparisonEnabled ? (
                              <td
                                style={{
                                  padding: '16px 12px',
                                  textAlign: 'right',
                                  color: getDeltaColor(row.comparisonDelta),
                                  fontWeight: 800,
                                  fontSize: '1rem',
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
