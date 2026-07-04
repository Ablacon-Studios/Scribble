/**
 * Tests for the GuestRoute component.
 */
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import GuestRoute from '../GuestRoute';

const mockUseAuth = jest.fn();

jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('react-router-dom', () => ({
  Navigate: ({ to }) => <div data-testid="navigate">Redirect to {to}</div>,
}));

describe('GuestRoute', () => {
  beforeEach(() => {
    mockUseAuth.mockClear();
  });

  // -----------------------------------------------------------------------
  // Test 1: Redirects to /profile when authenticated
  // -----------------------------------------------------------------------
  test('redirects to /profile when user is authenticated', () => {
    mockUseAuth.mockReturnValue({ user: { username: 'test' }, loading: false });

    render(
      <GuestRoute>
        <div data-testid="guest-content">Guest Content</div>
      </GuestRoute>
    );

    expect(screen.queryByTestId('guest-content')).not.toBeInTheDocument();
    expect(screen.getByTestId('navigate')).toHaveTextContent('/profile');
  });

  // -----------------------------------------------------------------------
  // Test 2: Renders children when not authenticated
  // -----------------------------------------------------------------------
  test('renders children when user is null', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });

    render(
      <GuestRoute>
        <div data-testid="guest-content">Guest Content</div>
      </GuestRoute>
    );

    expect(screen.getByTestId('guest-content')).toBeInTheDocument();
    expect(screen.queryByTestId('navigate')).not.toBeInTheDocument();
  });
});
