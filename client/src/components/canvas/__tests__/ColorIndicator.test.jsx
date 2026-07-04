/**
 * Tests for the ColorIndicator component.
 */
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import ColorIndicator from '../ColorIndicator';

describe('ColorIndicator', () => {
  // -----------------------------------------------------------------------
  // 1. Renders color circle with correct background color
  // -----------------------------------------------------------------------
  test('renders a color circle with the specified background color', () => {
    render(<ColorIndicator color="#7c3aed" />);

    // The circle div is aria-hidden="true"
    const circle = document.querySelector('[aria-hidden="true"]');
    expect(circle).toBeInTheDocument();
    expect(circle).toHaveStyle({ backgroundColor: '#7c3aed' });
  });

  // -----------------------------------------------------------------------
  // 2. Renders "Drawing color" text
  // -----------------------------------------------------------------------
  test('renders the "Drawing color" label text', () => {
    render(<ColorIndicator color="#7c3aed" />);

    const label = screen.getByText('Drawing color');
    expect(label).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // 3. Color circle has aria-hidden="true"
  // -----------------------------------------------------------------------
  test('the color circle has aria-hidden="true" for accessibility', () => {
    render(<ColorIndicator color="#7c3aed" />);

    const circle = document.querySelector('[aria-hidden="true"]');
    expect(circle).toBeInTheDocument();
    expect(circle).toHaveAttribute('aria-hidden', 'true');
  });

  // -----------------------------------------------------------------------
  // 4. Renders with different colors
  // -----------------------------------------------------------------------
  test('renders the correct background for a different color prop', () => {
    render(<ColorIndicator color="#ef4444" />);

    const circle = document.querySelector('[aria-hidden="true"]');
    expect(circle).toHaveStyle({ backgroundColor: '#ef4444' });
  });

  // -----------------------------------------------------------------------
  // 5. Has the expected layout CSS classes
  // -----------------------------------------------------------------------
  test('root container has flex layout classes', () => {
    const { container } = render(<ColorIndicator color="#7c3aed" />);

    const root = container.firstChild;
    expect(root).toHaveClass('flex');
    expect(root).toHaveClass('items-center');
  });
});
