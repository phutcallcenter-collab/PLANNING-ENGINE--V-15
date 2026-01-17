import { BackupPayload } from './types'
import { DOMAIN_VERSION } from '@/store/useAppStore'

export function parseBackup(text: string): BackupPayload {
  let parsed: unknown

  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('El archivo no es JSON válido.')
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Formato de respaldo inválido.')
  }

  const payload = parsed as BackupPayload

  if (payload.version !== DOMAIN_VERSION) {
    throw new Error(
      `Versión incompatible. Esperada ${DOMAIN_VERSION}, recibida ${
        payload.version || 'desconocida'
      }`
    )
  }

  if (!Array.isArray(payload.representatives)) {
    throw new Error('Respaldo corrupto: representantes inválidos.')
  }

  if (!Array.isArray(payload.incidents)) {
    throw new Error('Respaldo corrupto: incidencias inválidas.')
  }

  return payload
}
