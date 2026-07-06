/**
 * Tests for the projectsApi utility functions.
 */
import '@testing-library/jest-dom';
import {
  createProject,
  listProjects,
  getProject,
  updateProject,
  deleteProject,
} from '../../utils/projectsApi';
import { getCsrfToken, setCsrfToken } from '../../utils/api';
import { ApiError } from '../../utils/api';

// -------------------------------------------------------------------------
// Mocks
// -------------------------------------------------------------------------

jest.mock('../../utils/api', () => ({
  getCsrfToken: jest.fn(),
  setCsrfToken: jest.fn(),
  ApiError: jest.requireActual('../../utils/api').ApiError,
}));

// -------------------------------------------------------------------------
// Tests
// -------------------------------------------------------------------------

describe('projectsApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
    getCsrfToken.mockReturnValue('test-csrf-token');
  });

  afterEach(() => {
    global.fetch.mockRestore?.();
  });

  describe('createProject', () => {
    test('sends correct POST body and returns unwrapped project', async () => {
      const mockProject = {
        id: 1,
        name: 'Test Project',
        stroke_count: 2,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
        strokes: {
          version: 1,
          strokes: [
            { type: 'draw', points: [{ x: 10, y: 20 }] },
            { type: 'erase', points: [{ x: 30, y: 40 }] },
          ],
        },
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ project: mockProject }),
      });

      const strokes = [
        { type: 'draw', points: [{ x: 10, y: 20 }] },
        { type: 'erase', points: [{ x: 30, y: 40 }] },
      ];
      const result = await createProject('Test Project', strokes, 800, 600);

      expect(global.fetch).toHaveBeenCalledTimes(1);
      const [url, options] = global.fetch.mock.calls[0];
      expect(url).toContain('/api/projects/');
      expect(options.method).toBe('POST');
      expect(options.headers['X-CSRF-Token']).toBe('test-csrf-token');

      const body = JSON.parse(options.body);
      expect(body.name).toBe('Test Project');
      expect(body.strokes).toEqual(strokes);
      expect(body.canvas_width).toBe(800);
      expect(body.canvas_height).toBe(600);

      // Project should be unwrapped (strokes is the inner array)
      expect(result.strokes).toEqual(strokes);
      expect(result.id).toBe(1);
      expect(result.name).toBe('Test Project');
    });

    test('throws ApiError when server responds with error status', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: 'Project name is required' }),
      });

      let caughtError;
      try {
        await createProject('', [], 800, 600);
      } catch (err) {
        caughtError = err;
      }

      expect(caughtError).toBeInstanceOf(ApiError);
      expect(caughtError.status).toBe(400);
      expect(caughtError.message).toBe('Project name is required');
    });
  });

  describe('listProjects', () => {
    test('sends GET with pagination params and returns list result', async () => {
      const mockData = {
        projects: [
          { id: 1, name: 'Project A', stroke_count: 3 },
          { id: 2, name: 'Project B', stroke_count: 0 },
        ],
        page: 1,
        per_page: 10,
        total: 2,
        pages: 1,
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockData),
      });

      const result = await listProjects(1, 10);

      expect(global.fetch).toHaveBeenCalledTimes(1);
      const [url, options] = global.fetch.mock.calls[0];
      expect(url).toContain('/api/projects/?page=1&per_page=10');
      expect(options.method).toBe('GET');

      expect(result.projects).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.perPage).toBe(10);
      expect(result.pages).toBe(1);
    });

    test('throws ApiError when server responds with 401', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: 'Authentication required' }),
      });

      let caughtError;
      try {
        await listProjects(1, 10);
      } catch (err) {
        caughtError = err;
      }

      expect(caughtError).toBeInstanceOf(ApiError);
      expect(caughtError.status).toBe(401);
      expect(caughtError.message).toBe('Authentication required');
    });
  });

  describe('getProject', () => {
    test('sends GET and returns unwrapped project with strokes', async () => {
      const rawStrokes = [{ type: 'draw', points: [{ x: 5, y: 5 }] }];
      const mockProject = {
        id: 42,
        name: 'My Project',
        strokes: { version: 1, strokes: rawStrokes },
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ project: mockProject }),
      });

      const result = await getProject(42);

      expect(global.fetch).toHaveBeenCalledTimes(1);
      const [url] = global.fetch.mock.calls[0];
      expect(url).toContain('/api/projects/42');

      expect(result.strokes).toEqual(rawStrokes);
      expect(result.name).toBe('My Project');
    });

    test('throws ApiError when project is not found (404)', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'Project not found' }),
      });

      let caughtError;
      try {
        await getProject(999);
      } catch (err) {
        caughtError = err;
      }

      expect(caughtError).toBeInstanceOf(ApiError);
      expect(caughtError.status).toBe(404);
      expect(caughtError.message).toBe('Project not found');
    });
  });

  describe('updateProject', () => {
    test('sends PUT with name and strokes and returns updated project', async () => {
      const mockProject = {
        id: 5,
        name: 'Updated Name',
        strokes: { version: 1, strokes: [] },
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ project: mockProject }),
      });

      const result = await updateProject(5, {
        name: 'Updated Name',
        strokes: [],
      });

      expect(global.fetch).toHaveBeenCalledTimes(1);
      const [url, options] = global.fetch.mock.calls[0];
      expect(url).toContain('/api/projects/5');
      expect(options.method).toBe('PUT');
      expect(options.headers['X-CSRF-Token']).toBe('test-csrf-token');

      const body = JSON.parse(options.body);
      expect(body.name).toBe('Updated Name');
      expect(body.strokes).toEqual([]);

      expect(result.name).toBe('Updated Name');
    });

    test('throws ApiError when server responds with 400', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: 'Invalid update data' }),
      });

      let caughtError;
      try {
        await updateProject(5, { name: '' });
      } catch (err) {
        caughtError = err;
      }

      expect(caughtError).toBeInstanceOf(ApiError);
      expect(caughtError.status).toBe(400);
      expect(caughtError.message).toBe('Invalid update data');
    });
  });

  describe('deleteProject', () => {
    test('sends DELETE and returns success response', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ message: 'Project deleted successfully' }),
      });

      const result = await deleteProject(7);

      expect(global.fetch).toHaveBeenCalledTimes(1);
      const [url, options] = global.fetch.mock.calls[0];
      expect(url).toContain('/api/projects/7');
      expect(options.method).toBe('DELETE');
      expect(options.headers['X-CSRF-Token']).toBe('test-csrf-token');

      expect(result.message).toBe('Project deleted successfully');
    });

    test('throws ApiError when project to delete is not found (404)', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'Project not found' }),
      });

      let caughtError;
      try {
        await deleteProject(999);
      } catch (err) {
        caughtError = err;
      }

      expect(caughtError).toBeInstanceOf(ApiError);
      expect(caughtError.status).toBe(404);
      expect(caughtError.message).toBe('Project not found');
    });
  });
});
