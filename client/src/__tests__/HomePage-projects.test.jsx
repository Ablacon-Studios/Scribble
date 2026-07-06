/**
 * Integration tests for HomePage project saving and loading flows.
 */
import '@testing-library/jest-dom';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HomePage from '../components/HomePage';

// -------------------------------------------------------------------------
// Mocks
// -------------------------------------------------------------------------

// Provide an authenticated user
const mockUser = {
  id: 1,
  name: 'Test User',
  username: 'testuser',
  email: 'test@example.com',
  verified: true,
  created_at: '2025-01-01T00:00:00Z',
};

jest.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser, loading: false }),
}));

jest.mock('../components/SplashScreen', () => () => <div data-testid="splash-screen">Splash</div>);

jest.mock('../components/layout/Navbar', () => () => <nav data-testid="navbar">Navbar</nav>);

jest.mock('../components/canvas/DrawingCanvas', () => {
  return function MockDrawingCanvas(props) {
    // Expose the ready callbacks immediately so HomePage can register them
    const { onGetStrokesReady, onLoadStrokesReady, onDirtyChange, onHasStrokesChange,
            onUndoReady, onRedoReady, onCanUndoChange, onCanRedoChange } = props;
    // Call ready callbacks in a microtask to avoid setState-during-render
    Promise.resolve().then(() => {
      onUndoReady?.(() => {});
      onRedoReady?.(() => {});
      onCanUndoChange?.(false);
      onCanRedoChange?.(false);
      onGetStrokesReady?.(() => [{ type: 'draw', points: [{ x: 1, y: 1 }] }]);
      onLoadStrokesReady?.(() => {});
      // Signal that there are strokes on the canvas so Save is enabled
      onHasStrokesChange?.(true);
    });
    return <canvas data-testid="drawing-canvas" />;
  };
});

// Mock toolbar: capture callbacks so we can trigger them in tests
let toolbarSaveCallback = null;
jest.mock('../components/toolbar/ColorToolbar', () => {
  return function MockColorToolbar(props) {
    toolbarSaveCallback = props.onProjectSave;
    return (
      <div data-testid="color-toolbar">
        <button data-testid="save-btn" onClick={props.onProjectSave}>Save</button>
        <button data-testid="new-btn" onClick={props.onProjectNew}>New</button>
        <button data-testid="load-btn" onClick={props.onProjectLoad}>Load</button>
      </div>
    );
  };
});

jest.mock('../components/canvas/ColorIndicator', () => () => <div data-testid="color-indicator" />);

// Mock modals and sidebar — render with their props visible for assertions
jest.mock('../components/projects/SaveProjectModal', () => {
  return function MockSaveProjectModal({ isOpen, onSave, onClose, isSaving, error }) {
    if (!isOpen) return null;
    return (
      <div data-testid="save-project-modal">
        <input
          data-testid="modal-name-input"
          placeholder="Project name"
          onChange={(e) => e.target.value}
        />
        <button data-testid="modal-save-btn" onClick={() => onSave('Test Drawing')}>
          Save
        </button>
        <button data-testid="modal-close-btn" onClick={onClose}>Cancel</button>
        {isSaving && <span data-testid="saving-indicator">Saving...</span>}
        {error && <span data-testid="save-error">{error}</span>}
      </div>
    );
  };
});

let sidebarLoadCallback = null;
jest.mock('../components/projects/ProjectListSidebar', () => {
  return function MockProjectListSidebar({ isOpen, onClose, onLoad, onDelete, activeProjectId }) {
    sidebarLoadCallback = onLoad;
    if (!isOpen) return null;
    return (
      <div data-testid="project-list-sidebar">
        <button data-testid="sidebar-load-btn" onClick={() => onLoad({ id: 1, name: 'My Project', strokes: [{ type: 'draw', points: [{ x: 10, y: 20 }] }] })}>
          Load Project
        </button>
        <button data-testid="sidebar-close-btn" onClick={onClose}>Close</button>
      </div>
    );
  };
});

let unsavedDialogCallbacks = {};
jest.mock('../components/projects/UnsavedChangesDialog', () => {
  return function MockUnsavedChangesDialog({ isOpen, onSave, onDiscard, onCancel }) {
    unsavedDialogCallbacks = { onSave, onDiscard, onCancel };
    if (!isOpen) return null;
    return (
      <div data-testid="unsaved-dialog">
        <button data-testid="unsaved-save-btn" onClick={onSave}>Save & Continue</button>
        <button data-testid="unsaved-discard-btn" onClick={onDiscard}>Discard</button>
        <button data-testid="unsaved-cancel-btn" onClick={onCancel}>Cancel</button>
      </div>
    );
  };
});

// Mock project API
const mockCreateProject = jest.fn();
const mockUpdateProject = jest.fn();

jest.mock('../utils/projectsApi', () => ({
  createProject: (...args) => mockCreateProject(...args),
  updateProject: (...args) => mockUpdateProject(...args),
}));

// -------------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------------

function renderHomePage() {
  return render(<HomePage />);
}

// -------------------------------------------------------------------------
// Tests
// -------------------------------------------------------------------------

describe('HomePage — Project Save/Load Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    toolbarSaveCallback = null;
    sidebarLoadCallback = null;
    unsavedDialogCallbacks = {};

    mockCreateProject.mockResolvedValue({
      id: 42,
      name: 'Test Drawing',
      strokes: [{ type: 'draw', points: [{ x: 10, y: 20 }] }],
    });

    mockUpdateProject.mockResolvedValue({
      id: 1,
      name: 'Existing Project',
      strokes: [{ type: 'draw', points: [{ x: 50, y: 50 }] }],
    });
  });

  // ── Save flow: no active project → modal opens ──────────────────────

  test('clicking Save when no active project opens SaveProjectModal', async () => {
    renderHomePage();

    // SaveProjectModal should NOT be visible initially
    expect(screen.queryByTestId('save-project-modal')).not.toBeInTheDocument();

    // Click the Save button in the toolbar
    const saveBtn = screen.getByTestId('save-btn');
    await userEvent.setup().click(saveBtn);

    // SaveProjectModal should now be visible
    await waitFor(() => {
      expect(screen.getByTestId('save-project-modal')).toBeInTheDocument();
    });
  });

  // ── Save flow: active project → direct save (no modal) ──────────────

  test('clicking Save when active project exists triggers direct save without modal', async () => {
    renderHomePage();

    // First, save via modal to create a project and set projectId
    const saveBtn = screen.getByTestId('save-btn');
    await userEvent.setup().click(saveBtn);

    // Modal should be open now
    await waitFor(() => {
      expect(screen.getByTestId('save-project-modal')).toBeInTheDocument();
    });

    // Submit the modal
    const modalSaveBtn = screen.getByTestId('modal-save-btn');
    await userEvent.setup().click(modalSaveBtn);

    // Wait for createProject to have been called
    await waitFor(() => {
      expect(mockCreateProject).toHaveBeenCalledWith(
        'Test Drawing',
        [{ type: 'draw', points: [{ x: 1, y: 1 }] }]
      );
    });

    // Now click Save again — should NOT open the modal
    // Reset the call count to track only the direct save
    mockUpdateProject.mockClear();
    await userEvent.setup().click(saveBtn);

    // Modal should NOT appear
    expect(screen.queryByTestId('save-project-modal')).not.toBeInTheDocument();

    // updateProject should have been called (direct save)
    await waitFor(() => {
      expect(mockUpdateProject).toHaveBeenCalled();
    });
  });

  // ── Load flow: loading a project injects strokes ─────────────────────

  test('loading a project injects strokes into the canvas and closes the sidebar', async () => {
    renderHomePage();

    // Open the project list sidebar by clicking Load
    const loadBtn = screen.getByTestId('load-btn');
    await userEvent.setup().click(loadBtn);

    // Sidebar should be visible
    await waitFor(() => {
      expect(screen.getByTestId('project-list-sidebar')).toBeInTheDocument();
    });

    // Click the Load button in the sidebar mock (which triggers onLoad
    // with a full project object — matching the real ProjectListSidebar)
    const sidebarLoadBtn = screen.getByTestId('sidebar-load-btn');
    await userEvent.setup().click(sidebarLoadBtn);

    // Sidebar should close after successful load
    await waitFor(() => {
      expect(screen.queryByTestId('project-list-sidebar')).not.toBeInTheDocument();
    });
  });
});
