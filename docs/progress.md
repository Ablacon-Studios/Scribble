# Progress

## Completed Features
- ✅ **Serve Web + Electron App from Server** — Approved 2026-07-03
- ✅ **User Authentication & Profile System** — Approved 2026-07-04
  - 179/179 tests, session auth, CSRF, rate limiting, email verification (SMTP), password reset
- ✅ **Drawing Canvas — Single Color Drawing** — Approved 2026-07-04
  - Spec: docs/specs/drawing-canvas.md
  - Design: docs/design/drawing-canvas.md
  - 205/205 tests pass (103 frontend + 102 backend)
  - HTML5 Canvas freehand drawing, mouse + touch, purple #7c3aed, 3px lines
  - HomePage now hosts canvas + color indicator
- ✅ **Multiple Colors & Color Picker** — Approved 2026-07-04
  - 12 preset colors + custom picker, toolbar sidebar, per-stroke color storage
  - 207/207 tests pass (105 frontend + 102 backend)
- ✅ **Eraser Tool & Brush Sizes** — Approved 2026-07-05
  - Spec: docs/specs/eraser-tool.md
  - Design: docs/design/eraser-tool.md
  - 263/263 tests pass (161 frontend + 102 backend)
  - Eraser mode toggle with 3 size presets (5/15/30px), true pixel erasure via destination-out
  - Brush size selector with 4 presets (1/3/5/8px), stored per-stroke
  - Eraser cursor overlay (purple ring + center dot), React Portal flyout menu
  - Interleaved chronological stroke replay for correct draw-over-erase behavior
- ✅ **Undo/Redo** — Approved 2026-07-05
  - Spec: docs/specs/undo-redo.md
  - Design: docs/design/undo-redo.md
  - 295/295 tests pass (193 frontend + 102 backend)
  - Undo (Ctrl+Z) / Redo (Ctrl+Shift+Z / Ctrl+Y) with toolbar buttons and keyboard shortcuts
  - Whole-stroke granularity, redo stack invalidation on new stroke, mid-stroke guard
  - UndoRedoToggle at top of toolbar (above eraser), vertical on desktop, horizontal on mobile
- ✅ **Shape Tools** — Approved 2026-07-05
  - Spec: docs/specs/shape-tools.md
  - Design: docs/design/shape-tools.md
  - 327/327 tests pass (225 frontend + 102 backend)
  - Rectangle, Circle, Line tools with live preview and click-and-drag
  - Shape strokes store compact {type, startPoint, endPoint} — no points[] array
  - ShapeToolsGroup radio buttons between eraser and color swatches

- ✅ **Project Saving & Loading** — Approved 2026-07-05
  - Spec: docs/specs/project-save-load.md
  - Design: docs/design/project-save-load.md
  - 439 tests pass (146 backend + 293 frontend)
  - Save, Load, Save As, New Project, Rename, Delete
  - ProjectListSidebar, SaveProjectModal, UnsavedChangesDialog
  - Project name indicator in toolbar, Ctrl+S/Ctrl+Shift+S keyboard shortcuts
  - Save As creates a new project from a loaded one (explicit button + Shift+click)
  - Production mode: server/app.py serves both frontend (SPA) and API on port 5000
  - Server fixes: eventlet→threading, load_dotenv before imports, absolute DB path

## Current Feature
- 🔧 **Toolbar Overflow Fix** — In Progress (not yet resolved)
  - The left-side toolbar extends off the bottom of the screen on desktop
  - Multiple approaches attempted: 2-column swatches, dynamic grids, overflow scrolling, min-h-0
  - Root cause may be in the CSS flex layout chain between HomePage → ColorToolbar
  - User wants content to wrap/fit without extending off-screen
