import { Link } from 'react-router-dom';
import Navbar from './layout/Navbar';

function SplashScreen() {
  return (
    <>
      <Navbar />
      <div
        className="min-h-screen flex flex-col items-center justify-center bg-scribble-bg"
        aria-label="Scribble home"
      >
        {/* Logo */}
        <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-scribble-primary to-scribble-primary-dark flex items-center justify-center mb-8 shadow-lg shadow-scribble-primary/20">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 64 64"
            fill="none"
            className="w-12 h-12"
          >
            <path
              d="M32 8 L12 52 L32 42 L52 52 Z"
              fill="white"
              stroke="white"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <circle cx="32" cy="16" r="4" fill="white" />
          </svg>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold tracking-[0.3em] uppercase text-white mb-8">
          Scribble
        </h1>

        {/* CTA buttons */}
        <div className="flex gap-4">
          <Link
            to="/login"
            className="px-6 py-2.5 bg-scribble-primary text-white font-semibold rounded-lg hover:bg-scribble-primary-dark transition-colors text-sm"
          >
            Log in
          </Link>
          <Link
            to="/register"
            className="px-6 py-2.5 border border-scribble-border text-scribble-muted font-semibold rounded-lg hover:text-white hover:border-white transition-colors text-sm"
          >
            Sign up
          </Link>
        </div>
      </div>
    </>
  );
}

export default SplashScreen;
