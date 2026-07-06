import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import SplashScreen from './SplashScreen';
import Navbar from './layout/Navbar';
import DrawingCanvas from './canvas/DrawingCanvas';
import ColorIndicator from './canvas/ColorIndicator';
import ColorToolbar from './toolbar/ColorToolbar';
import SaveProjectModal from './projects/SaveProjectModal';
import ProjectListSidebar from './projects/ProjectListSidebar';
import UnsavedChangesDialog from './projects/UnsavedChangesDialog';
import { createProject, updateProject } from '../utils/projectsApi';

function HomePage() {
  const { user } = useAuth();
  const [activeColor, setActiveColor] = useState('#7c3aed');
  const colorRef = useRef('#7c3aed');

  // Eraser state
  const [eraserMode, setEraserMode] = useState(false);
  const eraserModeRef = useRef(false);
  const [eraserSize, setEraserSize] = useState(15);
  const eraserSizeRef = useRef(15);

  // Shape tool state
  const [shapeMode, setShapeMode] = useState(null);
  const shapeModeRef = useRef(null);

  // Brush state
  const [brushSize, setBrushSize] = useState(3);
  const brushSizeRef = useRef(3);

  // Undo/Redo state
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Refs to hold undo/redo functions exposed by DrawingCanvas
  const undoRef = useRef(null);
  const redoRef = useRef(null);

  // Project state
  const [projectId, setProjectId] = useState(null);
  const [projectName, setProjectName] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showProjectList, setShowProjectList] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState(null); // 'new' | 'load'
  const [pendingProjectId, setPendingProjectId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [canSave, setCanSave] = useState(false);
  const [saveError, setSaveError] = useState(null);

  // Refs for DrawingCanvas get/load strokes
  const getStrokesRef = useRef(null);
  const loadStrokesRef = useRef(null);

  const hasStrokesRef = useRef(false);

  const handleColorChange = (newColor) => {
    colorRef.current = newColor;
    setActiveColor(newColor);

    if (eraserModeRef.current) {
      eraserModeRef.current = false;
      setEraserMode(false);
    }

    if (shapeModeRef.current !== null) {
      shapeModeRef.current = null;
      setShapeMode(null);
    }
  };

  const handleEraserToggle = (newValue) => {
    eraserModeRef.current = newValue;
    setEraserMode(newValue);
    if (newValue && shapeModeRef.current !== null) {
      shapeModeRef.current = null;
      setShapeMode(null);
    }
  };

  const handleEraserSizeChange = (newSize) => {
    eraserSizeRef.current = newSize;
    setEraserSize(newSize);
  };

  const handleShapeModeChange = (newMode) => {
    shapeModeRef.current = newMode;
    setShapeMode(newMode);
    if (newMode !== null && eraserModeRef.current) {
      eraserModeRef.current = false;
      setEraserMode(false);
    }
  };

  const handleBrushSizeChange = (newSize) => {
    brushSizeRef.current = newSize;
    setBrushSize(newSize);
  };

  const handleUndo = useCallback(() => {
    undoRef.current?.();
  }, []);

  const handleRedo = useCallback(() => {
    redoRef.current?.();
  }, []);

  // ── Project handlers ────────────────────────────────────────────────
  // NOTE: handlers are ordered so that a function is defined before
  // it is referenced by another useCallback dependency.

  const executeNewProject = useCallback(() => {
    loadStrokesRef.current?.([]);
    setProjectId(null);
    setProjectName('');
    setIsDirty(false);
    hasStrokesRef.current = false;
    setCanSave(false);
  }, []);

  const doSilentSave = useCallback(async () => {
    if (!projectId) return;
    setIsSaving(true);
    try {
      const strokes = getStrokesRef.current?.() || [];
      await updateProject(projectId, { strokes });
      setIsDirty(false);
    } catch (err) {
      // Silently fail — user can retry
    } finally {
      setIsSaving(false);
    }
  }, [projectId]);

  const handleSaveProject = useCallback(() => {
    if (isSaving) return;
    if (!hasStrokesRef.current) return;
    if (projectId) {
      // Silent save over existing project
      doSilentSave();
    } else {
      setSaveError(null);
      setShowSaveModal(true);
    }
  }, [projectId, isSaving, doSilentSave]);

  const handleNewProject = useCallback(() => {
    if (isDirty) {
      setPendingAction('new');
      setShowUnsavedDialog(true);
    } else {
      executeNewProject();
    }
  }, [isDirty, executeNewProject]);

  const handleSaveAs = useCallback(async (name) => {
    setIsSaving(true);
    setSaveError(null);
    try {
      const strokes = getStrokesRef.current?.() || [];
      const project = await createProject(name, strokes);
      setProjectId(project.id);
      setProjectName(project.name);
      setIsDirty(false);
      setShowSaveModal(false);
    } catch (err) {
      setSaveError(err.message || 'Failed to save project');
    } finally {
      setIsSaving(false);
    }
  }, []);

  const handleSaveAsClick = useCallback(() => {
    if (!hasStrokesRef.current) return;
    setSaveError(null);
    setShowSaveModal(true);
  }, []);

  const handleOpenProjects = useCallback(() => {
    if (isDirty) {
      setPendingAction('load');
      setShowUnsavedDialog(true);
    } else {
      setShowProjectList(true);
    }
  }, [isDirty]);

  const handleLoadProject = useCallback(async (project) => {
    try {
      loadStrokesRef.current?.(project.strokes || []);
      setProjectId(project.id);
      setProjectName(project.name);
      setIsDirty(false);
      const hasStrokes = project.strokes && project.strokes.length > 0;
      hasStrokesRef.current = hasStrokes;
      setCanSave(hasStrokes);
      setShowProjectList(false);
    } catch {
      // Error handled silently
    }
  }, []);

  const handleDeleteProject = useCallback((id) => {
    if (id === projectId) {
      setProjectId(null);
      setProjectName('');
      // Canvas strokes preserved — user hasn't lost work
    }
  }, [projectId]);

  const _continueAfterSave = useCallback(() => {
    setShowUnsavedDialog(false);
    if (pendingAction === 'new') {
      executeNewProject();
    } else if (pendingAction === 'load') {
      setShowProjectList(true);
    }
    setPendingAction(null);
  }, [pendingAction, executeNewProject]);

  const handleSaveBeforeContinue = useCallback(() => {
    // Save first, then continue with the pending action
    if (!hasStrokesRef.current) {
      _continueAfterSave();
      return;
    }
    if (projectId) {
      // Silent save over existing project, then proceed
      setIsSaving(true);
      (async () => {
        try {
          const strokes = getStrokesRef.current?.() || [];
          await updateProject(projectId, { strokes });
          setIsDirty(false);
          setIsSaving(false);
          _continueAfterSave();
        } catch {
          setIsSaving(false);
        }
      })();
    } else {
      // Need to name the project first — show save modal, then continue
      setSaveError(null);
      setShowSaveModal(true);
    }
  }, [projectId, _continueAfterSave]);

  const handleDiscardUnsaved = useCallback(() => {
    setShowUnsavedDialog(false);
    if (pendingAction === 'new') {
      executeNewProject();
    } else if (pendingAction === 'load') {
      setShowProjectList(true);
    }
    setPendingAction(null);
  }, [pendingAction, executeNewProject]);

  const handleCancelUnsaved = useCallback(() => {
    setShowUnsavedDialog(false);
    setPendingAction(null);
  }, []);

  // ── Keyboard shortcuts ──────────────────────────────────────────────

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't intercept when focus is in an input, textarea, select,
      // or contenteditable element
      const target = e.target;
      const tag = target.tagName;
      if (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        target.isContentEditable
      ) {
        return;
      }

      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;

      if (e.key.toLowerCase() === 'z' && e.shiftKey) {
        e.preventDefault();
        redoRef.current?.();
      } else if (e.key.toLowerCase() === 'z') {
        e.preventDefault();
        undoRef.current?.();
      } else if (e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redoRef.current?.();
      } else if (e.key.toLowerCase() === 'n') {
        e.preventDefault();
        handleNewProject();
      } else if (e.key.toLowerCase() === 's' && e.shiftKey) {
        e.preventDefault();
        handleSaveAsClick();
      } else if (e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSaveProject();
      } else if (e.key.toLowerCase() === 'o') {
        e.preventDefault();
        handleOpenProjects();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNewProject, handleSaveProject, handleSaveAsClick, handleOpenProjects]);

  if (!user) {
    return <SplashScreen />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-scribble-bg">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <ColorToolbar
          currentColor={activeColor}
          onColorChange={handleColorChange}
          eraserMode={eraserMode}
          onEraserToggle={handleEraserToggle}
          eraserSize={eraserSize}
          onEraserSizeChange={handleEraserSizeChange}
          brushSize={brushSize}
          onBrushSizeChange={handleBrushSizeChange}
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={handleUndo}
          onRedo={handleRedo}
          shapeMode={shapeMode}
          onShapeModeChange={handleShapeModeChange}
          hasActiveProject={!!projectId}
          isDirty={isDirty}
          canSave={canSave}
          isSaving={isSaving}
          onProjectNew={handleNewProject}
          onProjectSave={handleSaveProject}
          onProjectLoad={handleOpenProjects}
          onSaveAs={handleSaveAsClick}
          projectName={projectName}
        />
        <main className="flex-1 flex flex-col items-center justify-center px-4 py-8">
            <DrawingCanvas
              colorRef={colorRef}
              eraserModeRef={eraserModeRef}
              eraserSizeRef={eraserSizeRef}
              brushSizeRef={brushSizeRef}
              shapeModeRef={shapeModeRef}
              onUndoReady={(fn) => { undoRef.current = fn; }}
              onRedoReady={(fn) => { redoRef.current = fn; }}
              onCanUndoChange={setCanUndo}
              onCanRedoChange={setCanRedo}
              onGetStrokesReady={(fn) => { getStrokesRef.current = fn; }}
              onLoadStrokesReady={(fn) => { loadStrokesRef.current = fn; }}
              onDirtyChange={(dirty) => {
                if (dirty) setIsDirty(true);
              }}
              onHasStrokesChange={(has) => {
                hasStrokesRef.current = has;
                setCanSave(has);
              }}
            />
          <ColorIndicator color={activeColor} />
        </main>
      </div>

      {/* Modals and sidebar */}
      <SaveProjectModal
        isOpen={showSaveModal}
        onSave={handleSaveAs}
        onClose={() => {
          setShowSaveModal(false);
          setSaveError(null);
        }}
        isSaving={isSaving}
        error={saveError}
        initialName={projectName}
      />
      <ProjectListSidebar
        isOpen={showProjectList}
        onClose={() => setShowProjectList(false)}
        onLoad={handleLoadProject}
        onDelete={handleDeleteProject}
        activeProjectId={projectId}
      />
      <UnsavedChangesDialog
        isOpen={showUnsavedDialog}
        onSave={handleSaveBeforeContinue}
        onDiscard={handleDiscardUnsaved}
        onCancel={handleCancelUnsaved}
      />
    </div>
  );
}

export default HomePage;
