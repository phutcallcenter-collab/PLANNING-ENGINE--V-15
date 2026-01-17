# Módulo de Analíticas

**ESTADO: CONGELADO**

Este módulo es un placeholder para la futura capa de analíticas y estadísticas del sistema.

## Principio Arquitectónico

Las estadísticas y los Key Performance Indicators (KPIs) **NO se implementarán** hasta que el modelo de dominio subyacente, especialmente el **modelo de turnos** (`DAY`, `NIGHT`, `MIXTO`, etc.), esté completamente definido, implementado y estabilizado.

## Razón

Construir una capa de analíticas sobre un modelo de dominio incompleto o sujeto a cambios resultaría en:
1.  **Métricas Frágiles**: Los cálculos se basarían en suposiciones que se romperán, requiriendo refactorizaciones costosas.
2.  **Código Acoplado**: La lógica de las estadísticas se acoplaría a implementaciones temporales.
3.  **Deuda Técnica**: Se crearía código que necesitaría ser reescrito casi en su totalidad.

El enfoque correcto es el opuesto:
> "Esperar a que el modelo de dominio exista y sea estable antes de medirlo."

## Contrato Futuro

Cuando se retome este módulo, deberá:
-   Consumir datos de `historyEvents` y `auditLog` como fuentes primarias.
-   Derivar métricas de forma pura, sin alterar el estado base.
-   Respetar la separación de responsabilidades entre el registro de datos (dominio) y la interpretación de los mismos (analíticas).

**NO TOCAR HASTA NUEVO AVISO.**
