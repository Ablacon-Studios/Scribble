import { useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

function UnsavedChangesDialog({ isOpen, onSave, onDiscard, onCancel }) {
  // Handle Escape key
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      onCancel();
    }
  }, [onCancel]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Dialog card */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="unsaved-dialog-title"
        data-testid="unsaved-changes-dialog"
      >
        <div className="relative w-full max-w-sm w-[90%] bg-scribble-surface border border-scribble-border rounded-xl shadow-2xl">
          {/* Header */}
          <div className="flex items-center gap-3 p-4 border-b border-scribble-border">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              width="24"
              height="24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="text-amber-400 shrink-0"
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <h2 id="unsaved-dialog-title" className="text-lg font-semibold text-white">
              Unsaved Changes
            </h2>
          </div>

          {/* Body */}
          <div className="p-4">
            <p className="text-sm text-scribble-muted">
              You have unsaved changes. Continue?
            </p>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 p-4 border-t border-scribble-border">
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded-lg text-sm text-scribble-muted hover:text-white
                         hover:bg-scribble-border/30 transition-colors duration-150"
            >
              Cancel
            </button>
            <button
              onClick={onDiscard}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white
                         bg-red-600 hover:bg-red-700 transition-colors duration-150"
            >
              Discard &amp; Continue
            </button>
            <button
              onClick={onSave}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white
                         bg-scribble-primary hover:bg-scribble-primary-dark
                         transition-colors duration-150"
            >
              Save First
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}

export default UnsavedChangesDialog;
