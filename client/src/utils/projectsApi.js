/**
 * Fetch wrapper for Scribble projects API calls.
 *
 * - Prepends ``/api/projects`` to all paths.
 * - Includes ``X-CSRF-Token`` header on state-changing requests.
 * - Sends credentials so session cookies are included.
 * - Throws ``ApiError`` on non-OK responses.
 */

import { getCsrfToken, ApiError } from './api';

const API_BASE = '/api/projects';
const DEFAULT_TIMEOUT_MS = 8000;

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
 * Make an authenticated request to the projects API.
 *
 * @param {string} path - Endpoint path (e.g. ``""`` for list).
 * @param {object} [options] - Standard fetch options.
 * @returns {Promise<any>} Parsed JSON response body.
 */
async function projectsRequest(path, options = {}) {
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

    clearTimeout_();

    if (!response.ok) {
      let errorMessage = 'Unknown error';
      try {
        const body = await response.json();
        errorMessage = body.error || body.message || errorMessage;
      } catch {
        errorMessage = response.statusText || 'Request failed';
      }
      throw new ApiError(response.status, errorMessage);
    }

    return response.json();
  } finally {
    clearTimeout_();
  }
}

/**
 * Extract the actual strokes array from the version envelope
 * returned by the server. The server wraps strokes as:
 * ``{"version": 1, "strokes": [...]}``
 */
function unwrapStrokes(project) {
  if (!project) return project;
  const strokes = project.strokes?.strokes;
  return {
    ...project,
    strokes: Array.isArray(strokes) ? strokes : project.strokes,
  };
}

/**
 * Create a new project.
 *
 * @param {string} name - Project name (1-100 chars).
 * @param {Array} strokes - Array of stroke objects.
 * @param {number} [canvasWidth] - Optional canvas width.
 * @param {number} [canvasHeight] - Optional canvas height.
 * @returns {Promise<object>} The created project object.
 */
export async function createProject(name, strokes, canvasWidth, canvasHeight) {
  const body = { name, strokes };
  if (canvasWidth != null) body.canvas_width = canvasWidth;
  if (canvasHeight != null) body.canvas_height = canvasHeight;

  const data = await projectsRequest('/', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return unwrapStrokes(data.project);
}

/**
 * List projects for the authenticated user with pagination.
 *
 * @param {number} [page=1] - Page number.
 * @param {number} [perPage=20] - Items per page (max 50).
 * @returns {Promise<object>} Object with ``{ projects, page, per_page, total, pages }``.
 */
export async function listProjects(page = 1, perPage = 20) {
  const query = new URLSearchParams({ page, per_page: perPage });
  const data = await projectsRequest(`/?${query.toString()}`);
  return {
    projects: data.projects || [],
    page: data.page,
    perPage: data.per_page,
    total: data.total,
    pages: data.pages,
  };
}

/**
 * Get a single project with its full strokes data.
 *
 * @param {number} id - Project ID.
 * @returns {Promise<object>} The project object with strokes array.
 */
export async function getProject(id) {
  const data = await projectsRequest(`/${id}`);
  return unwrapStrokes(data.project);
}

/**
 * Update an existing project (partial update).
 *
 * @param {number} id - Project ID.
 * @param {object} data - Fields to update: ``{ name?, strokes?, canvas_width?, canvas_height? }``.
 * @returns {Promise<object>} The updated project object.
 */
export async function updateProject(id, dataFields) {
  const data = await projectsRequest(`/${id}`, {
    method: 'PUT',
    body: JSON.stringify(dataFields),
  });
  return unwrapStrokes(data.project);
}

/**
 * Delete a project permanently.
 *
 * @param {number} id - Project ID.
 * @returns {Promise<object>} Response with success message.
 */
export async function deleteProject(id) {
  return projectsRequest(`/${id}`, {
    method: 'DELETE',
  });
}
