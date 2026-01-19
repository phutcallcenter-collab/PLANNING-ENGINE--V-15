/**
 * 🧪 TESTS: Validación de operaciones de cambio de turno (REFRACTORIZADO)
 * 
 * Basado en EffectiveSwapContext.
 */

import { validateSwapOperation } from '../../../src/domain/swaps/validateSwapOperation'
import { EffectiveSwapContext } from '../../../src/domain/swaps/buildDailyEffectiveContext'
import { ShiftType } from '../../../src/domain/types'

// Helper para crear contexto mock
const mockCtx = (
  data: Record<string, { shifts: ShiftType[]; blocked?: boolean }>
): EffectiveSwapContext => {
  const daily: any = {}
  Object.entries(data).forEach(([id, info]) => {
    daily[id] = {
      effectiveShifts: new Set(info.shifts),
      baseShifts: new Set(info.shifts), // Para simplificar tests
      isBlocked: !!info.blocked,
    }
  })
  return { daily }
}

describe('validateSwapOperation - COVER', () => {
  it('permite DAY -> cubrir NIGHT (Rafael cubre a Luz)', () => {
    // Rafael (NIGHT) cubre a Luz (DAY)
    // El target 'Luz' trabaja DAY. El agente 'Rafael' trabaja NIGHT.
    // Rafael quiere cubrir el turno 'DAY' de Luz.
    const ctx = mockCtx({
      luz: { shifts: ['DAY'] },
      rafael: { shifts: ['NIGHT'] },
    })

    // To (Rafael) cubre turno DAY de From (Luz)
    // Validación: Luz tiene DAY? Sí. Rafael tiene DAY? No. -> OK.
    const res = validateSwapOperation('COVER', 'luz', 'rafael', 'DAY', ctx)
    expect(res).toBeNull()
  })

  it('permite OFF -> cubrir DAY (Luz cubre a Kirsis)', () => {
    // Luz (OFF/Libre) cubre a Kirsis (DAY)
    const ctx = mockCtx({
      kirsis: { shifts: ['DAY'] },
      luz: { shifts: [] }, // OFF
    })

    const res = validateSwapOperation('COVER', 'kirsis', 'luz', 'DAY', ctx)
    expect(res).toBeNull()
  })

  it('rechaza si el que cubre YA TIENE ese turno', () => {
    const ctx = mockCtx({
      juan: { shifts: ['DAY'] },
      pedro: { shifts: ['DAY'] },
    })
    // Pedro (DAY) quiere cubrir a Juan (DAY) -> Imposible, ya trabaja.
    const res = validateSwapOperation('COVER', 'juan', 'pedro', 'DAY', ctx)
    expect(res).toContain('no está disponible')
  })

  it('rechaza si el objetivo NO TIENE el turno a cubrir', () => {
    const ctx = mockCtx({
      juan: { shifts: ['NIGHT'] }, // Juan es Noche
      pedro: { shifts: [] },
    })
    // Pedro quiere cubrir turno DAY de Juan -> Juan no tiene turno DAY.
    const res = validateSwapOperation('COVER', 'juan', 'pedro', 'DAY', ctx)
    expect(res).toContain('no tiene ese turno asignado')
  })

  it('rechaza si alguien está BLOQUEADO (Vacaciones)', () => {
    const ctx = mockCtx({
      juan: { shifts: [], blocked: true },
      pedro: { shifts: ['DAY'] },
    })
    const res = validateSwapOperation('COVER', 'juan', 'pedro', 'DAY', ctx)
    expect(res).toContain('vacaciones')
  })
})

describe('validateSwapOperation - SWAP', () => {
  it('permite intercambio DAY <-> NIGHT', () => {
    const ctx = mockCtx({
      juan: { shifts: ['DAY'] },
      pedro: { shifts: ['NIGHT'] },
    })
    const res = validateSwapOperation('SWAP', 'juan', 'pedro', 'DAY', ctx)
    expect(res).toBeNull()
  })

  it('rechaza intercambio si NO tienen turnos (OFF)', () => {
    const ctx = mockCtx({
      juan: { shifts: ['DAY'] },
      pedro: { shifts: [] }, // OFF
    })
    const res = validateSwapOperation('SWAP', 'juan', 'pedro', 'DAY', ctx)
    expect(res).toContain('deben tener turnos')
  })

  it('rechaza intercambio mismo turno (DAY <-> DAY)', () => {
    const ctx = mockCtx({
      juan: { shifts: ['DAY'] },
      pedro: { shifts: ['DAY'] },
    })
    const res = validateSwapOperation('SWAP', 'juan', 'pedro', 'DAY', ctx)
    expect(res).toContain('mismo turno')
  })
})

describe('validateSwapOperation - DOUBLE', () => {
  it('permite DOBLE turno si está libre en ese horario', () => {
    const ctx = mockCtx({
      juan: { shifts: ['DAY'] },
    })
    // Juan hace doble en NIGHT -> OK
    const res = validateSwapOperation('DOUBLE', undefined, 'juan', 'NIGHT', ctx)
    expect(res).toBeNull()
  })

  it('rechaza DOBLE si ya trabaja ese horario', () => {
    const ctx = mockCtx({
      juan: { shifts: ['DAY'] },
    })
    // Juan hace doble en DAY -> Error
    const res = validateSwapOperation('DOUBLE', undefined, 'juan', 'DAY', ctx)
    expect(res).toContain('ya trabaja ese turno')
  })
})
