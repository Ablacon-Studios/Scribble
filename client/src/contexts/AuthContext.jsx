import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiRequest, setCsrfToken, ApiError } from '../utils/api';

const AuthContext = createContext(null);

/**
 * Hook to access auth state and methods. Must be used within ``AuthProvider``.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // ── Bootstrap: CSRF token + session check ──────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        // Fetch CSRF token first (creates session if needed)
        const csrfRes = await apiRequest('/csrf');
        if (!cancelled) {
          setCsrfToken(csrfRes.csrf_token);
        }

        // Check for existing session
        const meRes = await apiRequest('/me');
        if (!cancelled) {
          setUser(meRes.user);
        }
      } catch {
        // Not authenticated or network error — user stays null
        if (!cancelled) {
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    bootstrap();
    return () => { cancelled = true; };
  }, []);

  // ── Auth actions ───────────────────────────────────────────────────

  const login = useCallback(async (identifier, password) => {
    const data = await apiRequest('/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    });
    setUser(data.user);
    setCsrfToken(data.csrf_token);
    return data;
  }, []);

  const register = useCallback(async (name, username, email, password) => {
    const data = await apiRequest('/register', {
      method: 'POST',
      body: JSON.stringify({
        name,
        username,
        email,
        password,
        confirm_password: password,
      }),
    });
    setUser(data.user);
    setCsrfToken(data.csrf_token);
    return data;
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiRequest('/logout', { method: 'POST' });
    } catch {
      // Proceed even if the server call fails
    }
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const data = await apiRequest('/me');
    setUser(data.user);
    return data.user;
  }, []);

  const updateProfile = useCallback(async (profileData) => {
    const data = await apiRequest('/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
    setUser(data.user);
    return data;
  }, []);

  const changePassword = useCallback(async (currentPassword, newPassword) => {
    return apiRequest('/password', {
      method: 'PUT',
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: newPassword,
      }),
    });
  }, []);

  const changeEmail = useCallback(async (newEmail, password) => {
    const data = await apiRequest('/email', {
      method: 'PUT',
      body: JSON.stringify({ new_email: newEmail, password }),
    });
    setUser(data.user);
    return data;
  }, []);

  const verifyEmail = useCallback(async (token) => {
    return apiRequest('/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  }, []);

  const forgotPassword = useCallback(async (email) => {
    return apiRequest('/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }, []);

  const resetPassword = useCallback(async (token, password) => {
    return apiRequest('/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password, confirm_password: password }),
    });
  }, []);

  const resendVerification = useCallback(async () => {
    return apiRequest('/resend-verification', { method: 'POST' });
  }, []);

  // ── Memoised context value ─────────────────────────────────────────

  const value = useMemo(() => ({
    user,
    loading,
    login,
    register,
    logout,
    refreshUser,
    updateProfile,
    changePassword,
    changeEmail,
    verifyEmail,
    forgotPassword,
    resetPassword,
    resendVerification,
  }), [user, loading, login, register, logout, refreshUser, updateProfile, changePassword, changeEmail, verifyEmail, forgotPassword, resetPassword, resendVerification]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
