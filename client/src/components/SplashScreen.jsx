function SplashScreen({ message }) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center bg-scribble-bg"
      role="status"
      aria-label="Loading Scribble"
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

      {/* Loading dots */}
      <div className="flex gap-2" aria-hidden="true">
        <span
          className="w-2.5 h-2.5 rounded-full bg-scribble-primary motion-safe:animate-pulse"
          style={{ animationDelay: '0s' }}
        />
        <span
          className="w-2.5 h-2.5 rounded-full bg-scribble-primary motion-safe:animate-pulse"
          style={{ animationDelay: '0.2s' }}
        />
        <span
          className="w-2.5 h-2.5 rounded-full bg-scribble-primary motion-safe:animate-pulse"
          style={{ animationDelay: '0.4s' }}
        />
        <span
          className="w-2.5 h-2.5 rounded-full bg-scribble-primary motion-safe:animate-pulse"
          style={{ animationDelay: '0.6s' }}
        />
      </div>

      {/* Optional status message */}
      {message && (
        <p className="mt-6 text-sm text-scribble-muted">{message}</p>
      )}

      {/* Screen reader only text */}
      <span className="sr-only">Loading Scribble...</span>
    </div>
  );
}

export default SplashScreen;
