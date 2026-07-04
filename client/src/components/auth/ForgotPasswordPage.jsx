import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function ForgotPasswordPage() {
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes('@')) {
      setStatus('error');
      setErrorMessage('Please enter a valid email address');
      return;
    }

    setStatus('submitting');
    setErrorMessage('');
    try {
      await forgotPassword(trimmed);
      setStatus('success');
    } catch (err) {
      if (err.status === 429) {
        setErrorMessage('Too many requests. Please try again later.');
      } else {
        setErrorMessage('Unable to send reset email. Please try again.');
      }
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-scribble-bg flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-scribble-surface border border-scribble-border rounded-xl shadow-xl p-8 text-center">
          <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-green-900/40 border border-green-500/40 flex items-center justify-center">
            <svg className="w-7 h-7 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-3">Check Your Email</h2>
          <p className="text-sm text-scribble-muted mb-2">
            If an account with that email exists, a reset link has been sent.
          </p>
          <p className="text-xs text-scribble-muted mb-6">
            Didn&apos;t receive it? Check your spam folder or{' '}
            <button
              onClick={() => { setStatus('idle'); setErrorMessage(''); }}
              className="text-scribble-primary hover:text-white underline underline-offset-2 transition-colors font-medium"
            >
              try another email
            </button>
          </p>
          <div className="border-t border-scribble-border my-6" />
          <Link to="/login" className="text-scribble-primary hover:text-white underline underline-offset-2 transition-colors text-sm">
            Back to Log in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-scribble-bg flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-scribble-surface border border-scribble-border rounded-xl shadow-xl p-8">
        <h1 className="text-2xl font-bold text-white mb-2">Forgot Password?</h1>
        <p className="text-sm text-scribble-muted mb-6">
          Enter your email and we&apos;ll send you a reset link.
        </p>

        {status === 'error' && (
          <div className="mb-6 p-3 rounded-lg bg-red-900/30 border border-red-500/50 text-red-300 text-sm flex items-start" role="alert">
            <svg className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <label htmlFor="email" className="block text-sm font-medium text-scribble-muted mb-1">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 bg-scribble-bg border border-scribble-border rounded-lg text-white placeholder-scribble-muted focus:outline-none focus:ring-2 focus:ring-scribble-primary focus:border-transparent mb-6"
            placeholder="you@example.com"
            required
          />
          <button
            type="submit"
            disabled={!email.trim() || status === 'submitting'}
            className="w-full py-2.5 bg-scribble-primary text-white font-semibold rounded-lg hover:bg-scribble-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-4"
          >
            {status === 'submitting' ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        <p className="text-center text-sm text-scribble-muted">
          Remember your password?{' '}
          <Link to="/login" className="text-scribble-primary hover:text-white underline underline-offset-2 transition-colors">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
