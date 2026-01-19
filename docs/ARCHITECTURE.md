# ARQUITECTURA DEL SISTEMA

**Planning Engine v1.0 - Decisiones de diseño**  
Última actualización: 2026-01-17

---

## 🎯 Principios rectores

1. **Separación de dominios** - Planner operativo y gerencial NO se mezclan
2. **Determinismo** - Mismo input → mismo output, siempre
3. **Transparencia** - No heurísticas opacas, no magia
4. **Sin interpretación** - El sistema refleja, no corrige
5. **Tolerancia a ambigüedad** - La ausencia de datos es válida

---

## 🏗️ Capas del sistema

```
┌────────────────────────────────────────┐
│  UI Layer (React Components)          │  ← Presentación
├────────────────────────────────────────┤
│  Hooks Layer (useWeeklyPlan, etc.)    │  ← Adaptadores
├────────────────────────────────────────┤
│  Store Layer (Zustand + Immer)        │  ← Estado global
├────────────────────────────────────────┤
│  Domain Layer (Lógica de negocio)     │  ← NÚCLEO
└────────────────────────────────────────┘
        ↓
┌────────────────────────────────────────┐
│  Persistence (IndexedDB - localStorage)│  ← Datos locales
└────────────────────────────────────────┘
```

**Regla inviolable:**
- UI **nunca** importa del dominio directamente
- Dominio **nunca** importa de UI
- Store **nunca** contiene lógica de negocio (solo mutaciones)

---

## 🧠 Dominios del sistema

### 1. Dominio Operativo (Representantes)

**Responsabilidad**: Planificación de turnos DAY/NIGHT y registro de incidencias

**Entidades principales:**
```typescript
Representative → baseSchedule → weeklyPlan → effectiveSchedule
                                     ↓
                                 incidents
                                     ↓
                                   swaps
```

**Módulos:**
- `domain/planning/` - Construcción de horarios
- `domain/swaps/` - Sistema COVER/DOUBLE/SWAP
- `domain/incidents/` - Registro de eventos reales
- `domain/availability/` - Lógica de disponibilidad
- `domain/representatives/` - Modelo de representantes

**Estado central:**
```typescript
{
  representatives: Representative[],
  weeklyPlan: WeeklyPlan,
  incidents: Incident[],
  swaps: SwapOperation[],
  coverageRules: CoverageRule[]
}
```

---

### 2. Dominio Gerencial (Supervisores/Managers)

**Responsabilidad**: Asignación de turnos gerenciales (separado del operativo)

**Entidades principales:**
```typescript
Manager → managementSchedules[weekKey][date] = ManagerPlanDay
                                                   ↓
                                          {duty, note}
```

**Módulos:**
- `domain/management/types.ts` - Tipos canónicos
- `domain/management/validation.ts` - Reglas de coherencia
- `store/managementScheduleSlice.ts` - Estado gerencial

**Estado central:**
```typescript
{
  managementSchedules: Record<string, ManagerWeeklyPlan>
}

// ManagerWeeklyPlan = Record<ISODate, ManagerPlanDay>
// ManagerPlanDay = {duty: ManagerDuty | null, note?: string}
```

**Principio clave:**
> `null` ≠ `OFF`  
> null = "no planificado" (dato válido, no error)

**Separación total:**
- NO afecta cobertura del planner operativo
- NO comparte tipos con planner operativo
- NO cruza validaciones con planner operativo

---

## 🔒 Store (Zustand + Immer)

**Patrón "Blindado":**

Todos los getters del store:
1. Crean estructura si no existe
2. Retornan `null` o dato válido
3. **Nunca retornan `undefined`**

**Ejemplo (management):**
```typescript
getManagerAssignment: (managerId, weekKey, date) => {
  const schedule = state.managementSchedules[weekKey]
  if (!schedule) return null          // Blindaje 1
  
  const days = schedule.days
  if (!days) return null               // Blindaje 2
  
  const assignment = days[date]
  return assignment ?? null            // Blindaje 3
}
```

**Por qué Immer:**
- Mutaciones inmutables (draft state)
- Previene bugs de referencia
- Código más legible

**Por qué Zustand:**
- Simple, sin boilerplate
- Integración directa con React
- Middleware fácil de extender

---

## 💾 Persistencia

**Estrategia: Adapter Pattern**

El sistema utiliza un **Strategy Pattern** para desacoplar la lógica de dominio del almacenamiento.
- `src/persistence/storage.ts`: Wrapper de integridad y migración.
- `src/application/persistence/`: Adaptadores concretos.

**Adaptadores:**
1. **LocalStorageAdapter** (Default): Usa `idb` (IndexedDB) para almacenamiento local robusto.
2. **HttpAdapter** (Opcional): Permite conectar un backend genérico.
3. **Persistence Factory**: Selecciona el adaptador basado en `NEXT_PUBLIC_BACKEND_URL`.

**Datos:**
- **IndexedDB** (preferido): Backup/restore completo, histórico.
- **localStorage** (fallback): Configuración de usuario, estado UI.

**Integración con Backend (Futuro):**
1. Definir `NEXT_PUBLIC_BACKEND_URL` en `.env`.
2. El backend debe implementar `GET /state` y `POST /state`.
3. El frontend cambia automáticamente de adaptador.

**Filosofía Offline:**
- El sistema funciona 100% offline por defecto.
- No depende de servicios externos.
- Latencia cero.

---

## 🚫 Por qué NO hay IA

**Decisión deliberada:**

El sistema **no tiene ni tendrá** componentes de:
- Machine learning
- Predicción automática
- Sugerencias "inteligentes"
- Optimización heurística

**Razones:**

1. **Explicabilidad** - Cada decisión debe ser trazable
2. **Determinismo** - IA introduce no-determinismo
3. **Responsabilidad** - Humanos deciden, sistema registra
4. **Confianza** - No hay "caja negra"
5. **Simplicidad** - Menos dependencias, menos mantenimiento

**Qué se usa en lugar de IA:**
- Reglas explícitas documentadas
- Validaciones con criterio claro
- Advertencias visuales (no bloqueos)
- Estado refleja intención humana

---

## 🔄 Flujo de datos

### Planner Operativo

```
User Input (UI)
    ↓
Store mutations (setters)
    ↓
Domain validation (domain/planning)
    ↓
State update (Immer draft)
    ↓
Hooks compute derived state
    ↓
UI re-renders
```

### Planner Gerencial

```
User selects duty (ManagerScheduleCell)
    ↓
Store: setManagerDuty(managerId, weekKey, date, duty, note)
    ↓
Validation: validateManagerNote(note)
    ↓
Store: ensureManagerSchedule(weekKey) → creates if missing
    ↓
State: managementSchedules[weekKey].days[date] = {duty, note}
    ↓
ManagerScheduleRow: validateManagerWeek() → soft warnings
    ↓
UI updates with ⚠️ if warnings exist
```

---

## 📐 Principios de validación

### Validación Dura (bloquea acción)

Usada para:
- Duplicados imposibles (misma incidencia, mismo día)
- Swaps inválidos (conflicto de turnos)
- Datos malformados (fechas inválidas)

**Efecto:**
- Error visible
- Acción no se ejecuta
- Usuario debe corregir

### Validación Suave (advierte, no bloquea)

Usada para:
- Patrones atípicos (3+ noches consecutivas)
- Semanas vacías (no planificado)
- Notas presentes

**Efecto:**
- ⚠️ Indicador visual
- Tooltip con explicación
- Acción SÍ se ejecuta

**Criterio:**
> Si el sistema no puede decidir si es error, es advertencia.

---

## 🔐 Separación Planner Operativo ↔ Gerencial

**Por qué están separados:**

1. **Dominios distintos** - Representantes vs. Supervisores
2. **Turnos distintos** - DAY/NIGHT vs. Día/Noche/Inter/Monitoreo
3. **Propósito distinto** - Cobertura operativa vs. Asignación gerencial
4. **Reglas distintas** - Cobertura estricta vs. Flexibilidad gerencial

**NO se cruzan:**
- Cobertura operativa NO cuenta turnos gerenciales
- Incidencias de gerentes NO afectan métricas de representantes
- Validaciones independientes
- Stores separados (slices distintos)

**Única interacción:**
- Vacaciones/Licencias gerenciales bloquean edición en planner gerencial
- Las incidencias son comunes (mismo modelo `Incident`)

---

## 📦 Estructura de archivos

```
src/
├── domain/                    # NÚCLEO - Lógica de negocio
│   ├── planning/              # Planner operativo
│   ├── management/            # Planner gerencial
│   ├── swaps/                 # Sistema de intercambios
│   ├── incidents/             # Incidencias
│   ├── representatives/       # Modelo representantes
│   ├── calendar/              # Calendario y feriados
│   ├── availability/          # Disponibilidad
│   └── audit/                 # Auditoría
│
├── store/                     # Estado global
│   ├── useAppStore.ts         # Store principal
│   └── managementScheduleSlice.ts  # Slice gerencial
│
├── hooks/                     # Adaptadores UI
│   ├── useWeeklyPlan.ts       # Plan operativo
│   ├── useCoverage.ts         # Cobertura
│   └── (otros hooks)
│
├── ui/                        # Componentes React
│   ├── planning/              # UI planner operativo
│   ├── management/            # UI planner gerencial
│   ├── logs/                  # Logs diarios
│   ├── stats/                 # Estadísticas
│   └── components/            # Componentes comunes
│
└── persistence/               # Capa de datos
    ├── storage.ts             # IndexedDB wrapper
    └── localStorage.ts        # localStorage wrapper
```

---

## 🧪 Testing

**Filosofía:**
- Se testea dominio (lógica de negocio)
- NO se testea UI (excepto lógica compleja)
- NO se testea store directamente (se testea mediante dominio)

**Coverage actual:**
- `__tests__/domain/` - Tests de lógica de negocio
- `__tests__/persistence/` - Tests de storage

**Por qué no hay más tests:**
- El sistema es determinista
- Las reglas están documentadas explícitamente
- Los bugs reales son de integración, no de unidad

---

## 🔄 Actualización y mantenimiento

**Dominios congelados (FASE 6):**

🔒 **Planner Operativo**
- Plan base, overrides, swaps, incidencias, cobertura, métricas

🔒 **Planner Gerencial**
- Día/Noche/Inter/Monitoreo, OFF, vacaciones/licencias, notas

**NO se agregan:**
- ❌ Nuevos estados de turno
- ❌ Nuevas reglas implícitas
- ❌ Validaciones automáticas no documentadas

**SÍ se permite:**
- ✅ Bug fixes (datos incorrectos, crashes)
- ✅ Inconsistencias internas (pantallas contradictorias)
- ✅ Cambios legales/contractuales

---

## 🎯 Decisiones de diseño clave

### 1. Sin backend obligatorio
**Por qué:** Simplicidad, offline-first, control de datos

### 2. Sin IA
**Por qué:** Determinismo, explicabilidad, responsabilidad humana

### 3. Validación suave > dura
**Por qué:** Realidad es ambigua, sistema no juzga

### 4. null ≠ OFF
**Por qué:** Ausencia de decisión ≠ decisión de ausencia

### 5. Separación operativo/gerencial
**Por qué:** Dominios distintos, reglas distintas, propósitos distintos

### 6. Dominio primero
**Por qué:** UI cambia, lógica de negocio es permanente

### 7. Store "blindado"
**Por qué:** Never return undefined, siempre estado válido

### 8. Documentación > código
**Por qué:** Código miente, documentación establece contrato

---

## 📚 Documentos relacionados

- [README.md](./README.md) - Qué hace el sistema
- [LIMITACIONES_SISTEMA.md](./LIMITACIONES_SISTEMA.md) - Qué NO hace
- [MANAGER_SCHEDULE_RULES.md](./MANAGER_SCHEDULE_RULES.md) - Reglas gerenciales
- [src/domain/swaps/ARCHITECTURE.md](./src/domain/swaps/ARCHITECTURE.md) - Arquitectura detallada de Swaps
- [CRITERIOS_NO_CAMBIO.md](./CRITERIOS_NO_CAMBIO.md) - Cuándo NO tocar el código

---

**Fin del documento de arquitectura.**  
Si una decisión no está aquí, probablemente fue accidental.
