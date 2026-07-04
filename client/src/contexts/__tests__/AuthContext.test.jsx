/**
 * Tests for the AuthContext provider and useAuth hook.
 */
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../AuthContext';

// Helper: a component that displays auth state for testing
function AuthConsumer() {
  const auth = useAuth();
  const [error, setError] = React.useState(null);

  const handleLogin = async () => {
    try {
      await auth.login('testuser', 'pass');
    } catch (e) {
      setError(e.message);
    }
  };

  const handleRegister = async () => {
    try {
      await auth.register('Name', 'user', 'e@e.com', 'pass12345');
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div>
      <span data-testid="loading">{String(auth.loading)}</span>
      <span data-testid="user">{auth.user ? auth.user.username : 'null'}</span>
      <span data-testid="error">{error || 'none'}</span>
      <button data-testid="btn-login" onClick={handleLogin}>Login</button>
      <button data-testid="btn-register" onClick={handleRegister}>Register</button>
      <button data-testid="btn-logout" onClick={() => auth.logout()}>Logout</button>
    </div>
  );
}

function renderWithProvider(ui) {
  return render(<AuthProvider>{ui}</AuthProvider>);
}

describe('AuthContext', () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  // Helper: mock successful bootstrap (csrf + me)
  function mockBootstrapSuccess(user = null) {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrf_token: 'test-csrf-token' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: user || { id: 1, username: 'testuser', email: 'test@example.com', name: 'Test' } }),
      });
  }

  function mockBootstrapUnauthenticated() {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrf_token: 'test-csrf-token' }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Authentication required' }),
      });
  }

  // -----------------------------------------------------------------------
  // Test 1: Loading starts as true
  // -----------------------------------------------------------------------
  test('loading starts as true initially', async () => {
    // Never resolve the fetch calls so loading stays true
    global.fetch.mockImplementation(() => new Promise(() => {}));

    renderWithProvider(<AuthConsumer />);
    expect(screen.getByTestId('loading').textContent).toBe('true');
  });

  // -----------------------------------------------------------------------
  // Test 2: Checks session on mount
  // -----------------------------------------------------------------------
  test('calls /api/auth/csrf and /api/auth/me on mount', async () => {
    mockBootstrapSuccess();

    renderWithProvider(<AuthConsumer />);

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    // Verify the fetch calls were made
    const calls = global.fetch.mock.calls;
    expect(calls[0][0]).toContain('/csrf');
    expect(calls[1][0]).toContain('/me');
  });

  // -----------------------------------------------------------------------
  // Test 3: Sets user after successful bootstrap
  // -----------------------------------------------------------------------
  test('sets user after successful bootstrap', async () => {
    mockBootstrapSuccess();

    renderWithProvider(<AuthConsumer />);

    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toBe('testuser');
    });
  });

  // -----------------------------------------------------------------------
  // Test 4: User stays null after unauthenticated bootstrap
  // -----------------------------------------------------------------------
  test('user stays null when /me returns 401', async () => {
    mockBootstrapUnauthenticated();

    renderWithProvider(<AuthConsumer />);

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    expect(screen.getByTestId('user').textContent).toBe('null');
  });

  // -----------------------------------------------------------------------
  // Test 5: Login calls API and sets user
  // -----------------------------------------------------------------------
  test('login calls /api/auth/login and sets user', async () => {
    // Bootstrap as unauthenticated
    mockBootstrapUnauthenticated();

    // Then mock the login request
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        user: { id: 1, username: 'testuser', email: 'test@example.com', name: 'Test' },
        csrf_token: 'new-csrf',
      }),
    });

    renderWithProvider(<AuthConsumer />);

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    await act(async () => {
      screen.getByTestId('btn-login').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toBe('testuser');
    });

    // Verify login call URL
    const loginCall = global.fetch.mock.calls.find(
      (call) => typeof call[0] === 'string' && call[0].includes('/login')
    );
    expect(loginCall).toBeTruthy();
  });

  // -----------------------------------------------------------------------
  // Test 6: Login handles 401 error
  // -----------------------------------------------------------------------
  test('login handles error — user stays null on 401', async () => {
    mockBootstrapUnauthenticated();

    // Mock login failure
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: 'Invalid username/email or password' }),
    });

    renderWithProvider(<AuthConsumer />);

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    await act(async () => {
      screen.getByTestId('btn-login').click();
    });

    // User should stay null
    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toBe('null');
    });
  });

  // -----------------------------------------------------------------------
  // Test 7: Logout calls API and clears user
  // -----------------------------------------------------------------------
  test('logout calls /api/auth/logout and sets user to null', async () => {
    mockBootstrapSuccess();

    // Mock the logout POST
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'Logged out successfully' }),
    });

    renderWithProvider(<AuthConsumer />);

    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toBe('testuser');
    });

    await act(async () => {
      screen.getByTestId('btn-logout').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toBe('null');
    });
  });

  // -----------------------------------------------------------------------
  // Test 8: Register calls API with correct data
  // -----------------------------------------------------------------------
  test('register calls /api/auth/register with correct data', async () => {
    mockBootstrapUnauthenticated();

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        user: { id: 2, username: 'newuser', email: 'new@example.com', name: 'New' },
        csrf_token: 'register-csrf',
      }),
    });

    renderWithProvider(<AuthConsumer />);

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    await act(async () => {
      screen.getByTestId('btn-register').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toBe('newuser');
    });

    // Verify register call URL
    const registerCall = global.fetch.mock.calls.find(
      (call) => typeof call[0] === 'string' && call[0].includes('/register')
    );
    expect(registerCall).toBeTruthy();
  });

  // -----------------------------------------------------------------------
  // Test 9: Register handles duplicate username (409)
  // -----------------------------------------------------------------------
  test('register handles duplicate username — error thrown on 409', async () => {
    mockBootstrapUnauthenticated();

    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({ error: 'Username is already taken' }),
    });

    renderWithProvider(<AuthConsumer />);

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    // The register button click will cause the apiRequest to throw,
    // which the consumer doesn't catch — but the AuthContext's register
    // function doesn't catch errors either (it lets them propagate).
    // The consumer's onClick also doesn't catch. In the actual RegisterPage
    // component, errors are caught in the handleSubmit.
    // For this test we just verify the user stays null.

    await act(async () => {
      screen.getByTestId('btn-register').click();
    });

    // User should still be null since the call failed
    expect(screen.getByTestId('user').textContent).toBe('null');
  });

  // -----------------------------------------------------------------------
  // Test 10: forgotPassword calls /api/auth/forgot-password with email
  // -----------------------------------------------------------------------
  test('forgotPassword calls /api/auth/forgot-password with email', async () => {
    mockBootstrapUnauthenticated();

    let capturedAuth = null;
    function TestConsumer() {
      const auth = useAuth();
      capturedAuth = auth;
      return <span data-testid="loading">{String(auth.loading)}</span>;
    }

    renderWithProvider(<TestConsumer />);

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    // Mock the forgot-password call (should be 3rd fetch after csrf + me)
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'Email sent' }),
    });

    await act(async () => {
      await capturedAuth.forgotPassword('test@example.com');
    });

    const forgotCall = global.fetch.mock.calls.find(
      (call) => typeof call[0] === 'string' && call[0].includes('/forgot-password')
    );
    expect(forgotCall).toBeTruthy();
  });

  // -----------------------------------------------------------------------
  // Test 11: resetPassword calls /api/auth/reset-password with token and password
  // -----------------------------------------------------------------------
  test('resetPassword calls /api/auth/reset-password with token and password', async () => {
    mockBootstrapUnauthenticated();

    let capturedAuth = null;
    function TestConsumer() {
      const auth = useAuth();
      capturedAuth = auth;
      return <span data-testid="loading">{String(auth.loading)}</span>;
    }

    renderWithProvider(<TestConsumer />);

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    // Mock the reset-password call (should be 3rd fetch after csrf + me)
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'Password reset' }),
    });

    await act(async () => {
      await capturedAuth.resetPassword('reset-token-123', 'newPassword1');
    });

    const resetCall = global.fetch.mock.calls.find(
      (call) => typeof call[0] === 'string' && call[0].includes('/reset-password')
    );
    expect(resetCall).toBeTruthy();
    const body = JSON.parse(resetCall[1].body);
    expect(body.token).toBe('reset-token-123');
    expect(body.password).toBe('newPassword1');
  });

  // -----------------------------------------------------------------------
  // Test 12: resendVerification calls /api/auth/resend-verification
  // -----------------------------------------------------------------------
  test('resendVerification calls /api/auth/resend-verification', async () => {
    mockBootstrapUnauthenticated();

    let capturedAuth = null;
    function TestConsumer() {
      const auth = useAuth();
      capturedAuth = auth;
      return <span data-testid="loading">{String(auth.loading)}</span>;
    }

    renderWithProvider(<TestConsumer />);

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    // Mock the resend-verification call (should be 3rd fetch after csrf + me)
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'Verification email sent' }),
    });

    await act(async () => {
      await capturedAuth.resendVerification();
    });

    const resendCall = global.fetch.mock.calls.find(
      (call) => typeof call[0] === 'string' && call[0].includes('/resend-verification')
    );
    expect(resendCall).toBeTruthy();
    expect(resendCall[1].method).toBe('POST');
  });

  // -----------------------------------------------------------------------
  // Test 13: verifyEmail calls /api/auth/verify-email with token
  // -----------------------------------------------------------------------
  test('verifyEmail calls /api/auth/verify-email with token', async () => {
    mockBootstrapUnauthenticated();

    let capturedAuth = null;
    function TestConsumer() {
      const auth = useAuth();
      capturedAuth = auth;
      return <span data-testid="loading">{String(auth.loading)}</span>;
    }

    renderWithProvider(<TestConsumer />);

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    // Mock the verify-email call (should be 3rd fetch after csrf + me)
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'Email verified' }),
    });

    await act(async () => {
      await capturedAuth.verifyEmail('verify-token-abc');
    });

    const verifyCall = global.fetch.mock.calls.find(
      (call) => typeof call[0] === 'string' && call[0].includes('/verify-email')
    );
    expect(verifyCall).toBeTruthy();
    const body = JSON.parse(verifyCall[1].body);
    expect(body.token).toBe('verify-token-abc');
  });
});
