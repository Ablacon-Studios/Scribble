/**
 * Tests for the UndoRedoToggle component.
 */
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import UndoRedoToggle from '../UndoRedoToggle';

describe('UndoRedoToggle', () => {
  // -----------------------------------------------------------------------
  // 1. Renders Undo and Redo buttons
  // -----------------------------------------------------------------------
  test('renders Undo and Redo buttons', () => {
    render(
      <UndoRedoToggle
        canUndo
        canRedo
        onUndo={jest.fn()}
        onRedo={jest.fn()}
      />
    );

    const undoBtn = screen.getByRole('button', { name: /undo last stroke/i });
    const redoBtn = screen.getByRole('button', { name: /redo last undone stroke/i });

    expect(undoBtn).toBeInTheDocument();
    expect(redoBtn).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // 2. Undo button calls onUndo handler on click
  // -----------------------------------------------------------------------
  test('Undo button calls onUndo handler on click', () => {
    const onUndo = jest.fn();
    const onRedo = jest.fn();

    render(
      <UndoRedoToggle
        canUndo
        canRedo
        onUndo={onUndo}
        onRedo={onRedo}
      />
    );

    const undoBtn = screen.getByRole('button', { name: /undo last stroke/i });
    fireEvent.click(undoBtn);

    expect(onUndo).toHaveBeenCalledTimes(1);
    expect(onRedo).not.toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // 3. Redo button calls onRedo handler on click
  // -----------------------------------------------------------------------
  test('Redo button calls onRedo handler on click', () => {
    const onUndo = jest.fn();
    const onRedo = jest.fn();

    render(
      <UndoRedoToggle
        canUndo
        canRedo
        onUndo={onUndo}
        onRedo={onRedo}
      />
    );

    const redoBtn = screen.getByRole('button', { name: /redo last undone stroke/i });
    fireEvent.click(redoBtn);

    expect(onRedo).toHaveBeenCalledTimes(1);
    expect(onUndo).not.toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // 4. Undo button is disabled when canUndo={false}
  // -----------------------------------------------------------------------
  test('Undo button is disabled when canUndo={false}', () => {
    render(
      <UndoRedoToggle
        canUndo={false}
        canRedo
        onUndo={jest.fn()}
        onRedo={jest.fn()}
      />
    );

    const undoBtn = screen.getByRole('button', { name: /undo last stroke/i });
    expect(undoBtn).toBeDisabled();
  });

  // -----------------------------------------------------------------------
  // 5. Redo button is disabled when canRedo={false}
  // -----------------------------------------------------------------------
  test('Redo button is disabled when canRedo={false}', () => {
    render(
      <UndoRedoToggle
        canUndo
        canRedo={false}
        onUndo={jest.fn()}
        onRedo={jest.fn()}
      />
    );

    const redoBtn = screen.getByRole('button', { name: /redo last undone stroke/i });
    expect(redoBtn).toBeDisabled();
  });

  // -----------------------------------------------------------------------
  // 6. Buttons are enabled when flags are true
  // -----------------------------------------------------------------------
  test('Both buttons are enabled when canUndo and canRedo are true', () => {
    render(
      <UndoRedoToggle
        canUndo
        canRedo
        onUndo={jest.fn()}
        onRedo={jest.fn()}
      />
    );

    const undoBtn = screen.getByRole('button', { name: /undo last stroke/i });
    const redoBtn = screen.getByRole('button', { name: /redo last undone stroke/i });

    expect(undoBtn).not.toBeDisabled();
    expect(redoBtn).not.toBeDisabled();
  });

  // -----------------------------------------------------------------------
  // 7. Accessible labels present
  // -----------------------------------------------------------------------
  test('buttons have accessible aria-labels with descriptive text', () => {
    render(
      <UndoRedoToggle
        canUndo
        canRedo
        onUndo={jest.fn()}
        onRedo={jest.fn()}
      />
    );

    const undoBtn = screen.getByRole('button', { name: /undo last stroke/i });
    const redoBtn = screen.getByRole('button', { name: /redo last undone stroke/i });

    expect(undoBtn).toHaveAttribute('aria-label', 'Undo last stroke');
    expect(redoBtn).toHaveAttribute('aria-label', 'Redo last undone stroke');
  });

  // -----------------------------------------------------------------------
  // 8. Focus-visible ring on keyboard navigation
  // -----------------------------------------------------------------------
  test('buttons have focus-visible ring styling for keyboard navigation', () => {
    render(
      <UndoRedoToggle
        canUndo
        canRedo
        onUndo={jest.fn()}
        onRedo={jest.fn()}
      />
    );

    const undoBtn = screen.getByRole('button', { name: /undo last stroke/i });
    const redoBtn = screen.getByRole('button', { name: /redo last undone stroke/i });

    // Both buttons should have the focus-visible ring classes
    expect(undoBtn.className).toContain('focus-visible:ring-2');
    expect(undoBtn.className).toContain('focus-visible:ring-scribble-primary');
    expect(undoBtn.className).toContain('focus-visible:ring-offset-2');

    expect(redoBtn.className).toContain('focus-visible:ring-2');
    expect(redoBtn.className).toContain('focus-visible:ring-scribble-primary');
    expect(redoBtn.className).toContain('focus-visible:ring-offset-2');
  });

  // -----------------------------------------------------------------------
  // 9. Disabled buttons do not fire click handlers
  // -----------------------------------------------------------------------
  test('disabled undo button does not fire onUndo when clicked', () => {
    const onUndo = jest.fn();

    render(
      <UndoRedoToggle
        canUndo={false}
        canRedo
        onUndo={onUndo}
        onRedo={jest.fn()}
      />
    );

    const undoBtn = screen.getByRole('button', { name: /undo last stroke/i });
    fireEvent.click(undoBtn);

    expect(onUndo).not.toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // 10. Tooltips show keyboard shortcuts
  // -----------------------------------------------------------------------
  test('buttons have title attributes with keyboard shortcut hints', () => {
    render(
      <UndoRedoToggle
        canUndo
        canRedo
        onUndo={jest.fn()}
        onRedo={jest.fn()}
      />
    );

    const undoBtn = screen.getByRole('button', { name: /undo last stroke/i });
    const redoBtn = screen.getByRole('button', { name: /redo last undone stroke/i });

    expect(undoBtn).toHaveAttribute('title', 'Undo (Ctrl+Z)');
    expect(redoBtn).toHaveAttribute('title', 'Redo (Ctrl+Shift+Z)');
  });
});
