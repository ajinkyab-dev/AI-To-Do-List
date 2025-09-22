import config from '../config/env.js';
import { generateStatusWithLLM, generateTaskStatusesWithLLM, generateTitleWithLLM, providerLabels } from './llmProvider.js';

const SUPPORTED_PROVIDERS = new Set(['openai', 'gemini', 'mock']);
const MAX_TASKS_FOR_STATUS = 50;

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

function heuristicTitle({ title, details }) {
  const source = `${details || ''} ${title || ''}`.trim();
  if (!source) {
    return 'General follow-up';
  }
  const cleaned = source.replace(/\s+/g, ' ');
  const words = cleaned.split(' ');
  return words.slice(0, 8).join(' ');
}

function summarizeList(items) {
  return items.map((item) => `- ${item.title}${item.details ? ` - ${item.details}` : ''}`).join('\n');
}

function heuristicStatus({ completed, inProgress }) {
  const completedSummary = completed.length
    ? summarizeList(completed)
    : '- No completed tasks in this period.';
  const progressSummary = inProgress.length
    ? summarizeList(inProgress)
    : '- No active tasks in progress.';

  return {
    completed: completedSummary,
    inProgress: progressSummary,
    provider: providerLabels.heuristic
  };
}

function sanitizeTaskStatusDescription(value) {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim();
}

function sanitizeHours(value) {
  if (value === undefined || value === null) {
    return '';
  }
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    const fixed = Number.isInteger(value) ? value.toString() : value.toFixed(1);
    return `${fixed}h`;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return '';
    }
    const numeric = Number(trimmed.replace(/[^0-9.]/g, ''));
    if (!Number.isNaN(numeric) && numeric > 0) {
      if (/[a-z]/i.test(trimmed)) {
        return trimmed;
      }
      const fixed = Number.isInteger(numeric) ? numeric.toString() : numeric.toFixed(1);
      return `${fixed}h`;
    }
    return trimmed;
  }
  return '';
}

function sanitizeTaskStatusInput(tasks) {
  if (!Array.isArray(tasks)) {
    return [];
  }

  return tasks.slice(0, MAX_TASKS_FOR_STATUS).map((task) => {
    const title = typeof task?.title === 'string' && task.title.trim() ? task.title.trim() : 'Untitled task';
    const descriptionSource = task?.description ?? task?.details ?? '';
    const description = sanitizeTaskStatusDescription(descriptionSource);
    const hoursSpent = sanitizeHours(task?.hoursSpent ?? task?.timeLog ?? task?.hours);
    return {
      title,
      description,
      hoursSpent
    };
  });
}

function heuristicTaskStatuses(tasks) {
  if (!tasks.length) {
    return [];
  }
  return tasks.map((task, index) => {
    const base = `${task.title}${task.description ? ` — ${task.description}` : ''}`;
    const hours = task.hoursSpent ? ` (Time spent: ${task.hoursSpent})` : '';
    return `${index + 1}. ${base}${hours}`.trim();
  });
}

function applyNumbering(text, index) {
  const cleaned = String(text ?? '').trim();
  if (!cleaned) {
    return `${index + 1}. Status pending.`;
  }
  const normalized = cleaned.replace(/^\d+[.)-]?\s*/, '').trim();
  return `${index + 1}. ${normalized}`;
}

export async function generateTitleSuggestion({ title, details }) {
  const provider = ensureProvider(config.modelProvider);
  if (provider === 'mock') {
    return { title: heuristicTitle({ title, details }), provider: providerLabels.heuristic };
  }

  requireKey(provider);

  try {
    const generated = await generateTitleWithLLM(provider, config, { title, details });
    return { title: generated, provider: providerLabels[provider] || provider };
  } catch (error) {
    console.warn(`Title generation via ${provider} failed:`, error.message);
    return { title: heuristicTitle({ title, details }), provider: providerLabels.heuristic, warning: error.message };
  }
}

export async function generateStatusReport({ completed, inProgress }) {
  const provider = ensureProvider(config.modelProvider);
  const sanitized = {
    completed: completed?.map((task) => ({
      title: task.title || 'Untitled task',
      details: task.details || '',
      comments: task.developerNotes || ''
    })) || [],
    inProgress: inProgress?.map((task) => ({
      title: task.title || 'Untitled task',
      details: task.details || '',
      comments: task.developerNotes || ''
    })) || []
  };

  if (provider === 'mock') {
    return heuristicStatus(sanitized);
  }

  requireKey(provider);

  try {
    const payload = await generateStatusWithLLM(provider, config, {
      completed: sanitized.completed
        .map((item) => `${item.title}${item.details ? ` - ${item.details}` : ''}${item.comments ? ` (${item.comments})` : ''}`)
        .join('\n'),
      inProgress: sanitized.inProgress
        .map((item) => `${item.title}${item.details ? ` - ${item.details}` : ''}${item.comments ? ` (${item.comments})` : ''}`)
        .join('\n')
    });

    const completedSummary = Array.isArray(payload.completed)
      ? payload.completed.join('\n')
      : String(payload.completed || '');
    const inProgressSummary = Array.isArray(payload.inProgress)
      ? payload.inProgress.join('\n')
      : String(payload.inProgress || '');

    return {
      completed: completedSummary,
      inProgress: inProgressSummary,
      provider: providerLabels[provider] || provider
    };
  } catch (error) {
    console.warn(`Status generation via ${provider} failed:`, error.message);
    const fallback = heuristicStatus(sanitized);
    return { ...fallback, warning: error.message };
  }
}

export async function generateTaskStatusList({ tasks }) {
  const sanitizedTasks = sanitizeTaskStatusInput(tasks);
  if (!sanitizedTasks.length) {
    const error = new Error('Provide at least one task to generate a status update.');
    error.status = 422;
    throw error;
  }

  const provider = ensureProvider(config.modelProvider);

  if (provider === 'mock') {
    return {
      updates: heuristicTaskStatuses(sanitizedTasks),
      provider: providerLabels.heuristic
    };
  }

  requireKey(provider);

  try {
    const payload = await generateTaskStatusesWithLLM(provider, config, { tasks: sanitizedTasks });
    const updates = Array.isArray(payload?.updates)
      ? payload.updates.map((entry, index) => applyNumbering(entry, index))
      : [];

    if (!updates.length) {
      throw new Error('Provider did not return any status updates.');
    }

    return {
      updates,
      provider: providerLabels[provider] || provider,
      model: payload?.model
    };
  } catch (error) {
    console.warn(`Task status generation via ${provider} failed:`, error.message);
    return {
      updates: heuristicTaskStatuses(sanitizedTasks),
      provider: providerLabels.heuristic,
      warning: error.message
    };
  }
}
