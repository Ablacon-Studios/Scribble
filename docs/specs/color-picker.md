# Tech Spec: Multiple Colors & Color Picker

**Status**: In Development
**Feature**: #4 — Multiple Colors & Color Picker
**Date**: 2026-07-04

## 1. Overview
Replace hardcoded #7c3aed with user-selectable colors. 12 preset swatches + native color picker. Left sidebar toolbar on desktop, horizontal strip on mobile. Each stroke stores its own color.

## 2. Requirements
- R4.1: Toolbar with 12 preset color swatches (black, white, red, orange, yellow, green, blue, indigo, purple, pink, brown, gray)
- R4.2: Clicking a swatch sets active drawing color
- R4.3: Custom color input `<input type="color">` for any color
- R4.4: Active swatch visually highlighted with white ring
- R4.5: DrawingCanvas receives `color` prop (no hardcoded constant)
- R4.6: Each stroke stores its own `color` field
- R4.7: Redraw replays strokes in their original colors

## 3. Technical Approach
- HomePage owns `activeColor` state, passes to Toolbar and DrawingCanvas
- DrawingCanvas uses `colorRef` to avoid stale closure in draw handlers
- Toolbar on left (desktop) or above (mobile) canvas
- ColorIndicator retained, now reflects dynamic color
- No backend changes

## 4. Files
- NEW: client/src/components/toolbar/ColorToolbar.jsx
- NEW: client/src/components/toolbar/ColorSwatch.jsx
- MODIFY: client/src/components/HomePage.jsx
- MODIFY: client/src/components/canvas/DrawingCanvas.jsx
- MODIFY: client/src/components/canvas/ColorIndicator.jsx

## 5. Out of Scope
Eraser, brush sizes, fill bucket, selection tool, opacities, color history

## 6. Test Strategy
- Toolbar renders 12 swatches + custom input
- Click swatch → onColorChange called
- Active swatch highlighted
- DrawingCanvas accepts color prop
- Strokes store color
