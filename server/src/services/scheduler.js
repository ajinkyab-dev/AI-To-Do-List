const MORNING_CATEGORIES = new Set(['Development', 'Planning', 'Admin'])
const AFTERNOON_CATEGORIES = new Set(['Meetings', 'Follow-up'])

function normalizeText (value) {
  return (value || '').toLowerCase()
}

function pickSlot (task) {
  if (task.status === 'Completed') {
    return null
  }

  const category = task.category || ''
  const notesText = normalizeText((task.notes || []).join(' '))
  const titleText = normalizeText(task.title)

  if (task.priority === 'High' || notesText.includes('time-sensitive')) {
    return 'morning'
  }

  if (MORNING_CATEGORIES.has(category)) {
    return 'morning'
  }

  if (AFTERNOON_CATEGORIES.has(category)) {
    return 'afternoon'
  }

  if (task.priority === 'Low' || notesText.includes('optional') || notesText.includes('research')) {
    return 'anytime'
  }

  if (titleText.includes('review') || titleText.includes('reply')) {
    return 'afternoon'
  }

  return task.priority === 'Medium' ? 'afternoon' : 'anytime'
}

export function buildSchedule (tasks) {
  const schedule = {
    morning: [],
    afternoon: [],
    anytime: []
  }

  tasks.forEach((task) => {
    const slot = pickSlot(task)
    if (slot && schedule[slot]) {
      schedule[slot].push(task)
    }
  })

  return schedule
}

export function buildStats (tasks) {
  const stats = {
    total: tasks.length,
    todo: 0,
    inProgress: 0,
    completed: 0,
    completion: 0
  }

  if (tasks.length === 0) {
    return stats
  }

  tasks.forEach((task) => {
    switch (task.status) {
      case 'Completed':
        stats.completed += 1
        break
      case 'In Progress':
        stats.inProgress += 1
        break
      default:
        stats.todo += 1
    }
  })

  stats.completion = Math.round((stats.completed / stats.total) * 100)
  return stats
}
