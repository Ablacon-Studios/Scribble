/**
 * Tests for the ProjectListSidebar component.
 */
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProjectListSidebar from '../../components/projects/ProjectListSidebar';

// -------------------------------------------------------------------------
// Mocks
// -------------------------------------------------------------------------

jest.mock('../../utils/projectsApi', () => ({
  listProjects: jest.fn(),
  getProject: jest.fn(),
  deleteProject: jest.fn(),
  updateProject: jest.fn(),
}));

import {
  listProjects,
  getProject,
  deleteProject,
  updateProject,
} from '../../utils/projectsApi';

// -------------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------------

const mockProjects = [
  {
    id: 1,
    name: 'Drawing One',
    stroke_count: 5,
    updated_at: '2025-06-15T10:00:00Z',
    created_at: '2025-06-15T10:00:00Z',
  },
  {
    id: 2,
    name: 'Drawing Two',
    stroke_count: 3,
    updated_at: '2025-06-14T08:30:00Z',
    created_at: '2025-06-14T08:30:00Z',
  },
];

// -------------------------------------------------------------------------
// Tests
// -------------------------------------------------------------------------

describe('ProjectListSidebar', () => {
  const mockOnClose = jest.fn();
  const mockOnLoad = jest.fn();
  const mockOnDelete = jest.fn();

  function renderSidebar(props = {}) {
    return render(
      <ProjectListSidebar
        isOpen={true}
        onClose={mockOnClose}
        onLoad={mockOnLoad}
        onDelete={mockOnDelete}
        activeProjectId={null}
        {...props}
      />
    );
  }

  beforeEach(() => {
    jest.clearAllMocks();
    listProjects.mockResolvedValue({
      projects: mockProjects,
      page: 1,
      perPage: 20,
      total: 2,
      pages: 1,
    });
    getProject.mockResolvedValue({ ...mockProjects[0], strokes: [] });
    deleteProject.mockResolvedValue({ message: 'Project deleted successfully' });
    updateProject.mockResolvedValue({ id: 1, name: 'Renamed' });
  });

  test('renders sidebar when isOpen is true', async () => {
    renderSidebar();

    await waitFor(() => {
      expect(screen.getByTestId('project-list-sidebar')).toBeInTheDocument();
    });

    expect(screen.getByText('Projects')).toBeInTheDocument();
  });

  test('fetches projects on mount', async () => {
    renderSidebar();

    await waitFor(() => {
      expect(listProjects).toHaveBeenCalledWith(1, 20);
    });

    await waitFor(() => {
      expect(screen.getByText('Drawing One')).toBeInTheDocument();
      expect(screen.getByText('Drawing Two')).toBeInTheDocument();
    });
  });

  test('shows loading skeleton while fetching', () => {
    // Delay the resolved promise so we can observe loading state
    listProjects.mockReturnValue(new Promise(() => {})); // never resolves during test

    renderSidebar();

    // Confirm the sidebar is rendering and project names aren't visible yet
    expect(screen.getByText('Projects')).toBeInTheDocument();
    expect(screen.queryByText('Drawing One')).not.toBeInTheDocument();
  });

  test('shows empty state when no projects exist', async () => {
    listProjects.mockResolvedValue({
      projects: [],
      page: 1,
      perPage: 20,
      total: 0,
      pages: 0,
    });

    renderSidebar();

    await waitFor(() => {
      expect(screen.getByText(/No saved projects yet/)).toBeInTheDocument();
    });
  });

  test('renders project cards with name, date, and stroke count', async () => {
    renderSidebar();

    await waitFor(() => {
      expect(screen.getByText('Drawing One')).toBeInTheDocument();
    });

    // Date should be formatted
    expect(screen.getByText(/Jun 15, 2025/)).toBeInTheDocument();
  });

  test('clicking Load calls onLoadProject with correct project data', async () => {
    renderSidebar();

    // Wait for the projects to load
    await waitFor(() => {
      expect(screen.getByText('Drawing One')).toBeInTheDocument();
    });

    // Click the first Load button
    const loadButtons = screen.getAllByText('Load');
    await userEvent.setup().click(loadButtons[0]);

    await waitFor(() => {
      expect(getProject).toHaveBeenCalledWith(1);
    });

    await waitFor(() => {
      expect(mockOnLoad).toHaveBeenCalled();
    });
  });

  test('clicking Delete shows confirmation dialog', async () => {
    renderSidebar();

    await waitFor(() => {
      expect(screen.getByText('Drawing One')).toBeInTheDocument();
    });

    // Find and click the first Delete button (using aria-label)
    const deleteBtn = screen.getByLabelText('Delete Drawing One');
    await userEvent.setup().click(deleteBtn);

    // Confirmation should appear
    expect(screen.getByText('Delete this project?')).toBeInTheDocument();
  });

  test('close button calls onClose', async () => {
    renderSidebar();

    const closeBtn = screen.getByLabelText('Close project list');
    await userEvent.setup().click(closeBtn);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  // ── Inline rename workflow ──────────────────────────────────────────

  test('clicking edit icon turns project name into an input', async () => {
    renderSidebar();

    await waitFor(() => {
      expect(screen.getByText('Drawing One')).toBeInTheDocument();
    });

    // Click the rename (edit) button
    const renameBtn = screen.getByLabelText('Rename Drawing One');
    await userEvent.setup().click(renameBtn);

    // The name text should be replaced by an input
    await waitFor(() => {
      expect(screen.getByTestId('rename-input-1')).toBeInTheDocument();
    });
    // The original heading should not be visible anymore
    expect(screen.queryByText('Drawing One')).not.toBeInTheDocument();
  });

  test('pressing Enter commits the inline rename', async () => {
    renderSidebar();

    await waitFor(() => {
      expect(screen.getByText('Drawing One')).toBeInTheDocument();
    });

    // Enter rename mode
    const renameBtn = screen.getByLabelText('Rename Drawing One');
    await userEvent.setup().click(renameBtn);

    // Wait for the input
    const input = await screen.findByTestId('rename-input-1');
    // Clear and type new name
    await userEvent.clear(input);
    await userEvent.type(input, 'New Name');

    // Press Enter
    await userEvent.keyboard('{Enter}');

    await waitFor(() => {
      expect(updateProject).toHaveBeenCalledWith(1, { name: 'New Name' });
    });
  });

  test('blurring the input commits the inline rename', async () => {
    renderSidebar();

    await waitFor(() => {
      expect(screen.getByText('Drawing One')).toBeInTheDocument();
    });

    // Enter rename mode
    const renameBtn = screen.getByLabelText('Rename Drawing One');
    await userEvent.setup().click(renameBtn);

    const input = await screen.findByTestId('rename-input-1');
    await userEvent.clear(input);
    await userEvent.type(input, 'Blurred Name');

    // Blur the input
    await userEvent.tab();

    await waitFor(() => {
      expect(updateProject).toHaveBeenCalledWith(1, { name: 'Blurred Name' });
    });
  });

  test('pressing Escape cancels the inline rename', async () => {
    renderSidebar();

    await waitFor(() => {
      expect(screen.getByText('Drawing One')).toBeInTheDocument();
    });

    // Enter rename mode
    const renameBtn = screen.getByLabelText('Rename Drawing One');
    await userEvent.setup().click(renameBtn);

    const input = await screen.findByTestId('rename-input-1');
    await userEvent.clear(input);
    await userEvent.type(input, 'Changed Name');

    // Press Escape
    await userEvent.keyboard('{Escape}');

    // updateProject should NOT have been called
    expect(updateProject).not.toHaveBeenCalled();

    // The input should be gone and original name restored as heading
    await waitFor(() => {
      expect(screen.queryByTestId('rename-input-1')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Drawing One')).toBeInTheDocument();
  });

  test('empty name is rejected with error message', async () => {
    renderSidebar();

    await waitFor(() => {
      expect(screen.getByText('Drawing One')).toBeInTheDocument();
    });

    // Enter rename mode
    const renameBtn = screen.getByLabelText('Rename Drawing One');
    await userEvent.setup().click(renameBtn);

    const input = await screen.findByTestId('rename-input-1');
    await userEvent.clear(input);

    // Press Enter with empty name
    await userEvent.keyboard('{Enter}');

    // Should show error, should NOT call updateProject
    await waitFor(() => {
      expect(screen.getByText('Name cannot be empty')).toBeInTheDocument();
    });
    expect(updateProject).not.toHaveBeenCalled();
  });

  // ── Error state ─────────────────────────────────────────────────────

  test('shows retry button when fetch fails', async () => {
    listProjects.mockRejectedValue(new Error('Network error'));

    renderSidebar();

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });

    // Retry button should be visible
    const retryBtn = screen.getByText('Retry');
    expect(retryBtn).toBeInTheDocument();

    // Clicking retry should call listProjects again
    // Reset mock to resolve this time
    listProjects.mockResolvedValue({
      projects: mockProjects,
      page: 1,
      perPage: 20,
      total: 2,
      pages: 1,
    });

    await userEvent.setup().click(retryBtn);

    await waitFor(() => {
      expect(listProjects).toHaveBeenCalledTimes(2);
    });
  });

  // ── Pagination — Load More ──────────────────────────────────────────

  test('shows Load More button when there are more pages and triggers next fetch', async () => {
    // Set up pagination with 2 pages
    listProjects.mockResolvedValueOnce({
      projects: mockProjects,
      page: 1,
      perPage: 2,
      total: 4,
      pages: 2,
    });

    renderSidebar();

    await waitFor(() => {
      expect(screen.getByText('Drawing One')).toBeInTheDocument();
    });

    // Load More button should appear
    const loadMoreBtn = screen.getByText('Load More');
    expect(loadMoreBtn).toBeInTheDocument();

    // Prepare mock for page 2
    const page2Projects = [
      { id: 3, name: 'Drawing Three', stroke_count: 1,
        updated_at: '2025-06-13T10:00:00Z', created_at: '2025-06-13T10:00:00Z' },
    ];
    listProjects.mockResolvedValueOnce({
      projects: page2Projects,
      page: 2,
      perPage: 2,
      total: 4,
      pages: 2,
    });

    // Click Load More
    await userEvent.setup().click(loadMoreBtn);

    await waitFor(() => {
      expect(listProjects).toHaveBeenCalledWith(2, 20);
    });

    // After loading, Drawing Three should appear
    await waitFor(() => {
      expect(screen.getByText('Drawing Three')).toBeInTheDocument();
    });
  });
});
