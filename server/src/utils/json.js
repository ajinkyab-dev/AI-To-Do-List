export function extractJsonObject (text) {
  if (typeof text !== 'string') {
    return null
  }
  const firstBrace = text.indexOf('{')
  const lastBrace = text.lastIndexOf('}')
  if (firstBrace === -1 || lastBrace === -1 || firstBrace > lastBrace) {
    return null
  }
  const jsonSlice = text.slice(firstBrace, lastBrace + 1)
  try {
    return JSON.parse(jsonSlice)
  } catch (error) {
    return null
  }
}

const STATUS_ALIASES = new Map([
  ['todo', 'To Do'],
  ['to-do', 'To Do'],
  ['not started', 'To Do'],
  ['in progress', 'In Progress'],
  ['progress', 'In Progress'],
  ['doing', 'In Progress'],
  ['completed', 'Completed'],
  ['done', 'Completed'],
  ['finished', 'Completed']
])

export function normalizePriority (value) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (normalized === 'high') return 'High'
  if (normalized === 'low') return 'Low'
  return 'Medium'
}

export function normalizeStatus (value) {
  if (!value) return 'To Do'
  if (typeof value === 'string') {
    const key = value.trim().toLowerCase()
    if (STATUS_ALIASES.has(key)) {
      return STATUS_ALIASES.get(key)
    }
    if (key === 'in progress') {
      return 'In Progress'
    }
    if (key === 'completed') {
      return 'Completed'
    }
  }
  return 'To Do'
}

export function sanitizeNotes (value) {
  if (!Array.isArray(value)) {
    return []
  }
  return value
    .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
    .filter(Boolean)
}
