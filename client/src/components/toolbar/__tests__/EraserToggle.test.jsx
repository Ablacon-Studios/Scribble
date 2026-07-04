/**
 * Tests for the EraserToggle component.
 */
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EraserToggle from '../EraserToggle';

describe('EraserToggle', () => {
  // -----------------------------------------------------------------------
  // 1. Accessible label
  // -----------------------------------------------------------------------
  test('renders with accessible label "Eraser tool"', () => {
    render(<EraserToggle active={false} onToggle={jest.fn()} />);

    const button = screen.getByRole('checkbox', { name: 'Eraser tool' });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('aria-label', 'Eraser tool');
  });

  // -----------------------------------------------------------------------
  // 2. Renders with role="checkbox"
  // -----------------------------------------------------------------------
  test('renders with role="checkbox"', () => {
    render(<EraserToggle active={false} onToggle={jest.fn()} />);

    const button = screen.getByRole('checkbox');
    expect(button).toBeInTheDocument();
    expect(button.tagName).toBe('BUTTON');
  });

  // -----------------------------------------------------------------------
  // 3. aria-checked is false when not active
  // -----------------------------------------------------------------------
  test('aria-checked is false when active=false', () => {
    render(<EraserToggle active={false} onToggle={jest.fn()} />);

    const button = screen.getByRole('checkbox');
    expect(button).toHaveAttribute('aria-checked', 'false');
  });

  // -----------------------------------------------------------------------
  // 4. aria-checked is true when active
  // -----------------------------------------------------------------------
  test('aria-checked is true when active=true', () => {
    render(<EraserToggle active={true} onToggle={jest.fn()} />);

    const button = screen.getByRole('checkbox');
    expect(button).toHaveAttribute('aria-checked', 'true');
  });

  // -----------------------------------------------------------------------
  // 5. Calls onToggle with true when clicked while inactive
  // -----------------------------------------------------------------------
  test('calls onToggle with true when clicked while inactive', async () => {
    const onToggle = jest.fn();
    const user = userEvent.setup();

    render(<EraserToggle active={false} onToggle={onToggle} />);

    const button = screen.getByRole('checkbox');
    await user.click(button);

    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(onToggle).toHaveBeenCalledWith(true);
  });

  // -----------------------------------------------------------------------
  // 6. Calls onToggle with false when clicked while active
  // -----------------------------------------------------------------------
  test('calls onToggle with false when clicked while active', async () => {
    const onToggle = jest.fn();
    const user = userEvent.setup();

    render(<EraserToggle active={true} onToggle={onToggle} />);

    const button = screen.getByRole('checkbox');
    await user.click(button);

    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(onToggle).toHaveBeenCalledWith(false);
  });

  // -----------------------------------------------------------------------
  // 7. Shows active visual state (ring/background) when active
  // -----------------------------------------------------------------------
  test('shows active ring and background styling when active', () => {
    render(<EraserToggle active={true} onToggle={jest.fn()} />);

    const button = screen.getByRole('checkbox');
    // Active state has ring-2 and a tinted background
    expect(button.className).toContain('ring-2');
    expect(button.className).toContain('bg-scribble-primary/20');
  });

  // -----------------------------------------------------------------------
  // 8. Shows inactive visual state when not active
  // -----------------------------------------------------------------------
  test('shows inactive transparent background when not active', () => {
    render(<EraserToggle active={false} onToggle={jest.fn()} />);

    const button = screen.getByRole('checkbox');
    // Inactive state has transparent bg and hover styling only
    expect(button.className).toContain('bg-transparent');
    expect(button.className).toContain('hover:bg-scribble-border/30');
  });

  // -----------------------------------------------------------------------
  // 9. Has focus-visible styling
  // -----------------------------------------------------------------------
  test('has focus-visible ring styling for keyboard accessibility', () => {
    render(<EraserToggle active={false} onToggle={jest.fn()} />);

    const button = screen.getByRole('checkbox');
    expect(button.className).toContain('focus-visible:ring-2');
    expect(button.className).toContain('focus-visible:ring-scribble-primary');
    expect(button.className).toContain('focus-visible:ring-offset-2');
  });

  // -----------------------------------------------------------------------
  // 10. Renders an SVG icon
  // -----------------------------------------------------------------------
  test('renders an SVG icon', () => {
    render(<EraserToggle active={false} onToggle={jest.fn()} />);

    const button = screen.getByRole('checkbox');
    const svg = button.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });
});
