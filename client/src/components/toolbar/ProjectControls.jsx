function ProjectControls({
  hasActiveProject,
  isDirty,
  canSave,
  isSaving,
  onProjectNew,
  onProjectSave,
  onProjectLoad,
  onSaveAs,
  projectName,
}) {
  const buttonClasses = `
    w-9 h-9 rounded-lg cursor-pointer transition-all duration-150 outline-none
    flex items-center justify-center
    bg-transparent hover:bg-scribble-border/30 active:bg-scribble-border/40
    focus-visible:ring-2 focus-visible:ring-scribble-primary focus-visible:ring-offset-2 focus-visible:ring-offset-scribble-surface
    disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none
  `;

  return (
    <div className="flex sm:flex-col items-center gap-1 shrink-0" aria-label="Project actions">
      {/* Save button */}
      <button
        type="button"
        aria-label={isDirty ? 'Save changes' : 'Save project'}
        title={isDirty ? 'Save changes (Ctrl+S)' : 'Save project (Ctrl+S)'}
        onClick={(e) => {
          if (hasActiveProject && e.shiftKey && onSaveAs) {
            onSaveAs();
          } else {
            onProjectSave();
          }
        }}
        disabled={!canSave || isSaving}
        className={`${buttonClasses} relative`}
        data-testid="save-project-button"
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
          className={isDirty ? 'text-amber-400' : 'text-scribble-muted'}
        >
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
          <polyline points="17 21 17 13 7 13 7 21" />
          <polyline points="7 3 7 8 15 8" />
        </svg>
        {/* Unsaved changes indicator dot */}
        {isDirty && (
          <span
            className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-scribble-primary rounded-full animate-pulse"
            aria-hidden="true"
          />
        )}
      </button>

      {/* Save As button */}
      <button
        type="button"
        aria-label="Save as new project"
        title="Save as new project (Ctrl+Shift+S)"
        onClick={onSaveAs}
        disabled={!canSave || !hasActiveProject}
        className={buttonClasses}
        data-testid="save-as-button"
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
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      </button>

      {/* Load Projects button */}
      <button
        type="button"
        aria-label="Open saved projects"
        title="Open saved projects (Ctrl+O)"
        onClick={onProjectLoad}
        className={buttonClasses}
        data-testid="open-projects-button"
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
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
      </button>

      {/* New Project button */}
      <button
        type="button"
        aria-label="New project"
        title="New project — clears the canvas (Ctrl+N)"
        onClick={onProjectNew}
        className={buttonClasses}
        data-testid="new-project-button"
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
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>

      {/* Project name indicator */}
      {hasActiveProject && projectName && (
        <span
          className="text-[10px] text-scribble-muted text-center leading-tight px-0.5 truncate max-w-[48px]"
          title={projectName}
        >
          {projectName}
        </span>
      )}
    </div>
  );
}

export default ProjectControls;
