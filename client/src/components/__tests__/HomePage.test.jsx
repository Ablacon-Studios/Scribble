/**
 * Tests for the HomePage component.
 */
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
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
});
