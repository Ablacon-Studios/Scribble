# Design Document: Drawing Canvas

**Feature**: #3 — Drawing Canvas
**Status**: In Design
**Date**: 2026-07-04

## 1. Design Overview
Freehand drawing canvas on the home page. Single-user, single-color. Canvas centered below Navbar with color indicator beneath it.

## 2. Layout
```
┌──────────────────────────────────────────┐
│  NAVBAR                                   │
├──────────────────────────────────────────┤
│                                           │
│         ┌─────────────────────┐           │
│         │   DRAWING CANVAS    │           │
│         │   bg-white          │           │
│         │   rounded-xl        │           │
│         │   border + shadow   │           │
│         │   cursor-crosshair  │           │
│         └─────────────────────┘           │
│                                           │
│              ●  Drawing color             │
└──────────────────────────────────────────┘
```

## 3. Component Specs

### HomePage (Modified)
- Outer div: min-h-screen flex flex-col bg-scribble-bg
- Main: flex-1 flex flex-col items-center justify-center px-4 py-8
- Contains DrawingCanvas + ColorIndicator

### DrawingCanvas (NEW)
- Wrapper div: w-full max-w-[960px] mx-auto
- Canvas: w-full, aspect-ratio 16/10, min-height 60vh on mobile
- bg-white, border border-scribble-border, rounded-xl, shadow-lg shadow-black/20
- cursor-crosshair, touch-action: none
- aria-label="Drawing canvas — use your mouse or touch to draw" role="img"
- Line style: #7c3aed, 3px, round caps, round joins
- ResizeObserver for responsive sizing

### ColorIndicator (NEW)
- Flex row, centered below canvas (mt-3, gap-2)
- 16x16px rounded-full circle in drawing color
- Label: "Drawing color" in text-xs text-scribble-muted
- Circle has aria-hidden="true" (decorative)

## 4. Responsive
- Desktop: max 960x600px, centered
- Tablet: full width up to 960px
- Mobile: full width, min-height 60vh

## 5. Interaction Flows
- Mouse: mousedown (begin) → mousemove (draw) → mouseup/mouseleave (end)
- Touch: touchstart → touchmove → touchend (preventDefault on touch events)
- Resize: ResizeObserver recalculates dimensions, clears and redraws

## 6. Accessibility
- Canvas: role="img", aria-label
- Color swatch: aria-hidden="true"
- Contrast: all passes WCAG AA (lowest 4.6:1 purple on white)

## 7. Colors
- Canvas bg: #ffffff
- Drawing: #7c3aed (purple-600)
- Page bg: #1a1a2e, Border: #0f3460, Label: #8892b0
