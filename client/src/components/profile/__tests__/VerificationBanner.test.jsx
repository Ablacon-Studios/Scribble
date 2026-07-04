/**
 * Tests for the VerificationBanner component.
 */
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import VerificationBanner from '../VerificationBanner';
import { ApiError } from '../../../utils/api';

// Mocks
const mockResendVerification = jest.fn();
const mockUseAuth = jest.fn();

function mockAuth(overrides = {}) {
  mockUseAuth.mockReturnValue({
    user: { id: 1, verified: false },
    resendVerification: mockResendVerification,
    loading: false,
    ...overrides,
    user: { id: 1, ...overrides.user },
  });
}

jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

describe('VerificationBanner', () => {
  beforeEach(() => {
    mockUseAuth.mockClear();
    mockResendVerification.mockClear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // -----------------------------------------------------------------------
  // Test 1: Always renders (parent controls visibility via user.verified)
  // -----------------------------------------------------------------------
  test('renders amber warning banner in default idle state', () => {
    mockAuth({ user: { verified: false } });

    render(<VerificationBanner />);

    expect(screen.getByText(/your email is not verified/i)).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /resend verification email/i })).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // Test 2: "Resend verification email" button calls resendVerification
  // -----------------------------------------------------------------------
  test('"Resend verification email" button calls resendVerification', async () => {
    mockAuth({ user: { verified: false } });
    mockResendVerification.mockResolvedValueOnce({ message: 'Email sent' });
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    render(<VerificationBanner />);

    await user.click(screen.getByRole('button', { name: /resend verification email/i }));

    expect(mockResendVerification).toHaveBeenCalledTimes(1);
  });

  // -----------------------------------------------------------------------
  // Test 3: Shows sending state when resend is in progress
  // -----------------------------------------------------------------------
  test('shows sending state when resend is in progress', async () => {
    mockAuth({ user: { verified: false } });
    // Never resolve so it stays in sending state
    mockResendVerification.mockImplementation(() => new Promise(() => {}));
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    render(<VerificationBanner />);

    await user.click(screen.getByRole('button', { name: /resend verification email/i }));

    expect(screen.getByText(/sending/i)).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // Test 4: Shows success message after successful resend
  // -----------------------------------------------------------------------
  test('shows success message after successful resend', async () => {
    mockAuth({ user: { verified: false } });
    mockResendVerification.mockResolvedValueOnce({ message: 'Verification email sent' });
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    render(<VerificationBanner />);

    await user.click(screen.getByRole('button', { name: /resend verification email/i }));

    await waitFor(() => {
      expect(screen.getByText(/verification email sent/i)).toBeInTheDocument();
    });
  });

  // -----------------------------------------------------------------------
  // Test 5: Shows error message on resend failure
  // -----------------------------------------------------------------------
  test('shows error message on resend failure', async () => {
    mockAuth({ user: { verified: false } });
    mockResendVerification.mockRejectedValueOnce(new ApiError(500, 'Failed to send verification email. Please try again.'));
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    render(<VerificationBanner />);

    await user.click(screen.getByRole('button', { name: /resend verification email/i }));

    await waitFor(() => {
      expect(screen.getByText(/failed to send verification email/i)).toBeInTheDocument();
    });
  });

  // -----------------------------------------------------------------------
  // Test 6: Success message has dismiss button
  // -----------------------------------------------------------------------
  test('success message has dismiss button', async () => {
    mockAuth({ user: { verified: false } });
    mockResendVerification.mockResolvedValueOnce({ message: 'Verification email sent' });
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    render(<VerificationBanner />);

    await user.click(screen.getByRole('button', { name: /resend verification email/i }));

    await waitFor(() => {
      expect(screen.getByText(/verification email sent/i)).toBeInTheDocument();
    });

    const dismissBtn = screen.getByRole('button', { name: /dismiss/i });
    expect(dismissBtn).toBeInTheDocument();

    await user.click(dismissBtn);

    // Should go back to the initial warning banner
    await waitFor(() => {
      expect(screen.getByText(/your email is not verified/i)).toBeInTheDocument();
    });
  });

  // -----------------------------------------------------------------------
  // Test 7: Shows rate limit error on 429
  // -----------------------------------------------------------------------
  test('shows rate limit error on 429', async () => {
    mockAuth({ user: { verified: false } });
    mockResendVerification.mockRejectedValueOnce(new ApiError(429, 'Too many verification emails sent'));
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    render(<VerificationBanner />);

    await user.click(screen.getByRole('button', { name: /resend verification email/i }));

    await waitFor(() => {
      expect(screen.getByText(/too many verification emails sent/i)).toBeInTheDocument();
    });
  });
});
