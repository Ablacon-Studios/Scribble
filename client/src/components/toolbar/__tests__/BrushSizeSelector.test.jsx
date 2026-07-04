/**
 * Tests for the BrushSizeSelector component.
 */
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BrushSizeSelector from '../BrushSizeSelector';

describe('BrushSizeSelector', () => {
  // -----------------------------------------------------------------------
  // 1. Renders four size buttons when visible=true
  // -----------------------------------------------------------------------
  test('renders four size buttons (Thin, Normal, Thick, Heavy)', () => {
    render(
      <BrushSizeSelector currentSize={3} onChange={jest.fn()} />
    );

    expect(screen.getByRole('radio', { name: 'Brush size: Thin (1 pixel)' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Brush size: Normal (3 pixel)' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Brush size: Thick (5 pixel)' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Brush size: Heavy (8 pixel)' })).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // 2. Normal is the default active size (value 3)
  // -----------------------------------------------------------------------
  test('Normal button has aria-checked true when currentSize=3', () => {
    render(
      <BrushSizeSelector currentSize={3} onChange={jest.fn()} />
    );

    const thinBtn = screen.getByRole('radio', { name: /brush size: thin/i });
    const normalBtn = screen.getByRole('radio', { name: /brush size: normal/i });
    const thickBtn = screen.getByRole('radio', { name: /brush size: thick/i });
    const heavyBtn = screen.getByRole('radio', { name: /brush size: heavy/i });

    expect(thinBtn).toHaveAttribute('aria-checked', 'false');
    expect(normalBtn).toHaveAttribute('aria-checked', 'true');
    expect(thickBtn).toHaveAttribute('aria-checked', 'false');
    expect(heavyBtn).toHaveAttribute('aria-checked', 'false');
  });

  // -----------------------------------------------------------------------
  // 3. Click Thin button calls onChange(1)
  // -----------------------------------------------------------------------
  test('clicking Thin button calls onChange with value 1', async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();

    render(
      <BrushSizeSelector currentSize={3} onChange={onChange} />
    );

    const thinBtn = screen.getByRole('radio', { name: /brush size: thin/i });
    await user.click(thinBtn);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(1);
  });

  // -----------------------------------------------------------------------
  // 4. Click Normal button calls onChange(3)
  // -----------------------------------------------------------------------
  test('clicking Normal button calls onChange with value 3', async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();

    render(
      <BrushSizeSelector currentSize={1} onChange={onChange} />
    );

    const normalBtn = screen.getByRole('radio', { name: /brush size: normal/i });
    await user.click(normalBtn);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(3);
  });

  // -----------------------------------------------------------------------
  // 5. Click Thick button calls onChange(5)
  // -----------------------------------------------------------------------
  test('clicking Thick button calls onChange with value 5', async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();

    render(
      <BrushSizeSelector currentSize={1} onChange={onChange} />
    );

    const thickBtn = screen.getByRole('radio', { name: /brush size: thick/i });
    await user.click(thickBtn);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(5);
  });

  // -----------------------------------------------------------------------
  // 6. Click Heavy button calls onChange(8)
  // -----------------------------------------------------------------------
  test('clicking Heavy button calls onChange with value 8', async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();

    render(
      <BrushSizeSelector currentSize={1} onChange={onChange} />
    );

    const heavyBtn = screen.getByRole('radio', { name: /brush size: heavy/i });
    await user.click(heavyBtn);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(8);
  });

  // -----------------------------------------------------------------------
  // 7. Active size button has active styling
  // -----------------------------------------------------------------------
  test('active size button inner dot has active background color', () => {
    render(
      <BrushSizeSelector currentSize={3} onChange={jest.fn()} />
    );

    const normalBtn = screen.getByRole('radio', { name: /brush size: normal/i });
    const dot = normalBtn.querySelector('span');

    expect(dot).not.toBeNull();
    // The active dot should have the scribble-primary background
    expect(dot.className).toContain('bg-scribble-primary');
  });

  // -----------------------------------------------------------------------
  // 8. Inactive sizes have muted styling
  // -----------------------------------------------------------------------
  test('inactive size buttons have muted dot background', () => {
    render(
      <BrushSizeSelector currentSize={3} onChange={jest.fn()} />
    );

    const thinBtn = screen.getByRole('radio', { name: /brush size: thin/i });
    const dot = thinBtn.querySelector('span');

    expect(dot).not.toBeNull();
    // Inactive dots should have muted background
    expect(dot.className).toContain('bg-scribble-muted');
  });

  // -----------------------------------------------------------------------
  // 9. Container has role="radiogroup" and aria-label="Brush size"
  // -----------------------------------------------------------------------
  test('container has role="radiogroup"', () => {
    render(
      <BrushSizeSelector currentSize={3} onChange={jest.fn()} />
    );

    const group = screen.getByRole('radiogroup', { name: 'Brush size' });
    expect(group).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // 10. Each button has role="radio" with aria-checked
  // -----------------------------------------------------------------------
  test('each button has role="radio" and correct aria-checked state', () => {
    render(
      <BrushSizeSelector currentSize={8} onChange={jest.fn()} />
    );

    const buttons = screen.getAllByRole('radio');
    expect(buttons).toHaveLength(4);

    buttons.forEach((btn) => {
      expect(btn).toHaveAttribute('aria-checked');
    });

    // Only Heavy should be checked since currentSize=8
    const heavyBtn = screen.getByRole('radio', { name: /brush size: heavy/i });
    expect(heavyBtn).toHaveAttribute('aria-checked', 'true');
  });

  // -----------------------------------------------------------------------
  // 11. Each button has descriptive aria-label with pixel value
  // -----------------------------------------------------------------------
  test('each button has a descriptive aria-label with size name and pixel value', () => {
    render(
      <BrushSizeSelector currentSize={3} onChange={jest.fn()} />
    );

    expect(screen.getByRole('radio', { name: 'Brush size: Thin (1 pixel)' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Brush size: Normal (3 pixel)' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Brush size: Thick (5 pixel)' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Brush size: Heavy (8 pixel)' })).toBeInTheDocument();
  });
});
