/**
 * Tests for the UnsavedChangesDialog component.
 */
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UnsavedChangesDialog from '../../components/projects/UnsavedChangesDialog';

describe('UnsavedChangesDialog', () => {
  const mockOnSave = jest.fn();
  const mockOnDiscard = jest.fn();
  const mockOnCancel = jest.fn();

  function renderDialog(props = {}) {
    return render(
      <UnsavedChangesDialog
        isOpen={true}
        onSave={mockOnSave}
        onDiscard={mockOnDiscard}
        onCancel={mockOnCancel}
        {...props}
      />
    );
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders dialog when isOpen is true', () => {
    renderDialog();

    expect(screen.getByTestId('unsaved-changes-dialog')).toBeInTheDocument();
  });

  test('does not render when isOpen is false', () => {
    render(
      <UnsavedChangesDialog
        isOpen={false}
        onSave={mockOnSave}
        onDiscard={mockOnDiscard}
        onCancel={mockOnCancel}
      />
    );

    expect(
      screen.queryByTestId('unsaved-changes-dialog')
    ).not.toBeInTheDocument();
  });

  test('shows unsaved changes title and body text', () => {
    renderDialog();

    expect(screen.getByText('Unsaved Changes')).toBeInTheDocument();
    expect(
      screen.getByText(/You have unsaved changes/)
    ).toBeInTheDocument();
  });

  test('shows Save First button', () => {
    renderDialog();

    const saveBtn = screen.getByText('Save First');
    expect(saveBtn).toBeInTheDocument();
  });

  test('shows "Discard & Continue" button', () => {
    renderDialog();

    const discardBtn = screen.getByText(/Discard & Continue/);
    expect(discardBtn).toBeInTheDocument();
  });

  test('shows Cancel button', () => {
    renderDialog();

    const cancelBtn = screen.getByText('Cancel');
    expect(cancelBtn).toBeInTheDocument();
  });

  test('clicking Save First calls onSave', async () => {
    renderDialog();

    const saveBtn = screen.getByText('Save First');
    await userEvent.setup().click(saveBtn);

    expect(mockOnSave).toHaveBeenCalledTimes(1);
  });

  test('clicking "Discard & Continue" calls onDiscard', async () => {
    renderDialog();

    const discardBtn = screen.getByText(/Discard & Continue/);
    await userEvent.setup().click(discardBtn);

    expect(mockOnDiscard).toHaveBeenCalledTimes(1);
  });

  test('clicking Cancel calls onCancel', async () => {
    renderDialog();

    const cancelBtn = screen.getByText('Cancel');
    await userEvent.setup().click(cancelBtn);

    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });
});
