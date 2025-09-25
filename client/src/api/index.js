const API_BASE = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || '';

let authToken = null;

export function setAuthToken(token) {
  authToken = typeof token === 'string' && token.trim().length ? token.trim() : null;
}

export function clearAuthToken() {
  authToken = null;
}

export function getAuthToken() {
  return authToken;
}

async function requestJson(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const response = await fetch(url, {
    ...options,
    headers
  });

  if (!response.ok) {
    const text = await response.text();
    let message = 'Request failed';
    if (text) {
      try {
        const parsed = JSON.parse(text);
        message = parsed.error || parsed.message || text;
      } catch (error) {
        message = text;
      }
    }
    const err = new Error(message);
    err.status = response.status;
    throw err;
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export async function loginWithGoogle(credential) {
  const result = await requestJson('/api/auth/google', {
    method: 'POST',
    body: JSON.stringify({ credential })
  });

  if (result?.token) {
    setAuthToken(result.token);
  }

  return result;
}

export async function organizeTasks(payload) {
  return requestJson('/api/tasks', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function fetchTasks() {
  return requestJson('/api/tasks', { method: 'GET' });
}

export async function createTask(payload) {
  return requestJson('/api/tasks/manual', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function updateTask(id, payload) {
  return requestJson(`/api/tasks/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
}

export async function deleteTask(id) {
  return requestJson(`/api/tasks/${id}`, {
    method: 'DELETE'
  });
}

export async function clearTasks() {
  return requestJson('/api/tasks', { method: 'DELETE' });
}

export async function summarizeTitle(payload) {
  return requestJson('/api/assist/summarize-title', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function generateTaskStatusUpdates(payload) {
  return requestJson('/api/assist/task-status', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}


