/**
 * Tests for the ShapeToolToggle component.
 */
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ShapeToolToggle from '../ShapeToolToggle';

describe('ShapeToolToggle', () => {
  const baseProps = {
    shapeType: 'rect',
    active: false,
    onClick: jest.fn(),
    label: 'Rectangle tool',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // 1. Renders with correct aria-label based on shapeType
  // -----------------------------------------------------------------------
  test('renders with correct aria-label based on shapeType', () => {
    render(<ShapeToolToggle {...baseProps} label="Rectangle tool" />);
    const button = screen.getByRole('radio', { name: 'Rectangle tool' });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('aria-label', 'Rectangle tool');

    // Also verify title attribute matches
    expect(button).toHaveAttribute('title', 'Rectangle tool');
  });

  // -----------------------------------------------------------------------
  // 2. Renders SVG icon element in DOM
  // -----------------------------------------------------------------------
  test('renders SVG icon element in DOM', () => {
    render(<ShapeToolToggle {...baseProps} />);

    const button = screen.getByRole('radio');
    const svg = button.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });

  // -----------------------------------------------------------------------
  // 3. Calls onClick when clicked
  // -----------------------------------------------------------------------
  test('calls onClick when clicked', async () => {
    const onClick = jest.fn();
    const user = userEvent.setup();

    render(<ShapeToolToggle {...baseProps} onClick={onClick} />);

    const button = screen.getByRole('radio');
    await user.click(button);

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  // -----------------------------------------------------------------------
  // 4. Shows active styling classes when active={true} (has ring classes)
  // -----------------------------------------------------------------------
  test('shows active styling when active is true including ring and background', () => {
    render(<ShapeToolToggle {...baseProps} active={true} />);

    const button = screen.getByRole('radio');
    // Active state has a dedicated background and the ring-scribble-primary
    // appears both as standalone (active) and inside focus-visible: — we check
    // for the active background which is unique to the active state
    expect(button.className).toContain('bg-scribble-primary/20');

    // The SVG icon in active state has purple text color
    const svg = button.querySelector('svg');
    expect(svg.getAttribute('class')).toContain('text-purple-300');
  });

  // -----------------------------------------------------------------------
  // 5. Shows inactive styling when active={false} (no active ring, has hover class)
  // -----------------------------------------------------------------------
  test('shows inactive styling when active is false with hover class', () => {
    render(<ShapeToolToggle {...baseProps} active={false} />);

    const button = screen.getByRole('radio');
    // Inactive: no active background, transparent bg, hover class
    expect(button.className).not.toContain('bg-scribble-primary/20');
    expect(button.className).toContain('bg-transparent');
    expect(button.className).toContain('hover:bg-scribble-border/30');

    // The SVG icon in inactive state has muted text color
    const svg = button.querySelector('svg');
    expect(svg.getAttribute('class')).toContain('text-scribble-muted');
  });

  // -----------------------------------------------------------------------
  // 6. Has role="radio" and aria-checked attributes
  // -----------------------------------------------------------------------
  test('has role="radio" and aria-checked reflects active state', () => {
    const { rerender } = render(<ShapeToolToggle {...baseProps} active={false} />);

    let button = screen.getByRole('radio');
    expect(button).toHaveAttribute('role', 'radio');
    expect(button).toHaveAttribute('aria-checked', 'false');

    // Re-render with active=true — aria-checked should update
    rerender(<ShapeToolToggle {...baseProps} active={true} />);
    button = screen.getByRole('radio');
    expect(button).toHaveAttribute('aria-checked', 'true');
  });

  // -----------------------------------------------------------------------
  // 7. Button is keyboard-focusable with focus-visible ring class
  // -----------------------------------------------------------------------
  test('button has focus-visible ring classes for keyboard accessibility', () => {
    render(<ShapeToolToggle {...baseProps} />);

    const button = screen.getByRole('radio');
    expect(button.className).toContain('focus-visible:ring-2');
    expect(button.className).toContain('focus-visible:ring-scribble-primary');
    expect(button.className).toContain('focus-visible:ring-offset-2');
    expect(button.className).toContain('outline-none');
  });
});
