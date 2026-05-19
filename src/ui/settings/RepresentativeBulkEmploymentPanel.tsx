'use client'

import { useMemo, useState } from 'react'
import type { Representative } from '@/domain/types'
import type { RepresentativeWorkloadSelection } from '@/store/representativeSlice'
import { resolveBulkEmploymentAssignment } from './bulkRepresentativeEmploymentAssignment'

type RepresentativeBulkEmploymentPanelProps = {
  canEditData: boolean
  representatives: Representative[]
  onApply: (
    representativeIds: string[],
    employmentType: RepresentativeWorkloadSelection
  ) => void
}

function formatWorkloadSelection(selection: RepresentativeWorkloadSelection) {
  if (selection === 'MIXTO') {
    return 'Mixto'
  }

  return selection === 'PART_TIME' ? 'Part Time' : 'Full Time'
}

export function RepresentativeBulkEmploymentPanel({
  canEditData,
  representatives,
  onApply,
}: RepresentativeBulkEmploymentPanelProps) {
  const [value, setValue] = useState('')
  const [employmentType, setEmploymentType] =
    useState<RepresentativeWorkloadSelection>('FULL_TIME')
  const result = useMemo(
    () =>
      resolveBulkEmploymentAssignment({
        representatives,
        value,
      }),
    [representatives, value]
  )

  const handleApply = () => {
    if (result.uniqueRepresentativeIds.length === 0) {
      return
    }

    const confirmed = confirm(
      `Se asignará ${formatWorkloadSelection(employmentType)} a ${result.uniqueRepresentativeIds.length} representante(s) coincidente(s).\n\n¿Deseas continuar?`
    )

    if (!confirmed) {
      return
    }

    onApply(result.uniqueRepresentativeIds, employmentType)
    setValue('')
  }

  return (
    <section
      style={{
        borderRadius: '22px',
        border: '1px solid rgba(15, 23, 42, 0.08)',
        background:
          'linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.96) 60%, rgba(239,246,255,0.78) 100%)',
        boxShadow: '0 18px 44px rgba(15, 23, 42, 0.05)',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}
    >
      <div style={{ display: 'grid', gap: '8px' }}>
        <div
          style={{
            fontSize: '0.78rem',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: '#7c3aed',
          }}
        >
          Asignación masiva
        </div>
        <div>
          <h3
            style={{
              margin: 0,
              fontSize: '1.08rem',
              color: 'var(--text-main)',
            }}
          >
            Jornada por lote
          </h3>
          <p
            style={{
              margin: '8px 0 0',
              fontSize: '13px',
              lineHeight: 1.6,
              color: 'var(--text-muted)',
              maxWidth: '72ch',
            }}
          >
            Pega nombres separados por línea, coma o punto y coma. El sistema busca
            coincidencias normalizadas y te deja aplicar `Full Time`, `Part Time` o `Mixto` de
            una sola vez.
          </p>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.25fr) minmax(260px, 0.75fr)',
          gap: '16px',
        }}
      >
        <div style={{ display: 'grid', gap: '10px' }}>
          <label
            style={{
              fontSize: '12px',
              fontWeight: 700,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              color: '#64748b',
            }}
          >
            Lista de nombres
          </label>
          <textarea
            value={value}
            onChange={event => setValue(event.target.value)}
            placeholder={'Ej:\nAna Garcia\nJose Rosario\nAndrea Manon'}
            style={{
              minHeight: '168px',
              resize: 'vertical',
              borderRadius: '16px',
              border: '1px solid rgba(148, 163, 184, 0.22)',
              background: 'rgba(255,255,255,0.98)',
              padding: '14px 15px',
              fontSize: '14px',
              lineHeight: 1.6,
              color: 'var(--text-main)',
              outline: 'none',
            }}
          />
          <div
            style={{
              fontSize: '12px',
              color: '#64748b',
              lineHeight: 1.6,
            }}
          >
            {result.parsedNames.length} nombre(s) detectado(s). Se ignoran duplicados
            escritos varias veces en la misma tanda.
          </div>
        </div>

        <div style={{ display: 'grid', gap: '12px', alignContent: 'start' }}>
          <div>
            <label
              style={{
                fontSize: '12px',
                fontWeight: 700,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                color: '#64748b',
              }}
            >
              Jornada a aplicar
            </label>
            <select
              value={employmentType}
              onChange={event =>
                setEmploymentType(
                  event.target.value as RepresentativeWorkloadSelection
                )
              }
              style={{
                width: '100%',
                marginTop: '8px',
                borderRadius: '14px',
                border: '1px solid rgba(148, 163, 184, 0.22)',
                background: 'rgba(255,255,255,0.98)',
                padding: '11px 12px',
                fontSize: '14px',
                color: 'var(--text-main)',
              }}
            >
              <option value="FULL_TIME">Full Time</option>
              <option value="PART_TIME">Part Time</option>
              <option value="MIXTO">Mixto</option>
            </select>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: '10px',
            }}
          >
            {[
              {
                label: 'Coincidencias',
                value: result.matchedRepresentatives.length,
                accent: '#0f766e',
                background: 'rgba(240,253,250,0.96)',
                border: 'rgba(13,148,136,0.18)',
              },
              {
                label: 'Sin match',
                value: result.unmatchedNames.length,
                accent: '#b45309',
                background: 'rgba(255,251,235,0.96)',
                border: 'rgba(245,158,11,0.22)',
              },
            ].map(item => (
              <div
                key={item.label}
                style={{
                  borderRadius: '14px',
                  border: `1px solid ${item.border}`,
                  background: item.background,
                  padding: '12px 13px',
                }}
              >
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: '#64748b',
                    marginBottom: '6px',
                  }}
                >
                  {item.label}
                </div>
                <div
                  style={{
                    fontSize: '1.1rem',
                    fontWeight: 800,
                    color: item.accent,
                  }}
                >
                  {item.value}
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={handleApply}
            disabled={!canEditData || result.uniqueRepresentativeIds.length === 0}
            style={{
              border: 'none',
              background:
                !canEditData || result.uniqueRepresentativeIds.length === 0
                  ? '#cbd5e1'
                  : '#111827',
              color: 'white',
              borderRadius: '12px',
              padding: '12px 16px',
              fontWeight: 700,
              cursor:
                !canEditData || result.uniqueRepresentativeIds.length === 0
                  ? 'not-allowed'
                  : 'pointer',
              opacity: !canEditData || result.uniqueRepresentativeIds.length === 0 ? 0.72 : 1,
            }}
          >
            Aplicar jornada al lote
          </button>
        </div>
      </div>

      {result.matchedRepresentatives.length > 0 ? (
        <div
          style={{
            padding: '14px 15px',
            borderRadius: '16px',
            border: '1px solid rgba(16, 185, 129, 0.18)',
            background: 'rgba(240, 253, 244, 0.92)',
            display: 'grid',
            gap: '10px',
          }}
        >
          <div
            style={{
              fontSize: '12px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: '#047857',
            }}
          >
            Coincidencias encontradas
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {result.matchedRepresentatives.map(representative => (
              <span
                key={representative.id}
                style={{
                  padding: '7px 10px',
                  borderRadius: '999px',
                  background: 'rgba(255,255,255,0.96)',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  color: '#065f46',
                  fontSize: '12px',
                  fontWeight: 700,
                }}
              >
                {representative.name}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {result.unmatchedNames.length > 0 ? (
        <div
          style={{
            padding: '14px 15px',
            borderRadius: '16px',
            border: '1px solid rgba(245, 158, 11, 0.2)',
            background: 'rgba(255, 251, 235, 0.92)',
            display: 'grid',
            gap: '10px',
          }}
        >
          <div
            style={{
              fontSize: '12px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: '#b45309',
            }}
          >
            Nombres sin coincidencia
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {result.unmatchedNames.map(name => (
              <span
                key={name}
                style={{
                  padding: '7px 10px',
                  borderRadius: '999px',
                  background: 'rgba(255,255,255,0.96)',
                  border: '1px solid rgba(245, 158, 11, 0.2)',
                  color: '#9a3412',
                  fontSize: '12px',
                  fontWeight: 700,
                }}
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {result.duplicateMatches.length > 0 ? (
        <div
          style={{
            padding: '14px 15px',
            borderRadius: '16px',
            border: '1px solid rgba(99, 102, 241, 0.18)',
            background: 'rgba(238, 242, 255, 0.9)',
            color: '#4338ca',
            fontSize: '12px',
            lineHeight: 1.6,
          }}
        >
          Hay {result.duplicateMatches.length} nombre(s) que coinciden con más de un
          perfil activo. En esos casos el lote tocará a todos los perfiles que
          compartan ese nombre.
        </div>
      ) : null}
    </section>
  )
}
