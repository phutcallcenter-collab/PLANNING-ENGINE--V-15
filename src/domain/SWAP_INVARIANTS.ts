/**
 * 🔒 INVARIANTES DEL SISTEMA DE SWAPS
 * 
 * Este archivo documenta las reglas fundamentales que NUNCA deben romperse.
 * Si alguna vez te encuentras violando estos principios, detente y replantea.
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * 1️⃣ SEPARACIÓN DE RESPONSABILIDADES
 * 
 *    ✅ El schedule BASE nunca se muta por swaps
 *       → WeeklyPlan es inmutable respecto a cambios operacionales
 *       → Los swaps NO modifican working/off
 * 
 *    ✅ Los swaps son overlays explícitos
 *       → Viven en su propio array separado
 *       → No contienen referencia al estado base
 *       → Son datos puros: { id, date, type, ... }
 * 
 *    ✅ El derivador combina base + overlays
 *       → effectiveShiftAssignment es la única función que lee ambos
 *       → El UI consume solo el resultado derivado
 *       → La derivación es PURA y DETERMINISTA
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * 2️⃣ ELIMINACIÓN DE SWAPS
 * 
 *    ✅ Delete = borrar overlay, NO reconstruir
 *       → removeSwap(id) solo filtra el array
 *       → NO toca working/off
 *       → NO "restaura" nada
 *       → El base reaparece automáticamente
 * 
 *    ✅ El delete es idempotente
 *       → Llamarlo múltiples veces no rompe nada
 *       → No falla si el swap ya no existe
 *       → Seguro ante race conditions
 * 
 *    ⛔ NUNCA escribas código que:
 *       - "Restaure el estado original"
 *       - Use flags tipo isReverting
 *       - Guarde previousAssignment
 *       - Recalcule working/off
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * 3️⃣ DETECCIÓN DE AFECTACIÓN
 * 
 *    ✅ Un selector centralizado decide qué swap afecta a una celda
 *       → getSwapForCell(swaps, { date, repId, shift })
 *       → La UI NO contiene lógica de negocio
 *       → Un solo punto de verdad
 * 
 *    ✅ Reglas de afectación por tipo:
 *       - COVER: Afecta fromRep Y toRep en el shift específico
 *       - DOUBLE: Afecta solo al rep en el shift específico
 *       - SWAP: Afecta a ambos reps (independiente del shift)
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * 4️⃣ CONSERVACIÓN DE LA ENERGÍA HUMANA (INVARIANTE FÍSICA)
 * 
 *    ⚠️ UNA PERSONA ≠ DOS TURNOS EL MISMO DÍA
 * 
 *    ✅ Regla fundamental validada ANTES de crear swap:
 *       → Una persona solo puede tener UNA obligación efectiva por día
 *       → Base assignment + overlays = máximo 1 turno activo
 *       → No existe "trabajar DAY y NIGHT simultáneamente"
 * 
 *    ✅ Validación en dominio (NO en UI):
 *       → validateSwapDoesNotCauseConflict() bloquea swaps imposibles
 *       → Ejecutada en addSwap() ANTES de insertar
 *       → getEffectiveAssignmentForDay() calcula asignación real
 * 
 *    ⛔ Si el dominio no lo prohíbe, la UX no puede salvarte
 *       → No confíes en botones deshabilitados
 *       → No confíes en tooltips
 *       → La regla DEBE vivir en el código de negocio
 * 
 *    📍 Referencias de implementación:
 *       → src/domain/planning/getEffectiveAssignmentForDay.ts
 *       → src/domain/swaps/validateSwapDoesNotCauseConflict.ts
 *       → src/store/useAppStore.ts (validación en addSwap)
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * 4️⃣ FLUJO DE DATOS UNIDIRECCIONAL
 * 
 *    Store → Selector → Derivador → UI
 *       ↓
 *    El UI solo DISPARA acciones, no decide reglas
 * 
 *    addSwap(data)    → Agrega overlay
 *    removeSwap(id)   → Quita overlay
 *    getSwapForCell() → Consulta afectación
 *    
 *    NUNCA:
 *    - El UI modifica el store directamente
 *    - El UI tiene lógica condicional de negocio
 *    - El UI decide si un swap afecta una celda
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * 5️⃣ ESTADO DEL MODAL
 * 
 *    ✅ Estado discriminado evita combinaciones inválidas
 *       → mode: 'CREATE' | 'DELETE'
 *       → TypeScript garantiza coherencia
 *       → Imposible renderizar estado incorrecto
 * 
 *    ⛔ NUNCA tengas:
 *       - existingSwap?: SwapEvent con initialDate?: string
 *       - Props opcionales que crean estados ambiguos
 *       - Necesidad de checks defensivos en el render
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * 6️⃣ PRINCIPIO DE MÍNIMA SORPRESA
 * 
 *    Si el código te hace preguntar:
 *    - "¿Cómo vuelvo al estado original?"    → ESTÁS HACIENDO MAL
 *    - "¿Dónde guardo el backup?"            → ESTÁS HACIENDO MAL
 *    - "¿Cómo recalculo working/off?"        → ESTÁS HACIENDO MAL
 * 
 *    La respuesta correcta siempre es:
 *    - El original nunca se tocó, ya existe
 *    - No hay backup, hay datos separados
 *    - No recalculas nada, el derivador lo hace
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * 📖 REFERENCIAS DE CÓDIGO
 * 
 * Selector centralizado:
 *   → src/domain/selectors/getSwapForCell.ts
 * 
 * Store actions:
 *   → src/store/useAppStore.ts → addSwap, removeSwap
 * 
 * Derivador:
 *   → src/domain/planning/effectiveShiftAssignment.ts
 * 
 * Modal UI:
 *   → src/ui/planning/SwapModal.tsx
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * ⚠️ SEÑALES DE ALERTA (Si ves esto, algo está mal)
 * 
 * - Código que "restaura" estados
 * - Funciones con "revert" o "rollback" en el nombre
 * - Lógica de detección duplicada en múltiples componentes
 * - Estados opcionales que permiten combinaciones imposibles
 * - Mutación directa de weeklyPlan por cambios operacionales
 * - Derivadores con efectos secundarios
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

// Este archivo es solo documentación. No exporta nada.
export {}
