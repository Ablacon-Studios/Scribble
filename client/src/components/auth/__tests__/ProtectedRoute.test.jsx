/**
 * Tests for the ProtectedRoute component.
 */
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import ProtectedRoute from '../ProtectedRoute';

// We create a mock for useAuth and react-router-dom
const mockUseAuth = jest.fn();

jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

// We need a minimal mock for Navigate to verify it's rendered
jest.mock('react-router-dom', () => ({
  Navigate: ({ to }) => <div data-testid="navigate">Redirect to {to}</div>,
}));

describe('ProtectedRoute', () => {
  beforeEach(() => {
    mockUseAuth.mockClear();
  });

  // -----------------------------------------------------------------------
  // Test 1: Renders children when authenticated
  // -----------------------------------------------------------------------
  test('renders children when user is authenticated', () => {
    mockUseAuth.mockReturnValue({ user: { username: 'test' }, loading: false });

    render(
      <ProtectedRoute>
        <div data-testid="protected-content">Protected Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    expect(screen.queryByTestId('navigate')).not.toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // Test 2: Redirects to /login when not authenticated
  // -----------------------------------------------------------------------
  test('redirects to /login when user is null', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });

    render(
      <ProtectedRoute>
        <div data-testid="protected-content">Protected Content</div>
      </ProtectedRoute>
    );

    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    expect(screen.getByTestId('navigate')).toHaveTextContent('/login');
  });

  // -----------------------------------------------------------------------
  // Test 3: Renders nothing while loading
  // -----------------------------------------------------------------------
  test('renders nothing while loading is true', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true });

    const { container } = render(
      <ProtectedRoute>
        <div data-testid="protected-content">Protected Content</div>
      </ProtectedRoute>
    );

    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    expect(screen.queryByTestId('navigate')).not.toBeInTheDocument();
    // The component returns null, so container should be empty
    expect(container.innerHTML).toBe('');
  });
});
