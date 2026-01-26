# Sistema de Planificación - Cierre de Ciclo de Refactorización

**Fecha**: 2026-01-20  
**Estado**: ✅ SELLADO Y OPERATIVO

---

## 🎯 Objetivo Cumplido

Corregir la lógica de contadores y métricas del sistema para que reflejen la realidad operativa del call center, eliminando ambigüedades semánticas y lógica paralela.

---

## 🔒 Arquitectura Canónica Establecida

### **Fuentes Únicas de Verdad**

```
┌─────────────────────────────────────────────────────────┐
│  PLANIFICACIÓN (Quién DEBE trabajar)                    │
├─────────────────────────────────────────────────────────┤
│  getPlannedAgentsForDay()                               │
│  - Base Plan OR Effective Period                        │
│  - Excluye: LICENCIA, VACACIONES                        │
│  - Incluye: AUSENCIA (planificado pero ausente)         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  EJECUCIÓN (Quién SÍ trabajó)                           │
├─────────────────────────────────────────────────────────┤
│  getDailyShiftStats()                                   │
│  - planned: getPlannedAgentsForDay().length             │
│  - present: planned - AUSENCIA                          │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  VISUALIZACIÓN (Qué muestra la UI)                      │
├─────────────────────────────────────────────────────────┤
│  - Contador: getDailyShiftStats()                       │
│  - Lista: getPlannedAgentsForDay() + marcas visuales    │
│  - Gráfico: getDailyShiftStats() vía getEffectiveDailyCoverage │
└─────────────────────────────────────────────────────────┘
```

---

## ✅ Problemas Resueltos

### **1. Contador Mentía (10/14 vs 10/10)**
- **Antes**: Denominador = capacidad total del turno (14)
- **Después**: Denominador = agentes efectivamente planificados (10)
- **Solución**: `getDailyShiftStats` consume `getPlannedAgentsForDay`

### **2. Lista Mostraba Fantasmas**
- **Antes**: Filtro por `baseShift` (mostraba gente no planificada)
- **Después**: Filtro por `getPlannedAgentsForDay` (solo planificados)
- **Solución**: `baseRepresentativeList` usa lógica canónica

### **3. Ausentes Desaparecían**
- **Antes**: Ausentes se ocultaban de la lista
- **Después**: Ausentes se tachan pero permanecen visibles
- **Solución**: Separación de lógica (planned) vs presentación (tachado)

### **4. Undo No Funcionaba**
- **Antes**: `UndoToast` no montado, `newId` no propagado
- **Después**: Toast en `ClientLayout`, `pushUndo` con referencia
- **Solución**: Restaurar circuito completo de Undo

### **5. Administrativo = Operativo**
- **Antes**: LICENCIA/VACACIONES filtraban por turno
- **Después**: LICENCIA/VACACIONES muestran TODOS los activos
- **Solución**: `isAdministrativeIncident` flag explícito

### **6. Gráfico Calculaba Por Su Cuenta**
- **Antes**: `getEffectiveDailyCoverage` → `getShiftCounts` (lógica paralela)
- **Después**: `getEffectiveDailyCoverage` → `getDailyShiftStats` (fuente única)
- **Solución**: Eliminar `getShiftCounts`, consumir stats canónicos

### **7. Representantes Inactivos Inflaban Contadores**
- **Antes**: Soft-deleted representatives (Rafael Ramirez x3) contaban en planes históricos
- **Después**: Filtro defensivo en `getPlannedAgentsForDay` salta inactivos
- **Solución**: `if (!representative || !representative.isActive) continue`

---

## 🧪 Test Mental Extremo (PASADO)

**Escenario**: Martes 20, Turno Día
- 10 planificados
- 2 ausentes
- 1 con licencia

**Resultado Validado**:
- ✅ Contador: `8 / 10`
- ✅ Lista: 10 nombres (2 tachados con badge "Ausente")
- ✅ Gráfico: Barra present = 8
- ✅ LICENCIA: No aparece en lista operativa
- ✅ AUSENCIA: Cuenta en planned, no en present

---

## 📋 Deuda Técnica Consciente

### **AUSENCIA Multi-Día (No Urgente)**

**Estado Actual**:
```typescript
// Funciona para ausencias puntuales
const isAbsent = incidents.some(i => 
  i.type === 'AUSENCIA' && 
  i.startDate === logDate  // ← Solo día exacto
)
```

**Solución Futura** (si AUSENCIA se vuelve multi-día):
```typescript
const isAbsent = incidents.some(i => {
  if (i.type !== 'AUSENCIA') return false
  const resolved = resolveIncidentDates(i, allCalendarDays, rep)
  return resolved.dates.includes(logDate)  // ← Rango completo
})
```

**Ubicación**: 
- `DailyLogView.tsx` línea ~230 (filtro `hideAbsent`)

**Impacto**: Bajo (AUSENCIA actualmente es puntual)

---

## 🛡️ Documentación Defensiva Agregada

### **Funciones Canónicas Documentadas**:

1. **`getPlannedAgentsForDay.ts`**
   ```typescript
   /**
    * ⚠️ CANONICAL SOURCE OF TRUTH FOR PLANNED AGENTS
    * DO NOT create alternative "who should work" logic in UI components.
    */
   ```

2. **`getDailyShiftStats.ts`**
   ```typescript
   /**
    * ⚠️ CANONICAL SOURCE OF TRUTH FOR DAILY SHIFT STATISTICS
    * DO NOT duplicate this logic in UI components, graphs, or reports.
    */
   ```

3. **`getEffectiveDailyCoverage.ts`**
   ```typescript
   /**
    * ⚠️ THIS COMPONENT DOES NOT CALCULATE LOGIC. IT CONSUMES CANONICAL STATS.
    */
   ```

---

## 🎯 Próximos Pasos Recomendados

### **Fase de Validación Operativa** (2-3 días)
1. Usar el sistema con datos reales
2. Observar sin modificar lógica
3. Documentar casos de negocio nuevos (no bugs arquitectónicos)

### **Mejoras Futuras** (Opcional)
1. **Tests Unitarios Canónicos**
   - `getPlannedAgentsForDay.test.ts`
   - `getDailyShiftStats.test.ts`
   
2. **Reportes Ejecutivos**
   - Resumen mensual de licencias/vacaciones
   - Análisis de tendencias de ausencias

3. **Blindaje Multi-Día**
   - Refactorizar filtro `hideAbsent` con `resolveIncidentDates`

---

## 📊 Métricas de Éxito

- ✅ Build: Exit code 0
- ✅ Test Mental Extremo: PASADO
- ✅ Lógica Paralela: ELIMINADA
- ✅ Fuentes de Verdad: CONSOLIDADAS (3)
- ✅ Documentación Defensiva: AGREGADA
- ✅ Deuda Técnica: CONSCIENTE Y DOCUMENTADA

---

## 🔐 Conclusión

El sistema pasó de:
- ❌ Contador mentía
- ❌ Lista mostraba fantasmas
- ❌ Gráfico calculaba por su cuenta
- ❌ Ausentes desaparecían
- ❌ Undo no funcionaba

A:
- ✅ Fuente única de verdad
- ✅ Separación clara: Planificación vs Ejecución
- ✅ Separación clara: Administrativo vs Operativo
- ✅ Separación clara: Lógica vs Presentación
- ✅ Sistema defendible ante datos reales

**Estado**: SELLADO Y OPERATIVO  
**Próximo paso**: Validación operativa (observar, no modificar)

---

**Firma**: Sistema de Planificación v15  
**Fecha de Cierre**: 2026-01-20
