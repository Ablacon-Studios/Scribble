/**
 * Tests for the ProjectControls component.
 */
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProjectControls from '../../components/toolbar/ProjectControls';

describe('ProjectControls', () => {
  const defaultProps = {
    hasActiveProject: false,
    isDirty: false,
    canSave: false,
    isSaving: false,
    onProjectNew: jest.fn(),
    onProjectSave: jest.fn(),
    onProjectLoad: jest.fn(),
  };

  function renderControls(props = {}) {
    return render(<ProjectControls {...defaultProps} {...props} />);
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('save button is disabled when canSave is false', () => {
    renderControls({ canSave: false });

    const saveBtn = screen.getByTestId('save-project-button');
    expect(saveBtn).toBeDisabled();
  });

  test('save button is enabled when canSave is true', () => {
    renderControls({ canSave: true });

    const saveBtn = screen.getByTestId('save-project-button');
    expect(saveBtn).not.toBeDisabled();
  });

  test('save button triggers onProjectSave when clicked', async () => {
    const onProjectSave = jest.fn();
    renderControls({ canSave: true, onProjectSave });

    const saveBtn = screen.getByTestId('save-project-button');
    await userEvent.setup().click(saveBtn);

    expect(onProjectSave).toHaveBeenCalledTimes(1);
  });

  test('load button triggers onProjectLoad when clicked', async () => {
    const onProjectLoad = jest.fn();
    renderControls({ onProjectLoad });

    const loadBtn = screen.getByTestId('open-projects-button');
    await userEvent.setup().click(loadBtn);

    expect(onProjectLoad).toHaveBeenCalledTimes(1);
  });

  test('new project button triggers onProjectNew when clicked', async () => {
    const onProjectNew = jest.fn();
    renderControls({ onProjectNew });

    const newBtn = screen.getByTestId('new-project-button');
    await userEvent.setup().click(newBtn);

    expect(onProjectNew).toHaveBeenCalledTimes(1);
  });

  test('shows unsaved changes indicator when isDirty is true', () => {
    renderControls({ isDirty: true });

    const saveBtn = screen.getByTestId('save-project-button');
    // The unsaved indicator is a span with animate-pulse inside the save button
    const indicator = saveBtn.querySelector('.animate-pulse');
    expect(indicator).toBeInTheDocument();
  });

  test('does not show unsaved indicator when isDirty is false', () => {
    renderControls({ isDirty: false });

    const saveBtn = screen.getByTestId('save-project-button');
    const indicator = saveBtn.querySelector('.animate-pulse');
    expect(indicator).not.toBeInTheDocument();
  });

  test('save button is disabled when isSaving is true', () => {
    renderControls({ canSave: true, isSaving: true });

    const saveBtn = screen.getByTestId('save-project-button');
    expect(saveBtn).toBeDisabled();
  });

  test('save button has correct aria-label when dirty', () => {
    renderControls({ isDirty: true });

    const saveBtn = screen.getByTestId('save-project-button');
    expect(saveBtn).toHaveAttribute('aria-label', 'Save changes');
  });

  test('save button has correct aria-label when clean', () => {
    renderControls({ isDirty: false });

    const saveBtn = screen.getByTestId('save-project-button');
    expect(saveBtn).toHaveAttribute('aria-label', 'Save project');
  });
});
