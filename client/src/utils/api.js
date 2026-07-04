/**
 * Fetch wrapper for Scribble auth API calls.
 *
 * - Prepends ``/api/auth`` to all paths.
 * - Includes ``X-CSRF-Token`` header on state-changing requests.
 * - Sends credentials so session cookies are included.
 * - Throws ``ApiError`` on non-OK responses.
 */

const API_BASE = '/api/auth';
const DEFAULT_TIMEOUT_MS = 8000;

let _csrfToken = null;

/**
 * Create an AbortController that auto-aborts after timeoutMs.
 * Returns { signal, clear } so the caller can cancel the timer
 * if the request completes before the timeout.
 */
function createTimeoutSignal(timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  return { signal: controller.signal, clear: () => clearTimeout(timeoutId) };
}

/**
 * Retrieve the module-level CSRF token (in-memory only).
 */
export function getCsrfToken() {
  return _csrfToken;
}

/**
 * Store a fresh CSRF token.
 */
export function setCsrfToken(token) {
  _csrfToken = token;
}

/**
 * Error class for API responses.
 */
export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/**
 * Make an authenticated (or guest) request to the auth API.
 *
 * @param {string} path - Endpoint path (e.g. ``"/login"``).
 * @param {object} [options] - Standard fetch options.
 * @returns {Promise<any>} Parsed JSON response body.
 */
export async function apiRequest(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const method = (options.method || 'GET').toUpperCase();

  // Include CSRF token for state-changing methods
  const csrfToken = getCsrfToken();
  if (csrfToken && ['POST', 'PUT', 'DELETE'].includes(method)) {
    headers['X-CSRF-Token'] = csrfToken;
  }

  const { signal, clear: clearTimeout_ } = createTimeoutSignal();

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      method,
      headers,
      credentials: 'include',
      signal,
    });

    clearTimeout_(); // Cancel the timeout since we got a response

    if (!response.ok) {
      let errorMessage = 'Unknown error';
      try {
        const body = await response.json();
        errorMessage = body.error || body.message || errorMessage;
      } catch {
        // Body is not JSON – use status text
        errorMessage = response.statusText || 'Request failed';
      }
      throw new ApiError(response.status, errorMessage);
    }

    return response.json();
  } finally {
    clearTimeout_(); // Clean up timeout in case of errors too
  }
}
