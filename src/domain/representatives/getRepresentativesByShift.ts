import { Representative } from './types'
import { ShiftType } from '../calendar/types'

/**
 * Obtiene representantes de un turno específico, ordenados por orderIndex.
 * 
 * IMPORTANTE: Este es el selector canónico que alimenta:
 * - Vista de configuración
 * - Reporte de incentivos
 * - Cualquier export futuro
 * 
 * Una verdad, cero discrepancias.
 */
export function getRepresentativesByShift(
    representatives: Representative[],
    shift: ShiftType
): Representative[] {
    return representatives
        .filter(rep => rep.baseShift === shift && rep.isActive)
        .sort((a, b) => a.orderIndex - b.orderIndex)
}

/**
 * Obtiene todos los representantes activos, segmentados por turno.
 */
export function getRepresentativesSegmented(
    representatives: Representative[]
): {
    day: Representative[]
    night: Representative[]
} {
    return {
        day: getRepresentativesByShift(representatives, 'DAY'),
        night: getRepresentativesByShift(representatives, 'NIGHT'),
    }
}
