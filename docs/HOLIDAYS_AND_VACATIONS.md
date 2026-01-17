# Sistema de Feriados y Vacaciones

## 📌 Cómo Funciona

### Tipos de Incidencias

El sistema maneja tres tipos principales de ausencias con comportamientos diferentes:

#### 1. **VACACIONES** (14 días laborales)
- ✅ **Cuenta SOLO días laborales reales**
- ❌ **Excluye automáticamente:**
  - Días feriados configurados en el calendario
  - Días de descanso base del representante (ej: domingos)
- 📊 **Duración fija:** Siempre 14 días laborales efectivos
- ⏳ **Duración calendario:** Variable (puede extenderse a 18-20 días calendario si hay feriados)

**Ejemplo:**
```
Vacaciones desde: 2025-01-02 (jueves)
Con feriados: 2025-01-06 (Reyes), 2025-01-21 (Altagracia), 2025-01-26 (Duarte)
Día OFF base: Domingos

Resultado:
- Se cuentan: 14 días laborales
- Se saltan: 2025-01-06, 2025-01-21, 2025-01-26 (feriados)
- Se saltan: 2025-01-05, 2025-01-12, 2025-01-19 (domingos)
- Fecha fin: 2025-01-18 (17 días calendario en total)
```

#### 2. **LICENCIA** (días calendario)
- ✅ **Cuenta TODOS los días calendario consecutivos**
- ✅ **Incluye feriados, fines de semana, etc.**
- 📊 **Duración:** La especificada en el campo `duration`

**Ejemplo:**
```
Licencia médica: 7 días desde 2025-03-01
Resultado: 7 días consecutivos (incluyendo cualquier feriado)
```

#### 3. **AUSENCIA / TARDANZA / ERROR** (puntuales)
- 📊 **Duración:** 1 día específico
- 🎯 **Uso:** Incidencias que generan puntos punitivos

---

## 🎯 Configuración de Feriados

### Estado Inicial

El sistema viene pre-configurado con los feriados nacionales de República Dominicana para 2025-2026:

**2025:**
- 01-01: Año Nuevo
- 01-06: Día de los Reyes Magos
- 01-21: Día de la Altagracia
- 01-26: Día de Duarte
- 02-27: Día de la Independencia
- 04-18: Viernes Santo
- 05-01: Día del Trabajo
- 06-19: Corpus Christi
- 08-16: Día de la Restauración
- 09-24: Día de las Mercedes
- 11-06: Día de la Constitución
- 12-25: Navidad

**2026:**
- (Lista completa incluida)

### Cómo Agregar Feriados Manualmente

Desde la interfaz de **Planificación**:

1. Haz clic en cualquier día de la grilla del calendario
2. Selecciona "Feriado (Laborable)" en el tipo de día
3. Agrega una etiqueta descriptiva (opcional)
4. Guarda

El sistema inmediatamente excluirá ese día del cálculo de vacaciones.

---

## 🧪 Verificación

### Tests Incluidos

Se incluyen tests exhaustivos en:
```
__tests__/domain/incidents/resolveIncidentDates.test.ts
```

**Casos cubiertos:**
- ✅ VACACIONES excluye feriados
- ✅ VACACIONES excluye días base OFF
- ✅ LICENCIA incluye todos los días
- ✅ Caso real con feriados dominicanos

### Ejecutar Tests

```bash
npm test -- resolveIncidentDates
```

---

## 🔍 Detalles Técnicos

### Función Principal
```typescript
resolveIncidentDates(incident, allCalendarDays, representative)
```

**Ubicación:** `src/domain/incidents/resolveIncidentDates.ts`

**Lógica para VACACIONES (línea 74-79):**
```typescript
if (representative) {
  const dayOfWeek = cursor.getUTCDay()
  const isBaseOffDay = representative.baseSchedule[dayOfWeek] === 'OFF'
  isCountableDay = dayInfo?.kind !== 'HOLIDAY' && !isBaseOffDay
}
```

### Configuración de Feriados
**Ubicación:** `src/domain/state.ts`

```typescript
const initialCalendarState: CalendarState = {
  specialDays: [
    { date: '2025-01-01', kind: 'HOLIDAY', label: 'Año Nuevo' },
    // ...
  ],
}
```

---

## ⚠️ Notas Importantes

1. **Los feriados deben estar configurados previamente** para que el sistema los excluya del cálculo de vacaciones.

2. **VACACIONES siempre cuenta 14 días laborales** - Este valor está hardcoded. Si necesitas cambiarlo, modifica la línea 44 de `resolveIncidentDates.ts`:
   ```typescript
   const duration = incident.type === 'VACACIONES' ? 14 : incident.duration ?? 1
   ```

3. **El sistema es determinista** - Mismo input = mismo output siempre.

4. **Los días base OFF del representante también se excluyen** - Si un representante tiene domingo como día OFF y ese día cae en medio de sus vacaciones, no cuenta como día laboral.

---

## 📋 Checklist para Nuevos Años

Al inicio de cada año, actualizar:

1. ✅ Agregar feriados del nuevo año en `src/domain/state.ts`
2. ✅ Verificar feriados móviles (Semana Santa, Corpus Christi)
3. ✅ Actualizar documentación si hay cambios en la ley
4. ✅ Ejecutar tests para verificar el comportamiento

---

## 🆘 Soporte

Si las vacaciones no están excluyendo feriados correctamente:

1. **Verificar que el feriado está configurado:**
   - Navega a Planificación
   - Verifica que el día aparece marcado como "Feriado"

2. **Verificar el calendario generado:**
   - Los feriados deben estar en `allCalendarDays` con `kind: 'HOLIDAY'`

3. **Ejecutar test de diagnóstico:**
   ```bash
   npm test -- resolveIncidentDates
   ```

4. **Revisar el estado persistido:**
   - El estado se guarda en IndexedDB
   - Si hay problemas, considera hacer reset con `resetState(true)`
