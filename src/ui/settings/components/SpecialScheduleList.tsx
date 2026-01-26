import { useAppStore } from '@/store/useAppStore'
import { ShiftAssignment, SpecialSchedule } from '@/domain/types'
import { Trash2, Calendar, Clock, StickyNote, Edit } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { useEditMode } from '@/hooks/useEditMode'

export function SpecialScheduleList({ repId, onEdit }: { repId: string, onEdit: (schedule: SpecialSchedule) => void }) {
    const { specialSchedules, removeSpecialSchedule } = useAppStore(s => ({
        specialSchedules: s.specialSchedules.filter(ss =>
            ss.scope === 'INDIVIDUAL' && ss.targetId === repId
        ),
        removeSpecialSchedule: s.removeSpecialSchedule,
    }));
    const { mode } = useEditMode()

    if (specialSchedules.length === 0) return null;

    // Helper to render compact pattern
    const renderPatternSummary = (pattern: SpecialSchedule['weeklyPattern']) => {
        const days = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
        return (
            <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                {days.map((d, i) => {
                    const state = pattern[i as 0 | 1 | 2 | 3 | 4 | 5 | 6];
                    if (!state) return null; // Skip if undefined
                    // Actually, undefined implies explicit pattern didn't have it? 
                    // New model has explicit 0-6.

                    if (state === 'OFF') {
                        return <span key={i} title={`${d}: Libre`} style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: '#fee2e2', color: '#991b1b', fontWeight: 600 }}>{d}</span>
                    }
                    if (state === 'MIXTO') {
                        return <span key={i} title={`${d}: Mixto`} style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: '#e0e7ff', color: '#4338ca', fontWeight: 600 }}>{d}*</span>
                    }
                    if (state === 'DAY') {
                        return <span key={i} title={`${d}: Día`} style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: '#dbeafe', color: '#1e40af', fontWeight: 600 }}>{d}</span>
                    }
                    if (state === 'NIGHT') {
                        return <span key={i} title={`${d}: Noche`} style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: '#dcfce7', color: '#166534', fontWeight: 600 }}>{d}</span>
                    }
                    return null
                })}
            </div>
        )
    }

    return (
        <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {specialSchedules.map(ss => (
                <div key={ss.id} style={{ fontSize: '12px', color: '#4b5563', background: '#f9fafb', padding: '10px', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <Calendar size={14} />
                            <span>{format(parseISO(ss.from), 'dd/MM/yy')} - {format(parseISO(ss.to), 'dd/MM/yy')}</span>
                        </div>
                        {ss.note && (
                            <div style={{ fontSize: '11px', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                                <StickyNote size={10} />
                                <span style={{ fontStyle: 'italic' }}>{ss.note}</span>
                            </div>
                        )}
                        {/* Weekly Pattern Visualization */}
                        {ss.weeklyPattern && renderPatternSummary(ss.weeklyPattern)}
                    </div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                            onClick={() => onEdit(ss)}
                            style={{ color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                            title="Editar Horario"
                        >
                            <Edit size={14} />
                        </button>
                        <button
                            onClick={() => removeSpecialSchedule(ss.id)}
                            style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                            title="Eliminar Horario"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                </div>
            ))}
        </div>
    )
}
