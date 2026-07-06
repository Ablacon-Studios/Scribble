/**
 * Tests for the ShapeToolsGroup component.
 */
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ShapeToolsGroup from '../ShapeToolsGroup';

describe('ShapeToolsGroup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // 1. Renders three shape buttons (rect, circle, line)
  // -----------------------------------------------------------------------
  test('renders three shape buttons for rect, circle, and line', () => {
    render(<ShapeToolsGroup shapeMode={null} onShapeModeChange={jest.fn()} />);

    const rectBtn = screen.getByRole('radio', { name: 'Rectangle tool' });
    const circleBtn = screen.getByRole('radio', { name: 'Circle tool' });
    const lineBtn = screen.getByRole('radio', { name: 'Line tool' });

    expect(rectBtn).toBeInTheDocument();
    expect(circleBtn).toBeInTheDocument();
    expect(lineBtn).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // 2. No button is active when shapeMode is null
  // -----------------------------------------------------------------------
  test('no button has aria-checked=true when shapeMode is null', () => {
    render(<ShapeToolsGroup shapeMode={null} onShapeModeChange={jest.fn()} />);

    const buttons = screen.getAllByRole('radio');
    expect(buttons).toHaveLength(3);

    for (const btn of buttons) {
      expect(btn).toHaveAttribute('aria-checked', 'false');
    }
  });

  // -----------------------------------------------------------------------
  // 3. Correct button is active when shapeMode matches
  // -----------------------------------------------------------------------
  test('correct button is active when shapeMode matches its type', () => {
    const { rerender } = render(
      <ShapeToolsGroup shapeMode={'rect'} onShapeModeChange={jest.fn()} />
    );

    expect(screen.getByRole('radio', { name: 'Rectangle tool' })).toHaveAttribute(
      'aria-checked', 'true',
    );
    expect(screen.getByRole('radio', { name: 'Circle tool' })).toHaveAttribute(
      'aria-checked', 'false',
    );

    // Switch to circle
    rerender(
      <ShapeToolsGroup shapeMode={'circle'} onShapeModeChange={jest.fn()} />
    );

    expect(screen.getByRole('radio', { name: 'Circle tool' })).toHaveAttribute(
      'aria-checked', 'true',
    );
    expect(screen.getByRole('radio', { name: 'Rectangle tool' })).toHaveAttribute(
      'aria-checked', 'false',
    );

    // Switch to line
    rerender(
      <ShapeToolsGroup shapeMode={'line'} onShapeModeChange={jest.fn()} />
    );

    expect(screen.getByRole('radio', { name: 'Line tool' })).toHaveAttribute(
      'aria-checked', 'true',
    );
    expect(screen.getByRole('radio', { name: 'Circle tool' })).toHaveAttribute(
      'aria-checked', 'false',
    );
  });

  // -----------------------------------------------------------------------
  // 4. Clicking a shape button calls onShapeModeChange with correct type
  // -----------------------------------------------------------------------
  test('clicking an inactive shape button calls onShapeModeChange with its type', async () => {
    const onShapeModeChange = jest.fn();
    const user = userEvent.setup();

    render(<ShapeToolsGroup shapeMode={null} onShapeModeChange={onShapeModeChange} />);

    // Click Rectangle
    await user.click(screen.getByRole('radio', { name: 'Rectangle tool' }));
    expect(onShapeModeChange).toHaveBeenCalledWith('rect');

    onShapeModeChange.mockClear();

    // Click Circle
    await user.click(screen.getByRole('radio', { name: 'Circle tool' }));
    expect(onShapeModeChange).toHaveBeenCalledWith('circle');

    onShapeModeChange.mockClear();

    // Click Line
    await user.click(screen.getByRole('radio', { name: 'Line tool' }));
    expect(onShapeModeChange).toHaveBeenCalledWith('line');
  });

  // -----------------------------------------------------------------------
  // 5. Clicking the active shape calls onShapeModeChange(null) (toggle-off)
  // -----------------------------------------------------------------------
  test('clicking the active shape button toggles it off via onShapeModeChange(null)', async () => {
    const onShapeModeChange = jest.fn();
    const user = userEvent.setup();

    render(<ShapeToolsGroup shapeMode={'rect'} onShapeModeChange={onShapeModeChange} />);

    // Click the already-active Rectangle — should toggle off
    await user.click(screen.getByRole('radio', { name: 'Rectangle tool' }));
    expect(onShapeModeChange).toHaveBeenCalledWith(null);
  });

  // -----------------------------------------------------------------------
  // 6. Has role="radiogroup" and aria-label="Shape tools"
  // -----------------------------------------------------------------------
  test('has role="radiogroup" and aria-label="Shape tools"', () => {
    render(<ShapeToolsGroup shapeMode={null} onShapeModeChange={jest.fn()} />);

    const group = screen.getByRole('radiogroup', { name: 'Shape tools' });
    expect(group).toBeInTheDocument();
    expect(group).toHaveAttribute('aria-label', 'Shape tools');
  });
});
