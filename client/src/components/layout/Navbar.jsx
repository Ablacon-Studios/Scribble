import { useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = useCallback(async () => {
    await logout();
    navigate('/login');
  }, [logout, navigate]);

  return (
    <header className="sticky top-0 z-50 bg-scribble-surface border-b border-scribble-border">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Left: Logo */}
        <Link
          to="/"
          className="text-lg font-bold tracking-wider text-white hover:text-scribble-primary transition-colors"
        >
          Scribble
        </Link>

        {/* Right: Navigation */}
        <nav className="flex items-center gap-4 text-sm" aria-label="Main navigation">
          {user ? (
            <>
              <Link
                to="/profile"
                className="text-scribble-muted hover:text-white transition-colors"
              >
                Profile
              </Link>
              <button
                onClick={handleLogout}
                className="text-scribble-muted hover:text-red-400 transition-colors"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="text-scribble-muted hover:text-white transition-colors"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="px-3 py-1.5 rounded-lg bg-scribble-primary text-white text-sm font-medium hover:bg-scribble-primary-dark transition-colors"
              >
                Register
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

export default Navbar;
