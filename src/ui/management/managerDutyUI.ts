/**
 * 🎨 MAPA VISUAL CANÓNICO — HORARIO GERENCIAL
 * 
 * Contrato visual cerrado, sin interpretación artística.
 * NO modificar sin consenso explícito.
 */

export const MANAGER_DUTY_UI = {
    DAY: {
        label: 'Día',
        bg: '#FEF3C7',
        fg: '#92400E',
    },
    NIGHT: {
        label: 'Noche',
        bg: '#E0E7FF',
        fg: '#3730A3',
    },
    INTER: {
        label: 'Inter',
        bg: '#DCFCE7',
        fg: '#166534',
    },
    MONITOR: {
        label: 'Mon',
        bg: '#F3E8FF',
        fg: '#6B21A8',
    },
    VACACIONES: {
        label: 'VAC',
        bg: '#ECFEFF',
        fg: '#0E7490',
        border: '#67E8F9',
    },
    LICENCIA: {
        label: 'LIC',
        bg: '#F5F3FF',
        fg: '#5B21B6',
        border: '#C4B5FD',
    },
    OFF: {
        label: '—',
        fg: '#9CA3AF',
        bg: 'transparent',
    },
    EMPTY: {
        label: ' ',
        fg: '#9CA3AF',
        bg: 'transparent',
    },
    AUS_JUST: {
        label: 'AJ',
        bg: '#FEF2F2',
        fg: '#991B1B',
    },
    AUS_UNJUST: {
        label: 'AI',
        bg: '#FEF2F2',
        fg: '#991B1B',
    },
} as const

/**
 * 📋 TOOLTIP RULES (cerradas)
 * 
 * Cuándo SÍ hay tooltip:
 * - ASSIGNED con note
 * - VACATION / LICENSE (siempre, aunque no tengan note)
 * 
 * Cuándo NO:
 * - ASSIGNED sin note (no ruido)
 * - UNDEFINED (no inventar información)
 * 
 * Contenido:
 * - Primera línea: humano y claro
 * - Segunda línea (opcional): 📝 + comentario
 */
