// localStorage is this app's only persistence layer (see CLAUDE.md) - there's
// no server copy to fall back on, so a load path must never silently discard
// data it doesn't recognize. Every entity is stored as `{ version, data }`.
// When the shape changes, add a migration that brings old data forward
// instead of resetting it, and bump the version each call site passes in.
export interface Migration<T> {
  version: number
  migrate: (data: unknown) => T
}

interface Envelope {
  version: number
  data: unknown
}

function isEnvelope(value: unknown): value is Envelope {
  return typeof value === 'object' && value !== null && 'version' in value && 'data' in value
}

export function loadVersioned<T>(key: string, currentVersion: number, migrations: Migration<T>[], fallback: () => T): T {
  const raw = localStorage.getItem(key)
  if (!raw) return fallback()

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    // Corrupt JSON - keep the original string around instead of overwriting
    // it with a fresh default on the next save.
    localStorage.setItem(`${key}:backup`, raw)
    return fallback()
  }

  // Data written before versioning existed has no envelope - treat the raw
  // payload itself as version 0 so the first migration can normalize it.
  let envelope: Envelope = isEnvelope(parsed) ? parsed : { version: 0, data: parsed }

  for (const migration of migrations) {
    if (envelope.version < migration.version) {
      envelope = { version: migration.version, data: migration.migrate(envelope.data) }
    }
  }

  if (envelope.version !== currentVersion) {
    // Nothing brought this up to the current version - don't guess at the
    // shape, preserve the original and fall back to defaults instead.
    localStorage.setItem(`${key}:backup`, raw)
    return fallback()
  }

  return envelope.data as T
}

export function saveVersioned<T>(key: string, version: number, data: T): void {
  localStorage.setItem(key, JSON.stringify({ version, data }))
}
