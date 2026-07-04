/**
 * Tests for the ResetPasswordPage component.
 */
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ResetPasswordPage from '../ResetPasswordPage';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockResetPassword = jest.fn();

jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    resetPassword: mockResetPassword,
    user: null,
    loading: false,
  }),
}));

// Shared mutable mock search params so individual tests can change the token
let mockSearchParams;

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useSearchParams: () => [mockSearchParams],
    Link: ({ children, to, ...props }) => (
      <a href={to} {...props}>{children}</a>
    ),
  };
});

describe('ResetPasswordPage', () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    global.fetch = jest.fn();
    mockResetPassword.mockClear();
    mockSearchParams = new URLSearchParams('token=test-reset-token');
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  // Helper: mock fetch for validate-reset-token to return valid: true
  function mockValidateToken(valid = true) {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ valid }),
    });
  }

  // -----------------------------------------------------------------------
  // Test 1: When no token in URL, shows "Invalid Reset Link"
  // -----------------------------------------------------------------------
  test('when no token in URL, shows "Invalid Reset Link" with link to /forgot-password', () => {
    mockSearchParams = new URLSearchParams('');

    render(<ResetPasswordPage />);

    expect(screen.getByText(/invalid reset link/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /request a new reset link/i })).toHaveAttribute('href', '/forgot-password');
  });

  // -----------------------------------------------------------------------
  // Test 2: Shows loading spinner while validating token
  // -----------------------------------------------------------------------
  test('shows loading spinner while validating token', () => {
    // Never resolve fetch so loading state persists
    global.fetch.mockImplementation(() => new Promise(() => {}));

    render(<ResetPasswordPage />);

    expect(screen.getByText(/verifying reset link/i)).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // Test 3: When token is invalid, shows "Link Expired" with link
  // -----------------------------------------------------------------------
  test('when token is invalid, shows "Link Expired" with link to /forgot-password', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ valid: false, error: 'Token has expired' }),
    });

    render(<ResetPasswordPage />);

    await waitFor(() => {
      expect(screen.getByText(/link expired/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/token has expired/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /request a new reset link/i })).toHaveAttribute('href', '/forgot-password');
  });

  // -----------------------------------------------------------------------
  // Test 4: When token is valid, shows reset form
  // -----------------------------------------------------------------------
  test('when token is valid, shows reset form with password and confirm password inputs', async () => {
    mockValidateToken(true);

    render(<ResetPasswordPage />);

    await waitFor(() => {
      expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
    });

    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset password/i })).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // Test 5: Shows error when passwords don't match
  // -----------------------------------------------------------------------
  test('shows error when passwords do not match', async () => {
    mockValidateToken(true);
    const user = userEvent.setup();

    render(<ResetPasswordPage />);

    await waitFor(() => {
      expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText(/new password/i), 'password123');
    await user.type(screen.getByLabelText(/confirm password/i), 'different456');
    await user.click(screen.getByRole('button', { name: /reset password/i }));

    expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // Test 6: Shows error when password is too short
  // -----------------------------------------------------------------------
  test('shows error when password is too short', async () => {
    mockValidateToken(true);
    const user = userEvent.setup();

    render(<ResetPasswordPage />);

    await waitFor(() => {
      expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText(/new password/i), 'short');
    await user.type(screen.getByLabelText(/confirm password/i), 'short');
    await user.click(screen.getByRole('button', { name: /reset password/i }));

    expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // Test 7: Calls reset password API with correct data on valid submit
  // -----------------------------------------------------------------------
  test('calls reset password API with correct data on valid submit', async () => {
    mockValidateToken(true);
    mockResetPassword.mockResolvedValueOnce({ message: 'Password reset successfully' });
    const user = userEvent.setup();

    render(<ResetPasswordPage />);

    await waitFor(() => {
      expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText(/new password/i), 'newPass123');
    await user.type(screen.getByLabelText(/confirm password/i), 'newPass123');
    await user.click(screen.getByRole('button', { name: /reset password/i }));

    await waitFor(() => {
      expect(mockResetPassword).toHaveBeenCalledWith('test-reset-token', 'newPass123');
    });
  });

  // -----------------------------------------------------------------------
  // Test 8: Shows success message after successful reset with link to /login
  // -----------------------------------------------------------------------
  test('shows success message after successful reset with link to /login', async () => {
    mockValidateToken(true);
    mockResetPassword.mockResolvedValueOnce({ message: 'Password reset successfully' });
    const user = userEvent.setup();

    render(<ResetPasswordPage />);

    await waitFor(() => {
      expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText(/new password/i), 'newPass123');
    await user.type(screen.getByLabelText(/confirm password/i), 'newPass123');
    await user.click(screen.getByRole('button', { name: /reset password/i }));

    await waitFor(() => {
      expect(screen.getByText(/password reset/i)).toBeInTheDocument();
    });

    expect(screen.getByRole('link', { name: /^log in$/i })).toHaveAttribute('href', '/login');
  });

  // -----------------------------------------------------------------------
  // Test 9: Shows error on API failure
  // -----------------------------------------------------------------------
  test('shows error on API failure during reset', async () => {
    mockValidateToken(true);
    mockResetPassword.mockRejectedValueOnce(new Error('Password reset failed'));
    const user = userEvent.setup();

    render(<ResetPasswordPage />);

    await waitFor(() => {
      expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText(/new password/i), 'newPass123');
    await user.type(screen.getByLabelText(/confirm password/i), 'newPass123');
    await user.click(screen.getByRole('button', { name: /reset password/i }));

    await waitFor(() => {
      expect(screen.getByText(/password reset failed/i)).toBeInTheDocument();
    });
  });

});
