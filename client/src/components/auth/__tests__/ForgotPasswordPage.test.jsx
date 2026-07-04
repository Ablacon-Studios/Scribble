/**
 * Tests for the ForgotPasswordPage component.
 */
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ForgotPasswordPage from '../ForgotPasswordPage';
import { ApiError } from '../../../utils/api';

// Mocks
const mockForgotPassword = jest.fn();

jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    forgotPassword: mockForgotPassword,
    user: null,
    loading: false,
  }),
}));

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    Link: ({ children, to, ...props }) => (
      <a href={to} {...props}>{children}</a>
    ),
  };
});

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    mockForgotPassword.mockClear();
  });

  // -----------------------------------------------------------------------
  // Test 1: Renders email input and submit button
  // -----------------------------------------------------------------------
  test('renders email input and submit button', () => {
    render(<ForgotPasswordPage />);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // Test 2: Submit button is disabled when email is empty
  // -----------------------------------------------------------------------
  test('submit button is disabled when email is empty', () => {
    render(<ForgotPasswordPage />);

    const submitBtn = screen.getByRole('button', { name: /send reset link/i });
    expect(submitBtn).toBeDisabled();
  });

  // -----------------------------------------------------------------------
  // Test 3: Calls forgotPassword with trimmed email on valid submit
  // -----------------------------------------------------------------------
  test('calls forgotPassword with trimmed email on valid submit', async () => {
    mockForgotPassword.mockResolvedValueOnce({ message: 'Email sent' });
    const user = userEvent.setup();
    render(<ForgotPasswordPage />);

    await user.type(screen.getByLabelText(/email/i), '  test@example.com  ');
    await user.click(screen.getByRole('button', { name: /send reset link/i }));

    await waitFor(() => {
      expect(mockForgotPassword).toHaveBeenCalledWith('test@example.com');
    });
  });

  // -----------------------------------------------------------------------
  // Test 4: Shows success message after successful submission
  // -----------------------------------------------------------------------
  test('shows success message after successful submission', async () => {
    mockForgotPassword.mockResolvedValueOnce({ message: 'Email sent' });
    const user = userEvent.setup();
    render(<ForgotPasswordPage />);

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.click(screen.getByRole('button', { name: /send reset link/i }));

    await waitFor(() => {
      expect(screen.getByText(/check your email/i)).toBeInTheDocument();
    });
  });

  // -----------------------------------------------------------------------
  // Test 5: Success message includes "Check Your Email" and link back to login
  // -----------------------------------------------------------------------
  test('success message includes "Check Your Email" and link back to login', async () => {
    mockForgotPassword.mockResolvedValueOnce({ message: 'Email sent' });
    const user = userEvent.setup();
    render(<ForgotPasswordPage />);

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.click(screen.getByRole('button', { name: /send reset link/i }));

    await waitFor(() => {
      expect(screen.getByText(/check your email/i)).toBeInTheDocument();
    });

    const loginLink = screen.getByRole('link', { name: /back to log in/i });
    expect(loginLink).toBeInTheDocument();
    expect(loginLink).toHaveAttribute('href', '/login');
  });

  // -----------------------------------------------------------------------
  // Test 6: "try another email" button returns to form when clicked
  // -----------------------------------------------------------------------
  test('shows "try another email" button that returns to form when clicked', async () => {
    mockForgotPassword.mockResolvedValueOnce({ message: 'Email sent' });
    const user = userEvent.setup();
    render(<ForgotPasswordPage />);

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.click(screen.getByRole('button', { name: /send reset link/i }));

    await waitFor(() => {
      expect(screen.getByText(/check your email/i)).toBeInTheDocument();
    });

    // Click "try another email"
    await user.click(screen.getByRole('button', { name: /try another email/i }));

    // Should return to form
    await waitFor(() => {
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument();
    });
  });

  // -----------------------------------------------------------------------
  // Test 7: Shows error banner on network failure
  // -----------------------------------------------------------------------
  test('shows error banner on network failure', async () => {
    mockForgotPassword.mockRejectedValueOnce(new ApiError(500, 'Server error'));
    const user = userEvent.setup();
    render(<ForgotPasswordPage />);

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.click(screen.getByRole('button', { name: /send reset link/i }));

    await waitFor(() => {
      expect(screen.getByText(/unable to send reset email/i)).toBeInTheDocument();
    });
  });

  // -----------------------------------------------------------------------
  // Test 8: Shows error on rate limit (status 429)
  // -----------------------------------------------------------------------
  test('shows rate limit error on status 429', async () => {
    mockForgotPassword.mockRejectedValueOnce(new ApiError(429, 'Too many requests'));
    const user = userEvent.setup();
    render(<ForgotPasswordPage />);

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.click(screen.getByRole('button', { name: /send reset link/i }));

    await waitFor(() => {
      expect(screen.getByText(/too many requests/i)).toBeInTheDocument();
    });
  });

  // -----------------------------------------------------------------------
  // Test 9: Has a "Log in" link pointing to /login
  // -----------------------------------------------------------------------
  test('has a "Log in" link pointing to /login', () => {
    render(<ForgotPasswordPage />);

    const loginLink = screen.getByRole('link', { name: /^log in$/i });
    expect(loginLink).toBeInTheDocument();
    expect(loginLink).toHaveAttribute('href', '/login');
  });
});
