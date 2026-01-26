import { Representative } from '@/domain/types'

/**
 * Checks if a representative is eligible for 'MIXTO' schedule states.
 * Currently based on `mixProfile`, but this abstraction allows future Rules
 * without breaking UI consumers.
 */
export function canUseMixto(rep: Representative): boolean {
    return !!rep.mixProfile
}
