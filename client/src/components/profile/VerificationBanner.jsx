import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';

export default function VerificationBanner() {
  const { resendVerification } = useAuth();
  const [status, setStatus] = useState('idle'); // idle | sending | success | error
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (status !== 'success') return;
    const id = setTimeout(() => setStatus('idle'), 10000);
    return () => clearTimeout(id);
  }, [status]);

  const handleResend = async () => {
    setStatus('sending');
    setErrorMessage('');
    try {
      await resendVerification();
      setStatus('success');
    } catch (err) {
      if (err.status === 429) {
        setErrorMessage('Too many verification emails sent. Please wait before requesting another.');
      } else {
        setErrorMessage(err.message || 'Failed to send verification email. Please try again.');
      }
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <div className="bg-green-900/30 border border-green-500/50 rounded-lg p-4" role="status">
        <div className="flex items-start gap-2">
          <svg className="w-5 h-5 mt-0.5 flex-shrink-0 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-sm text-green-300">Verification email sent! Check your inbox.</span>
          <button
            onClick={() => setStatus('idle')}
            className="ml-auto text-green-400 hover:text-green-200 transition-colors"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-4" role="alert">
        <div className="flex items-start gap-2">
          <svg className="w-5 h-5 mt-0.5 flex-shrink-0 text-red-400" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span className="text-sm text-red-300">{errorMessage}</span>
          <button
            onClick={() => setStatus('idle')}
            className="ml-auto text-red-400 hover:text-red-200 transition-colors"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-amber-900/20 border border-amber-500/40 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2" role="alert">
      <div className="flex items-start gap-2">
        <svg className="w-5 h-5 mt-0.5 flex-shrink-0 text-amber-400" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        <span className="text-sm text-amber-300">
          Your email is not verified. Check your inbox or{' '}
        </span>
      </div>
      <button
        onClick={handleResend}
        disabled={status === 'sending'}
        className="text-sm font-medium text-amber-400 hover:text-amber-200 underline underline-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
      >
        {status === 'sending' ? 'Sending...' : 'Resend verification email'}
      </button>
    </div>
  );
}
