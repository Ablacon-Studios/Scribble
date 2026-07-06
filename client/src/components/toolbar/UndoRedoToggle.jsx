function UndoRedoToggle({ canUndo, canRedo, onUndo, onRedo }) {
  const buttonClasses = `
    w-9 h-9 rounded-lg cursor-pointer transition-all duration-150 outline-none
    flex items-center justify-center
    bg-transparent hover:bg-scribble-border/30 active:bg-scribble-border/40
    focus-visible:ring-2 focus-visible:ring-scribble-primary focus-visible:ring-offset-2 focus-visible:ring-offset-scribble-surface
    disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none
  `;

  return (
    <div className="flex sm:flex-col items-center gap-1 shrink-0" aria-label="Undo/Redo actions">
      {/* Undo button */}
      <button
        type="button"
        disabled={!canUndo}
        aria-label="Undo last stroke"
        title="Undo (Ctrl+Z)"
        onClick={onUndo}
        className={buttonClasses}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          width="18"
          height="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="text-scribble-muted"
        >
          <path d="M3 7v6h6" />
          <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
        </svg>
      </button>

      {/* Redo button */}
      <button
        type="button"
        disabled={!canRedo}
        aria-label="Redo last undone stroke"
        title="Redo (Ctrl+Shift+Z)"
        onClick={onRedo}
        className={buttonClasses}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          width="18"
          height="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="text-scribble-muted"
        >
          <path d="M21 7v6h-6" />
          <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13" />
        </svg>
      </button>
    </div>
  );
}

export default UndoRedoToggle;
