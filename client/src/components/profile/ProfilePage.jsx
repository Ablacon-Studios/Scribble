import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { ApiError } from '../../utils/api';
import Navbar from '../layout/Navbar';
import VerificationBanner from './VerificationBanner';

// Shared input class (from design doc 3.1)
const INPUT_CLASS =
  'w-full px-4 py-2.5 rounded-lg bg-scribble-bg border border-scribble-border text-white placeholder-scribble-muted focus:outline-none focus:ring-2 focus:ring-scribble-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200';

// Shared label class
const LABEL_CLASS = 'block text-sm font-medium text-scribble-muted mb-1.5';

// Success message
function SuccessMsg({ message }) {
  return (
    <div
      className="p-3 rounded-lg text-sm bg-green-900/30 border border-green-500/50 text-green-300 mt-3"
      role="status"
    >
      {message}
    </div>
  );
}

// Error message
function ErrorMsg({ message }) {
  return (
    <div
      className="p-3 rounded-lg text-sm bg-red-900/30 border border-red-500/50 text-red-300 mt-3 flex items-start"
      role="alert"
    >
      <span>{message}</span>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
 * Section 1: User Info Card
 * ────────────────────────────────────────────────────────────────── */

function UserInfoCard() {
  const { user, updateProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [fieldError, setFieldError] = useState({});

  // Sync local edit state when entering edit mode
  const startEditing = () => {
    setEditName(user.name);
    setEditUsername(user.username);
    setError('');
    setSuccess('');
    setFieldError({});
    setIsEditing(true);
  };

  const cancelEditing = useCallback(() => {
    setIsEditing(false);
    setError('');
    setFieldError({});
  }, []);

  // Escape key to cancel
  useEffect(() => {
    if (!isEditing) return;
    const handler = (e) => {
      if (e.key === 'Escape') cancelEditing();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isEditing, cancelEditing]);

  const handleSave = async () => {
    const name = editName.trim();
    const username = editUsername.trim();

    if (!name) {
      setFieldError({ name: 'Name is required' });
      return;
    }
    setError('');
    setSuccess('');
    setFieldError({});
    setIsSaving(true);

    try {
      await updateProfile({ name, username });
      setSuccess('Profile updated successfully.');
      setIsEditing(false);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          setFieldError({ username: err.message });
        } else if (err.status === 400) {
          const msg = err.message.toLowerCase();
          if (msg.includes('username')) {
            setFieldError({ username: err.message });
          } else {
            setError(err.message);
          }
        } else {
          setError(err.message);
        }
      } else {
        setError('Unable to connect to server. Please try again.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) return null;

  const memberSince = new Date(user.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <section className="bg-scribble-surface border border-scribble-border rounded-xl shadow-lg shadow-black/30 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">Profile</h2>
        {!isEditing && (
          <button
            onClick={startEditing}
            className="text-sm text-scribble-primary hover:text-white transition-colors font-medium"
          >
            Edit
          </button>
        )}
      </div>

      {/* View mode */}
      {!isEditing && (
        <div className="space-y-1">
          <div className="flex justify-between items-center py-2 border-b border-scribble-border">
            <span className="text-xs font-medium text-scribble-muted uppercase tracking-wider">Display Name</span>
            <span className="text-sm text-white">{user.name}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-scribble-border">
            <span className="text-xs font-medium text-scribble-muted uppercase tracking-wider">Username</span>
            <span className="text-sm text-white">{user.username}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-scribble-border">
            <span className="text-xs font-medium text-scribble-muted uppercase tracking-wider">Email</span>
            <span className="text-sm text-white">{user.email}</span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-xs font-medium text-scribble-muted uppercase tracking-wider">Member Since</span>
            <span className="text-sm text-white">{memberSince}</span>
          </div>
        </div>
      )}

      {/* Edit mode */}
      {isEditing && (
        <>
          <div className="space-y-4 mb-4">
            <div>
              <label htmlFor="pf-name" className={LABEL_CLASS}>Display Name</label>
              <input
                type="text"
                id="pf-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
                disabled={isSaving}
                aria-invalid={!!fieldError.name}
                className={INPUT_CLASS}
              />
              {fieldError.name && <p className="mt-1 text-sm text-red-400" role="alert">{fieldError.name}</p>}
            </div>
            <div>
              <label htmlFor="pf-username" className={LABEL_CLASS}>Username</label>
              <input
                type="text"
                id="pf-username"
                value={editUsername}
                onChange={(e) => setEditUsername(e.target.value)}
                required
                disabled={isSaving}
                aria-invalid={!!fieldError.username}
                className={INPUT_CLASS}
              />
              {fieldError.username && <p className="mt-1 text-sm text-red-400" role="alert">{fieldError.username}</p>}
            </div>
            {/* Email read-only */}
            <div className="flex justify-between items-center py-2">
              <span className="text-xs font-medium text-scribble-muted uppercase tracking-wider">Email</span>
              <span className="text-sm text-white">{user.email}</span>
            </div>
            {/* Member Since read-only */}
            <div className="flex justify-between items-center py-2">
              <span className="text-xs font-medium text-scribble-muted uppercase tracking-wider">Member Since</span>
              <span className="text-sm text-white">{memberSince}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-scribble-primary hover:bg-scribble-primary-dark text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              onClick={cancelEditing}
              disabled={isSaving}
              className="text-scribble-muted hover:text-white text-sm font-medium px-4 py-2 transition-colors"
            >
              Cancel
            </button>
          </div>

          {success && <SuccessMsg message={success} />}
          {error && <ErrorMsg message={error} />}
        </>
      )}

      {/* Show success from a previous save when back in view mode */}
      {!isEditing && success && <SuccessMsg message={success} />}
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────
 * Section 2: Change Email Card
 * ────────────────────────────────────────────────────────────────── */

function ChangeEmailCard() {
  const { changeEmail, refreshUser } = useAuth();
  const [newEmail, setNewEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const email = newEmail.trim();
    if (!email) {
      setError('New email is required');
      return;
    }
    if (!email.includes('@') || email.length < 5) {
      setError('Please enter a valid email address');
      return;
    }
    if (!password) {
      setError('Current password is required');
      return;
    }

    setIsSubmitting(true);
    try {
      await changeEmail(email, password);
      setSuccess('Email updated successfully.');
      setNewEmail('');
      setPassword('');
      await refreshUser();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 403) {
          setError(err.message);
        } else {
          setError(err.message);
        }
      } else {
        setError('Unable to connect to server. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="bg-scribble-surface border border-scribble-border rounded-xl shadow-lg shadow-black/30 p-6">
      <h2 className="text-lg font-semibold text-white mb-4">Change Email</h2>
      <form onSubmit={handleSubmit} noValidate>
        <div className="mb-4">
          <label htmlFor="ce-email" className={LABEL_CLASS}>New Email</label>
          <input
            type="email"
            id="ce-email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            required
            disabled={isSubmitting}
            className={INPUT_CLASS}
          />
        </div>
        <div className="mb-4">
          <label htmlFor="ce-password" className={LABEL_CLASS}>Current Password (for verification)</label>
          <input
            type="password"
            id="ce-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isSubmitting}
            className={INPUT_CLASS}
          />
        </div>
        <button
          type="submit"
          disabled={isSubmitting || !newEmail.trim() || !password}
          aria-busy={isSubmitting}
          className="bg-scribble-primary hover:bg-scribble-primary-dark text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Updating...' : 'Update Email'}
        </button>
      </form>
      {success && <SuccessMsg message={success} />}
      {error && <ErrorMsg message={error} />}
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────
 * Section 3: Change Password Card
 * ────────────────────────────────────────────────────────────────── */

function ChangePasswordCard() {
  const { changePassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [fieldError, setFieldError] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setFieldError({});

    // Client-side validation
    if (!currentPassword) {
      setFieldError((prev) => ({ ...prev, currentPassword: 'Current password is required' }));
      return;
    }
    if (!newPassword) {
      setFieldError((prev) => ({ ...prev, newPassword: 'New password is required' }));
      return;
    }
    if (newPassword.length < 8) {
      setFieldError((prev) => ({ ...prev, newPassword: 'Password must be at least 8 characters' }));
      return;
    }
    if (newPassword !== confirmPassword) {
      setFieldError((prev) => ({ ...prev, confirmPassword: 'Passwords do not match' }));
      return;
    }

    setIsSubmitting(true);
    try {
      await changePassword(currentPassword, newPassword);
      setSuccess('Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 403) {
          setFieldError({ currentPassword: err.message });
        } else if (err.status === 400) {
          const msg = err.message.toLowerCase();
          if (msg.includes('password')) {
            setFieldError({ newPassword: err.message });
          } else {
            setError(err.message);
          }
        } else {
          setError(err.message);
        }
      } else {
        setError('Unable to connect to server. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="bg-scribble-surface border border-scribble-border rounded-xl shadow-lg shadow-black/30 p-6">
      <h2 className="text-lg font-semibold text-white mb-4">Change Password</h2>
      <form onSubmit={handleSubmit} noValidate>
        <div className="mb-4">
          <label htmlFor="cp-current" className={LABEL_CLASS}>Current Password</label>
          <input
            type="password"
            id="cp-current"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            disabled={isSubmitting}
            aria-invalid={!!fieldError.currentPassword}
            className={INPUT_CLASS}
          />
          {fieldError.currentPassword && (
            <p className="mt-1 text-sm text-red-400" role="alert">{fieldError.currentPassword}</p>
          )}
        </div>
        <div className="mb-4">
          <label htmlFor="cp-new" className={LABEL_CLASS}>New Password</label>
          <input
            type="password"
            id="cp-new"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            disabled={isSubmitting}
            aria-invalid={!!fieldError.newPassword}
            className={INPUT_CLASS}
          />
          <p className="mt-1 text-xs text-scribble-muted">Minimum 8 characters</p>
          {fieldError.newPassword && (
            <p className="mt-1 text-sm text-red-400" role="alert">{fieldError.newPassword}</p>
          )}
        </div>
        <div className="mb-4">
          <label htmlFor="cp-confirm" className={LABEL_CLASS}>Confirm New Password</label>
          <input
            type="password"
            id="cp-confirm"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            disabled={isSubmitting}
            aria-invalid={!!fieldError.confirmPassword}
            className={INPUT_CLASS}
          />
          {fieldError.confirmPassword && (
            <p className="mt-1 text-sm text-red-400" role="alert">{fieldError.confirmPassword}</p>
          )}
        </div>
        <button
          type="submit"
          disabled={isSubmitting || !currentPassword || !newPassword || !confirmPassword}
          aria-busy={isSubmitting}
          className="bg-scribble-primary hover:bg-scribble-primary-dark text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Changing...' : 'Change Password'}
        </button>
      </form>
      {success && <SuccessMsg message={success} />}
      {error && <ErrorMsg message={error} />}
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────
 * Main Profile Page
 * ────────────────────────────────────────────────────────────────── */

function ProfilePage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-scribble-bg">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {user && !user.verified && <VerificationBanner />}
        <UserInfoCard />
        <ChangeEmailCard />
        <ChangePasswordCard />
      </main>
    </div>
  );
}

export default ProfilePage;
