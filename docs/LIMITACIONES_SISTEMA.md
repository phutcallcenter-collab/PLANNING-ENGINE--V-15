# LIMITACIONES DELIBERADAS DEL SISTEMA

**Documento de criterio operativo - FASE 5 + FASE 6**  
Última actualización: 2026-01-17

---

## ⚠️ ACTUALIZACIÓN IMPORTANTE - Gerencia = Representantes

**Decisión arquitectónica (post-FASE 5):**

El sistema gerencial paralelo fue **eliminado** por sobreingeniería.

**Solución correcta:**
- Gerentes son `Representative` con `role: 'MANAGER'`
- Usan el MISMO planner operativo (filtrado en UI)
- Usan las MISMAS incidencias (VACACIONES, LICENCIA)
- Usan los MISMOS overrides y effective periods

**No existe:**
- ❌ managementSchedules
- ❌ Motor gerencial separado
- ❌ Estados gerenciales especiales

**Sí existe:**
- ✅ Planner con filtro `role === 'MANAGER'`
- ✅ Labels visibles para managers (Día, Noche, OFF)
- ✅ Reuso total de infraestructura existente

Ver: [ManagerPlanner.tsx](src/ui/management/ManagerPlanner.tsx) - 100 líneas, cero lógica nueva.

---

## 🎯 Principio fundamental de FASE 5

> **El sistema nunca completa lo que el humano no decidió.**
> 
> Un sistema sano no intenta corregir la realidad.  
> La refleja sin mentir.

---

## 📋 Clasificación de problemas

### 🟢 A. Estados formales (sí se modelan)

Estos son los únicos estados que el sistema reconoce:

- `DAY` - Día
- `NIGHT` - Noche
- `INTER` - Intermedio
- `MONITORING` - Monitoreo
- `null` - No planificado
- `VACACIONES` - (desde incidentes)
- `LICENCIA` - (desde incidentes)

✅ **Cubiertos completamente por el modelo**

---

### 🟡 B. Estados humanos informales (NO se modelan)

**Ejemplos reales que NO son estados del sistema:**

- "Fulano no aparece"
- "Puso MT"
- "Esa semana nadie sabe"
- "Está pero no está"
- Siglas inventadas en Excel
- Ausencias sin justificar formalmente

**Decisión arquitectónica:**

❌ **No se crean enums** para estos casos  
❌ **No se crean flags** booleanos  
❌ **No se intenta inferir** significado  

**Solución:**

✅ Se registran como **notas** (campo `note`)  
✅ La UI muestra el texto literal  
✅ El sistema **no interpreta**

**Ejemplo correcto:**
```typescript
{
  date: '2026-01-15',
  duty: null,
  note: 'MT - revisar'
}
```

---

### 🔵 C. Omisiones deliberadas (sí se representan)

**Caso: Semana sin asignación / Día en blanco**

Esto **NO es error**. Es un dato válido.

**Representación:**
```typescript
{
  date: '2026-01-20',
  duty: null,  // Explícitamente "no planificado"
  note: undefined
}
```

**UI debe mostrar:**
- Celda vacía (select con "—" seleccionado)
- Tooltip: "Sin planificación registrada"

**UI NO debe mostrar:**
- ❌ "Off"
- ❌ "Vacaciones"
- ❌ "Error"
- ❌ "Advertencia"

**null ≠ OFF:**
- `null` = No se decidió
- `OFF` sería un duty explícito (si existiera como estado)

---

### 🔴 D. Inconsistencias de poder (solo se anotan)

**Ejemplos reales:**

- Encargada desaparece varios días sin registro
- Cambios sin explicación
- Correcciones retroactivas
- Planificación que no coincide con realidad

**Decisión del sistema:**

👉 **El sistema NO juzga**  
👉 **SOLO deja rastro** (mediante notas y auditoría)

**Por qué:**

El sistema no tiene contexto político ni autoridad organizacional para:
- Decidir qué es "correcto"
- Inferir responsabilidades
- Forzar coherencia humana

**Esto es diseño sano, no cobardía.**

---

## 🧩 Caso específico: Fulano

### Qué NO puede hacer el sistema:

❌ Saber si Fulano debía estar  
❌ Asumir turnos automáticamente  
❌ Inferir responsabilidades  
❌ Decidir si su ausencia es problema  

### Qué SÍ puede hacer el sistema:

✅ Mostrar que no hay asignación (`duty: null`)  
✅ Mostrar que no hay nota  
✅ Mostrar que es recurrente (visual: semanas vacías)  

**El juicio lo hace la gerencia, no la app.**

---

## 📊 Métricas de gerencia

### Estado: ⛔ FUERA DE ALCANCE

**Tentación típica:**
> "¿Y si sacamos métricas de presencia de gerencia?"

**Por qué NO:**

Esto abre:
- Auditorías que el sistema no puede sostener
- Conflictos políticos
- Expectativas incorrectas sobre capacidad del sistema
- Responsabilidad legal sobre datos incompletos

**Si se necesita en el futuro:**

Requiere:
1. Definición formal de "presencia esperada"
2. Modelo de jornadas gerenciales
3. Acuerdo organizacional explícito
4. Proceso de validación humana

📌 **Documentado explícitamente como NO implementado**

---

## ⚠️ Validaciones permitidas (solo visuales)

Se permiten **advertencias suaves** del tipo:

✅ "Semana sin planificación completa"  
✅ "Asignaciones atípicas detectadas" (3+ noches seguidas)  
✅ "Notas presentes" (indicador discreto)

**Características:**

❌ No bloquean guardado  
❌ No corrigen automáticamente  
❌ No fuerzan decisiones  
✅ Solo informan  
✅ Tooltip discreto  

---

## 🚫 Qué NO hace el sistema (explícito)

Lista exhaustiva para protección futura:

1. ❌ **No infiere asignaciones faltantes**
   - Si no hay `duty`, no hay `duty`
   - No asume "probablemente era día"

2. ❌ **No convierte estados informales en formales**
   - "MT" no se convierte en MONITORING automáticamente
   - Siglas raras se quedan como texto en `note`

3. ❌ **No valida coherencia con realidad operativa**
   - No cruza con planner de agentes
   - No verifica si alguien "realmente estuvo"

4. ❌ **No genera métricas de cumplimiento**
   - No calcula "días cubiertos"
   - No mide "presencia efectiva"

5. ❌ **No fuerza explicaciones**
   - Las notas son opcionales
   - El sistema no exige justificación

6. ❌ **No bloquea cambios retroactivos**
   - Permite editar el pasado
   - No congela semanas cerradas (por ahora)

7. ❌ **No decide jerarquías**
   - Si dos managers tienen duty el mismo día → permitido
   - El sistema no conoce quién "manda"

8. ❌ **No sincroniza con planner operativo**
   - Horario gerencial es independiente
   - No afecta cobertura de agentes
   - No se mezclan dominios

---

## 📖 Cómo usar el sistema correctamente

### Para planificación semanal:

1. Abrir horario gerencial
2. Seleccionar duty para cada día de cada manager
3. Agregar nota si es necesario (opcional)
4. Guardar

**Si no sabes qué poner:** Dejar en "—" (null)

### Para casos raros:

1. Usar nota para contexto
2. No inventar estados
3. Aceptar que el sistema solo refleja, no decide

### Para auditoría futura:

1. El sistema conserva todo (no borra)
2. Las notas quedan visibles indefinidamente
3. Vacaciones/licencias se cruzan automáticamente

---

## ✅ Estado tras FASE 5

El sistema queda:

✅ **Coherente** - No contradice su propio modelo  
✅ **No mentiroso** - Muestra lo que hay, no lo que "debería"  
✅ **No autoritario** - No fuerza decisiones  
✅ **No ingenuo** - Reconoce que los humanos son caóticos  
✅ **A prueba de casos límite** - Diseñado para realidad, no teoría  

**Y, sobre todo:**

> **No promete más de lo que puede cumplir.**

---

## 🔒 Protección legal/organizacional

Este documento establece:

1. **Limitaciones conocidas y aceptadas**
2. **Qué decisiones son humanas, no del sistema**
3. **Qué datos el sistema NO valida**

**Para disputas futuras:**

El sistema es una **herramienta de registro**, no de:
- Auditoría
- Cumplimiento
- Validación de realidad
- Juicio organizacional

---

## 📌 Modificaciones futuras

**Si alguien pide agregar funcionalidad que contradice este documento:**

1. Revisar si es realmente necesario
2. Actualizar este documento PRIMERO
3. Asegurar que no se rompe el principio fundamental
4. Documentar por qué se hace la excepción

**Este documento protege al sistema de convertirse en un Frankenstein.**

---

**Fin del documento de limitaciones deliberadas.**  
Si algo no está aquí, probablemente no debe estar en el sistema.
