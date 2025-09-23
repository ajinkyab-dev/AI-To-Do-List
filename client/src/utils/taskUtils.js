import { v4 as uuidv4 } from 'uuid';

export const STATUS_OPTIONS = ['To Do', 'In Progress', 'Completed'];
export const PRIORITY_OPTIONS = ['High', 'Medium', 'Low'];

const CATEGORY_FALLBACK = 'Work';
const CATEGORY_OPTIONS_BASE = [
  'Work',
  'Admin',
  'Meetings',
  'Follow-up',
  'Planning',
  'Development',
  'Personal',
  'Learning',
  'Other'
];

export const CATEGORY_OPTIONS = CATEGORY_OPTIONS_BASE;

const PRIORITY_ORDER = {
  High: 0,
  Medium: 1,
  Low: 2
};

function ensureTaskShape(task = {}) {
  const { developerNotes, ...rest } = task || {};
  const base = rest || {};
  return {
    ...base,
    id: base.id || uuidv4(),
    title: base.title || 'Untitled task',
    priority: base.priority || 'Medium',
    category: base.category || CATEGORY_FALLBACK,
    status: base.status || 'To Do',
    notes: Array.isArray(base.notes) ? base.notes : [],
    details: base.details || '',
    timeLog: base.timeLog || '',
    hoursSpent: base.hoursSpent ?? '',
    statusSummary: base.statusSummary || ''
  };
}
export function withClientId(tasks) {
  return (tasks || []).map((task) => ensureTaskShape(task));
}

export function sortByPriority(tasks) {
  return [...(tasks || [])].sort((a, b) => {
    const left = PRIORITY_ORDER[a.priority] ?? 1;
    const right = PRIORITY_ORDER[b.priority] ?? 1;
    if (left !== right) {
      return left - right;
    }
    return (a.title || '').localeCompare(b.title || '');
  });
}

export function computeStats(tasks) {
  const stats = {
    total: tasks.length,
    todo: 0,
    inProgress: 0,
    completed: 0,
    completion: 0
  };

  if (tasks.length === 0) {
    return stats;
  }

  tasks.forEach((task) => {
    switch (task.status) {
      case 'Completed':
        stats.completed += 1;
        break;
      case 'In Progress':
        stats.inProgress += 1;
        break;
      default:
        stats.todo += 1;
    }
  });

  stats.completion = Math.round((stats.completed / stats.total) * 100);
  return stats;
}

const MORNING_CATEGORIES = new Set(['Development', 'Planning', 'Admin']);
const AFTERNOON_CATEGORIES = new Set(['Meetings', 'Follow-up']);

function toText(value) {
  return (value || '').toLowerCase();
}

function chooseSlot(task) {
  if (task.status === 'Completed') {
    return null;
  }
  const notesText = toText((task.notes || []).join(' '));
  const titleText = toText(task.title);

  if (task.priority === 'High' || notesText.includes('time-sensitive')) {
    return 'morning';
  }

  if (MORNING_CATEGORIES.has(task.category)) {
    return 'morning';
  }

  if (AFTERNOON_CATEGORIES.has(task.category)) {
    return 'afternoon';
  }

  if (task.priority === 'Low' || notesText.includes('optional') || notesText.includes('research')) {
    return 'anytime';
  }

  if (titleText.includes('review') || titleText.includes('reply')) {
    return 'afternoon';
  }

  return task.priority === 'Medium' ? 'afternoon' : 'anytime';
}

export function buildSchedule(tasks) {
  const schedule = {
    morning: [],
    afternoon: [],
    anytime: []
  };

  sortByPriority(tasks).forEach((task) => {
    const slot = chooseSlot(task);
    if (slot && schedule[slot]) {
      schedule[slot].push(task);
    }
  });

  return {
    morning: sortByPriority(schedule.morning),
    afternoon: sortByPriority(schedule.afternoon),
    anytime: sortByPriority(schedule.anytime)
  };
}

export function updateTask(tasks, id, updater) {
  return tasks.map((task) => {
    if (task.id === id) {
      return ensureTaskShape({ ...task, ...updater(task) });
    }
    return task;
  });
}

export function removeTask(tasks, id) {
  return tasks.filter((task) => task.id !== id);
}

