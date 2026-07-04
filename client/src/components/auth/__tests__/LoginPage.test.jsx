/**
 * Tests for the LoginPage component.
 */
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginPage from '../LoginPage';
import { ApiError } from '../../../utils/api';

// Mocks
const mockNavigate = jest.fn();
const mockLogin = jest.fn();

jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    login: mockLogin,
    user: null,
    loading: false,
  }),
}));

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    Link: ({ children, to, ...props }) => (
      <a href={to} {...props}>{children}</a>
    ),
  };
});

// Mock Navbar to simplify tests
jest.mock('../../layout/Navbar', () => () => <div data-testid="navbar">Navbar</div>);

describe('LoginPage', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockLogin.mockClear();
  });

  // -----------------------------------------------------------------------
  // Test 1: Renders login form fields
  // -----------------------------------------------------------------------
  test('renders username/email and password fields', () => {
    render(<LoginPage />);

    expect(screen.getByLabelText(/username or email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // Test 2: Button is disabled when fields are empty
  // -----------------------------------------------------------------------
  test('submit button is disabled when fields are empty', () => {
    render(<LoginPage />);

    const submitBtn = screen.getByRole('button', { name: /log in/i });
    expect(submitBtn).toBeDisabled();
  });

  // -----------------------------------------------------------------------
  // Test 3: Calls login on valid submit
  // -----------------------------------------------------------------------
  test('calls login with correct arguments on valid submit', async () => {
    mockLogin.mockResolvedValueOnce({ user: { username: 'test' } });
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText(/username or email/i), 'testuser');
    await user.type(screen.getByLabelText(/^password$/i), 'mypassword');
    await user.click(screen.getByRole('button', { name: /log in/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('testuser', 'mypassword');
    });
  });

  // -----------------------------------------------------------------------
  // Test 4: Shows error on failed login
  // -----------------------------------------------------------------------
  test('shows error message on failed login', async () => {
    mockLogin.mockRejectedValueOnce(new ApiError(401, 'Invalid username/email or password'));

    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText(/username or email/i), 'testuser');
    await user.type(screen.getByLabelText(/^password$/i), 'wrongpass');
    await user.click(screen.getByRole('button', { name: /log in/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid username\/email or password/i)).toBeInTheDocument();
    });
  });

  // -----------------------------------------------------------------------
  // Test 5: Redirects on successful login
  // -----------------------------------------------------------------------
  test('redirects to /profile on successful login', async () => {
    mockLogin.mockResolvedValueOnce({ user: { username: 'test' } });
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText(/username or email/i), 'testuser');
    await user.type(screen.getByLabelText(/^password$/i), 'mypassword');
    await user.click(screen.getByRole('button', { name: /log in/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  // -----------------------------------------------------------------------
  // Test 6: Has link to register page
  // -----------------------------------------------------------------------
  test('has a link to the register page', () => {
    render(<LoginPage />);

    const registerLink = screen.getByRole('link', { name: /sign up/i });
    expect(registerLink).toBeInTheDocument();
    expect(registerLink).toHaveAttribute('href', '/register');
  });

  // -----------------------------------------------------------------------
  // Test 7: "Forgot password?" link exists and links to /forgot-password
  // -----------------------------------------------------------------------
  test('"Forgot password?" link exists and links to /forgot-password', () => {
    render(<LoginPage />);

    const forgotPasswordLink = screen.getByRole('link', { name: /forgot password/i });
    expect(forgotPasswordLink).toBeInTheDocument();
    expect(forgotPasswordLink).toHaveAttribute('href', '/forgot-password');
  });
});
