
/**
 * 🗓️ Canonical Helper for parsing YYYY-MM-DD strings as Local Dates.
 * 
 * WHY THIS EXISTS:
 * 'date-fns' `parseISO` (and `new Date()`) treat "YYYY-MM-DD" as UTC.
 * When formatted in a local timezone (e.g. GMT-4), this shifts the date back by one day.
 * 
 * This helper guarantees that "2026-02-05" becomes Feb 5th 00:00:00 LOCAL TIME.
 * Use this EXCLUSIVELY for displaying YYYY-MM-DD strings in the UI.
 */
export function parseLocalDate(dateStr: string): Date {
    if (!dateStr) return new Date()
    const [year, month, day] = dateStr.split('-').map(Number)
    return new Date(year, month - 1, day)
}
