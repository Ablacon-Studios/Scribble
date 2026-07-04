import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function VerifyEmailPage() {
  const { verifyEmail } = useAuth();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [state, setState] = useState(token ? 'loading' : 'no-token');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;

    const verify = async () => {
      try {
        await verifyEmail(token);
        setState('success');
      } catch (err) {
        setError(err.message || 'Verification failed');
        setState('error');
      }
    };

    verify();
  }, [token, verifyEmail]);

  return (
    <div className="min-h-screen bg-scribble-bg flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-scribble-surface border border-scribble-border rounded-xl shadow-xl p-8 text-center">
        {state === 'no-token' && (
          <>
            <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-red-900/40 border border-red-500/40 flex items-center justify-center">
              <svg className="w-7 h-7 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white mb-3">Invalid Verification Link</h2>
            <p className="text-sm text-scribble-muted mb-6">
              This verification link is missing or incomplete.
            </p>
            <Link
              to="/profile"
              className="inline-block px-4 py-2 rounded-lg border border-scribble-border text-scribble-muted hover:text-white hover:border-scribble-muted transition-colors text-sm font-medium mb-4"
            >
              Go to Profile
            </Link>
            <p className="text-xs text-scribble-muted">
              From your profile, you can request a new verification email.
            </p>
          </>
        )}

        {state === 'loading' && (
          <>
            <h2 className="text-2xl font-bold text-white mb-6">Email Verification</h2>
            <div className="flex justify-center gap-2 mb-4">
              {[0, 0.2, 0.4, 0.6].map((delay, i) => (
                <span
                  key={i}
                  className="w-2.5 h-2.5 rounded-full bg-scribble-primary motion-safe:animate-pulse"
                  style={{ animationDelay: `${delay}s` }}
                />
              ))}
            </div>
            <p className="text-sm text-scribble-muted">Verifying your email...</p>
          </>
        )}

        {state === 'success' && (
          <>
            <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-green-900/40 border border-green-500/40 flex items-center justify-center">
              <svg className="w-7 h-7 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white mb-3">Email Verified!</h2>
            <p className="text-sm text-scribble-muted mb-6">
              Your email has been verified. You can now use all features.
            </p>
            <Link
              to="/profile"
              className="inline-block w-full py-2.5 bg-scribble-primary text-white font-semibold rounded-lg hover:bg-scribble-primary-dark transition-colors"
            >
              Go to Profile
            </Link>
            <div className="border-t border-scribble-border my-6" />
            <Link to="/login" className="text-scribble-primary hover:text-white underline underline-offset-2 transition-colors text-sm">
              Back to Log in
            </Link>
          </>
        )}

        {state === 'error' && (
          <>
            <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-red-900/40 border border-red-500/40 flex items-center justify-center">
              <svg className="w-7 h-7 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white mb-3">Verification Failed</h2>
            <p className="text-sm text-scribble-muted mb-6">{error}</p>
            <Link
              to="/profile"
              className="inline-block px-4 py-2 rounded-lg border border-scribble-border text-scribble-muted hover:text-white hover:border-scribble-muted transition-colors text-sm font-medium mb-4"
            >
              Go to Profile
            </Link>
            <p className="text-xs text-scribble-muted">
              From your profile, you can request a new verification email.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
