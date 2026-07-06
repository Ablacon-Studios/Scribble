/**
 * Tests for the SaveProjectModal component.
 */
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SaveProjectModal from '../../components/projects/SaveProjectModal';

describe('SaveProjectModal', () => {
  const mockOnSave = jest.fn();
  const mockOnClose = jest.fn();

  function renderModal(props = {}) {
    return render(
      <SaveProjectModal
        isOpen={true}
        onSave={mockOnSave}
        onClose={mockOnClose}
        isSaving={false}
        error={null}
        {...props}
      />
    );
  }

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock requestAnimationFrame for focus logic
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      cb();
      return 1;
    });
  });

  afterEach(() => {
    window.requestAnimationFrame.mockRestore?.();
  });

  test('renders when isOpen is true', () => {
    renderModal();

    expect(screen.getByTestId('save-project-modal')).toBeInTheDocument();
    expect(screen.getByText('Save Project')).toBeInTheDocument();
    expect(screen.getByTestId('project-name-input')).toBeInTheDocument();
  });

  test('does not render when isOpen is false', () => {
    render(
      <SaveProjectModal
        isOpen={false}
        onSave={mockOnSave}
        onClose={mockOnClose}
        isSaving={false}
        error={null}
      />
    );

    expect(screen.queryByTestId('save-project-modal')).not.toBeInTheDocument();
  });

  test('input field accepts project name', async () => {
    const user = userEvent.setup();
    renderModal();

    const input = screen.getByTestId('project-name-input');
    await user.type(input, 'My Cool Drawing');

    expect(input.value).toBe('My Cool Drawing');
  });

  test('save button is disabled when input is empty', () => {
    renderModal();

    const saveBtn = screen.getByTestId('save-project-submit');
    expect(saveBtn).toBeDisabled();
  });

  test('save button is enabled when input has text', async () => {
    const user = userEvent.setup();
    renderModal();

    const input = screen.getByTestId('project-name-input');
    await user.type(input, 'A');

    const saveBtn = screen.getByTestId('save-project-submit');
    expect(saveBtn).not.toBeDisabled();
  });

  test('save button calls onSave with entered name', async () => {
    const user = userEvent.setup();
    renderModal();

    const input = screen.getByTestId('project-name-input');
    await user.type(input, 'My Masterpiece');

    const saveBtn = screen.getByTestId('save-project-submit');
    await user.click(saveBtn);

    expect(mockOnSave).toHaveBeenCalledTimes(1);
    expect(mockOnSave).toHaveBeenCalledWith('My Masterpiece');
  });

  test('cancel button calls onClose', async () => {
    const user = userEvent.setup();
    renderModal();

    const cancelBtn = screen.getByText('Cancel');
    await user.click(cancelBtn);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test('pressing Enter triggers save', async () => {
    const user = userEvent.setup();
    renderModal();

    const input = screen.getByTestId('project-name-input');
    await user.type(input, 'Quick Save');
    await user.keyboard('{Enter}');

    expect(mockOnSave).toHaveBeenCalledTimes(1);
    expect(mockOnSave).toHaveBeenCalledWith('Quick Save');
  });

  test('displays error message when provided', () => {
    renderModal({ error: 'Failed to save project' });

    expect(screen.getByTestId('save-project-error')).toBeInTheDocument();
    expect(screen.getByText('Failed to save project')).toBeInTheDocument();
  });

  test('save button shows spinner and is disabled when isSaving is true', () => {
    renderModal({ isSaving: true });

    const saveBtn = screen.getByTestId('save-project-submit');
    expect(saveBtn).toBeDisabled();
    // Should still show Save text, spinner is an SVG within
    expect(saveBtn.textContent).toContain('Save');
  });
});
