# Tech Spec: Drawing Canvas — Single Color Drawing

**Status**: In Development
**Feature**: #3 — Drawing Canvas (Single Color Drawing)
**Date**: 2026-07-04

## 1. Overview
Transform the HomePage into a freehand drawing surface using HTML5 Canvas. Single fixed color (#7c3aed purple), 3px line width, mouse and touch support. No backend changes needed.

## 2. Requirements
- R3.1: Canvas renders on home page for authenticated users
- R3.2: Mouse drawing (mousedown → mousemove → mouseup)
- R3.3: Touch drawing (touchstart → touchmove → touchend)
- R3.4: Single fixed color #7c3aed
- R3.5: Fixed line width 3px with round caps/joins
- R3.6: Responsive canvas, fills viewport below Navbar
- R3.7: Prevent default touch behaviors while drawing
- R3.8: Stroke data tracked in React state

## 3. Technical Approach
- Canvas element with useRef for DOM access
- Cached CanvasRenderingContext2D ref
- Stroke state: array of { points: [{x, y}, ...] }
- Drawing: beginPath/moveTo/lineTo/stroke in real-time on mousemove
- Redraw: clear + replay all strokes on resize
- ResizeObserver for responsive sizing
- devicePixelRatio support for HiDPI

## 4. Files
- NEW: client/src/components/canvas/DrawingCanvas.jsx
- NEW: client/src/components/canvas/ColorIndicator.jsx
- MODIFY: client/src/components/HomePage.jsx
- NEW: client/src/components/canvas/__tests__/DrawingCanvas.test.jsx

## 5. Out of Scope
Multiple colors, brush sizes, eraser, undo/redo, layers, collaboration, saving, shape tools, export.

## 6. Dependencies
None new. jest-canvas-mock already installed for testing.
