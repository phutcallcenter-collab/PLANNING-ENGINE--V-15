# 🔒 REGLAS DURAS DE CAMBIOS DE TURNO Y COBERTURA

# 🔒 REGLAS PRECISAS DE CAMBIOS DE TURNO Y COBERTURA

## Regla 0 — Lógica de Colisión de Turnos
**La cobertura se permite según el turno BASE del representante, no su estado ese día.**

- **Turnos base diferentes**: Sin colisión → SIEMPRE válido
- **Mismo turno base**: Colisión horaria → Válido SOLO si el que cubre está OFF
- **Perfil MIXTO**: Conflictivo con ambos → Válido SOLO si está OFF

---

## 🛡️ COVER — Lógica Precisa por Turno Base

### ✅ COVER es válido cuando:

#### Caso 1: Turnos Base Diferentes (Sin Colisión)
- **DAY** cubre a **NIGHT** → ✅ SIEMPRE válido
- **NIGHT** cubre a **DAY** → ✅ SIEMPRE válido
- No importa si el que cubre está OFF o trabajando
- **Razón**: No hay colisión horaria

#### Caso 2: Mismo Turno Base (Con Colisión)
- **DAY** cubre a **DAY** → ✅ Válido SOLO si el que cubre está OFF
- **NIGHT** cubre a **NIGHT** → ✅ Válido SOLO si el que cubre está OFF
- **Razón**: Colisión horaria se resuelve con OFF

#### Caso 3: Perfil MIXTO
- **MIXTO** puede cubrir → ✅ SOLO si está OFF ese día
- **Razón**: Perfil MIXTO es conflictivo con ambos turnos

### ❌ COVER está PROHIBIDO cuando:

1. **Incidencias bloqueantes**:
   - ❌ No se puede cubrir A alguien de vacaciones/licencia
   - ❌ No se puede cubrir CON alguien de vacaciones/licencia

2. **Mismo turno base y ambos trabajan**:
   - ❌ DAY (trabajando) no puede cubrir a DAY (trabajando)

3. **Perfil MIXTO trabajando**:
   - ❌ MIXTO (trabajando) no puede cubrir a nadie

4. **Sin assignment**:
   - ❌ El cubierto no tiene asignación válida

### Ejemplos Válidos:
```
✅ Ana (NIGHT base, trabajando) ← Carlos (DAY base, trabajando)
   → Carlos puede cubrir (sin colisión)

✅ Pedro (DAY base, trabajando) ← Luis (DAY base, OFF)
   → Luis puede cubrir (colisión resuelta con OFF)

✅ María (NIGHT base, trabajando) ← Mixto (OFF)
   → Mixto puede cubrir (está OFF)
```

### Ejemplos Inválidos:
```
❌ Juan (DAY base, trabajando) ← Pedro (DAY base, trabajando)
   → Colisión sin resolver

❌ Carlos (cualquier turno) ← Mixto (trabajando)
   → Mixto conflictivo cuando trabaja

❌ Ana (VACATION) ← Elena (cualquier estado)
   → No cubrir a vacaciones

❌ Pedro (trabajando) ← Luis (LEAVE)
   → No cubrir con licencia
```

---

## 🔁 SWAP — La única forma válida cuando ambos trabajan

### ✅ SWAP es válido si:
1. Trabajan **turnos distintos**
   - A → Día
   - B → Noche
2. Ambos **EXISTEN** en el plan base
3. Intercambian turnos **completos**
4. Cobertura total por turno se **conserva**

### ❌ SWAP es inválido si:
1. Ambos trabajan el **mismo turno**
2. Uno estaba **OFF**
3. Se usa para "arreglar" cobertura

### Ejemplo válido:
- Carlos trabaja **Día**
- Diana trabaja **Noche**
- Carlos ↔ Diana → ✅ VÁLIDO

### Ejemplo inválido:
- Carlos trabaja **Día**
- Roberto trabaja **Día**
- Carlos ↔ Roberto → ❌ INVÁLIDO (mismo turno)

---

## 🟧 DOUBLE — Cuándo aplica de verdad

### ✅ DOUBLE es válido SOLO si:
1. La persona **ya trabajaba ese día**
2. Asume un **turno adicional**
3. La cobertura **aumenta +1**
4. **No sustituye** a nadie

**Traducción:**
> "Nadie sale, alguien entra extra."

### ❌ DOUBLE es inválido si:
1. Se usa para **reemplazar** a alguien (eso es COVER)
2. Se usa cuando alguien estaba **OFF** (debe estar trabajando primero)
3. Se usa para tapar una **ausencia**

### Ejemplo válido:
- Elena trabaja **Día**
- Elena hace DOUBLE → trabaja también **Noche** → ✅ VÁLIDO

### Ejemplo inválido:
- Elena está **OFF**
- Elena hace DOUBLE en **Día** → ❌ INVÁLIDO (no estaba trabajando)

---

## 🧮 Regla crítica de cobertura

| Operación | Cambia cantidad |
|-----------|----------------|
| COVER     | ❌ NO          |
| SWAP      | ❌ NO          |
| DOUBLE    | ✅ +1          |
| AUSENCIA  | ❌ -1          |
| LICENCIA  | ❌ -1          |

**Si COVER o SWAP cambian números → bug lógico.**

---

## 🔥 Regla de oro

> **Si ambos estaban trabajando, NO existe COVER.**

Opciones reales:
- **SWAP** (si turnos opuestos)
- **DOUBLE** (si alguien hace extra)
- **Nada** (evento inválido)

---

## 🧠 Checklist rápido (para el dominio)

### Antes de aceptar un evento COVER:
```typescript
assert(from.shouldWork === true)
assert(to.shouldWork === false)
assert(from.shift === shift)
assert(to.shift !== shift)
```

Si alguna falla → **reject**.

---

## Regla de disponibilidad por tipo de turno

### Turno específico (DAY o NIGHT):
- **Juan (Día) puede cubrir a María (Día)** → ❌ NO (mismo turno, ambos trabajan)
- **Juan (Día) puede cubrir a Pedro (Noche)** → ✅ SÍ (si Juan está OFF ese día)
- **Juan (Noche) puede cubrir a María (Día)** → ✅ SÍ (si Juan está OFF ese día)

### Turno mixto (BOTH):
- Pueden cubrir **siempre que tengan disponibilidad** en uno de los turnos
- Si trabajan BOTH, pueden hacer DOUBLE pero NO COVER (ya están trabajando)

### Regla simple:
> **Solo se puede cubrir si la persona que va a cubrir tiene disponibilidad el día seleccionado.**

Ejemplos:
- Juan trabaja **Noche** → puede cubrir a María que trabaja **Día** ✅
- Pedro trabaja **Noche** → NO puede cubrir a Juan (**Noche**) a menos que lo haga en su día libre ✅

---

## 🎯 DETECCIÓN AUTOMÁTICA DEL TURNO (importante para la UI)

### Problema común:
Cuando usas COVER en la UI, el sistema debe determinar **qué turno se está cubriendo** automáticamente.

### Solución:
1. **Para COVER**: El turno relevante es el que trabaja la persona cubierta (`from`)
   - Si Elena (Noche) necesita cobertura → se cubre el turno **NOCHE**
   - Si Carlos (Día) necesita cobertura → se cubre el turno **DÍA**
   - La UI NO debe usar el botón "Día/Noche" seleccionado, sino detectar el turno automáticamente

2. **Para SWAP**: Se usa el turno seleccionado en la UI
   - El `from` debe trabajar ese turno
   - El `to` debe trabajar el turno opuesto

3. **Para DOUBLE**: Se usa el turno seleccionado en la UI
   - La persona debe estar trabajando OTRO turno ese día

### Ejemplo correcto:
```typescript
// Elena trabaja NOCHE, necesita cobertura
// Ana trabaja DÍA (está disponible en NOCHE)

// ❌ INCORRECTO: usar turno DÍA porque está seleccionado en UI
validateSwapOperation('COVER', 'elena', 'ana', 'DAY', context)
// Error: "Elena no está asignada a Turno DAY"

// ✅ CORRECTO: detectar que Elena trabaja NOCHE
const elenaShift = getShiftFromAssignment('elena') // → 'NIGHT'
validateSwapOperation('COVER', 'elena', 'ana', 'NIGHT', context)
// OK: Ana puede cubrir a Elena en el turno NOCHE
```

---

## 🔒 INVARIANTES CRÍTICOS

### 0️⃣ Principio base
- El **plan base nunca se modifica**
- Swaps, covers y doubles **no editan horarios**
- Solo crean eventos que **alteran la interpretación efectiva**

### 1️⃣ Identidad del evento
```typescript
{
  type: 'COVER' | 'SWAP' | 'DOUBLE'
  date: ISODate
  shift: ShiftType
}
```
Si falta uno → **evento inválido**.

### 3️⃣ Reglas temporales
- Todos los eventos afectan **SOLO el date indicado**
- No hay arrastre implícito
- Eventos multi-día requieren **múltiples eventos**

### 5️⃣ Reglas de colisión
Un solo evento por persona/día/turno:
- DOUBLE + COVER → ❌ inválido
- COVER + SWAP → ❌ inválido
- SWAP + SWAP → ❌ inválido

### 7️⃣ Regla final
**La UI no decide si algo es válido.**

La verdad vive en:
- `resolveEffectiveDuty`
- `getEffectiveAssignmentsForPlanner`
- `getEffectiveDailyCoverage`
- `getEffectiveDailyLogData`

---

## 🧠 Traducción brutal

- Si un cambio no puede explicarse en una frase → **no es válido**
- Si afecta más de un día sin decirlo explícitamente → **es un bug**
- Si cambia números sin un evento explícito → **es corrupción**
- Si la UI "arregla" algo que el dominio no valida → **estás mintiendo**
