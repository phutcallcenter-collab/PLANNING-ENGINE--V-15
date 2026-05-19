import type { Representative } from '@/domain/types'
import {
  Calendar,
  Edit,
  Moon,
  Plus,
  RotateCcw,
  Shield,
  Sparkles,
  Sun,
  Target,
  Trash2,
  UserRound,
} from 'lucide-react'
import {
  countRepresentativeDayOffs,
  getRepresentativeCommercialLabel,
  getRepresentativeEmploymentLabel,
  getRepresentativeMixLabel,
  getRepresentativeOffDayLabels,
  getRepresentativeRoleLabel,
  getRepresentativeShiftLabel,
} from './representativeEditorSchema'

type RepresentativeDetailPanelProps = {
  advancedEditMode: boolean
  onCreateNew: () => void
  onDeactivate: () => void
  onEdit: () => void
  onReactivate: () => void
  representative: Representative
  specialScheduleCount: number
}

export function RepresentativeDetailPanel({
  advancedEditMode,
  onCreateNew,
  onDeactivate,
  onEdit,
  onReactivate,
  representative,
  specialScheduleCount,
}: RepresentativeDetailPanelProps) {
  const ShiftIcon = representative.baseShift === 'DAY' ? Sun : Moon
  const dayOffCount = countRepresentativeDayOffs(representative.baseSchedule)
  const dayOffLabels = getRepresentativeOffDayLabels(representative.baseSchedule)
  const isActive = representative.isActive !== false

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '18px',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '16px',
          flexWrap: 'wrap',
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: '14px',
            alignItems: 'flex-start',
          }}
        >
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '16px',
              display: 'grid',
              placeItems: 'center',
              background: isActive
                ? 'rgba(37, 99, 235, 0.12)'
                : 'rgba(148, 163, 184, 0.16)',
              color: isActive ? '#2563eb' : '#64748b',
              flexShrink: 0,
            }}
          >
            <UserRound size={22} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div>
              <h4
                style={{
                  margin: 0,
                  fontSize: '1.15rem',
                  color: 'var(--text-main)',
                }}
              >
                {representative.name}
              </h4>
              <p
                style={{
                  margin: '6px 0 0',
                  fontSize: '13px',
                  lineHeight: 1.6,
                  color: 'var(--text-muted)',
                  maxWidth: '58ch',
                }}
              >
                Revisa la ficha primero y entra a edicion solo cuando vayas a cambiar
                algo. Asi evitamos recaptura innecesaria y errores por tocar datos sin
                querer.
              </p>
            </div>

            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 10px',
                  borderRadius: '999px',
                  background: 'rgba(255,255,255,0.9)',
                  border: '1px solid rgba(148, 163, 184, 0.2)',
                  color: '#334155',
                  fontSize: '12px',
                  fontWeight: 700,
                }}
              >
                <ShiftIcon size={14} />
                {getRepresentativeShiftLabel(representative.baseShift)}
              </span>
              <span
                style={{
                  padding: '7px 10px',
                  borderRadius: '999px',
                  background: 'rgba(255,255,255,0.9)',
                  border: '1px solid rgba(148, 163, 184, 0.2)',
                  color: '#334155',
                  fontSize: '12px',
                  fontWeight: 700,
                }}
              >
                {getRepresentativeRoleLabel(representative.role)}
              </span>
              <span
                style={{
                  padding: '7px 10px',
                  borderRadius: '999px',
                  background: 'rgba(255,255,255,0.9)',
                  border: '1px solid rgba(148, 163, 184, 0.2)',
                  color: '#334155',
                  fontSize: '12px',
                  fontWeight: 700,
                }}
              >
                {getRepresentativeEmploymentLabel(
                  representative.employmentType,
                  representative.mixProfile
                )}
              </span>
              <span
                style={{
                  padding: '7px 10px',
                  borderRadius: '999px',
                  background: isActive
                    ? 'rgba(236, 253, 245, 0.92)'
                    : 'rgba(248, 250, 252, 0.92)',
                  border: isActive
                    ? '1px solid rgba(16, 185, 129, 0.22)'
                    : '1px solid rgba(148, 163, 184, 0.22)',
                  color: isActive ? '#047857' : '#64748b',
                  fontSize: '12px',
                  fontWeight: 700,
                }}
              >
                {isActive ? 'Activo' : 'Inactivo'}
              </span>
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            gap: '10px',
            flexWrap: 'wrap',
            justifyContent: 'flex-end',
          }}
        >
          <button
            type="button"
            onClick={onEdit}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 14px',
              borderRadius: '12px',
              border: '1px solid rgba(37, 99, 235, 0.18)',
              background: '#2563eb',
              color: 'white',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <Edit size={15} />
            Editar ficha
          </button>
          <button
            type="button"
            onClick={onCreateNew}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 14px',
              borderRadius: '12px',
              border: '1px solid rgba(148, 163, 184, 0.22)',
              background: 'white',
              color: '#334155',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <Plus size={15} />
            Nuevo
          </button>
          {advancedEditMode ? (
            isActive ? (
              <button
                type="button"
                onClick={onDeactivate}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  border: '1px solid rgba(248, 113, 113, 0.24)',
                  background: '#fef2f2',
                  color: '#b91c1c',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <Trash2 size={15} />
                Desactivar
              </button>
            ) : (
              <button
                type="button"
                onClick={onReactivate}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  border: '1px solid rgba(16, 185, 129, 0.24)',
                  background: '#ecfdf5',
                  color: '#047857',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <RotateCcw size={15} />
                Reactivar
              </button>
            )
          ) : null}
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '12px',
        }}
      >
        {[
          {
            label: 'Turno base',
            value: getRepresentativeShiftLabel(representative.baseShift),
            icon: <ShiftIcon size={14} />,
          },
          {
            label: 'Rol operativo',
            value: getRepresentativeRoleLabel(representative.role),
            icon: <Shield size={14} />,
          },
          {
            label: 'Dias OFF base',
            value: `${dayOffCount} dia(s)`,
            icon: <Sparkles size={14} />,
          },
          {
            label: 'Horarios especiales',
            value:
              specialScheduleCount === 0
                ? 'Sin ajustes'
                : `${specialScheduleCount} activo(s)`,
            icon: <Calendar size={14} />,
          },
          {
            label: 'Ranking comercial',
            value: representative.commercialEligible ? 'Participa' : 'No participa',
            icon: <Target size={14} />,
          },
        ].map(item => (
          <div
            key={item.label}
            style={{
              borderRadius: '16px',
              border: '1px solid rgba(148, 163, 184, 0.16)',
              background: 'rgba(255,255,255,0.88)',
              padding: '14px 15px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              minHeight: '94px',
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                color: '#64748b',
                fontSize: '12px',
                fontWeight: 700,
              }}
            >
              {item.icon}
              {item.label}
            </div>
            <div
              style={{
                fontSize: '14px',
                fontWeight: 700,
                color: 'var(--text-main)',
                lineHeight: 1.5,
              }}
            >
              {item.value}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.1fr) minmax(0, 0.9fr)',
          gap: '14px',
        }}
      >
        <div
          style={{
            padding: '16px',
            borderRadius: '16px',
            border: '1px solid rgba(148, 163, 184, 0.16)',
            background: 'rgba(255,255,255,0.9)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div
            style={{
              fontSize: '12px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: '#64748b',
            }}
          >
            Patron base semanal
          </div>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
            }}
          >
            {dayOffLabels.length > 0 ? (
              dayOffLabels.map(label => (
                <span
                  key={label}
                  style={{
                    padding: '7px 10px',
                    borderRadius: '999px',
                    background: 'rgba(239, 246, 255, 0.95)',
                    border: '1px solid rgba(37, 99, 235, 0.16)',
                    color: '#1d4ed8',
                    fontSize: '12px',
                    fontWeight: 700,
                  }}
                >
                  {label} OFF
                </span>
              ))
            ) : (
              <span
                style={{
                  padding: '7px 10px',
                  borderRadius: '999px',
                  background: 'rgba(248,250,252,0.95)',
                  border: '1px solid rgba(148, 163, 184, 0.16)',
                  color: '#64748b',
                  fontSize: '12px',
                  fontWeight: 700,
                }}
              >
                Sin dias OFF base
              </span>
            )}
          </div>
          <p
            style={{
              margin: 0,
              fontSize: '13px',
              lineHeight: 1.6,
              color: 'var(--text-muted)',
            }}
          >
            El patron base se usa como referencia para la planificacion automatica y
            para recalcular semanas futuras.
          </p>
        </div>

        <div
          style={{
            padding: '16px',
            borderRadius: '16px',
            border: '1px solid rgba(148, 163, 184, 0.16)',
            background: 'rgba(255,255,255,0.9)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div
            style={{
              fontSize: '12px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: '#64748b',
            }}
          >
            Contexto operativo
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#475569',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            <Sparkles size={15} color="#7c3aed" />
            {getRepresentativeMixLabel(representative)}
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#475569',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            <Target size={15} color={representative.commercialEligible ? '#0f766e' : '#64748b'} />
            {getRepresentativeCommercialLabel(
              representative.commercialEligible === true
            )}
          </div>
          <p
            style={{
              margin: 0,
              fontSize: '13px',
              lineHeight: 1.6,
              color: isActive ? 'var(--text-muted)' : '#92400e',
            }}
          >
            {isActive
              ? 'Desde aqui puedes validar la ficha antes de entrar a editar y evitar cambios accidentales.'
              : 'La ficha esta inactiva. Su historial se conserva, pero no entra en nuevos planes hasta que la reactives.'}
          </p>
          {!advancedEditMode ? (
            <div
              style={{
                padding: '12px 13px',
                borderRadius: '12px',
                background: 'rgba(248,250,252,0.96)',
                border: '1px dashed rgba(148, 163, 184, 0.28)',
                color: '#64748b',
                fontSize: '12px',
                lineHeight: 1.6,
              }}
            >
              La desactivacion y reactivacion quedan protegidas por el modo de edicion
              avanzada.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
