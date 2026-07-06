import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';

function SaveProjectModal({ isOpen, onSave, onClose, isSaving, error, initialName = '' }) {
  const [name, setName] = useState('');
  const inputRef = useRef(null);
  const previousActiveRef = useRef(null);

  // Reset name, focus input, and save previously focused element when modal opens
  useEffect(() => {
    if (isOpen) {
      // Store the currently focused element so we can return focus on close
      previousActiveRef.current = document.activeElement;
      setName(initialName);
      // Small delay to ensure the input is mounted before focusing
      requestAnimationFrame(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      });
    } else if (previousActiveRef.current) {
      // Return focus to the element that triggered the modal
      const el = previousActiveRef.current;
      previousActiveRef.current = null;
      if (typeof el.focus === 'function') {
        el.focus();
      }
    }
  }, [isOpen]);

  // Handle Escape key
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  const trimmedName = name.trim();
  const canSave = trimmedName.length > 0 && trimmedName.length <= 200 && !isSaving;

  const handleSave = () => {
    if (!canSave) return;
    onSave(trimmedName);
  };

  const handleInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSave();
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal card */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="save-modal-title"
        data-testid="save-project-modal"
      >
        <div className="relative w-full max-w-sm w-[90%] bg-scribble-surface border border-scribble-border rounded-xl shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-scribble-border">
            <h2 id="save-modal-title" className="text-lg font-semibold text-white">
              Save Project
            </h2>
            <button
              onClick={onClose}
              aria-label="Close"
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
          <div className="p-4">
            <input
              ref={inputRef}
              id="project-name-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder="Project name"
              maxLength={200}
              className="w-full px-3 py-2 rounded-lg bg-scribble-bg border border-scribble-border
                         text-white placeholder:text-scribble-muted/50 text-sm
                         focus:outline-none focus:border-scribble-primary focus:ring-1 focus:ring-scribble-primary
                         transition-colors duration-150"
              data-testid="project-name-input"
            />
            {error && (
              <p className="text-red-400 text-xs mt-2" data-testid="save-project-error">
                {error}
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 p-4 border-t border-scribble-border">
            <button
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 rounded-lg text-sm text-scribble-muted hover:text-white
                         hover:bg-scribble-border/30 transition-colors duration-150
                         disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!canSave}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white
                         bg-scribble-primary hover:bg-scribble-primary-dark
                         transition-colors duration-150
                         disabled:opacity-50 disabled:cursor-not-allowed
                         flex items-center gap-2"
              data-testid="save-project-submit"
            >
              {isSaving && (
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
              )}
              Save
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}

export default SaveProjectModal;
