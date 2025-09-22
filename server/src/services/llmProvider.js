import { extractJsonObject } from '../utils/json.js';

export const providerLabels = {
  openai: 'OpenAI',
  gemini: 'Google Gemini',
  mock: 'Heuristic',
  heuristic: 'Heuristic'
};

const SYSTEM_PROMPT = `You are an expert operations assistant that restructures raw task notes into actionable to-do items. Always answer with strict JSON using the following schema:
{
  "tasks": [
    {
      "title": string,
      "priority": "High" | "Medium" | "Low",
      "category": string,
      "notes": string[],
      "status": "To Do" | "In Progress" | "Completed"
    }
  ]
}
Rules:
- Title should be concise and actionable.
- Always include a priority, one of High, Medium, Low.
- Provide a category label (e.g. Work, Admin, Meetings, Follow-up); invent one if needed.
- Notes should contain short bullet phrases about extra context (or be an empty array).
- Status defaults to "To Do" unless explicitly stated.
- Respond with JSON only, no additional text.`;

const TITLE_PROMPT = `You generate short task names. Return JSON: { "title": string }.`;

const STATUS_PROMPT = `You create concise status updates for managers. Respond with JSON:
{
  "completed": [string],
  "inProgress": [string]
}`;

const TASK_STATUS_PROMPT = `You craft professional status updates for each task. Respond with JSON:
{
  "updates": [string]
}
Rules:
- Each entry must begin with its number followed by a period (e.g. "1. Completed the deployment update.").
- Reference the task title and description.
- Mention hours spent when provided.
- Keep each update concise and professional.`;

function buildUserPrompt(notes, groupByCategory) {
  return `Raw task notes:\n${notes}\n\nGroup tasks by category preference: ${groupByCategory ? 'Group similar tasks together' : 'Return a flat list but keep category metadata.'}`;
}

function buildTaskStatusPrompt(tasks) {
  const lines = tasks.map((task, index) => {
    const description = task.description || 'No description provided.';
    const hours = task.hoursSpent || 'Not provided';
    return `Task ${index + 1}:\nTitle: ${task.title}\nDescription: ${description || 'No description provided.'}\nHours spent: ${hours || 'Not provided'}`;
  });
  return `Provide numbered status updates for the following tasks:\n\n${lines.join('\n\n')}`;
}

async function postOpenAI({ apiKey }, body) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI error: ${errorText}`);
  }

  return response.json();
}

async function callOpenAI({ apiKey, model }, { notes, groupByCategory }) {
  if (!apiKey) {
    throw new Error('Missing OpenAI API key.');
  }

  const payload = await postOpenAI({ apiKey }, {
    model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: buildUserPrompt(notes, groupByCategory) }
    ],
    temperature: 0.2,
    response_format: { type: 'json_object' }
  });

  const message = payload.choices?.[0]?.message?.content;
  const data = extractJsonObject(message);

  if (!data?.tasks) {
    throw new Error('OpenAI returned an unexpected response.');
  }

  return { tasks: data.tasks, model };
}

async function callOpenAITitle({ apiKey, model }, { title, details }) {
  if (!apiKey) {
    throw new Error('Missing OpenAI API key.');
  }

  const prompt = `Existing title: ${title || '(none)'}\nTask details: ${details || '(not provided)'}\nReturn a short (<=8 words) action-oriented title.`;

  const payload = await postOpenAI({ apiKey }, {
    model,
    messages: [
      { role: 'system', content: TITLE_PROMPT },
      { role: 'user', content: prompt }
    ],
    temperature: 0.2,
    response_format: { type: 'json_object' }
  });

  const message = payload.choices?.[0]?.message?.content;
  const data = extractJsonObject(message);
  if (!data?.title) {
    throw new Error('OpenAI did not return a title.');
  }
  return data.title;
}

async function callOpenAIStatus({ apiKey, model }, { completed, inProgress }) {
  if (!apiKey) {
    throw new Error('Missing OpenAI API key.');
  }

  const content = `Completed tasks:\n${completed}\n\nIn progress tasks:\n${inProgress}`;

  const payload = await postOpenAI({ apiKey }, {
    model,
    messages: [
      { role: 'system', content: STATUS_PROMPT },
      { role: 'user', content }
    ],
    temperature: 0.3,
    response_format: { type: 'json_object' }
  });

  const message = payload.choices?.[0]?.message?.content;
  const data = extractJsonObject(message);
  if (!data) {
    throw new Error('OpenAI did not return a status report.');
  }
  return data;
}

async function callOpenAITaskStatuses({ apiKey, model }, { tasks }) {
  if (!apiKey) {
    throw new Error('Missing OpenAI API key.');
  }
  if (!Array.isArray(tasks) || tasks.length === 0) {
    throw new Error('No tasks provided for status generation.');
  }

  const content = buildTaskStatusPrompt(tasks);

  const payload = await postOpenAI({ apiKey }, {
    model,
    messages: [
      { role: 'system', content: TASK_STATUS_PROMPT },
      { role: 'user', content }
    ],
    temperature: 0.3,
    response_format: { type: 'json_object' }
  });

  const message = payload.choices?.[0]?.message?.content;
  const data = extractJsonObject(message);
  if (!Array.isArray(data?.updates)) {
    throw new Error('OpenAI did not return task updates.');
  }
  return { updates: data.updates, model };
}

async function callGemini({ apiKey, model }, { notes, groupByCategory }) {
  if (!apiKey) {
    throw new Error('Missing Gemini API key.');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: `${SYSTEM_PROMPT}\n\n${buildUserPrompt(notes, groupByCategory)}` }]
        }
      ],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json'
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini error: ${errorText}`);
  }

  const payload = await response.json();
  const rawText = payload.candidates?.[0]?.content?.parts?.[0]?.text;
  const data = extractJsonObject(rawText);

  if (!data?.tasks) {
    throw new Error('Gemini returned an unexpected response.');
  }

  return { tasks: data.tasks, model };
}

async function callGeminiTitle({ apiKey, model }, { title, details }) {
  if (!apiKey) {
    throw new Error('Missing Gemini API key.');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const prompt = `${TITLE_PROMPT}\nExisting title: ${title || '(none)'}\nTask details: ${details || '(not provided)'}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json'
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini error: ${errorText}`);
  }

  const payload = await response.json();
  const rawText = payload.candidates?.[0]?.content?.parts?.[0]?.text;
  const data = extractJsonObject(rawText);
  if (!data?.title) {
    throw new Error('Gemini did not return a title.');
  }
  return data.title;
}

async function callGeminiStatus({ apiKey, model }, { completed, inProgress }) {
  if (!apiKey) {
    throw new Error('Missing Gemini API key.');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const prompt = `${STATUS_PROMPT}\n\nCompleted tasks:\n${completed}\n\nIn progress tasks:\n${inProgress}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        temperature: 0.3,
        responseMimeType: 'application/json'
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini error: ${errorText}`);
  }

  const payload = await response.json();
  const rawText = payload.candidates?.[0]?.content?.parts?.[0]?.text;
  const data = extractJsonObject(rawText);
  if (!data) {
    throw new Error('Gemini did not return a status report.');
  }
  return data;
}

async function callGeminiTaskStatuses({ apiKey, model }, { tasks }) {
  if (!apiKey) {
    throw new Error('Missing Gemini API key.');
  }
  if (!Array.isArray(tasks) || tasks.length === 0) {
    throw new Error('No tasks provided for status generation.');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const prompt = `${TASK_STATUS_PROMPT}\n\n${buildTaskStatusPrompt(tasks)}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        temperature: 0.3,
        responseMimeType: 'application/json'
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini error: ${errorText}`);
  }

  const payload = await response.json();
  const rawText = payload.candidates?.[0]?.content?.parts?.[0]?.text;
  const data = extractJsonObject(rawText);
  if (!Array.isArray(data?.updates)) {
    throw new Error('Gemini did not return task updates.');
  }
  return { updates: data.updates, model };
}

export async function invokeLLM(provider, options, request) {
  switch (provider) {
    case 'openai':
      return callOpenAI(options.openai, request);
    case 'gemini':
      return callGemini(options.gemini, request);
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

export async function generateTitleWithLLM(provider, options, request) {
  switch (provider) {
    case 'openai':
      return callOpenAITitle(options.openai, request);
    case 'gemini':
      return callGeminiTitle(options.gemini, request);
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

export async function generateTaskStatusesWithLLM(provider, options, request) {
  switch (provider) {
    case 'openai':
      return callOpenAITaskStatuses(options.openai, request);
    case 'gemini':
      return callGeminiTaskStatuses(options.gemini, request);
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

export async function generateStatusWithLLM(provider, options, request) {
  switch (provider) {
    case 'openai':
      return callOpenAIStatus(options.openai, request);
    case 'gemini':
      return callGeminiStatus(options.gemini, request);
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}
