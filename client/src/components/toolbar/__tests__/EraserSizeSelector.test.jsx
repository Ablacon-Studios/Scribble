/**
 * Tests for the EraserSizeSelector component.
 */
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EraserSizeSelector from '../EraserSizeSelector';

describe('EraserSizeSelector', () => {
  // -----------------------------------------------------------------------
  // 1. Renders three size buttons when visible=true
  // -----------------------------------------------------------------------
  test('renders three size buttons (Small, Medium, Large) when visible=true', () => {
    render(
      <EraserSizeSelector currentSize={15} onChange={jest.fn()} visible={true} />
    );

    expect(screen.getByRole('radio', { name: 'Eraser size: Small (5 pixels)' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Eraser size: Medium (15 pixels)' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Eraser size: Large (30 pixels)' })).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // 2. Does NOT render when visible=false
  // -----------------------------------------------------------------------
  test('does NOT render when visible=false', () => {
    const { container } = render(
      <EraserSizeSelector currentSize={15} onChange={jest.fn()} visible={false} />
    );

    expect(container.firstChild).toBeNull();
  });

  // -----------------------------------------------------------------------
  // 3. Default active size is 15 (Medium)
  // -----------------------------------------------------------------------
  test('Medium button has aria-checked true when currentSize=15', () => {
    render(
      <EraserSizeSelector currentSize={15} onChange={jest.fn()} visible={true} />
    );

    const smallBtn = screen.getByRole('radio', { name: /eraser size: small/i });
    const mediumBtn = screen.getByRole('radio', { name: /eraser size: medium/i });
    const largeBtn = screen.getByRole('radio', { name: /eraser size: large/i });

    expect(smallBtn).toHaveAttribute('aria-checked', 'false');
    expect(mediumBtn).toHaveAttribute('aria-checked', 'true');
    expect(largeBtn).toHaveAttribute('aria-checked', 'false');
  });

  // -----------------------------------------------------------------------
  // 4. Click Small button calls onChange(5)
  // -----------------------------------------------------------------------
  test('clicking Small button calls onChange with value 5', async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();

    render(
      <EraserSizeSelector currentSize={15} onChange={onChange} visible={true} />
    );

    const smallBtn = screen.getByRole('radio', { name: /eraser size: small/i });
    await user.click(smallBtn);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(5);
  });

  // -----------------------------------------------------------------------
  // 5. Click Medium button calls onChange(15)
  // -----------------------------------------------------------------------
  test('clicking Medium button calls onChange with value 15', async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();

    render(
      <EraserSizeSelector currentSize={5} onChange={onChange} visible={true} />
    );

    const mediumBtn = screen.getByRole('radio', { name: /eraser size: medium/i });
    await user.click(mediumBtn);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(15);
  });

  // -----------------------------------------------------------------------
  // 6. Click Large button calls onChange(30)
  // -----------------------------------------------------------------------
  test('clicking Large button calls onChange with value 30', async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();

    render(
      <EraserSizeSelector currentSize={5} onChange={onChange} visible={true} />
    );

    const largeBtn = screen.getByRole('radio', { name: /eraser size: large/i });
    await user.click(largeBtn);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(30);
  });

  // -----------------------------------------------------------------------
  // 7. Active size button has proper styling
  // -----------------------------------------------------------------------
  test('active size button inner dot has active background color', () => {
    render(
      <EraserSizeSelector currentSize={15} onChange={jest.fn()} visible={true} />
    );

    const mediumBtn = screen.getByRole('radio', { name: /eraser size: medium/i });
    const dot = mediumBtn.querySelector('span');

    expect(dot).not.toBeNull();
    // The active dot should have the scribble-primary background
    expect(dot.className).toContain('bg-scribble-primary');
  });

  test('inactive size buttons have muted dot background', () => {
    render(
      <EraserSizeSelector currentSize={15} onChange={jest.fn()} visible={true} />
    );

    const smallBtn = screen.getByRole('radio', { name: /eraser size: small/i });
    const dot = smallBtn.querySelector('span');

    expect(dot).not.toBeNull();
    // Inactive dots should have muted background
    expect(dot.className).toContain('bg-scribble-muted');
  });

  // -----------------------------------------------------------------------
  // 8. Container has role="radiogroup"
  // -----------------------------------------------------------------------
  test('container has role="radiogroup"', () => {
    render(
      <EraserSizeSelector currentSize={15} onChange={jest.fn()} visible={true} />
    );

    const group = screen.getByRole('radiogroup', { name: 'Eraser size' });
    expect(group).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // 9. Each button has role="radio" and proper aria-checked
  // -----------------------------------------------------------------------
  test('each button has role="radio" and correct aria-checked state', () => {
    render(
      <EraserSizeSelector currentSize={30} onChange={jest.fn()} visible={true} />
    );

    const buttons = screen.getAllByRole('radio');
    expect(buttons).toHaveLength(3);

    buttons.forEach((btn) => {
      expect(btn).toHaveAttribute('aria-checked');
    });

    // Only Large should be checked since currentSize=30
    const largeBtn = screen.getByRole('radio', { name: /eraser size: large/i });
    expect(largeBtn).toHaveAttribute('aria-checked', 'true');
  });

  // -----------------------------------------------------------------------
  // 10. Each button has descriptive aria-label
  // -----------------------------------------------------------------------
  test('each button has a descriptive aria-label with size name and pixel value', () => {
    render(
      <EraserSizeSelector currentSize={15} onChange={jest.fn()} visible={true} />
    );

    expect(screen.getByRole('radio', { name: 'Eraser size: Small (5 pixels)' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Eraser size: Medium (15 pixels)' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Eraser size: Large (30 pixels)' })).toBeInTheDocument();
  });
});
