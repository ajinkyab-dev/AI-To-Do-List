const HIGH_SIGNAL_WORDS = ['urgent', 'asap', 'today', 'eod', 'finish', 'submit', 'deadline', 'send', 'present', 'presentation', 'deploy', 'release', 'fix', 'bug', 'issue', 'client', 'review', 'call', 'payment']
const MEDIUM_SIGNAL_WORDS = ['tomorrow', 'soon', 'prepare', 'draft', 'plan', 'update', 'check', 'follow up', 'remind', 'email', 'schedule', 'organize']
const LOW_SIGNAL_WORDS = ['someday', 'later', 'idea', 'optional', 'research', 'read', 'explore', 'brainstorm']

const CATEGORY_RULES = [
  { name: 'Meetings', keywords: ['meeting', 'meet', 'call', 'sync', 'standup', 'catch up', '1:1', 'one on one', 'zoom', 'webex'] },
  { name: 'Follow-up', keywords: ['follow up', 'email', 'reply', 'respond', 'response', 'ping', 'check in'] },
  { name: 'Admin', keywords: ['invoice', 'expense', 'timesheet', 'payroll', 'policy', 'form', 'contract', 'document', 'report', 'travel', 'booking', 'book flight'] },
  { name: 'Planning', keywords: ['plan', 'strategy', 'roadmap', 'outline', 'draft', 'proposal', 'budget'] },
  { name: 'Development', keywords: ['code', 'deploy', 'fix', 'bug', 'issue', 'feature', 'review pr', 'merge', 'test', 'qa', 'build'] },
  { name: 'Personal', keywords: ['lunch', 'dinner', 'doctor', 'gym', 'pick up', 'family', 'personal'] },
  { name: 'Learning', keywords: ['learn', 'course', 'training', 'tutorial', 'research', 'read', 'study'] }
]

export function parseRawTasks (raw) {
  const normalized = raw
    .replace(/\r\n?/g, '\n')
    .replace(/[,;](?=\s*[a-z0-9])/gi, '\n')
    .replace(/[\u2022\u2023\u25CF]/g, '\n')

  const lines = normalized
    .split(/\n+/)
    .map((line) =>
      line
        .replace(/^\s*(?:[-*]+|\d+[).]?|[a-z]\))\s+/i, '')
        .trim()
    )
    .filter(Boolean)

  const tasks = []
  for (const entry of lines) {
    const cleaned = entry.replace(/\s+/g, ' ').trim()
    if (cleaned) {
      tasks.push(cleaned)
    }
  }
  return tasks
}

const toTitle = (text) => {
  const trimmed = text.trim().replace(/\s+/g, ' ')
  if (!trimmed) {
    return 'Untitled task'
  }
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
}

const normalize = (text) => text.toLowerCase()

const inferPriority = (text) => {
  let score = 1

  HIGH_SIGNAL_WORDS.forEach((word) => {
    if (text.includes(word)) score += 2
  })
  MEDIUM_SIGNAL_WORDS.forEach((word) => {
    if (text.includes(word)) score += 1
  })
  LOW_SIGNAL_WORDS.forEach((word) => {
    if (text.includes(word)) score -= 2
  })

  if (/\b(today|asap|urgent|eod)\b/.test(text)) score += 1
  if (/\b(next week|next month|later)\b/.test(text)) score -= 1

  if (score >= 4) return 'High'
  if (score <= 1) return 'Low'
  return 'Medium'
}

const inferCategory = (text) => {
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some((keyword) => text.includes(keyword))) {
      return rule.name
    }
  }
  return 'Work'
}

const extractSignals = (text) => {
  const notes = new Set()

  if (/\b(today|asap|eod|urgent)\b/.test(text)) {
    notes.add('Time-sensitive')
  }
  if (/\b(tomorrow|next week|next month|by (monday|tuesday|wednesday|thursday|friday))\b/.test(text)) {
    notes.add('Has a due window')
  }
  if (/\b(call|email|follow up|reply|reach out)\b/.test(text)) {
    notes.add('Requires communication')
  }
  if (/\b(invoice|expense|report|timesheet|contract)\b/.test(text)) {
    notes.add('Administrative task')
  }
  if (/\b(deploy|release|bug|issue|fix)\b/.test(text)) {
    notes.add('Technical work')
  }

  return Array.from(notes)
}

export function heuristicOrganize (raw, { groupByCategory }) {
  const entries = parseRawTasks(raw)
  const tasks = entries.map((text) => {
    const normalized = normalize(text)
    return {
      title: toTitle(text),
      priority: inferPriority(normalized),
      category: inferCategory(normalized),
      notes: extractSignals(normalized),
      status: 'To Do'
    }
  })

  return {
    tasks,
    grouped: Boolean(groupByCategory),
    provider: 'heuristic',
    providerLabel: 'Heuristic'
  }
}
