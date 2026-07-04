/**
 * Tests for the Navbar component.
 */
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Navbar from '../Navbar';

// Mocks
const mockNavigate = jest.fn();
const mockLogout = jest.fn();
const mockUseAuth = jest.fn();

jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  Link: ({ children, to, ...props }) => (
    <a href={to} {...props}>{children}</a>
  ),
}));

describe('Navbar', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockLogout.mockClear();
    mockUseAuth.mockClear();
  });

  // -----------------------------------------------------------------------
  // Test 1: Shows Login and Register when unauthenticated
  // -----------------------------------------------------------------------
  test('shows Login and Register links when user is null', () => {
    mockUseAuth.mockReturnValue({ user: null, logout: mockLogout });

    render(<Navbar />);

    expect(screen.getByText('Login')).toBeInTheDocument();
    expect(screen.getByText('Register')).toBeInTheDocument();
    expect(screen.queryByText('Profile')).not.toBeInTheDocument();
    expect(screen.queryByText('Logout')).not.toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // Test 2: Shows Profile and Logout when authenticated
  // -----------------------------------------------------------------------
  test('shows Profile link and Logout button when authenticated', () => {
    mockUseAuth.mockReturnValue({ user: { username: 'test' }, logout: mockLogout });

    render(<Navbar />);

    expect(screen.getByText('Profile')).toBeInTheDocument();
    expect(screen.getByText('Logout')).toBeInTheDocument();
    expect(screen.queryByText('Login')).not.toBeInTheDocument();
    expect(screen.queryByText('Register')).not.toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // Test 3: Logout button calls logout and navigates to /login
  // -----------------------------------------------------------------------
  test('clicking Logout calls logout and navigates to /login', async () => {
    mockLogout.mockResolvedValueOnce();
    mockUseAuth.mockReturnValue({ user: { username: 'test' }, logout: mockLogout });

    const user = userEvent.setup();
    render(<Navbar />);

    await user.click(screen.getByText('Logout'));

    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });
});
