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

## Current Feature
- 🔧 **Eraser Tool & Brush Sizes** — Awaiting Approval (NOT APPROVED)
  - Spec: docs/specs/eraser-tool.md
  - Design: docs/design/eraser-tool.md
  - 263/263 tests pass (161 frontend + 102 backend)
  - Eraser mode toggle with 3 size presets (5/15/30px)
  - True pixel erasure via destination-out composite operation
  - Brush size selector with 4 presets: Thin (1px), Normal (3px), Thick (5px), Heavy (8px)
  - Brush sizes stored per-stroke, replayed on redraw
  - Eraser cursor overlay (purple ring with center dot, always tracks mouse)
  - Eraser size flyout menu via React Portal (fixed positioning, no layout shift)
  - Strokes replayed in chronological order (interleaved draw/erase, not two-pass)
  - Cursor overlay on desktop, touch device support
  - Integration with color toolbar (exits eraser mode on color pick)
