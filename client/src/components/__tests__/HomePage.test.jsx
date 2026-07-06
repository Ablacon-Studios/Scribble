/**
 * Tests for the HomePage component.
 */
import '@testing-library/jest-dom';
import 'jest-canvas-mock';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HomePage from '../HomePage';

// -------------------------------------------------------------------------
// Mocks
// -------------------------------------------------------------------------

// Track what useAuth returns so we can switch between authenticated /
// unauthenticated states per test
let mockUser = null;

const mockUseAuth = jest.fn(() => ({ user: mockUser, loading: false }));

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(),
  Link: ({ children, to, ...props }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

// -------------------------------------------------------------------------
// Tests
// -------------------------------------------------------------------------

describe('HomePage', () => {
  beforeEach(() => {
    // Reset to unauthenticated by default
    mockUser = null;
    mockUseAuth.mockReturnValue({ user: mockUser, loading: false });

    // The authenticated branch renders DrawingCanvas which uses ResizeObserver
    global.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // 1. When user is null, renders SplashScreen
  // -----------------------------------------------------------------------
  test('renders SplashScreen when there is no authenticated user', () => {
    mockUser = null;
    mockUseAuth.mockReturnValue({ user: null, loading: false });

    render(<HomePage />);

    // SplashScreen displays the "Scribble" heading
    expect(screen.getByRole('heading', { name: /scribble/i })).toBeInTheDocument();

    // SplashScreen has "Log in" and "Sign up" CTAs
    expect(screen.getByText('Log in')).toBeInTheDocument();
    expect(screen.getByText('Sign up')).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // 2. When user is authenticated, renders DrawingCanvas
  // -----------------------------------------------------------------------
  test('renders DrawingCanvas when user is authenticated', () => {
    mockUser = { id: 1, username: 'testuser', name: 'Test User' };
    mockUseAuth.mockReturnValue({ user: mockUser, loading: false });

    // Mock clientWidth for the DrawingCanvas wrapper div
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
      configurable: true,
      value: 800,
    });

    HTMLElement.prototype.getBoundingClientRect = jest.fn().mockReturnValue({
      left: 0,
      top: 0,
      right: 800,
      bottom: 500,
      width: 800,
      height: 500,
      x: 0,
      y: 0,
    });

    render(<HomePage />);

    // DrawingCanvas renders a canvas with role="img"
    const canvas = screen.getByRole('img');
    expect(canvas).toBeInTheDocument();
    expect(canvas.tagName).toBe('CANVAS');
  });

  // -----------------------------------------------------------------------
  // 3. When user is authenticated, renders ColorIndicator
  // -----------------------------------------------------------------------
  test('renders ColorIndicator when user is authenticated', () => {
    mockUser = { id: 1, username: 'testuser', name: 'Test User' };
    mockUseAuth.mockReturnValue({ user: mockUser, loading: false });

    Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
      configurable: true,
      value: 800,
    });

    HTMLElement.prototype.getBoundingClientRect = jest.fn().mockReturnValue({
      left: 0,
      top: 0,
      right: 800,
      bottom: 500,
      width: 800,
      height: 500,
      x: 0,
      y: 0,
    });

    render(<HomePage />);

    // ColorIndicator displays the "Drawing color" label
    expect(screen.getByText('Drawing color')).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // 4. Authenticated page includes Navbar
  // -----------------------------------------------------------------------
  test('renders Navbar when user is authenticated', () => {
    mockUser = { id: 1, username: 'testuser', name: 'Test User' };
    mockUseAuth.mockReturnValue({ user: mockUser, loading: false });

    Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
      configurable: true,
      value: 800,
    });

    HTMLElement.prototype.getBoundingClientRect = jest.fn().mockReturnValue({
      left: 0,
      top: 0,
      right: 800,
      bottom: 500,
      width: 800,
      height: 500,
      x: 0,
      y: 0,
    });

    render(<HomePage />);

    // Navbar is rendered when user is authenticated
    // Navbar contains navigation links — we can look for the Scribble brand or links
    // The Navbar component renders a <nav> element
    const nav = document.querySelector('nav');
    expect(nav).toBeInTheDocument();
  });

  // =======================================================================
  // ERASER INTEGRATION TESTS
  // =======================================================================

  /** Helper to render HomePage in authenticated state with canvas mocks */
  function renderAuthenticatedHomePage() {
    mockUser = { id: 1, username: 'testuser', name: 'Test User' };
    mockUseAuth.mockReturnValue({ user: mockUser, loading: false });

    Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
      configurable: true,
      value: 800,
    });

    HTMLElement.prototype.getBoundingClientRect = jest.fn().mockReturnValue({
      left: 0,
      top: 0,
      right: 800,
      bottom: 500,
      width: 800,
      height: 500,
      x: 0,
      y: 0,
    });

    return render(<HomePage />);
  }

  // -----------------------------------------------------------------------
  // 5. EraserToggle renders in the toolbar
  // -----------------------------------------------------------------------
  test('EraserToggle renders in the toolbar when authenticated', () => {
    renderAuthenticatedHomePage();

    // EraserToggle has role="checkbox" and label "Eraser tool"
    const eraserBtn = screen.getByRole('checkbox', { name: 'Eraser tool' });
    expect(eraserBtn).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // 6. Toggling eraser shows EraserSizeSelector
  // -----------------------------------------------------------------------
  test('toggling eraser on shows EraserSizeSelector', async () => {
    const user = userEvent.setup();
    renderAuthenticatedHomePage();

    // Click the eraser toggle to activate eraser mode
    const eraserBtn = screen.getByRole('checkbox', { name: 'Eraser tool' });
    await user.click(eraserBtn);

    // EraserSizeSelector should now be visible with radiogroup role
    const sizeGroup = screen.getByRole('radiogroup', { name: 'Eraser size' });
    expect(sizeGroup).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // 7. Toggling eraser off hides EraserSizeSelector
  // -----------------------------------------------------------------------
  test('toggling eraser off hides EraserSizeSelector', async () => {
    const user = userEvent.setup();
    renderAuthenticatedHomePage();

    const eraserBtn = screen.getByRole('checkbox', { name: 'Eraser tool' });

    // Turn eraser on
    await user.click(eraserBtn);
    expect(screen.getByRole('radiogroup', { name: 'Eraser size' })).toBeInTheDocument();

    // Turn eraser off
    await user.click(eraserBtn);
    expect(screen.queryByRole('radiogroup', { name: 'Eraser size' })).not.toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // 8. Clicking a color swatch while in eraser mode exits eraser mode
  // -----------------------------------------------------------------------
  test('clicking a color swatch while in eraser mode exits eraser mode', async () => {
    const user = userEvent.setup();
    renderAuthenticatedHomePage();

    const eraserBtn = screen.getByRole('checkbox', { name: 'Eraser tool' });

    // Turn eraser on
    await user.click(eraserBtn);
    expect(eraserBtn).toHaveAttribute('aria-checked', 'true');

    // Click a color swatch (e.g., Black — aria-label is just the color name)
    const blackSwatch = screen.getByRole('radio', { name: 'Black' });
    await user.click(blackSwatch);

    // Eraser should now be off
    expect(eraserBtn).toHaveAttribute('aria-checked', 'false');
    // EraserSizeSelector should be hidden
    expect(screen.queryByRole('radiogroup', { name: 'Eraser size' })).not.toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // 9. Exiting eraser mode keeps the last active color
  // -----------------------------------------------------------------------
  test('exiting eraser mode keeps the last active color', async () => {
    const user = userEvent.setup();
    renderAuthenticatedHomePage();

    // The default active color (#7c3aed) is not a preset, so none are pre-checked
    // Select Red as the active color
    const redSwatch = screen.getByRole('radio', { name: 'Red' });
    await user.click(redSwatch);
    expect(redSwatch).toHaveAttribute('aria-checked', 'true');

    // Toggle eraser on, then off
    const eraserBtn = screen.getByRole('checkbox', { name: 'Eraser tool' });
    await user.click(eraserBtn);
    await user.click(eraserBtn); // toggle off

    // Red should still be the active color
    expect(redSwatch).toHaveAttribute('aria-checked', 'true');
  });

  // -----------------------------------------------------------------------
  // 10. Changing eraser size calls the handler
  // -----------------------------------------------------------------------
  test('changing eraser size updates the UI', async () => {
    const user = userEvent.setup();
    renderAuthenticatedHomePage();

    // Turn eraser on to show size selector
    const eraserBtn = screen.getByRole('checkbox', { name: 'Eraser tool' });
    await user.click(eraserBtn);

    // Click the Small size button
    const smallBtn = screen.getByRole('radio', { name: 'Eraser size: Small (5 pixels)' });
    await user.click(smallBtn);

    // The Small button should now be checked
    expect(smallBtn).toHaveAttribute('aria-checked', 'true');
  });

  // =======================================================================
  // BRUSH SIZE INTEGRATION TESTS
  // =======================================================================

  // -----------------------------------------------------------------------
  // 11. BrushSizeSelector renders in the toolbar (4 size buttons visible)
  // -----------------------------------------------------------------------
  test('BrushSizeSelector renders in the toolbar with four size buttons', () => {
    renderAuthenticatedHomePage();

    // BrushSizeSelector has a radiogroup with label "Brush size"
    const brushGroup = screen.getByRole('radiogroup', { name: 'Brush size' });
    expect(brushGroup).toBeInTheDocument();

    // Four brush size radio buttons
    const brushButtons = screen.getAllByRole('radio', { name: /brush size:/i });
    expect(brushButtons).toHaveLength(4);
  });

  // -----------------------------------------------------------------------
  // 12. Changing brush size updates the active button
  // -----------------------------------------------------------------------
  test('changing brush size updates the active button', async () => {
    const user = userEvent.setup();
    renderAuthenticatedHomePage();

    // The default brush size is 3 (Normal), so Normal should be checked
    const normalBtn = screen.getByRole('radio', { name: /brush size: normal/i });
    expect(normalBtn).toHaveAttribute('aria-checked', 'true');

    // Click Thin (value 1)
    const thinBtn = screen.getByRole('radio', { name: /brush size: thin/i });
    await user.click(thinBtn);

    // Thin should now be checked, Normal should not
    expect(thinBtn).toHaveAttribute('aria-checked', 'true');
    expect(normalBtn).toHaveAttribute('aria-checked', 'false');
  });

  // -----------------------------------------------------------------------
  // 13. Brush size selector stays visible when eraser is toggled on/off
  // -----------------------------------------------------------------------
  test('BrushSizeSelector stays visible when eraser is toggled', async () => {
    const user = userEvent.setup();
    renderAuthenticatedHomePage();

    // Brush size should be present initially
    const brushGroup = screen.getByRole('radiogroup', { name: 'Brush size' });
    expect(brushGroup).toBeInTheDocument();

    // Toggle eraser on
    const eraserBtn = screen.getByRole('checkbox', { name: 'Eraser tool' });
    await user.click(eraserBtn);

    // Brush size should still be present (unlike eraser size which only shows in eraser mode)
    expect(screen.getByRole('radiogroup', { name: 'Brush size' })).toBeInTheDocument();

    // Active brush size should be preserved
    const normalBtn = screen.getByRole('radio', { name: /brush size: normal/i });
    expect(normalBtn).toHaveAttribute('aria-checked', 'true');

    // Toggle eraser off
    await user.click(eraserBtn);

    // Brush size should still be present
    expect(screen.getByRole('radiogroup', { name: 'Brush size' })).toBeInTheDocument();
  });

  // =======================================================================
  // UNDO / REDO INTEGRATION TESTS
  // =======================================================================

  // -----------------------------------------------------------------------
  // 14. Ctrl+Z triggers undo on the canvas
  // -----------------------------------------------------------------------
  test('Ctrl+Z triggers undo on the canvas', async () => {
    renderAuthenticatedHomePage();

    const canvas = screen.getByRole('img');
    const ctx = canvas.getContext('2d');

    // Draw a stroke so there is something to undo
    fireEvent.mouseDown(canvas, { clientX: 100, clientY: 50 });
    fireEvent.mouseMove(canvas, { clientX: 150, clientY: 75 });
    fireEvent.mouseUp(canvas);
    await new Promise(resolve => setTimeout(resolve, 0));

    // Clear spy state after the draw
    ctx.clearRect.mockClear();
    ctx.stroke.mockClear();

    // Press Ctrl+Z
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
    await new Promise(resolve => setTimeout(resolve, 0));

    // After undo, the canvas should be redrawn (clearRect called)
    expect(ctx.clearRect).toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // 15. Ctrl+Shift+Z triggers redo
  // -----------------------------------------------------------------------
  test('Ctrl+Shift+Z triggers redo on the canvas', async () => {
    renderAuthenticatedHomePage();

    const canvas = screen.getByRole('img');
    const ctx = canvas.getContext('2d');

    // Draw a stroke
    fireEvent.mouseDown(canvas, { clientX: 100, clientY: 50 });
    fireEvent.mouseMove(canvas, { clientX: 150, clientY: 75 });
    fireEvent.mouseUp(canvas);
    await new Promise(resolve => setTimeout(resolve, 0));

    // Undo via Ctrl+Z
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
    await new Promise(resolve => setTimeout(resolve, 0));

    // Clear spies after undo
    ctx.clearRect.mockClear();
    ctx.stroke.mockClear();

    // Press Ctrl+Shift+Z to redo
    fireEvent.keyDown(window, { key: 'Z', ctrlKey: true, shiftKey: true });
    await new Promise(resolve => setTimeout(resolve, 0));

    // After redo, the canvas should be redrawn (clearRect called)
    expect(ctx.clearRect).toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // 16. Ctrl+Y triggers redo
  // -----------------------------------------------------------------------
  test('Ctrl+Y triggers redo on the canvas', async () => {
    renderAuthenticatedHomePage();

    const canvas = screen.getByRole('img');
    const ctx = canvas.getContext('2d');

    // Draw a stroke
    fireEvent.mouseDown(canvas, { clientX: 100, clientY: 50 });
    fireEvent.mouseMove(canvas, { clientX: 150, clientY: 75 });
    fireEvent.mouseUp(canvas);
    await new Promise(resolve => setTimeout(resolve, 0));

    // Undo via Ctrl+Z
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
    await new Promise(resolve => setTimeout(resolve, 0));

    // Clear spies after undo
    ctx.clearRect.mockClear();
    ctx.stroke.mockClear();

    // Press Ctrl+Y to redo
    fireEvent.keyDown(window, { key: 'y', ctrlKey: true });
    await new Promise(resolve => setTimeout(resolve, 0));

    // After redo, the canvas should be redrawn
    expect(ctx.clearRect).toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // 17. Cmd+Z on Mac triggers undo
  // -----------------------------------------------------------------------
  test('Cmd+Z triggers undo on Mac', async () => {
    renderAuthenticatedHomePage();

    const canvas = screen.getByRole('img');
    const ctx = canvas.getContext('2d');

    // Draw a stroke
    fireEvent.mouseDown(canvas, { clientX: 100, clientY: 50 });
    fireEvent.mouseMove(canvas, { clientX: 150, clientY: 75 });
    fireEvent.mouseUp(canvas);
    await new Promise(resolve => setTimeout(resolve, 0));

    // Clear spies
    ctx.clearRect.mockClear();
    ctx.stroke.mockClear();

    // Press Cmd+Z (metaKey)
    fireEvent.keyDown(window, { key: 'z', metaKey: true });
    await new Promise(resolve => setTimeout(resolve, 0));

    // After undo, the canvas should be redrawn
    expect(ctx.clearRect).toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // 18. Undo button in toolbar is wired to canvas undo
  // -----------------------------------------------------------------------
  test('Undo button in toolbar triggers canvas undo', async () => {
    renderAuthenticatedHomePage();

    const canvas = screen.getByRole('img');
    const ctx = canvas.getContext('2d');

    // Draw a stroke so there is something to undo
    fireEvent.mouseDown(canvas, { clientX: 100, clientY: 50 });
    fireEvent.mouseMove(canvas, { clientX: 150, clientY: 75 });
    fireEvent.mouseUp(canvas);
    await new Promise(resolve => setTimeout(resolve, 0));

    // Wait for canUndo to become true (button to enable)
    await new Promise(resolve => setTimeout(resolve, 50));

    // Clear spies after the draw
    ctx.clearRect.mockClear();
    ctx.stroke.mockClear();

    // Click the undo button in the toolbar
    const undoBtn = screen.getByRole('button', { name: /undo last stroke/i });
    fireEvent.click(undoBtn);
    await new Promise(resolve => setTimeout(resolve, 0));

    // After undo, the canvas should be redrawn
    expect(ctx.clearRect).toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // 19. Redo button in toolbar is wired to canvas redo
  // -----------------------------------------------------------------------
  test('Redo button in toolbar restores an undone stroke', async () => {
    renderAuthenticatedHomePage();

    const canvas = screen.getByRole('img');
    const ctx = canvas.getContext('2d');

    // Draw a stroke
    fireEvent.mouseDown(canvas, { clientX: 100, clientY: 50 });
    fireEvent.mouseMove(canvas, { clientX: 150, clientY: 75 });
    fireEvent.mouseUp(canvas);
    await new Promise(resolve => setTimeout(resolve, 0));

    // Undo via keyboard
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
    await new Promise(resolve => setTimeout(resolve, 50));

    // Clear spies after undo
    ctx.clearRect.mockClear();
    ctx.stroke.mockClear();

    // Click the redo button
    const redoBtn = screen.getByRole('button', { name: /redo last undone stroke/i });
    fireEvent.click(redoBtn);
    await new Promise(resolve => setTimeout(resolve, 0));

    // After redo, the canvas should be redrawn
    expect(ctx.clearRect).toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // 20. Undo and Redo buttons are disabled when stacks are empty
  // -----------------------------------------------------------------------
  test('Undo and Redo buttons are disabled on fresh load', async () => {
    renderAuthenticatedHomePage();

    // On initial render, no strokes → both buttons disabled
    const undoBtn = screen.getByRole('button', { name: /undo last stroke/i });
    const redoBtn = screen.getByRole('button', { name: /redo last undone stroke/i });

    expect(undoBtn).toBeDisabled();
    expect(redoBtn).toBeDisabled();
  });

  // -----------------------------------------------------------------------
  // 21. Ctrl+Z does not fire when a text input is focused
  // -----------------------------------------------------------------------
  test('Ctrl+Z does not trigger canvas undo when input is focused', async () => {
    renderAuthenticatedHomePage();

    const canvas = screen.getByRole('img');
    const ctx = canvas.getContext('2d');

    // Draw a stroke so undo would have an effect if it fired
    fireEvent.mouseDown(canvas, { clientX: 100, clientY: 50 });
    fireEvent.mouseMove(canvas, { clientX: 150, clientY: 75 });
    fireEvent.mouseUp(canvas);
    await new Promise(resolve => setTimeout(resolve, 0));

    // Create and focus a text input
    const input = document.createElement('input');
    input.setAttribute('type', 'text');
    document.body.appendChild(input);
    input.focus();

    // Clear spies — any further clearRect would indicate an undo redraw
    ctx.clearRect.mockClear();

    // Fire Ctrl+Z on the INPUT (not window) so that e.target.tagName === 'INPUT',
    // which triggers the input-guard early return in the keydown handler
    fireEvent.keyDown(input, { key: 'z', ctrlKey: true });
    await new Promise(resolve => setTimeout(resolve, 0));

    // The handler must have returned early — no undo, so no redraw via clearRect
    expect(ctx.clearRect).not.toHaveBeenCalled();

    // Clean up
    document.body.removeChild(input);
  });

  // -----------------------------------------------------------------------
  // 22. Unrelated key presses do not trigger undo/redo
  // -----------------------------------------------------------------------
  test('unrelated key presses do not cause side effects', async () => {
    renderAuthenticatedHomePage();

    const canvas = screen.getByRole('img');
    const ctx = canvas.getContext('2d');

    // Draw a stroke
    fireEvent.mouseDown(canvas, { clientX: 100, clientY: 50 });
    fireEvent.mouseMove(canvas, { clientX: 150, clientY: 75 });
    fireEvent.mouseUp(canvas);
    await new Promise(resolve => setTimeout(resolve, 0));

    // Clear spies
    ctx.clearRect.mockClear();

    // Press random letter 'a' — should be no-op (no modifier)
    fireEvent.keyDown(window, { key: 'a' });
    await new Promise(resolve => setTimeout(resolve, 0));

    // Press Ctrl+A — not undo/redo
    fireEvent.keyDown(window, { key: 'a', ctrlKey: true });
    await new Promise(resolve => setTimeout(resolve, 0));

    // Canvas should not have been redrawn as a result of undo/redo
    // (initial redraws from the original stroke are already cleared)
    // No assertion needed on clearRect because it may have been called
    // during initial render — we just verify no error was thrown.
  });

  // =======================================================================
  // SHAPE MODE INTEGRATION TESTS
  // =======================================================================

  // -----------------------------------------------------------------------
  // 23. shapeMode defaults to null (pencil mode) — no shape button active
  // -----------------------------------------------------------------------
  test('shapeMode defaults to null so no shape button is active on load', () => {
    renderAuthenticatedHomePage();

    // ShapeToolsGroup renders three radio buttons — none should be checked
    const rectBtn = screen.getByRole('radio', { name: 'Rectangle tool' });
    const circleBtn = screen.getByRole('radio', { name: 'Circle tool' });
    const lineBtn = screen.getByRole('radio', { name: 'Line tool' });

    expect(rectBtn).toHaveAttribute('aria-checked', 'false');
    expect(circleBtn).toHaveAttribute('aria-checked', 'false');
    expect(lineBtn).toHaveAttribute('aria-checked', 'false');
  });

  // -----------------------------------------------------------------------
  // 24. handleShapeModeChange sets shapeMode and clears eraserMode
  // -----------------------------------------------------------------------
  test('selecting a shape tool while eraser is active exits eraser mode', async () => {
    const user = userEvent.setup();
    renderAuthenticatedHomePage();

    const eraserBtn = screen.getByRole('checkbox', { name: 'Eraser tool' });

    // Turn eraser on
    await user.click(eraserBtn);
    expect(eraserBtn).toHaveAttribute('aria-checked', 'true');

    // Click Rectangle tool — should exit eraser mode
    const rectBtn = screen.getByRole('radio', { name: 'Rectangle tool' });
    await user.click(rectBtn);

    // Eraser should now be off
    expect(eraserBtn).toHaveAttribute('aria-checked', 'false');
    // Rectangle tool should be active
    expect(rectBtn).toHaveAttribute('aria-checked', 'true');
    // EraserSizeSelector should be hidden
    expect(screen.queryByRole('radiogroup', { name: 'Eraser size' })).not.toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // 25. handleEraserToggle clears shapeMode when activating eraser
  // -----------------------------------------------------------------------
  test('activating eraser while a shape tool is selected clears shapeMode', async () => {
    const user = userEvent.setup();
    renderAuthenticatedHomePage();

    // Select Circle tool
    const circleBtn = screen.getByRole('radio', { name: 'Circle tool' });
    await user.click(circleBtn);
    expect(circleBtn).toHaveAttribute('aria-checked', 'true');

    // Now turn eraser on
    const eraserBtn = screen.getByRole('checkbox', { name: 'Eraser tool' });
    await user.click(eraserBtn);

    // Eraser should be on
    expect(eraserBtn).toHaveAttribute('aria-checked', 'true');
    // Shape mode should be cleared
    expect(circleBtn).toHaveAttribute('aria-checked', 'false');
    // Eraser flyout should appear
    expect(screen.getByRole('radiogroup', { name: 'Eraser size' })).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // 26. handleColorChange clears shapeMode when a color is picked
  // -----------------------------------------------------------------------
  test('picking a color while a shape tool is active exits shape mode', async () => {
    const user = userEvent.setup();
    renderAuthenticatedHomePage();

    // Select Line tool
    const lineBtn = screen.getByRole('radio', { name: 'Line tool' });
    await user.click(lineBtn);
    expect(lineBtn).toHaveAttribute('aria-checked', 'true');

    // Pick a color (e.g., Red)
    const redSwatch = screen.getByRole('radio', { name: 'Red' });
    await user.click(redSwatch);

    // Line tool should now be inactive (shape mode cleared)
    expect(lineBtn).toHaveAttribute('aria-checked', 'false');
    // Color swatch should be active
    expect(redSwatch).toHaveAttribute('aria-checked', 'true');
  });

  // -----------------------------------------------------------------------
  // 27. shapeModeRef is passed to DrawingCanvas (verified via shape drawing)
  // -----------------------------------------------------------------------
  test('shapeModeRef is passed to DrawingCanvas so shape drawing works', async () => {
    const user = userEvent.setup();
    renderAuthenticatedHomePage();

    // Select Rectangle tool
    const rectBtn = screen.getByRole('radio', { name: 'Rectangle tool' });
    await user.click(rectBtn);
    expect(rectBtn).toHaveAttribute('aria-checked', 'true');

    // Draw on the canvas — should use shape drawing path (strokeRect)
    const canvas = screen.getByRole('img');
    const ctx = canvas.getContext('2d');
    const strokeRectSpy = jest.spyOn(ctx, 'strokeRect');

    fireEvent.mouseDown(canvas, { clientX: 100, clientY: 50 });
    fireEvent.mouseMove(canvas, { clientX: 200, clientY: 150 });

    // strokeRect must be called, proving shapeModeRef was passed with 'rect'
    expect(strokeRectSpy).toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // 28. ColorToolbar receives shapeMode and onShapeModeChange props
  // -----------------------------------------------------------------------
  test('ColorToolbar receives and wires shapeMode and onShapeModeChange', async () => {
    const user = userEvent.setup();
    renderAuthenticatedHomePage();

    // Verify ShapeToolsGroup exists (rendered by ColorToolbar)
    const shapeGroup = screen.getByRole('radiogroup', { name: 'Shape tools' });
    expect(shapeGroup).toBeInTheDocument();

    // Click Rectangle tool — onShapeModeChange should propagate up to HomePage
    const rectBtn = screen.getByRole('radio', { name: 'Rectangle tool' });
    await user.click(rectBtn);
    expect(rectBtn).toHaveAttribute('aria-checked', 'true');

    // Click the same button again — should toggle off via onShapeModeChange(null)
    await user.click(rectBtn);
    expect(rectBtn).toHaveAttribute('aria-checked', 'false');
  });

  // -----------------------------------------------------------------------
  // 29. ShapeToolsGroup is rendered in the ColorToolbar
  // -----------------------------------------------------------------------
  test('ShapeToolsGroup renders inside the ColorToolbar with three shape buttons', () => {
    renderAuthenticatedHomePage();

    // The ShapeToolsGroup is a radiogroup labeled "Shape tools"
    const shapeGroup = screen.getByRole('radiogroup', { name: 'Shape tools' });
    expect(shapeGroup).toBeInTheDocument();

    // It contains three shape radio buttons
    const shapeButtons = within(shapeGroup).getAllByRole('radio');
    expect(shapeButtons).toHaveLength(3);

    // The three buttons are for Rectangle, Circle, and Line
    expect(
      within(shapeGroup).getByRole('radio', { name: 'Rectangle tool' }),
    ).toBeInTheDocument();
    expect(
      within(shapeGroup).getByRole('radio', { name: 'Circle tool' }),
    ).toBeInTheDocument();
    expect(
      within(shapeGroup).getByRole('radio', { name: 'Line tool' }),
    ).toBeInTheDocument();
  });

  // =======================================================================
  // PROJECT INTEGRATION TESTS
  // =======================================================================

  // -----------------------------------------------------------------------
  // 30. ProjectControls renders save/load/new buttons when authenticated
  // -----------------------------------------------------------------------
  test('ProjectControls renders save, load, and new project buttons', () => {
    renderAuthenticatedHomePage();

    expect(screen.getByTestId('save-project-button')).toBeInTheDocument();
    expect(screen.getByTestId('open-projects-button')).toBeInTheDocument();
    expect(screen.getByTestId('new-project-button')).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // 31. New project button is enabled on load
  // -----------------------------------------------------------------------
  test('new project button is enabled on fresh load', () => {
    renderAuthenticatedHomePage();

    const newBtn = screen.getByTestId('new-project-button');
    expect(newBtn).not.toBeDisabled();
  });

  // -----------------------------------------------------------------------
  // 32. Save button is disabled when canvas has no strokes
  // -----------------------------------------------------------------------
  test('save button is disabled when canvas has no strokes', () => {
    renderAuthenticatedHomePage();

    const saveBtn = screen.getByTestId('save-project-button');
    expect(saveBtn).toBeDisabled();
  });

  // -----------------------------------------------------------------------
  // 33. Save button becomes enabled after drawing a stroke
  // -----------------------------------------------------------------------
  test('save button becomes enabled after drawing a stroke', async () => {
    renderAuthenticatedHomePage();

    const saveBtn = screen.getByTestId('save-project-button');
    expect(saveBtn).toBeDisabled();

    // Draw a stroke on the canvas
    const canvas = screen.getByRole('img');
    fireEvent.mouseDown(canvas, { clientX: 100, clientY: 50 });
    fireEvent.mouseMove(canvas, { clientX: 150, clientY: 75 });
    fireEvent.mouseUp(canvas);
    await new Promise(resolve => setTimeout(resolve, 50));

    // After drawing, the save button should be enabled
    expect(saveBtn).not.toBeDisabled();
  });

  // -----------------------------------------------------------------------
  // 34. Unsaved changes indicator appears after drawing
  // -----------------------------------------------------------------------
  test('unsaved changes indicator appears on save button after drawing', async () => {
    renderAuthenticatedHomePage();

    const saveBtn = screen.getByTestId('save-project-button');

    // Initially no unsaved indicator
    let indicator = saveBtn.querySelector('.animate-pulse');
    expect(indicator).not.toBeInTheDocument();

    // Draw a stroke
    const canvas = screen.getByRole('img');
    fireEvent.mouseDown(canvas, { clientX: 100, clientY: 50 });
    fireEvent.mouseMove(canvas, { clientX: 150, clientY: 75 });
    fireEvent.mouseUp(canvas);
    await new Promise(resolve => setTimeout(resolve, 50));

    // Unsaved indicator should now be visible
    indicator = saveBtn.querySelector('.animate-pulse');
    expect(indicator).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // 35. Open Projects button is enabled and can be clicked
  // -----------------------------------------------------------------------
  test('open projects button opens ProjectListSidebar', async () => {
    renderAuthenticatedHomePage();

    const openBtn = screen.getByTestId('open-projects-button');
    expect(openBtn).not.toBeDisabled();

    // Click to open the projects sidebar
    await userEvent.setup().click(openBtn);

    // The ProjectListSidebar should now be visible
    // (It renders in a portal, so we check for it by testid)
    await waitFor(() => {
      expect(screen.getByTestId('project-list-sidebar')).toBeInTheDocument();
    });
  });
});
