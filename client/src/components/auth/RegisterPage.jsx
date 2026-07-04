import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ApiError } from '../../utils/api';
import Navbar from '../layout/Navbar';

const USERNAME_RE = /^[a-zA-Z0-9_]+$/;

function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [verificationUrl, setVerificationUrl] = useState('');
  const [accountExists, setAccountExists] = useState(false);

  const updateField = (field) => (e) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    if (serverError) setServerError('');
    if (accountExists) setAccountExists(false);
    // Clear field error on change
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    const trimmed = {
      name: formData.name.trim(),
      username: formData.username.trim(),
      email: formData.email.trim(),
      password: formData.password,
      confirmPassword: formData.confirmPassword,
    };

    if (!trimmed.name) newErrors.name = 'Name is required';

    if (!trimmed.username) {
      newErrors.username = 'Username is required';
    } else if (trimmed.username.length < 3 || trimmed.username.length > 50) {
      newErrors.username = 'Username must be 3–50 characters and contain only letters, numbers, and underscores';
    } else if (!USERNAME_RE.test(trimmed.username)) {
      newErrors.username = 'Username must be 3–50 characters and contain only letters, numbers, and underscores';
    }

    if (!trimmed.email) {
      newErrors.email = 'Email is required';
    } else if (!trimmed.email.includes('@') || trimmed.email.length < 5) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!trimmed.password) {
      newErrors.password = 'Password is required';
    } else if (trimmed.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (!trimmed.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (trimmed.password !== trimmed.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    return { newErrors, trimmed };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    const { newErrors, trimmed } = validateForm();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});

    setIsSubmitting(true);

    try {
      const data = await register(trimmed.name, trimmed.username, trimmed.email, trimmed.password);
      setVerificationUrl(data.verification_url);
      setRegistered(true);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          setAccountExists(true);
          // Map duplicate errors to specific fields
          const msg = err.message.toLowerCase();
          if (msg.includes('username')) {
            setErrors((prev) => ({ ...prev, username: err.message }));
          } else if (msg.includes('email')) {
            setErrors((prev) => ({ ...prev, email: err.message }));
          }
          setServerError(err.message);
        } else if (err.status === 400) {
          // Map validation errors from server
          const msg = err.message.toLowerCase();
          if (msg.includes('name')) {
            setErrors((prev) => ({ ...prev, name: err.message }));
          } else if (msg.includes('username')) {
            setErrors((prev) => ({ ...prev, username: err.message }));
          } else if (msg.includes('email')) {
            setErrors((prev) => ({ ...prev, email: err.message }));
          } else if (msg.includes('password')) {
            setErrors((prev) => ({ ...prev, password: err.message }));
          } else {
            setServerError(err.message);
          }
        } else {
          setServerError(err.message);
        }
      } else {
        setServerError('Unable to connect to server. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const allFieldsFilled = Object.values(formData).every((v) => v.trim().length > 0);
  const isDisabled = isSubmitting || accountExists || !allFieldsFilled;

  // Input class pattern from design doc section 3.1
  const inputClass = (field) =>
    `w-full px-4 py-2.5 rounded-lg bg-scribble-bg border ${
      errors[field] ? 'border-red-400 ring-1 ring-red-400' : 'border-scribble-border'
    } text-white placeholder-scribble-muted focus:outline-none focus:ring-2 focus:ring-scribble-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200`;

  if (registered) {
    return (
      <div className="min-h-screen bg-scribble-bg">
        <Navbar />
        <div className="flex items-center justify-center px-4 py-20">
          <div className="max-w-md w-full bg-scribble-surface border border-scribble-border rounded-xl shadow-xl p-8 text-center">
            <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-green-900/40 border border-green-500/40 flex items-center justify-center">
              <svg className="w-7 h-7 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white mb-3">Account Created!</h2>
            <p className="text-sm text-scribble-muted mb-6">
              A verification email has been sent to <strong className="text-white">{formData.email}</strong>.
            </p>
            <a
              href={verificationUrl}
              className="inline-block w-full py-2.5 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-500 transition-colors mb-3"
            >
              Verify your email now
            </a>
            <p className="text-xs text-scribble-muted mb-4">
              Or check your inbox and click the verification link in the email.
            </p>
            <div className="border-t border-scribble-border my-6" />
            <Link to="/profile" className="text-scribble-primary hover:text-white underline underline-offset-2 transition-colors text-sm">
              Go to Profile
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-scribble-bg">
      <Navbar />
      <main className="flex items-start justify-center px-4 pt-24 pb-12">
        <div className="w-full max-w-md bg-scribble-surface border border-scribble-border rounded-xl shadow-lg shadow-black/30 p-6 sm:p-8">
          <h1 className="text-2xl font-bold text-white mb-6">Create Account</h1>

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

          {/* Account already exists banner */}
          {accountExists && (
            <div className="mb-6 p-4 rounded-lg bg-amber-900/20 border border-amber-500/40 text-amber-300 text-sm" role="alert">
              <p className="font-medium mb-1">Account already exists</p>
              <p>
                An account with that username or email already exists.{' '}
                <Link to="/login" className="text-amber-400 hover:text-amber-200 underline underline-offset-2 font-medium">
                  Log in instead
                </Link>
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            {/* Name */}
            <div className="mb-4">
              <label htmlFor="reg-name" className="block text-sm font-medium text-scribble-muted mb-1.5">Name</label>
              <input type="text" id="reg-name" value={formData.name} onChange={updateField('name')} required disabled={isSubmitting} aria-invalid={!!errors.name} className={inputClass('name')} />
              {errors.name && <p className="mt-1 text-sm text-red-400" role="alert">{errors.name}</p>}
            </div>

            {/* Username */}
            <div className="mb-4">
              <label htmlFor="reg-username" className="block text-sm font-medium text-scribble-muted mb-1.5">Username</label>
              <input type="text" id="reg-username" value={formData.username} onChange={updateField('username')} required disabled={isSubmitting} aria-invalid={!!errors.username} className={inputClass('username')} />
              <p className="mt-1 text-xs text-scribble-muted">3&ndash;50 characters, letters, numbers, and underscores</p>
              {errors.username && <p className="mt-1 text-sm text-red-400" role="alert">{errors.username}</p>}
            </div>

            {/* Email */}
            <div className="mb-4">
              <label htmlFor="reg-email" className="block text-sm font-medium text-scribble-muted mb-1.5">Email</label>
              <input type="email" id="reg-email" value={formData.email} onChange={updateField('email')} required disabled={isSubmitting} aria-invalid={!!errors.email} className={inputClass('email')} />
              {errors.email && <p className="mt-1 text-sm text-red-400" role="alert">{errors.email}</p>}
            </div>

            {/* Password */}
            <div className="mb-4">
              <label htmlFor="reg-password" className="block text-sm font-medium text-scribble-muted mb-1.5">Password</label>
              <input type="password" id="reg-password" value={formData.password} onChange={updateField('password')} required disabled={isSubmitting} aria-invalid={!!errors.password} className={inputClass('password')} />
              <p className="mt-1 text-xs text-scribble-muted">Minimum 8 characters</p>
              {errors.password && <p className="mt-1 text-sm text-red-400" role="alert">{errors.password}</p>}
            </div>

            {/* Confirm Password */}
            <div className="mb-6">
              <label htmlFor="reg-confirm" className="block text-sm font-medium text-scribble-muted mb-1.5">Confirm Password</label>
              <input type="password" id="reg-confirm" value={formData.confirmPassword} onChange={updateField('confirmPassword')} required disabled={isSubmitting} aria-invalid={!!errors.confirmPassword} className={inputClass('confirmPassword')} />
              {errors.confirmPassword && <p className="mt-1 text-sm text-red-400" role="alert">{errors.confirmPassword}</p>}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isDisabled}
              aria-busy={isSubmitting}
              className="w-full py-2.5 bg-scribble-primary text-white font-semibold rounded-lg hover:bg-scribble-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          {/* Bottom link */}
          <p className="text-center text-scribble-muted text-sm mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-scribble-primary hover:text-white underline underline-offset-2 transition-colors">
              Log in
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

export default RegisterPage;
