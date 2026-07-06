import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { listProjects, getProject, deleteProject, updateProject } from '../../utils/projectsApi';

function ProjectListSidebar({ isOpen, onClose, onLoad, onDelete, activeProjectId }) {
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [loadingId, setLoadingId] = useState(null);
  const [loadErrorId, setLoadErrorId] = useState(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Inline rename state
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editError, setEditError] = useState(null);
  const editInputRef = useRef(null);

  // Close sidebar transition — render the DOM but hide with translate
  const [visible, setVisible] = useState(false);

  // When isOpen changes, trigger visibility for transition
  useEffect(() => {
    if (isOpen) {
      setVisible(true);
    } else {
      // Delay removal to allow exit animation
      const timer = setTimeout(() => setVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const fetchProjects = useCallback(async (page = 1, append = false) => {
    if (append) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
    }
    setFetchError(null);
    try {
      const data = await listProjects(page, 20);
      if (append) {
        setProjects((prev) => [...prev, ...data.projects]);
      } else {
        setProjects(data.projects);
      }
      setCurrentPage(data.page);
      setTotalPages(data.pages);
    } catch (err) {
      setFetchError(err.message || 'Failed to load projects');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchProjects(1, false);
      setEditingId(null);
      setEditError(null);
      setLoadErrorId(null);
    }
  }, [isOpen, fetchProjects]);

  const handleLoadMore = () => {
    if (currentPage < totalPages && !isLoadingMore) {
      fetchProjects(currentPage + 1, true);
    }
  };

  // Handle Escape key
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      if (editingId) {
        // Cancel rename first if editing
        setEditingId(null);
        setEditError(null);
      } else {
        onClose();
      }
    }
  }, [onClose, editingId]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  // Focus edit input when inline rename is activated
  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  const handleLoad = async (id) => {
    setLoadingId(id);
    setLoadErrorId(null);
    try {
      const project = await getProject(id);
      onLoad(project);
    } catch (err) {
      setLoadErrorId(id);
    } finally {
      setLoadingId(null);
    }
  };

  const handleDeleteConfirm = async (id) => {
    setDeletingId(id);
    try {
      await deleteProject(id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
      setConfirmDeleteId(null);
      if (onDelete) onDelete(id);
    } catch {
      // Error — keep the item in the list
    } finally {
      setDeletingId(null);
    }
  };

  // --- Inline rename handlers ---

  const handleStartRename = (project) => {
    setEditingId(project.id);
    setEditName(project.name);
    setEditError(null);
  };

  const handleCancelRename = () => {
    setEditingId(null);
    setEditError(null);
  };

  const handleCommitRename = async (id) => {
    const trimmed = editName.trim();
    if (!trimmed) {
      setEditError('Name cannot be empty');
      return;
    }
    if (trimmed.length > 200) {
      setEditError('Name must be at most 200 characters');
      return;
    }
    try {
      await updateProject(id, { name: trimmed });
      setProjects((prev) =>
        prev.map((p) => (p.id === id ? { ...p, name: trimmed } : p))
      );
      setEditingId(null);
      setEditError(null);
    } catch (err) {
      setEditError(err.message || 'Failed to rename project');
    }
  };

  const handleRenameKeyDown = (e, id) => {
    if (e.key === 'Enter') {
      handleCommitRename(id);
    } else if (e.key === 'Escape') {
      handleCancelRename();
    }
  };

  const handleRenameBlur = (id) => {
    handleCommitRename(id);
  };

  // --- Helpers ---

  const formatDate = (isoString) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  if (!visible) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sidebar panel */}
      <div
        className={`fixed right-0 top-0 h-full w-full sm:w-80 bg-scribble-surface
                    border-l border-scribble-border z-50 shadow-2xl flex flex-col
                    transform transition-transform duration-300 ease-out ${
                      isOpen ? 'translate-x-0' : 'translate-x-full'
                    }`}
        role="dialog"
        aria-modal="true"
        aria-label="Saved projects"
        data-testid="project-list-sidebar"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-scribble-border shrink-0">
          <h2 className="text-lg font-semibold text-white">Projects</h2>
          <button
            onClick={onClose}
            aria-label="Close project list"
            className="w-8 h-8 rounded-lg flex items-center justify-center
                       text-scribble-muted hover:text-white hover:bg-scribble-border/30
                       transition-colors duration-150"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-3">
          {/* Loading skeleton */}
          {isLoading && (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-scribble-bg/50 border border-scribble-border rounded-lg p-3 animate-pulse"
                >
                  <div className="h-5 bg-scribble-border rounded w-3/4 mb-2" />
                  <div className="h-3 bg-scribble-border rounded w-1/3" />
                </div>
              ))}
            </div>
          )}

          {/* Error state */}
          {!isLoading && fetchError && (
            <div className="flex flex-col items-center py-8 gap-3">
              <p className="text-red-400 text-sm text-center">{fetchError}</p>
              <button
                onClick={() => fetchProjects(1, false)}
                className="px-4 py-2 rounded-lg text-sm text-white bg-scribble-primary
                           hover:bg-scribble-primary-dark transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          {/* Empty state */}
          {!isLoading && !fetchError && projects.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                width="48"
                height="48"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className="text-scribble-border mb-4"
              >
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
              <p className="text-scribble-muted text-sm">
                No saved projects yet. Create your first drawing and click Save!
              </p>
            </div>
          )}

          {/* Project list */}
          {!isLoading && !fetchError && projects.map((project) => (
            <div
              key={project.id}
              className={`border rounded-lg p-3 mb-2 transition-colors ${
                activeProjectId === project.id
                  ? 'border-scribble-primary bg-scribble-primary/10'
                  : 'bg-scribble-bg/50 border-scribble-border hover:border-scribble-primary/30'
              }`}
            >
              <div className="flex items-center justify-between">
                {/* Name or inline edit input */}
                {editingId === project.id ? (
                  <div className="flex-1 flex flex-col mr-2">
                    <input
                      ref={editInputRef}
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => handleRenameKeyDown(e, project.id)}
                      onBlur={() => handleRenameBlur(project.id)}
                      maxLength={200}
                      className="w-full px-2 py-1 rounded bg-scribble-bg border border-scribble-primary
                                 text-white text-sm focus:outline-none"
                      data-testid={`rename-input-${project.id}`}
                    />
                    {editError && (
                      <p className="text-red-400 text-xs mt-1">{editError}</p>
                    )}
                  </div>
                ) : (
                  <h3 className="text-white font-medium text-sm truncate flex-1">
                    {project.name}
                  </h3>
                )}
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  {/* Edit (rename) button — hidden while editing */}
                  {editingId !== project.id && (
                    <button
                      onClick={() => handleStartRename(project)}
                      className="p-1 rounded hover:bg-scribble-border/30 text-scribble-muted
                                 hover:text-white transition-colors"
                      aria-label={`Rename ${project.name}`}
                      title="Rename project"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        width="14"
                        height="14"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                      </svg>
                    </button>
                  )}
                  {/* Load button */}
                  <button
                    onClick={() => handleLoad(project.id)}
                    disabled={loadingId === project.id}
                    className="px-3 py-1 rounded text-xs font-medium text-white
                               bg-scribble-primary hover:bg-scribble-primary-dark
                               transition-colors disabled:opacity-50"
                    aria-label={`Load ${project.name}`}
                  >
                    {loadingId === project.id ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        width="14"
                        height="14"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                        className="animate-spin"
                      >
                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                      </svg>
                    ) : (
                      'Load'
                    )}
                  </button>
                  {/* Delete button */}
                  <button
                    onClick={() => setConfirmDeleteId(project.id)}
                    disabled={deletingId === project.id}
                    className="p-1 rounded hover:bg-red-500/20 text-scribble-muted hover:text-red-400
                               transition-colors disabled:opacity-50"
                    aria-label={`Delete ${project.name}`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      width="14"
                      height="14"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      <line x1="10" y1="11" x2="10" y2="17" />
                      <line x1="14" y1="11" x2="14" y2="17" />
                    </svg>
                  </button>
                </div>
              </div>
              {/* Load error for specific card */}
              {loadErrorId === project.id && (
                <p className="text-red-400 text-xs mt-1">
                  Failed to load this project. Please try again.
                </p>
              )}
              <p className="text-xs text-scribble-muted mt-1">
                {formatDate(project.updated_at)}
              </p>

              {/* Inline delete confirmation */}
              {confirmDeleteId === project.id && (
                <div className="mt-2 pt-2 border-t border-scribble-border">
                  <p className="text-xs text-scribble-muted mb-2">
                    Delete this project?
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      disabled={deletingId === project.id}
                      className="px-3 py-1 rounded text-xs text-scribble-muted
                                 hover:bg-scribble-border/30 transition-colors
                                 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleDeleteConfirm(project.id)}
                      disabled={deletingId === project.id}
                      className="px-3 py-1 rounded text-xs font-medium text-white
                                 bg-red-600 hover:bg-red-700 transition-colors
                                 disabled:opacity-50 flex items-center gap-1"
                    >
                      {deletingId === project.id && (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          width="12"
                          height="12"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                          className="animate-spin"
                        >
                          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                        </svg>
                      )}
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Load More button */}
          {!isLoading && !fetchError && projects.length > 0 && currentPage < totalPages && (
            <div className="flex justify-center pt-2 pb-1">
              <button
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                className="px-4 py-2 rounded-lg text-sm text-white bg-scribble-primary/20
                           hover:bg-scribble-primary/40 transition-colors
                           disabled:opacity-50 flex items-center gap-2"
              >
                {isLoadingMore ? (
                  <>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      width="16"
                      height="16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                      className="animate-spin"
                    >
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                    Loading...
                  </>
                ) : (
                  'Load More'
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </>,
    document.body
  );
}

export default ProjectListSidebar;
