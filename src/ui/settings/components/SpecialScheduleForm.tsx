import { useState } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { ShiftAssignment, SpecialSchedule } from '@/domain/types'
import styles from './SpecialScheduleForm.module.css'

const DaysOfWeekSelector = ({ selectedDays, onToggle }: { selectedDays: number[], onToggle: (day: number) => void }) => {
    const days = ['D', 'L', 'M', 'X', 'J', 'V', 'S']; // 0 = Domingo
    return (
        <div className={styles.daysSelector}>
            {days.map((day, index) => (
                <button
                    key={index}
                    type="button"
                    onClick={() => onToggle(index)}
                    className={`${styles.dayButton} ${selectedDays.includes(index) ? styles.selected : ''}`}
                    aria-label={`Seleccionar ${day}`}
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
        
        // Convert assignment and daysOfWeek to weeklyPattern
        const weeklyPattern: SpecialSchedule['weeklyPattern'] = {
            0: daysOfWeek.includes(0) ? (assignment.type === 'SINGLE' ? assignment.shift : assignment.type === 'BOTH' ? 'MIXTO' : 'OFF') : 'OFF',
            1: daysOfWeek.includes(1) ? (assignment.type === 'SINGLE' ? assignment.shift : assignment.type === 'BOTH' ? 'MIXTO' : 'OFF') : 'OFF',
            2: daysOfWeek.includes(2) ? (assignment.type === 'SINGLE' ? assignment.shift : assignment.type === 'BOTH' ? 'MIXTO' : 'OFF') : 'OFF',
            3: daysOfWeek.includes(3) ? (assignment.type === 'SINGLE' ? assignment.shift : assignment.type === 'BOTH' ? 'MIXTO' : 'OFF') : 'OFF',
            4: daysOfWeek.includes(4) ? (assignment.type === 'SINGLE' ? assignment.shift : assignment.type === 'BOTH' ? 'MIXTO' : 'OFF') : 'OFF',
            5: daysOfWeek.includes(5) ? (assignment.type === 'SINGLE' ? assignment.shift : assignment.type === 'BOTH' ? 'MIXTO' : 'OFF') : 'OFF',
            6: daysOfWeek.includes(6) ? (assignment.type === 'SINGLE' ? assignment.shift : assignment.type === 'BOTH' ? 'MIXTO' : 'OFF') : 'OFF',
        };
        
        const newSchedule: Omit<SpecialSchedule, 'id'> = {
            scope: 'INDIVIDUAL',
            targetId: repId,
            from: startDate,
            to: endDate,
            weeklyPattern,
            note: reason || undefined
        };
        addSpecialSchedule(newSchedule);
        onSave(); // Closes the form
    }

    return (
        <form
            onSubmit={handleSubmit}
            className={styles.form}
        >
            <h4 className={styles.formTitle}>
                Añadir Horario Especial
            </h4>
            <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                    <label htmlFor="startDate" className={styles.label}>Fecha Inicio</label>
                    <input 
                        id="startDate"
                        type="date" 
                        value={startDate} 
                        onChange={e => setStartDate(e.target.value)} 
                        className={styles.input}
                        aria-label="Fecha de inicio del horario especial"
                    />
                </div>
                <div className={styles.formGroup}>
                    <label htmlFor="endDate" className={styles.label}>Fecha Fin</label>
                    <input 
                        id="endDate"
                        type="date" 
                        value={endDate} 
                        onChange={e => setEndDate(e.target.value)} 
                        className={styles.input}
                        aria-label="Fecha de fin del horario especial"
                    />
                </div>
            </div>
            <div>
                <label className={styles.label}>Días de la semana</label>
                <DaysOfWeekSelector selectedDays={daysOfWeek} onToggle={handleToggleDay} />
            </div>
            <div>
                <label htmlFor="assignment" className={styles.label}>Asignación</label>
                <select 
                    id="assignment"
                    onChange={(e) => handleAssignmentChange(e.target.value as any)} 
                    className={styles.select}
                    aria-label="Tipo de asignación para el horario especial"
                >
                    <option value="DAY">Día</option>
                    <option value="NIGHT">Noche</option>
                    <option value="BOTH">Mixto (Ambos)</option>
                    <option value="NONE">Libre</option>
                </select>
            </div>
            <div>
                <label htmlFor="reason" className={styles.label}>Motivo (opcional)</label>
                <input 
                    id="reason"
                    type="text" 
                    value={reason} 
                    onChange={e => setReason(e.target.value)} 
                    placeholder="Ej: Universidad, Capacitación" 
                    className={styles.input}
                />
            </div>
            <div className={styles.actions}>
                <button type="button" onClick={onSave} className={styles.cancelButton}>Cancelar</button>
                <button type="submit" className={styles.submitButton}>Guardar Horario</button>
            </div>
        </form>
    )
}

