# 🛡️ Pruebas Hostiles - Sistema de Swaps Blindado

## ✅ Escenarios Validados (29 tests pasando)

### 🔒 Protección contra doble asignación

#### COVER - Cobertura de turnos
- ❌ **RECHAZA**: Que alguien cubra cuando ya está trabajando otro turno
  - Mensaje: "Bruno López ya tiene asignado el turno de Noche ese día y no puede cubrir otro turno."
  
- ❌ **RECHAZA**: Doble cobertura sobre la misma persona
  - Escenario: Carlos cubre NIGHT → intenta cubrir DAY también
  - Mensaje: "Carlos Ruiz ya tiene asignado el turno de Noche ese día..."

- ✅ **ACEPTA**: Que alguien libre (OFF) cubra un turno

#### DOUBLE - Turnos dobles
- ❌ **RECHAZA**: Doblar turno cuando ya está trabajando
  - Escenario: Ana trabaja DAY → intenta doblar NIGHT
  - Mensaje: "Ana García ya tiene asignado el turno de Día ese día y no puede hacer un turno doble."

- ❌ **RECHAZA**: Doblar turno después de cubrir
  - Escenario: Carlos cubre DAY → intenta doblar NIGHT
  - Bloquea la doble asignación

- ✅ **ACEPTA**: Doblar turno cuando está libre (OFF)

#### SWAP - Intercambio de turnos
- ❌ **RECHAZA**: Intercambiar con turno incorrecto
  - Escenario: Ana (DAY) intenta intercambiar como si trabajara NIGHT
  - Mensaje: "Ana García tiene asignado Día, no Noche. No se puede intercambiar."

- ✅ **ACEPTA**: Intercambiar turnos correctamente
  - Escenario: Ana (DAY) ↔ Bruno (NIGHT)

#### Cadenas en cascada
- ❌ **RECHAZA**: Múltiples swaps que generan conflicto
  - Escenario: 
    1. Ana cubre Carlos (Carlos OFF → DAY)
    2. Intentar que Carlos cubra Bruno (NIGHT)
  - Resultado: Bloqueado (Carlos ya trabaja DAY)

---

## 🎯 Matriz de Validación

| Escenario | Base | Swap Propuesto | Resultado |
|-----------|------|----------------|-----------|
| Cubrir cuando trabaja | DAY | COVER NIGHT | ❌ RECHAZA |
| Cubrir cuando libre | OFF | COVER DAY | ✅ ACEPTA |
| Doblar cuando trabaja | DAY | DOUBLE NIGHT | ❌ RECHAZA |
| Doblar cuando libre | OFF | DOUBLE DAY | ✅ ACEPTA |
| Swap turno incorrecto | DAY | SWAP como NIGHT | ❌ RECHAZA |
| Swap turno correcto | DAY ↔ NIGHT | SWAP | ✅ ACEPTA |
| Doble cobertura | COVER DAY + COVER NIGHT | Mismo rep | ❌ RECHAZA |
| Cubrir después doblar | DOUBLE DAY + COVER NIGHT | Mismo rep | ❌ RECHAZA |

---

## 🔧 Arquitectura de Validación

```
Usuario → Modal → handleSubmit()
                    ↓ try
                    addSwap(data)
                      ↓
                    Store: validateSwapDoesNotCauseConflict()
                      ↓
                    getBaseAssignmentForDay()
                      ↓
                    getEffectiveAssignmentForDay()
                      ↓
                    [Base + Swaps existentes] = Asignación efectiva
                      ↓
                    ¿Conflicto?
                      ├─ SÍ → throw Error("mensaje humano")
                      │         ↓
                      │       catch en Modal
                      │         ↓
                      │       showToast({ error })
                      │
                      └─ NO → Crear swap + Cerrar modal
```

---

## 📊 Cobertura de Tests

### Funciones de dominio
- ✅ `getSwapForCell`: 13/13 tests (incluye invariante múltiples swaps)
- ✅ `getEffectiveAssignmentForDay`: 7/7 tests
- ✅ `validateSwapDoesNotCauseConflict`: 9/9 tests (escenarios hostiles)

### Total: 29 tests pasando

---

## 🚫 Casos imposibles ahora

1. **Una persona trabajando dos turnos el mismo día**
   - Validado en dominio, no en UI
   - Error descriptivo con nombre real de la persona

2. **Intercambiar turnos que no coinciden**
   - Sistema valida base assignment antes de crear swap

3. **Coberturas en cascada que violan física**
   - Detecta estado efectivo incluyendo swaps previos

4. **Doble-booking silencioso**
   - Todo intento genera error descriptivo

---

## 🎓 Mensajes de Error (Human-Friendly)

### Antes (técnico):
```
Cannot create COVER: rep-a is already assigned to DAY on 2026-01-15
```

### Ahora (humano):
```
Ana García ya tiene asignado el turno de Día ese día y no puede cubrir otro turno.
```

**Características:**
- ✅ Nombre real de la persona (no IDs técnicos)
- ✅ "Día" / "Noche" (no DAY/NIGHT)
- ✅ Explicación de por qué no puede
- ✅ Idioma español consistente

---

## ✅ Checklist Final

- [x] Build compila sin errores
- [x] 29 tests del sistema de swaps pasan
- [x] Validación en dominio (no en UI)
- [x] Mensajes de error human-friendly
- [x] Toast muestra errores al usuario
- [x] Modal permanece abierto en error
- [x] Modal cierra en éxito
- [x] Protección contra todas las combinaciones hostiles
- [x] Invariante documentada en SWAP_INVARIANTS.ts
- [x] Tests de escenarios en cascada

---

## 🎯 Garantías del Sistema

**El sistema ahora GARANTIZA que:**

1. Una persona = máximo 1 turno efectivo por día
2. No existen estados físicamente imposibles
3. Errores se reportan antes de crear datos corruptos
4. Usuario recibe feedback claro y específico
5. No se puede "colar" un swap inválido por ningún camino

**Esto ya no es código defensivo. Es código que entiende las leyes físicas.**
