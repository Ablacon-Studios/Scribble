import { useRef, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import ColorSwatch from './ColorSwatch';
import UndoRedoToggle from './UndoRedoToggle';
import EraserToggle from './EraserToggle';
import ShapeToolsGroup from './ShapeToolsGroup';
import BrushSizeSelector from './BrushSizeSelector';
import EraserSizeSelector from './EraserSizeSelector';
import ProjectControls from './ProjectControls';

const PRESET_COLORS = [
  { name: 'Black',   hex: '#000000' },
  { name: 'White',   hex: '#ffffff' },
  { name: 'Red',     hex: '#ef4444' },
  { name: 'Orange',  hex: '#f97316' },
  { name: 'Yellow',  hex: '#eab308' },
  { name: 'Green',   hex: '#22c55e' },
  { name: 'Blue',    hex: '#3b82f6' },
  { name: 'Indigo',  hex: '#6366f1' },
  { name: 'Purple',  hex: '#a855f7' },
  { name: 'Pink',    hex: '#ec4899' },
  { name: 'Brown',   hex: '#78716c' },
  { name: 'Gray',    hex: '#6b7280' },
];

function ColorToolbar({
  currentColor,
  onColorChange,
  eraserMode,
  onEraserToggle,
  eraserSize,
  onEraserSizeChange,
  brushSize,
  onBrushSizeChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  shapeMode,
  onShapeModeChange,
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
  const eraserRef = useRef(null);
  const [flyoutPos, setFlyoutPos] = useState({ top: 0, left: 0 });

  useLayoutEffect(() => {
    if (eraserMode && eraserRef.current) {
      const rect = eraserRef.current.getBoundingClientRect();
      const isDesktop = window.innerWidth >= 640;
      setFlyoutPos({
        top: isDesktop ? rect.top : rect.bottom + 4,
        left: isDesktop ? rect.right + 8 : rect.left,
      });
    }
  }, [eraserMode]);

  return (
    <div
      className="sm:w-16 sm:h-full sm:flex-col sm:border-r sm:border-b-0 sm:overflow-y-auto sm:min-h-0
                  w-full flex-row border-b border-r-0 px-2 py-2 overflow-x-auto overflow-y-hidden
                  bg-scribble-surface border-scribble-border flex items-center gap-1.5 sm:gap-1"
      role="toolbar"
      aria-label="Drawing toolbar"
    >
      {/* Undo / Redo buttons */}
      <UndoRedoToggle
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={onUndo}
        onRedo={onRedo}
      />

      {/* Eraser toggle with flyout — NOT inside overflow area */}
      <div ref={eraserRef} className="sm:relative flex sm:flex-col items-center shrink-0">
        <EraserToggle active={eraserMode} onToggle={onEraserToggle} />
        {eraserMode && createPortal(
          <div className="fixed z-50 bg-scribble-surface border border-scribble-border rounded-lg shadow-lg p-2 flex flex-col items-center gap-2"
            style={{ top: flyoutPos.top, left: flyoutPos.left }}>
            <EraserSizeSelector
              currentSize={eraserSize}
              onChange={onEraserSizeChange}
              visible={eraserMode}
            />
          </div>,
          document.body
        )}
      </div>

      {/* Shape tools */}
      <ShapeToolsGroup
        shapeMode={shapeMode}
        onShapeModeChange={onShapeModeChange}
      />

      {/* Separator */}
      <div
        className="sm:w-full sm:h-px sm:my-1 w-px h-6 mx-1 bg-scribble-border shrink-0"
        aria-hidden="true"
      />

      {/* Project controls (Save / Load / New) */}
      <ProjectControls
        hasActiveProject={hasActiveProject}
        isDirty={isDirty}
        canSave={canSave}
        isSaving={isSaving}
        onProjectNew={onProjectNew}
        onProjectSave={onProjectSave}
        onProjectLoad={onProjectLoad}
        onSaveAs={onSaveAs}
        projectName={projectName}
      />

      {/* Separator */}
      <div
        className="sm:w-full sm:h-px sm:my-1 w-px h-6 mx-1 bg-scribble-border shrink-0"
        aria-hidden="true"
      />

      {/* Color swatches */}
      <div
        className="grid grid-cols-2 gap-1.5"
        role="radiogroup"
        aria-label="Preset colors"
      >
        {PRESET_COLORS.map((c) => (
          <ColorSwatch
            key={c.hex}
            color={c.hex}
            name={c.name}
            isActive={currentColor === c.hex}
            onSelect={onColorChange}
          />
        ))}
      </div>

      {/* Brush size selector */}
      <div
        className="sm:w-full sm:h-px sm:my-1 w-px h-6 mx-1 bg-scribble-border shrink-0"
        aria-hidden="true"
      />
      <BrushSizeSelector
        currentSize={brushSize}
        onChange={onBrushSizeChange}
      />

      {/* Custom color picker — pushed to bottom on desktop */}
      <div className="sm:mt-auto sm:w-full sm:pt-2 sm:border-t sm:border-scribble-border flex sm:flex-col items-center gap-1">
        <div className="sm:hidden w-px h-6 bg-scribble-border mx-1" aria-hidden="true" />
        <input
          type="color"
          value={currentColor}
          onChange={(e) => onColorChange(e.target.value)}
          className="w-7 h-7 sm:w-7 sm:h-7 w-8 h-8 rounded-full cursor-pointer border-0 p-0 bg-transparent
                     [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch]:border-0
                     hover:scale-110 transition-transform duration-150
                     focus-visible:ring-2 focus-visible:ring-scribble-primary focus-visible:ring-offset-2 focus-visible:ring-offset-scribble-surface"
          aria-label="Custom color picker"
          title="Custom color"
        />
        <span className="hidden sm:block text-[10px] text-scribble-muted text-center">Custom</span>
      </div>
    </div>
  );
}

export default ColorToolbar;
