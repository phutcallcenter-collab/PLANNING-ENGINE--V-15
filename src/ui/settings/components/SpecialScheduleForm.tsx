import { useState } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { ShiftAssignment, SpecialSchedule } from '@/domain/types'

const DaysOfWeekSelector = ({ selectedDays, onToggle }: { selectedDays: number[], onToggle: (day: number) => void }) => {
    const days = ['D', 'L', 'M', 'X', 'J', 'V', 'S']; // 0 = Domingo
    return (
        <div style={{ display: 'flex', gap: '4px' }}>
            {days.map((day, index) => (
                <button
                    key={index}
                    type="button"
                    onClick={() => onToggle(index)}
                    style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        border: '1px solid',
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: selectedDays.includes(index) ? '#eef2ff' : '#f1f5f9',
                        borderColor: selectedDays.includes(index) ? '#c7d2fe' : '#e2e8f0',
                        color: selectedDays.includes(index) ? '#4338ca' : '#64748b',
                    }}
                >
                    {day}
                </button>
            ))}
        </div>
    )
}

export function SpecialScheduleForm({ repId, onSave }: { repId: string, onSave: () => void }) {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [daysOfWeek, setDaysOfWeek] = useState<number[]>([]);
    const [assignment, setAssignment] = useState<ShiftAssignment>({ type: 'SINGLE', shift: 'DAY' });
    const [reason, setReason] = useState('');

    const addSpecialSchedule = useAppStore(s => s.addSpecialSchedule);

    const handleToggleDay = (day: number) => {
        setDaysOfWeek(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
    };

    const handleAssignmentChange = (type: 'DAY' | 'NIGHT' | 'BOTH' | 'NONE') => {
        if (type === 'BOTH' || type === 'NONE') {
            setAssignment({ type });
        } else {
            setAssignment({ type: 'SINGLE', shift: type });
        }
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!startDate || !endDate || daysOfWeek.length === 0) {
            alert('Por favor complete las fechas y días de la semana.');
            return;
        }
        const newSchedule: Omit<SpecialSchedule, 'id'> = {
            representativeId: repId,
            startDate,
            endDate,
            daysOfWeek,
            assignment,
            reason: reason || undefined
        };
        addSpecialSchedule(newSchedule);
        onSave(); // Closes the form
    }

    return (
        <form
            onSubmit={handleSubmit}
            style={{
                background: '#f9fafb',
                padding: '20px',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
                margin: '16px 0',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
            }}
        >
            <h4 style={{ margin: 0, fontSize: '14px', color: 'var(--text-main)', fontWeight: 600 }}>
                Añadir Horario Especial
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Fecha Inicio</label>
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid var(--border-strong)', borderRadius: '6px' }} />
                </div>
                <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Fecha Fin</label>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid var(--border-strong)', borderRadius: '6px' }} />
                </div>
            </div>
            <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Días de la semana</label>
                <DaysOfWeekSelector selectedDays={daysOfWeek} onToggle={handleToggleDay} />
            </div>
            <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Asignación</label>
                <select onChange={(e) => handleAssignmentChange(e.target.value as any)} style={{ width: '100%', padding: '8px', border: '1px solid var(--border-strong)', borderRadius: '6px', background: 'var(--bg-panel)' }}>
                    <option value="DAY">Día</option>
                    <option value="NIGHT">Noche</option>
                    <option value="BOTH">Mixto (Ambos)</option>
                    <option value="NONE">Libre</option>
                </select>
            </div>
            <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Motivo (opcional)</label>
                <input type="text" value={reason} onChange={e => setReason(e.target.value)} placeholder="Ej: Universidad, Capacitación" style={{ width: '100%', padding: '8px', border: '1px solid var(--border-strong)', borderRadius: '6px' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" onClick={onSave} style={{ padding: '8px 12px', border: '1px solid var(--border-strong)', borderRadius: '6px', background: 'var(--bg-panel)', cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" style={{ padding: '8px 16px', background: '#111827', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>Guardar Horario</button>
            </div>
        </form>
    )
}

