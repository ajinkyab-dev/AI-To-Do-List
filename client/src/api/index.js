const API_BASE = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || '';

async function postJson(path, payload) {
  const url = `${API_BASE}${path}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Request failed');
  }

  return response.json();
}

export async function organizeTasks(payload) {
  return postJson('/api/tasks', payload);
}

export async function summarizeTitle(payload) {
  return postJson('/api/assist/summarize-title', payload);
}

export async function generateTaskStatusUpdates(payload) {
  return postJson('/api/assist/task-status', payload);
}
