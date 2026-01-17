# 🏛️ Arquitectura de Validación de Swaps

## Principio Rector: Dominio Blindado

**REGLA DE ORO**: La UI nunca valida reglas de negocio. Solo construye contexto y delega.

---

## 📋 Capas de Responsabilidad

### 1️⃣ Capa de Dominio (`validateSwapOperation.ts`)
**Responsabilidad**: ÚNICA fuente de verdad para reglas de negocio.

```typescript
export interface SwapValidationContext {
  daily: Record<string, { 
    assignment: any | null
    shouldWork: boolean  // 🔑 Crítico para reglas duras
  }>
}

export function validateSwapOperation(
  type: SwapType,
  fromId?: string,
  toId?: string,
  shift: ShiftType,
  ctx: SwapValidationContext
): ValidationError
```

**Reglas Implementadas**:
- ✅ **COVER**: `from.shouldWork=true`, `to` NO trabaja ESE turno específico (puede trabajar turno opuesto)
- ✅ **SWAP**: `from.shouldWork=true`, `to.shouldWork=true`, turnos diferentes
- ✅ **DOUBLE**: `to.shouldWork=true`, `to.assignment.type !== 'BOTH'`

**Invariantes**:
- Nunca retorna `null` si hay estado inválido
- Mensajes de error claros y en español
- Sin dependencias de UI
- 100% testeable

---

### 2️⃣ Capa de Aplicación (`SwapModal.tsx`)
**Responsabilidad**: Construir contexto y orquestar validación.

```typescript
// ✅ CORRECTO: Construir contexto completo
const validationContext = useMemo(() => {
  return {
    daily: weeklyPlan.agents.reduce((acc, agent) => {
      const day = agent.days[date]
      const assignment = day?.assignment ?? null
      const shouldWork = assignment ? assignment.type !== 'NONE' : false
      
      acc[agent.representativeId] = { assignment, shouldWork }
      return acc
    }, {})
  }
}, [weeklyPlan, date])

// ✅ CORRECTO: Delegar validación
const validationError = useMemo(() => {
  if (!type || !date) return "Seleccione tipo y fecha."
  return validateSwapOperation(type, fromId, toId, shift, validationContext)
}, [type, fromId, toId, shift, date, validationContext])
```

**❌ PROHIBIDO**:
```typescript
// ❌ NO duplicar reglas de negocio
if (fromId === toId) return "Error duplicado"
if (!from.assignment) return "Lógica duplicada"

// ❌ NO cargar datos propios
const [weeklyPlan, setWeeklyPlan] = useState()
useEffect(() => { loadData() }, [])

// ❌ NO asumir estado
if (type === 'COVER' && bothWorking) return "UI asumiendo regla"
```

**✅ PERMITIDO**:
- Construir contexto a partir de props
- Calcular `effectiveShift` para UX (pero dominio re-valida)
- Mostrar mensajes de error del dominio
- Deshabilitar botón si `validationError !== null`

---

### 3️⃣ Capa de Coordinación (`PlanningSection.tsx`)
**Responsabilidad**: Proveer datos a componentes inferiores.

```typescript
// ✅ CORRECTO: Pasar plan cargado
{swapModalState.isOpen && weeklyPlan && (
  <SwapModal 
    weeklyPlan={weeklyPlan}  // 🎯 Plan viene de arriba
    initialDate={swapModalState.date}
    initialShift={swapModalState.shift}
    onClose={closeSwapModal}
  />
)}
```

---

## 🧪 Testing Strategy

### Tests de Dominio (20 tests - 100% passing)
```bash
npm test -- validateSwapOperation.test
```

**Cobertura**:
- ✅ COVER: 7 casos (válidos e inválidos)
- ✅ SWAP: 5 casos (mismo turno, no trabajan, etc)
- ✅ DOUBLE: 3 casos (OFF, BOTH, válido)
- ✅ Casos integrados: 5 escenarios complejos

---

## 🚫 Anti-Patrones Detectados y Eliminados

### ❌ 1. Validación Duplicada
**Antes**:
```typescript
// UI validando manualmente
if (fromId === toId) return "Error"
const domainError = validateSwapOperation(...)
if (domainError) return domainError
```

**Después**:
```typescript
// UI solo delega
return validateSwapOperation(type, fromId, toId, shift, ctx)
```

---

### ❌ 2. Contexto Incompleto
**Antes**:
```typescript
{ daily: { 'id': { assignment: {...} } } }  // ⚠️ Falta shouldWork
```

**Después**:
```typescript
{ daily: { 'id': { assignment: {...}, shouldWork: true } } }  // ✅
```

---

### ❌ 3. Carga de Datos en Componente de Presentación
**Antes**:
```typescript
// SwapModal cargaba su propio weeklyPlan
const [weeklyPlan, setWeeklyPlan] = useState()
useEffect(() => { /* load */ }, [])
```

**Después**:
```typescript
// SwapModal recibe plan como prop
interface SwapModalProps {
  weeklyPlan: WeeklyPlan  // 🎯 Dato inyectado
  ...
}
```

---

### ❌ 4. Turno Incorrecto en Validación
**Antes**:
```typescript
// COVER usaba shift de UI (incorrecto)
validateSwapOperation('COVER', from, to, selectedShift, ctx)
```

**Después**:
```typescript
// COVER usa effectiveShift (detectado del assignment)
const effectiveShift = from.assignment?.shift || selectedShift
validateSwapOperation('COVER', from, to, effectiveShift, ctx)
```

---

## 📐 Reglas de Negocio (Simplificadas)

### Helpers Internos
```typescript
const get = (id?) => (id ? ctx.daily[id] : undefined)
const from = get(fromId)
const to = get(toId)
```

### COVER
```typescript
if (!from.shouldWork) return "El cubierto no está asignado ese día"
if (to.assignment?.type === 'BOTH') return "Ya trabaja ambos turnos"
if (to.assignment?.shift === shift) return "Ya trabaja ese turno"
// ✅ Permite cubrir si está OFF o trabaja turno opuesto
```

### SWAP
```typescript
if (!from.shouldWork || !to.shouldWork) 
  return "Ambos deben trabajar ese día"
if (fromShift === toShift) 
  return "El intercambio no tiene efecto"
```

### DOUBLE
```typescript
if (!to.shouldWork) 
  return "No se puede hacer DOUBLE si no trabaja"
if (to.assignment.type === 'BOTH') 
  return "Ya trabaja ambos turnos"
```

---

## ✅ Estado Final

- **Dominio**: Blindado, sin dependencias, 100% testeable
- **UI**: Pura, solo construye contexto y muestra errores
- **Tests**: 20/20 passing
- **Arquitectura**: Single Source of Truth

---

## 🎯 Próximos Pasos (si aplica)

1. **Optimización de Performance**: Memoización de contexto si crece
2. **Logs de Auditoría**: Registrar swaps aplicados
3. **Validación de Períodos**: Restricciones de fechas futuras
4. **Tests E2E**: Cypress/Playwright para flujo completo

---

**Última actualización**: 2025-01-22  
**Estado**: ✅ Producción-ready
