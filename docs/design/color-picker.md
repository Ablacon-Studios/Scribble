# Design: Multiple Colors & Color Picker

**Feature**: #4 — Color Picker
**Date**: 2026-07-04

## Layout
```
┌──────────────────────────────────────────┐
│ NAVBAR                                    │
├────────┬─────────────────────────────────┤
│ TOOLBAR│        DRAWING CANVAS            │
│ w-16   │                                  │
│  ■ ■   │                                  │
│  ■ ■   │                                  │
│  ■ ■   │                                  │
│  ■ ■   │                                  │
│  ■ ■   │                                  │
│  ■ ■   │                                  │
│        │                                  │
│  🎨    │                                  │
├────────┴─────────────────────────────────┤
│              ● Drawing color              │
└──────────────────────────────────────────┘
```
Mobile: toolbar becomes horizontal scrollable strip above canvas.

## Components

### ColorToolbar
- Desktop: w-16 fixed sidebar, bg-scribble-surface, border-r
- Mobile: w-full horizontal row, border-b, overflow-x-auto
- 12 swatches in 2-col grid (desktop) or single row (mobile)
- Custom color input at bottom/end
- aria-label="Color selection toolbar"

### ColorSwatch
- 28x28px (desktop), 32x32px (mobile) rounded-full button
- Active: ring-2 ring-white ring-offset-2
- Hover: scale-110
- role="radio" with aria-checked and aria-label

### HomePage (modified)
- activeColor state, flex layout with toolbar + canvas
- Passes color to DrawingCanvas and ColorIndicator

### DrawingCanvas (modified)
- Accepts `color` prop
- colorRef ensures latest color in event handlers
- Each stroke: { points: [...], color: string }

## Colors
12 presets: black, white, red, orange, yellow, green, blue, indigo, purple, pink, brown, gray
Default: #7c3aed
