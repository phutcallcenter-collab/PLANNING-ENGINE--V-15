import type { VisualVariant } from '@/application/ui-adapters/cellState'
import { Check, Sun, XCircle, LucideIcon } from 'lucide-react'

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
 * 
 * UPDATE V15: "Surgeon Mode"
 * - Working → Blanco + Checkmark (Descanso visual)
 */
export const CELL_THEME: Record<VisualVariant, CellTheme> = {
    WORKING: {
        bg: '#ffffff',
        fg: '#15803d',
        icon: Check,
    },

    OFF: {
        bg: 'transparent', // Neutral, no attention
        fg: '#9ca3af',     // Muted gray
        border: 'none',
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

    ABSENT_JUSTIFIED: {
        bg: 'hsl(0, 60%, 97%)', // Much lighter red (Almost white-red)
        fg: 'hsl(0, 60%, 40%)', // Softer text
        border: 'hsl(0, 60%, 80%)', // Soft border
        icon: Check, // Semantic "OK"
    },
}
