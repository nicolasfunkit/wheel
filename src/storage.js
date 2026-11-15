// Small localStorage wrapper: reads are synchronous (usable before the first render) and
// every access is guarded, because storage can be unavailable (private browsing, blocked
// cookies…). In that case the app simply runs without persistence.

export function load(key, fallback) {
  try {
    return localStorage.getItem(key) ?? fallback
  } catch {
    return fallback
  }
}

export function save(key, value) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // not persisted
  }
}
