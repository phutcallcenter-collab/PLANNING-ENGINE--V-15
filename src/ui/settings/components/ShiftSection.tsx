import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { useAppStore } from '@/store/useAppStore'
import { ShiftType, Representative } from '@/domain/types'
import { SortableRepCard } from './SortableRepCard'

interface ShiftSectionProps {
    shift: ShiftType
    representatives: Representative[]
    onEdit: (rep: Representative) => void
    onAddSchedule: (repId: string | null) => void
    addingScheduleFor: string | null
    advancedEditMode: boolean
}

export function ShiftSection({
    shift,
    representatives,
    onEdit,
    onAddSchedule,
    addingScheduleFor,
    advancedEditMode,
}: ShiftSectionProps) {
    const reorderRepresentatives = useAppStore(s => s.reorderRepresentatives)

    const ids = representatives.map(r => r.id)

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event

        if (!over || active.id === over.id) return

        const oldIndex = ids.indexOf(active.id as string)
        const newIndex = ids.indexOf(over.id as string)

        const newOrder = arrayMove(ids, oldIndex, newIndex)
        reorderRepresentatives(shift, newOrder)
    }

    return (
        <div>
            <div style={{
                fontSize: '12px',
                color: advancedEditMode ? '#92400e' : '#6b7280',
                marginBottom: '12px',
                fontStyle: 'italic',
                background: advancedEditMode ? '#fef3c7' : '#f9fafb',
                padding: '8px 12px',
                borderRadius: '6px',
                border: `1px solid ${advancedEditMode ? '#fbbf24' : '#e5e7eb'}`
            }}>
                {advancedEditMode
                    ? '💡 El orden define el ranking del incentivo. Arrastra desde ≡ para reordenar.'
                    : '🔒 Activa el Modo de Edición Avanzada para reordenar representantes.'
                }
            </div>

            {advancedEditMode ? (
                <DndContext
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={ids}
                        strategy={verticalListSortingStrategy}
                    >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {representatives.map(rep => (
                                <SortableRepCard
                                    key={rep.id}
                                    rep={rep}
                                    onEdit={onEdit}
                                    onAddSchedule={onAddSchedule}
                                    addingScheduleFor={addingScheduleFor}
                                    advancedEditMode={advancedEditMode}
                                />
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {representatives.map(rep => (
                        <SortableRepCard
                            key={rep.id}
                            rep={rep}
                            onEdit={onEdit}
                            onAddSchedule={onAddSchedule}
                            addingScheduleFor={addingScheduleFor}
                            advancedEditMode={advancedEditMode}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}
