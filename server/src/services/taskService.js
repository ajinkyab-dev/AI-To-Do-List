import config from '../config/env.js'
import prisma from '../db/prisma.js'
import { heuristicOrganize } from './heuristicParser.js'
import { invokeLLM, providerLabels } from './llmProvider.js'
import { normalizePriority, normalizeStatus, sanitizeNotes } from '../utils/json.js'
import { buildSchedule, buildStats } from './scheduler.js'

const SUPPORTED_PROVIDERS = new Set(['openai', 'gemini', 'mock'])
const FALLBACK_CATEGORY = 'Work'

const DB_STATUS_MAP = {
  'To Do': 'ToDo',
  'In Progress': 'InProgress',
  Completed: 'Completed'
}

const CLIENT_STATUS_MAP = {
  ToDo: 'To Do',
  InProgress: 'In Progress',
  Completed: 'Completed'
}

function parseGroupFlag (value, fallback = true) {
  if (typeof value === 'boolean') {
    return value
  }
  if (typeof value === 'string') {
    const lowered = value.trim().toLowerCase()
    if (['true', '1', 'yes', 'on'].includes(lowered)) {
      return true
    }
    if (['false', '0', 'no', 'off'].includes(lowered)) {
      return false
    }
  }
  if (typeof value === 'number') {
    return value === 1
  }
  return fallback
}

function sanitizeTitle (value) {
  if (!value) {
    return 'Untitled task'
  }
  if (typeof value !== 'string') {
    return String(value)
  }
  const trimmed = value.trim()
  return trimmed.length ? trimmed : 'Untitled task'
}

function sanitizeCategory (value) {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (trimmed) {
      return trimmed
    }
  }
  return FALLBACK_CATEGORY
}

function sanitizeText (value) {
  if (typeof value !== 'string') {
    return ''
  }
  return value.trim()
}

function sanitizeTasks (tasks) {
  if (!Array.isArray(tasks) || tasks.length === 0) {
    return []
  }

  return tasks.slice(0, 100).map((task) => ({
    title: sanitizeTitle(task?.title),
    priority: normalizePriority(task?.priority),
    category: sanitizeCategory(task?.category),
    notes: sanitizeNotes(task?.notes),
    status: normalizeStatus(task?.status),
    details: sanitizeText(task?.details),
    timeLog: sanitizeText(task?.timeLog),
    hoursSpent: sanitizeText(task?.hoursSpent),
    statusSummary: sanitizeText(task?.statusSummary)
  }))
}

function ensureProvider (provider) {
  const normalized = (provider || '').toLowerCase()
  if (!SUPPORTED_PROVIDERS.has(normalized)) {
    return 'mock'
  }
  return normalized
}

function requireKey (provider) {
  if (provider === 'openai' && !config.openai.apiKey) {
    const error = new Error('OpenAI API key is not configured. Set OPENAI_API_KEY or switch MODEL_PROVIDER to mock.')
    error.status = 400
    throw error
  }
  if (provider === 'gemini' && !config.gemini.apiKey) {
    const error = new Error('Gemini API key is not configured. Set GEMINI_API_KEY or switch MODEL_PROVIDER to mock.')
    error.status = 400
    throw error
  }
}

function validateNotes (notes) {
  if (notes === undefined || notes === null) {
    const error = new Error('The "notes" field is required.')
    error.status = 422
    throw error
  }
  const text = String(notes).trim()
  if (!text) {
    const error = new Error('Provide at least one task note.')
    error.status = 422
    throw error
  }
  if (text.length > 8000) {
    const error = new Error('Notes payload is too long. Limit to 8,000 characters.')
    error.status = 413
    throw error
  }
  return text
}

function formatTasksForClient (records) {
  if (!Array.isArray(records) || records.length === 0) {
    return []
  }

  return records.map((task) => ({
    id: task.id,
    title: task.title,
    priority: task.priority || 'Medium',
    category: task.category || FALLBACK_CATEGORY,
    status: CLIENT_STATUS_MAP[task.status] || 'To Do',
    notes: Array.isArray(task.notes) ? task.notes : [],
    details: task.details || '',
    timeLog: task.timeLog || '',
    hoursSpent: task.hoursSpent || '',
    statusSummary: task.statusSummary || '',
    createdAt: task.createdAt,
    updatedAt: task.updatedAt
  }))
}

function buildResponse ({ tasks, grouped, provider, providerLabel, model, warning }) {
  const clientTasks = formatTasksForClient(tasks)
  return {
    tasks: clientTasks,
    grouped,
    provider,
    providerLabel: providerLabel || providerLabels[provider] || provider,
    model,
    warning,
    stats: buildStats(clientTasks),
    schedule: buildSchedule(clientTasks),
    timestamp: new Date().toISOString()
  }
}

function mapStatusForDb (status) {
  return DB_STATUS_MAP[normalizeStatus(status)] || 'ToDo'
}

function prepareTaskData ({ userId, task }) {
  return {
    userId,
    title: task.title,
    details: task.details || '',
    category: task.category,
    priority: task.priority,
    status: mapStatusForDb(task.status),
    notes: task.notes,
    timeLog: task.timeLog || null,
    hoursSpent: task.hoursSpent || null,
    statusSummary: task.statusSummary || null
  }
}

async function replaceUserTasks (userId, tasks) {
  return prisma.$transaction(async (tx) => {
    await tx.task.deleteMany({ where: { userId } })

    if (!tasks.length) {
      return []
    }

    const creations = []
    for (const task of tasks) {
      const created = await tx.task.create({
        data: prepareTaskData({ userId, task })
      })
      creations.push(created)
    }
    return creations
  })
}

function sanitizeUpdatePayload (payload) {
  const data = {}

  if (payload.title !== undefined) {
    data.title = sanitizeTitle(payload.title)
  }
  if (payload.details !== undefined) {
    data.details = sanitizeText(payload.details)
  }
  if (payload.category !== undefined) {
    data.category = sanitizeCategory(payload.category)
  }
  if (payload.priority !== undefined) {
    data.priority = normalizePriority(payload.priority)
  }
  if (payload.status !== undefined) {
    data.status = mapStatusForDb(payload.status)
  }
  if (payload.notes !== undefined) {
    data.notes = sanitizeNotes(payload.notes)
  }
  if (payload.timeLog !== undefined) {
    const trimmed = sanitizeText(payload.timeLog)
    data.timeLog = trimmed || null
  }
  if (payload.hoursSpent !== undefined) {
    const trimmed = sanitizeText(payload.hoursSpent)
    data.hoursSpent = trimmed || null
  }
  if (payload.statusSummary !== undefined) {
    const trimmed = sanitizeText(payload.statusSummary)
    data.statusSummary = trimmed || null
  }

  return data
}

export async function fetchTasksForUser ({ user }) {
  const [dbUser, records] = await prisma.$transaction([
    prisma.user.findUnique({ where: { id: user.id } }),
    prisma.task.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'asc' } })
  ])

  const groupedPreference = dbUser?.groupByCategory ?? true

  return buildResponse({
    tasks: records,
    grouped: groupedPreference,
    provider: 'database',
    providerLabel: 'Database'
  })
}

export async function organizeTasks ({ user, notes, groupByCategory }) {
  const sanitizedNotes = validateNotes(notes)
  const groupedPreference = parseGroupFlag(groupByCategory, user.groupByCategory ?? true)
  const provider = ensureProvider(config.modelProvider)

  let tasks
  let model
  let warning
  let providerLabel = providerLabels[provider] || provider

  if (provider === 'mock') {
    const result = heuristicOrganize(sanitizedNotes, { groupByCategory: groupedPreference })
    tasks = result.tasks
    providerLabel = result.providerLabel || providerLabel
  } else {
    requireKey(provider)
    try {
      const llmResult = await invokeLLM(provider, config, { notes: sanitizedNotes, groupByCategory: groupedPreference })
      model = llmResult.model
      if (!Array.isArray(llmResult.tasks) || llmResult.tasks.length === 0) {
        throw new Error('Model returned no tasks.')
      }
      tasks = llmResult.tasks
    } catch (error) {
      console.warn(`LLM provider ${provider} failed, using heuristic fallback: ${error.message}`)
      const fallback = heuristicOrganize(sanitizedNotes, { groupByCategory: groupedPreference })
      tasks = fallback.tasks
      providerLabel = `${providerLabels[provider] || provider} (fallback heuristics)`
      warning = error.message
    }
  }

  const sanitized = sanitizeTasks(tasks)
  const persisted = await replaceUserTasks(user.id, sanitized)

  await prisma.user.update({
    where: { id: user.id },
    data: { groupByCategory: groupedPreference }
  })

  return buildResponse({
    tasks: persisted,
    grouped: groupedPreference,
    provider,
    providerLabel,
    model,
    warning
  })
}

export async function createTaskForUser ({ userId, payload }) {
  const sanitized = sanitizeTasks([payload])[0]
  if (!sanitized) {
    const error = new Error('Invalid task payload.')
    error.status = 422
    throw error
  }

  const created = await prisma.task.create({
    data: prepareTaskData({ userId, task: sanitized })
  })

  return formatTasksForClient([created])[0]
}

export async function updateTaskForUser ({ userId, taskId, payload }) {
  const data = sanitizeUpdatePayload(payload || {})

  if (Object.keys(data).length === 0) {
    const error = new Error('No valid fields supplied for update.')
    error.status = 422
    throw error
  }

  const updated = await prisma.task.updateMany({
    where: { id: taskId, userId },
    data
  })

  if (updated.count === 0) {
    const error = new Error('Task not found.')
    error.status = 404
    throw error
  }

  const record = await prisma.task.findUnique({ where: { id: taskId } })
  return formatTasksForClient([record])[0]
}

export async function deleteTaskForUser ({ userId, taskId }) {
  const deleted = await prisma.task.deleteMany({ where: { id: taskId, userId } })
  if (deleted.count === 0) {
    const error = new Error('Task not found.')
    error.status = 404
    throw error
  }
}

export async function clearTasksForUser (userId) {
  await prisma.task.deleteMany({ where: { userId } })
}
