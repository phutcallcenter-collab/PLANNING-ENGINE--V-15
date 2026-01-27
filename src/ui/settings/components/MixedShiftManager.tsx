/**
 * 🛑 COMPONENTE DESHABILITADO
 *
 * MixedShiftManager operaba sobre un modelo de dominio legacy (addEffectivePeriod)
 * que ya no existe. Ha sido reemplazado por el sistema de Horarios Especiales
 * que utiliza `weeklyPattern` explícitos.
 *
 * Este componente se mantiene para no romper imports, pero está funcionalmente
 * desactivado para prevenir errores de build y runtime.
 *
 * La gestión de horarios mixtos ahora se realiza a través del SpecialScheduleWizard.
 */
export function MixedShiftManager() {
  if (process.env.NODE_ENV !== 'production') {
    return (
      <div style={{ padding: 16, margin: '16px 0', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', fontSize: '13px', lineHeight: 1.5 }}>
        <strong>MixedShiftManager Deshabilitado:</strong> Este componente utiliza una API
        legacy (`addEffectivePeriod`) que ya no existe en el dominio. La gestión
        de horarios especiales ahora se centraliza en el `SpecialScheduleWizard`.
      </div>
    )
  }

  return null
}
