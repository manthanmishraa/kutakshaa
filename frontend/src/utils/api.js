const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');

function buildHeaders(customHeaders = {}) {
  const token = localStorage.getItem('kutaksha_token');
  const headers = {
    'Content-Type': 'application/json',
    ...customHeaders,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: buildHeaders(options.headers),
    });
  } catch (error) {
    if (error instanceof TypeError) {
      const networkError = new Error(
        `Unable to reach the Kutaksha backend at ${API_BASE}. Start the backend or set VITE_API_BASE_URL to its public URL.`,
      );
      networkError.cause = error;
      throw networkError;
    }
    throw error;
  }

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('kutaksha_token');
      window.dispatchEvent(new Event('kutaksha-auth-expired'));
    }
    const errorBody = await response.text().catch(() => '');
    const error = new Error(`API request failed (${response.status}): ${response.statusText}`);
    error.status = response.status;
    error.body = errorBody;
    throw error;
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

/** Turn a thrown request() error into something worth showing a user. */
export function describeApiError(error) {
  if (!error) return 'Something went wrong.';

  if (error.name === 'AbortError') {
    return 'The assistant took too long to respond. Please try again.';
  }

  if (error.status === 401) {
    return 'Your session has expired. Please sign in again.';
  }

  if (error.status === 429) {
    return 'The Gemini assistant quota is temporarily exhausted. Please wait and try again, or check the Gemini API quota and billing plan.';
  }

  try {
    const parsed = JSON.parse(error.body);
    if (parsed?.detail) {
      return typeof parsed.detail === 'string' ? parsed.detail : JSON.stringify(parsed.detail);
    }
  } catch {
    // Body was not JSON — fall through to the raw message.
  }

  return error.message || 'Something went wrong.';
}

/**
 * Ask the RAG assistant. The LangGraph pipeline can take a while, so this
 * aborts rather than hanging the UI forever.
 */
export async function askRag(query, chatHistory = [], { timeoutMs = 180000, behaviorContext = null } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await request('/chat/query', {
      method: 'POST',
      body: JSON.stringify({
        query,
        chat_history: chatHistory,
        behavior_context: behaviorContext,
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function loginToBackend(payload) {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function registerToBackend(payload) {
  return request('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getProfile() {
  return request('/auth/profile');
}

export async function logoutBackend() {
  return request('/auth/logout', {
    method: 'POST',
  });
}

export { API_BASE };
export default {
  loginToBackend,
  registerToBackend,
  getProfile,
  logoutBackend,
  askRag,
  describeApiError,
  API_BASE,
};
