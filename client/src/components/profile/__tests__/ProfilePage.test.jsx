/**
 * Tests for the ProfilePage component.
 */
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProfilePage from '../ProfilePage';

// Mocks
const mockUpdateProfile = jest.fn();
const mockChangeEmail = jest.fn();
const mockChangePassword = jest.fn();
const mockRefreshUser = jest.fn();
const mockLogout = jest.fn();

const defaultUser = {
  id: 1,
  name: 'Test User',
  username: 'testuser',
  email: 'test@example.com',
  created_at: '2024-01-15T00:00:00Z',
};

const mockUseAuth = jest.fn();

function mockAuth(overrides = {}) {
  mockUseAuth.mockReturnValue({
    user: defaultUser,
    loading: false,
    updateProfile: mockUpdateProfile,
    changeEmail: mockChangeEmail,
    changePassword: mockChangePassword,
    refreshUser: mockRefreshUser,
    logout: mockLogout,
    ...overrides,
  });
}

jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('../../layout/Navbar', () => () => <div data-testid="navbar">Navbar</div>);

describe('ProfilePage', () => {
  beforeEach(() => {
    mockUseAuth.mockClear();
    mockUpdateProfile.mockClear();
    mockChangeEmail.mockClear();
    mockChangePassword.mockClear();
    mockRefreshUser.mockClear();
    mockLogout.mockClear();
  });

  // -----------------------------------------------------------------------
  // Test 1: Displays user info
  // -----------------------------------------------------------------------
  test('displays user name, username, and email', () => {
    mockAuth();

    render(<ProfilePage />);

    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('testuser')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // Test 2: Edit mode shows input fields
  // -----------------------------------------------------------------------
  test('clicking Edit shows input fields for name and username', async () => {
    mockAuth();
    const user = userEvent.setup();
    render(<ProfilePage />);

    // Click Edit button
    const editBtn = screen.getByRole('button', { name: /edit/i });
    await user.click(editBtn);

    // Name input should appear
    expect(screen.getByLabelText(/display name/i)).toBeInTheDocument();
    // Username input should appear
    expect(screen.getByLabelText(/^username$/i)).toBeInTheDocument();
    // Save and Cancel buttons should appear
    expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // Test 3: Cancel discards changes
  // -----------------------------------------------------------------------
  test('clicking Cancel after editing discards changes and returns to view mode', async () => {
    mockAuth();
    const user = userEvent.setup();
    render(<ProfilePage />);

    // Enter edit mode
    await user.click(screen.getByRole('button', { name: /edit/i }));

    // Change name
    const nameInput = screen.getByLabelText(/display name/i);
    await user.clear(nameInput);
    await user.type(nameInput, 'New Name');

    // Click Cancel
    await user.click(screen.getByRole('button', { name: /cancel/i }));

    // Should be back in view mode with original name
    expect(screen.getByText('Test User')).toBeInTheDocument();
    // Edit button should be visible again
    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // Test 4: Change email form renders
  // -----------------------------------------------------------------------
  test('change email section has new email and password inputs', () => {
    mockAuth();

    render(<ProfilePage />);

    // The Change Email heading should be present
    expect(screen.getByRole('heading', { name: /change email/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/new email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/current password.*verification/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /update email/i })).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // Test 5: Change password form renders
  // -----------------------------------------------------------------------
  test('change password section has all three password inputs', () => {
    mockAuth();

    render(<ProfilePage />);

    // The Change Password heading should be present (use heading role to be specific)
    expect(screen.getByRole('heading', { name: /change password/i })).toBeInTheDocument();
    expect(screen.getByLabelText('Current Password')).toBeInTheDocument();
    expect(screen.getByLabelText('New Password')).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm new password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /change password/i })).toBeInTheDocument();
  });
});
