function EraserToggle({ active, onToggle }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={active}
      aria-label="Eraser tool"
      title="Eraser"
      onClick={() => onToggle(!active)}
      className={`
        w-9 h-9 rounded-lg cursor-pointer transition-all duration-150 outline-none
        flex items-center justify-center
        focus-visible:ring-2 focus-visible:ring-scribble-primary focus-visible:ring-offset-2 focus-visible:ring-offset-scribble-surface
        ${active
          ? 'bg-scribble-primary/20 ring-2 ring-scribble-primary ring-offset-2 ring-offset-scribble-surface'
          : 'bg-transparent hover:bg-scribble-border/30'
        }
      `}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        width="18"
        height="18"
        className={active ? 'text-purple-300' : 'text-scribble-muted'}
        fill="currentColor"
        aria-hidden="true"
      >
        <rect x="3" y="8" width="18" height="10" rx="1" transform="rotate(-12 12 13)" />
        <rect
          x="3"
          y="8"
          width="18"
          height="3"
          rx="1"
          transform="rotate(-12 12 13)"
          fill="currentColor"
          opacity="0.5"
        />
      </svg>
    </button>
  );
}

export default EraserToggle;
