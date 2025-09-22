import config from '../config/env.js';
import { heuristicOrganize } from './heuristicParser.js';
import { invokeLLM, providerLabels } from './llmProvider.js';
import { normalizePriority, normalizeStatus, sanitizeNotes } from '../utils/json.js';
import { buildSchedule, buildStats } from './scheduler.js';

const SUPPORTED_PROVIDERS = new Set(['openai', 'gemini', 'mock']);

const FALLBACK_CATEGORY = 'Work';

function parseGroupFlag(value) {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
  }
  if (typeof value === 'number') {
    return value === 1;
  }
  return true;
}

function sanitizeTitle(value) {
  if (!value) {
    return 'Untitled task';
  }
  if (typeof value !== 'string') {
    return String(value);
  }
  const trimmed = value.trim();
  return trimmed.length ? trimmed : 'Untitled task';
}

function sanitizeCategory(value) {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed) {
      return trimmed;
    }
  }
  return FALLBACK_CATEGORY;
}

function sanitizeTasks(tasks) {
  if (!Array.isArray(tasks) || tasks.length === 0) {
    return [];
  }

  return tasks.slice(0, 100).map((task) => ({
    title: sanitizeTitle(task?.title),
    priority: normalizePriority(task?.priority),
    category: sanitizeCategory(task?.category),
    notes: sanitizeNotes(task?.notes),
    status: normalizeStatus(task?.status)
  }));
}

function ensureProvider(provider) {
  const normalized = (provider || '').toLowerCase();
  if (!SUPPORTED_PROVIDERS.has(normalized)) {
    return 'mock';
  }
  return normalized;
}

function requireKey(provider) {
  if (provider === 'openai' && !config.openai.apiKey) {
    const error = new Error('OpenAI API key is not configured. Set OPENAI_API_KEY or switch MODEL_PROVIDER to mock.');
    error.status = 400;
    throw error;
  }
  if (provider === 'gemini' && !config.gemini.apiKey) {
    const error = new Error('Gemini API key is not configured. Set GEMINI_API_KEY or switch MODEL_PROVIDER to mock.');
    error.status = 400;
    throw error;
  }
}

function validateNotes(notes) {
  if (notes === undefined || notes === null) {
    const error = new Error('The "notes" field is required.');
    error.status = 422;
    throw error;
  }
  const text = String(notes).trim();
  if (!text) {
    const error = new Error('Provide at least one task note.');
    error.status = 422;
    throw error;
  }
  if (text.length > 8000) {
    const error = new Error('Notes payload is too long. Limit to 8,000 characters.');
    error.status = 413;
    throw error;
  }
  return text;
}

function buildResponse({ tasks, grouped, provider, providerLabel, model, warning }) {
  const sanitizedTasks = sanitizeTasks(tasks);
  const stats = buildStats(sanitizedTasks);
  const schedule = buildSchedule(sanitizedTasks);

  return {
    tasks: sanitizedTasks,
    grouped,
    provider,
    providerLabel: providerLabel || providerLabels[provider] || provider,
    model,
    warning,
    stats,
    schedule,
    timestamp: new Date().toISOString()
  };
}

export async function organizeTasks({ notes, groupByCategory }) {
  const sanitizedNotes = validateNotes(notes);
  const grouped = parseGroupFlag(groupByCategory);
  const provider = ensureProvider(config.modelProvider);

  if (provider === 'mock') {
    return buildResponse(heuristicOrganize(sanitizedNotes, { groupByCategory: grouped }));
  }

  requireKey(provider);

  const request = { notes: sanitizedNotes, groupByCategory: grouped };
  let model;

  try {
    const llmResult = await invokeLLM(provider, config, request);
    model = llmResult.model;
    if (!Array.isArray(llmResult.tasks) || llmResult.tasks.length === 0) {
      throw new Error('Model returned no tasks.');
    }
    return buildResponse({
      tasks: llmResult.tasks,
      grouped,
      provider,
      model
    });
  } catch (error) {
    console.warn(`LLM provider ${provider} failed, using heuristic fallback: ${error.message}`);
    const fallback = heuristicOrganize(sanitizedNotes, { groupByCategory: grouped });
    return buildResponse({
      ...fallback,
      provider: 'heuristic',
      providerLabel: `${providerLabels[provider] || provider} (fallback heuristics)`,
      model,
      warning: error.message
    });
  }
}
