import { Representative } from '../representatives/types'
import { ShiftType } from '../calendar/types'
import { getShiftCapabilities } from './shiftCapability'
import { AssignmentContext, ShiftAssignment } from './shiftAssignment'

/**
 * ⚠️ HARDENED DOMAIN ENGINE
 *
 * Resolves the EFFECTIVE shifts a representative actually covers
 * on a given date.
 *
 * Priority:
 * 1. Availability (absence / license / vacation)
 * 2. Explicit override
 * 3. Natural capability (base + mix profile)
 */
export function getEffectiveShiftAssignment(
  rep: Representative,
  context: AssignmentContext
): ShiftAssignment {
  // 1️⃣ No disponible = no cubre nada
  if (context.availability === 'UNAVAILABLE') {
    return { type: 'NONE' }
  }

  // 2️⃣ Override explícito (domina todo)
  if (context.overrides?.force) {
    return context.overrides.force
  }

  // 3️⃣ Capacidades naturales
  const capabilities = getShiftCapabilities(rep, context.date)

  if (capabilities.length === 2) {
    return { type: 'BOTH' }
  }

  if (capabilities.length === 1) {
    return {
      type: 'SINGLE',
      shift: capabilities[0],
    }
  }

  return { type: 'NONE' }
}
