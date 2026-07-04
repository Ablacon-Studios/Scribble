/**
 * Tests for the VerifyEmailPage component.
 */
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import VerifyEmailPage from '../VerifyEmailPage';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockVerifyEmail = jest.fn();

jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    verifyEmail: mockVerifyEmail,
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

describe('VerifyEmailPage', () => {
  beforeEach(() => {
    mockVerifyEmail.mockClear();
    mockSearchParams = new URLSearchParams('token=test-verify-token');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // -----------------------------------------------------------------------
  // Test 1: When no token in URL, shows "Invalid Verification Link"
  // -----------------------------------------------------------------------
  test('when no token in URL, shows "Invalid Verification Link" with link to /profile', () => {
    mockSearchParams = new URLSearchParams('');

    render(<VerifyEmailPage />);

    expect(screen.getByText(/invalid verification link/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /go to profile/i })).toHaveAttribute('href', '/profile');
  });

  // -----------------------------------------------------------------------
  // Test 2: Shows loading spinner on mount with token
  // -----------------------------------------------------------------------
  test('shows loading spinner on mount with token', () => {
    // Never resolve verifyEmail so loading state persists
    mockVerifyEmail.mockImplementation(() => new Promise(() => {}));

    render(<VerifyEmailPage />);

    expect(screen.getByText(/verifying your email/i)).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // Test 3: Shows success message when verification succeeds
  // -----------------------------------------------------------------------
  test('shows success message when verification succeeds', async () => {
    mockVerifyEmail.mockResolvedValueOnce({ message: 'Email verified' });

    render(<VerifyEmailPage />);

    await waitFor(() => {
      expect(screen.getByText(/email verified/i)).toBeInTheDocument();
    });
  });

  // -----------------------------------------------------------------------
  // Test 4: Shows error message when verification fails (400)
  // -----------------------------------------------------------------------
  test('shows error message when verification fails', async () => {
    mockVerifyEmail.mockRejectedValueOnce(new Error('Invalid or expired verification token'));

    render(<VerifyEmailPage />);

    await waitFor(() => {
      expect(screen.getByText(/verification failed/i)).toBeInTheDocument();
      expect(screen.getByText(/invalid or expired verification token/i)).toBeInTheDocument();
    });
  });

  // -----------------------------------------------------------------------
  // Test 5: Shows error message on network failure
  // -----------------------------------------------------------------------
  test('shows error message on network failure', async () => {
    mockVerifyEmail.mockRejectedValueOnce(new Error('Unable to verify email. Please try again later.'));

    render(<VerifyEmailPage />);

    await waitFor(() => {
      expect(screen.getByText(/verification failed/i)).toBeInTheDocument();
      expect(screen.getByText(/unable to verify email/i)).toBeInTheDocument();
    });
  });

  // -----------------------------------------------------------------------
  // Test 6: "Go to Profile" link exists in success state
  // -----------------------------------------------------------------------
  test('"Go to Profile" link exists in success state', async () => {
    mockVerifyEmail.mockResolvedValueOnce({ message: 'Email verified' });

    render(<VerifyEmailPage />);

    await waitFor(() => {
      expect(screen.getByText(/email verified/i)).toBeInTheDocument();
    });

    const profileLink = screen.getByRole('link', { name: /go to profile/i });
    expect(profileLink).toBeInTheDocument();
    expect(profileLink).toHaveAttribute('href', '/profile');
  });

  // -----------------------------------------------------------------------
  // Test 7: "Go to Profile" link exists in error state
  // -----------------------------------------------------------------------
  test('"Go to Profile" link exists in error state', async () => {
    mockVerifyEmail.mockRejectedValueOnce(new Error('Token expired'));

    render(<VerifyEmailPage />);

    await waitFor(() => {
      expect(screen.getByText(/verification failed/i)).toBeInTheDocument();
    });

    const profileLink = screen.getByRole('link', { name: /go to profile/i });
    expect(profileLink).toBeInTheDocument();
    expect(profileLink).toHaveAttribute('href', '/profile');
  });
});
