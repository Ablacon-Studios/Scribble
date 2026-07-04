/**
 * Tests for the RegisterPage component.
 */
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RegisterPage from '../RegisterPage';
import { ApiError } from '../../../utils/api';

// Mocks
const mockNavigate = jest.fn();
const mockRegister = jest.fn();

jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    register: mockRegister,
    user: null,
    loading: false,
    logout: jest.fn(),
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

jest.mock('../../layout/Navbar', () => () => <div data-testid="navbar">Navbar</div>);

describe('RegisterPage', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockRegister.mockClear();
  });

  // -----------------------------------------------------------------------
  // Test 1: Renders all register fields
  // -----------------------------------------------------------------------
  test('renders all fields: name, username, email, password, confirm password', () => {
    render(<RegisterPage />);

    expect(screen.getByLabelText(/^name$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^username$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // Test 2: Validates passwords match
  // -----------------------------------------------------------------------
  test('shows error when passwords do not match', async () => {
    const user = userEvent.setup();
    render(<RegisterPage />);

    await user.type(screen.getByLabelText(/^name$/i), 'Test User');
    await user.type(screen.getByLabelText(/^username$/i), 'testuser');
    await user.type(screen.getByLabelText(/^email$/i), 'test@example.com');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.type(screen.getByLabelText(/confirm password/i), 'different456');

    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // Test 3: Calls register on valid submit
  // -----------------------------------------------------------------------
  test('calls register with correct data on valid submit', async () => {
    mockRegister.mockResolvedValueOnce({ user: { username: 'testuser' }, csrf_token: 'abc' });
    const user = userEvent.setup();
    render(<RegisterPage />);

    await user.type(screen.getByLabelText(/^name$/i), 'Test User');
    await user.type(screen.getByLabelText(/^username$/i), 'testuser');
    await user.type(screen.getByLabelText(/^email$/i), 'test@example.com');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.type(screen.getByLabelText(/confirm password/i), 'password123');

    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith(
        'Test User', 'testuser', 'test@example.com', 'password123'
      );
    });
  });

  // -----------------------------------------------------------------------
  // Test 4: Shows error on duplicate (409)
  // -----------------------------------------------------------------------
  test('shows error when duplicate username (409)', async () => {
    mockRegister.mockRejectedValueOnce(new ApiError(409, 'Username is already taken'));

    const user = userEvent.setup();
    render(<RegisterPage />);

    await user.type(screen.getByLabelText(/^name$/i), 'Test User');
    await user.type(screen.getByLabelText(/^username$/i), 'testuser');
    await user.type(screen.getByLabelText(/^email$/i), 'test@example.com');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.type(screen.getByLabelText(/confirm password/i), 'password123');

    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findAllByText(/username is already taken/i)).not.toHaveLength(0);
  });

  // -----------------------------------------------------------------------
  // Test 5: Has link to login page
  // -----------------------------------------------------------------------
  test('has a link to the login page', () => {
    render(<RegisterPage />);

    const loginLink = screen.getByRole('link', { name: /log in/i });
    expect(loginLink).toBeInTheDocument();
    expect(loginLink).toHaveAttribute('href', '/login');
  });
});
