import { VisualVariant } from '@/application/ui-adapters/cellState'
import { XCircle, Sun, LucideIcon } from 'lucide-react'

export interface CellTheme {
    bg: string
    fg: string
    border?: string
    icon?: LucideIcon
}

/**
 * VISUAL INVARIANTS
 *
 * 🟢 Verde  → trabaja / trabajó (no explica nada)
 * ⚪ Gris   → libre
 * 🔵 Azul   → vacaciones
 * 🟣 Violeta→ licencia
 * 🟢 Verde → feriado trabajado (con label)
 * 🔴 Rojo   → ausencia (única alerta)
 */
export const CELL_THEME: Record<VisualVariant, CellTheme> = {
    WORKING: {
        bg: 'hsl(142, 60%, 94%)',
        fg: 'hsl(142, 45%, 25%)',
    },

    OFF: {
        bg: 'hsl(220, 10%, 96%)',
        fg: 'hsl(220, 10%, 45%)',
    },

    VACATION: {
        bg: 'hsl(200, 70%, 94%)',
        fg: 'hsl(200, 55%, 30%)',
    },

    LICENSE: {
        bg: 'hsl(265, 60%, 95%)',
        fg: 'hsl(265, 40%, 35%)',
    },

    HOLIDAY: {
        bg: 'hsl(142, 60%, 94%)',
        fg: 'hsl(35, 90%, 30%)',
        border: 'hsl(35, 90%, 60%)',
        icon: Sun,
    },

    ABSENT: {
        bg: 'hsl(0, 85%, 92%)',
        fg: 'hsl(0, 70%, 25%)',
        border: 'hsl(0, 85%, 60%)',
        icon: XCircle,
    },
}
