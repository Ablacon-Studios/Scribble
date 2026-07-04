import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ApiError } from '../../utils/api';
import Navbar from '../layout/Navbar';

function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    setErrors({});

    // Client-side validation
    const newErrors = {};
    const trimmedId = identifier.trim();
    if (!trimmedId) {
      newErrors.identifier = 'Username or email is required';
    }
    if (!password) {
      newErrors.password = 'Password is required';
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      await login(trimmedId, password);
      setFailedAttempts(0);
      navigate('/');
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 429) {
          setServerError('Too many login attempts. Please wait a moment and try again.');
          setFailedAttempts((prev) => prev + 1);
          setIsSubmitting(false);
          return;
        }
        setFailedAttempts((prev) => prev + 1);
        if (err.status === 401) {
          setPassword('');
          setServerError('Invalid username/email or password');
        } else if (err.status === 400) {
          setServerError(err.message);
        } else {
          setServerError(err.message);
        }
      } else {
        setFailedAttempts((prev) => prev + 1);
        setServerError('Unable to connect to server. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const isDisabled = isSubmitting || !identifier.trim() || !password;

  return (
    <div className="min-h-screen bg-scribble-bg">
      <Navbar />
      <main className="flex items-start justify-center px-4 pt-24 pb-12">
        <div className="w-full max-w-md bg-scribble-surface border border-scribble-border rounded-xl shadow-lg shadow-black/30 p-6 sm:p-8">
          <h1 className="text-2xl font-bold text-white mb-6">Welcome Back</h1>

          {/* Server error banner */}
          {serverError && (
            <div
              className="mb-6 p-3 rounded-lg bg-red-900/30 border border-red-500/50 text-red-300 text-sm flex items-start"
              role="alert"
            >
              <svg className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>{serverError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            {/* Identifier field */}
            <div className="mb-4">
              <label
                htmlFor="login-identifier"
                className="block text-sm font-medium text-scribble-muted mb-1.5"
              >
                Username or Email
              </label>
              <input
                type="text"
                id="login-identifier"
                name="identifier"
                value={identifier}
                onChange={(e) => { setIdentifier(e.target.value); setServerError(''); setFailedAttempts(0); }}
                required
                disabled={isSubmitting}
                aria-invalid={!!errors.identifier}
                className="w-full px-4 py-2.5 rounded-lg bg-scribble-bg border border-scribble-border text-white placeholder-scribble-muted focus:outline-none focus:ring-2 focus:ring-scribble-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              />
              {errors.identifier && (
                <p className="mt-1 text-sm text-red-400" role="alert">{errors.identifier}</p>
              )}
            </div>

            {/* Password field */}
            <div className="mb-6">
              <label
                htmlFor="login-password"
                className="block text-sm font-medium text-scribble-muted mb-1.5"
              >
                Password
              </label>
              <input
                type="password"
                id="login-password"
                name="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setServerError(''); setFailedAttempts(0); }}
                required
                disabled={isSubmitting}
                aria-invalid={!!errors.password}
                className="w-full px-4 py-2.5 rounded-lg bg-scribble-bg border border-scribble-border text-white placeholder-scribble-muted focus:outline-none focus:ring-2 focus:ring-scribble-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-400" role="alert">{errors.password}</p>
              )}
            </div>

            <div className="text-right mb-4">
              <Link to="/forgot-password" className="text-sm text-scribble-primary hover:text-white transition-colors">
                Forgot password?
              </Link>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={isDisabled}
              aria-busy={isSubmitting}
              className="w-full py-2.5 bg-scribble-primary text-white font-semibold rounded-lg hover:bg-scribble-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Logging in...' : 'Log In'}
            </button>
          </form>

          {failedAttempts >= 2 && (
            <p className="mt-4 text-center text-sm">
              <Link to="/forgot-password" className="text-scribble-primary hover:text-white underline underline-offset-2">
                Forgot your password?
              </Link>
            </p>
          )}

          {/* "or" divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-scribble-border"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-3 bg-scribble-surface text-scribble-muted">or</span>
            </div>
          </div>

          {/* Bottom link */}
          <p className="text-center text-scribble-muted text-sm">
            Don&apos;t have an account?{' '}
            <Link to="/register" className="text-scribble-primary hover:text-white underline underline-offset-2 transition-colors">
              Sign up
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

export default LoginPage;
