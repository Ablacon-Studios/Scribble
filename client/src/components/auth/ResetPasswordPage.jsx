import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function ResetPasswordPage() {
  const { resetPassword } = useAuth();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [validating, setValidating] = useState(!!token);
  const [tokenValid, setTokenValid] = useState(false);
  const [tokenError, setTokenError] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (!token) return;

    const validate = async () => {
      try {
        const response = await fetch(`/api/auth/validate-reset-token?token=${encodeURIComponent(token)}`, {
          credentials: 'include',
        });
        const data = await response.json();
        if (data.valid) {
          setTokenValid(true);
        } else {
          setTokenValid(false);
          setTokenError(data.error || 'Invalid or expired reset token');
        }
      } catch {
        setTokenValid(false);
        setTokenError('Unable to validate reset link. Please try again.');
      }
      setValidating(false);
    };

    validate();
  }, [token]);

  const validateForm = () => {
    const errors = {};
    if (!newPassword) errors.newPassword = 'New password is required';
    else if (newPassword.length < 8) errors.newPassword = 'Password must be at least 8 characters';
    if (!confirmPassword) errors.confirmPassword = 'Please confirm your password';
    else if (newPassword !== confirmPassword) errors.confirmPassword = 'Passwords do not match';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setStatus('submitting');
    setErrorMessage('');
    try {
      await resetPassword(token, newPassword);
      setStatus('success');
    } catch (err) {
      const msg = err.message || 'Password reset failed';
      if (msg.includes('expired') || msg.includes('Invalid')) {
        setTokenValid(false);
        setTokenError(msg);
        setStatus('idle');
      } else {
        setErrorMessage(msg);
        setStatus('error');
      }
    }
  };

  const containerClass = "min-h-screen bg-scribble-bg flex items-center justify-center px-4";
  const cardClass = "max-w-md w-full bg-scribble-surface border border-scribble-border rounded-xl shadow-xl p-8";

  // No token
  if (!token) {
    return (
      <div className={containerClass}>
        <div className={`${cardClass} text-center`}>
          <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-red-900/40 border border-red-500/40 flex items-center justify-center">
            <svg className="w-7 h-7 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-3">Invalid Reset Link</h2>
          <p className="text-sm text-scribble-muted mb-6">
            This reset link is missing or incomplete.
          </p>
          <Link
            to="/forgot-password"
            className="inline-block px-4 py-2 rounded-lg border border-scribble-border text-scribble-muted hover:text-white hover:border-scribble-muted transition-colors text-sm font-medium"
          >
            Request a New Reset Link
          </Link>
        </div>
      </div>
    );
  }

  // Validating
  if (validating) {
    return (
      <div className={containerClass}>
        <div className={`${cardClass} text-center`}>
          <h2 className="text-2xl font-bold text-white mb-6">Reset Password</h2>
          <div className="flex justify-center gap-2 mb-4">
            {[0, 0.2, 0.4, 0.6].map((delay, i) => (
              <span
                key={i}
                className="w-2.5 h-2.5 rounded-full bg-scribble-primary motion-safe:animate-pulse"
                style={{ animationDelay: `${delay}s` }}
              />
            ))}
          </div>
          <p className="text-sm text-scribble-muted">Verifying reset link...</p>
        </div>
      </div>
    );
  }

  // Invalid/expired
  if (!tokenValid) {
    return (
      <div className={containerClass}>
        <div className={`${cardClass} text-center`}>
          <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-red-900/40 border border-red-500/40 flex items-center justify-center">
            <svg className="w-7 h-7 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-3">Link Expired</h2>
          <p className="text-sm text-scribble-muted mb-6">
            {tokenError || 'This reset link is invalid or has expired.'}
          </p>
          <Link
            to="/forgot-password"
            className="inline-block mb-6 px-4 py-2 rounded-lg border border-scribble-border text-scribble-muted hover:text-white hover:border-scribble-muted transition-colors text-sm font-medium"
          >
            Request a New Reset Link
          </Link>
          <div className="border-t border-scribble-border mb-4" />
          <Link to="/login" className="text-scribble-primary hover:text-white underline underline-offset-2 transition-colors text-sm">
            Back to Log in
          </Link>
        </div>
      </div>
    );
  }

  // Success
  if (status === 'success') {
    return (
      <div className={containerClass}>
        <div className={`${cardClass} text-center`}>
          <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-green-900/40 border border-green-500/40 flex items-center justify-center">
            <svg className="w-7 h-7 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-3">Password Reset!</h2>
          <p className="text-sm text-scribble-muted mb-6">
            Your password has been reset successfully.
          </p>
          <Link
            to="/login"
            className="inline-block w-full py-2.5 bg-scribble-primary text-white font-semibold rounded-lg hover:bg-scribble-primary-dark transition-colors"
          >
            Log in
          </Link>
        </div>
      </div>
    );
  }

  // Form
  return (
    <div className={containerClass}>
      <div className={cardClass}>
        <h1 className="text-2xl font-bold text-white mb-6">Reset Password</h1>

        {status === 'error' && (
          <div className="mb-6 p-3 rounded-lg bg-red-900/30 border border-red-500/50 text-red-300 text-sm flex items-start" role="alert">
            <svg className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="newPassword" className="block text-sm font-medium text-scribble-muted mb-1">
              New Password
            </label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={`w-full px-3 py-2 bg-scribble-bg border rounded-lg text-white placeholder-scribble-muted focus:outline-none focus:ring-2 focus:ring-scribble-primary focus:border-transparent ${fieldErrors.newPassword ? 'border-red-500' : 'border-scribble-border'}`}
              placeholder="Enter new password"
            />
            {fieldErrors.newPassword && (
              <p className="mt-1 text-sm text-red-400" role="alert">{fieldErrors.newPassword}</p>
            )}
            <p className="mt-1 text-xs text-scribble-muted">Minimum 8 characters</p>
          </div>

          <div className="mb-6">
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-scribble-muted mb-1">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={`w-full px-3 py-2 bg-scribble-bg border rounded-lg text-white placeholder-scribble-muted focus:outline-none focus:ring-2 focus:ring-scribble-primary focus:border-transparent ${fieldErrors.confirmPassword ? 'border-red-500' : 'border-scribble-border'}`}
              placeholder="Confirm new password"
            />
            {fieldErrors.confirmPassword && (
              <p className="mt-1 text-sm text-red-400" role="alert">{fieldErrors.confirmPassword}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={status === 'submitting'}
            className="w-full py-2.5 bg-scribble-primary text-white font-semibold rounded-lg hover:bg-scribble-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {status === 'submitting' ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
