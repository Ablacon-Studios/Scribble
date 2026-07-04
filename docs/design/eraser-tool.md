# Design Document: Eraser Tool

**Feature**: #5 — Eraser Tool
**Status**: In Design
**Date**: 2026-07-04

## 1. Design Overview

Add an eraser tool mode to the Scribble app. The eraser appears as a toggle
button at the top of the ColorToolbar sidebar, above the color swatches.
When active, the canvas switches to eraser mode, a custom cursor overlay
appears on desktop, and an eraser size selector reveals itself below the
swatches.

This is a toggle-able *mode* — not a drawing color. Toggling it on changes
the tool from pencil to eraser. Toggling it off (or clicking a color swatch)
returns to pencil mode with the previously selected color.

---

## 2. Layout

### 2.1 Desktop Layout (vertical sidebar, eraser inactive)

```
┌────────┬─────────────────────────────────┐
│ NAVBAR                                  │
├────────┼─────────────────────────────────┤
│ 🧹     │                                 │
│────────│   ← separator                   │
│ ■ ■    │                                 │
│ ■ ■    │   ← color swatches              │
│ ■ ■    │                                 │
│ ■ ■    │                                 │
│ ■ ■    │                                 │
│ ■ ■    │                                 │
│        │                                 │
│ 🎨     │   ← custom color picker         │
├────────┴─────────────────────────────────┤
│        ●  Drawing color                  │
│  ┌──────────────────────────┐            │
│  │     DRAWING CANVAS       │            │
│  │     cursor-crosshair     │            │
│  └──────────────────────────┘            │
└──────────────────────────────────────────┘
```

### 2.2 Desktop Layout (vertical sidebar, eraser active)

```
┌────────┬─────────────────────────────────┐
│ NAVBAR                                  │
├────────┼─────────────────────────────────┤
│[🧹]    │   ← eraser toggle (highlighted) │
│────────│   ← separator                   │
│ ■ ■    │                                 │
│ ■ ■    │   ← color swatches              │
│ ■ ■    │   (last color still highlighted)│
│ ■ ■    │                                 │
│ ■ ■    │                                 │
│ ■ ■    │                                 │
│────────│   ← separator                   │
│ ● ○ ○  │   ← eraser size (S / M / L)     │
│────────│   ← separator                   │
│ 🎨     │   ← custom color picker         │
├────────┴─────────────────────────────────┤
│        ●  Drawing color                  │
│  ┌──────────────────────────┐            │
│  │     DRAWING CANVAS       │            │
│  │     cursor-none          │            │
│  │   + cursor overlay (○)   │            │
│  └──────────────────────────┘            │
└──────────────────────────────────────────┘

Legend:
 [🧹] = highlighted active toggle
 (○)  = circular cursor overlay following mouse
```

### 2.3 Mobile Layout (horizontal toolbar strip)

```
┌─────────────────────────────────────────┐
│ NAVBAR                                   │
├─────────────────────────────────────────┤
│ 🧹 │ ■ ■ ■ ■ ■ ■ ... │ 🎨              │  ← eraser inactive
├─────────────────────────────────────────┤
│ 🧹 │ ■ ■ ■ ■ ■ ■ ... │ ● ○ ○ │ 🎨     │  ← eraser active
├─────────────────────────────────────────┤
│         ┌───────────────────┐            │
│         │  DRAWING CANVAS   │            │
│         └───────────────────┘            │
└─────────────────────────────────────────┘
```

---

## 3. Component Specifications

### 3.1 EraserToggle

**File**: `client/src/components/toolbar/EraserToggle.jsx`

**Props**:

| Prop       | Type       | Required | Description                              |
|------------|------------|----------|------------------------------------------|
| `active`   | `boolean`  | Yes      | Whether eraser mode is currently active  |
| `onToggle` | `function` | Yes      | Called with `true`/`false` on click      |

**Icon**: An inline SVG depicting a classic pink eraser block, 24×24 viewBox.

**States**:

| State     | Visual                                                       |
|-----------|--------------------------------------------------------------|
| Default   | 36px touch target, rounded-lg, bg-transparent, hover:bg-scribble-border/30, icon color: scribble-muted |
| Hover     | Background brightens, icon color: white |
| Focus     | focus-visible:ring-2 focus-visible:ring-scribble-primary focus-visible:ring-offset-2 |
| **Active**| bg-scribble-primary/20 ring-2 ring-scribble-primary ring-offset-2 ring-offset-scribble-surface |

**Accessibility**: role="checkbox", aria-checked, aria-label="Eraser tool", title="Eraser"

### 3.2 EraserSizeSelector

**File**: `client/src/components/toolbar/EraserSizeSelector.jsx`

**Props**:

| Prop          | Type       | Required | Description                                  |
|---------------|------------|----------|----------------------------------------------|
| `currentSize` | `number`   | Yes      | Currently selected eraser diameter (5, 15, or 30) |
| `onChange`    | `function` | Yes      | Called with new size value (5, 15, or 30)    |
| `visible`     | `boolean`  | Yes      | Whether to render the component at all       |

**Size definitions**:

| Label  | Value (px) | CSS visual size |
|--------|------------|-----------------|
| Small  | 5          | 6×6 px circle   |
| Medium | 15         | 12×12 px circle  |
| Large  | 30         | 18×18 px circle  |

**Accessibility**: role="radiogroup" on container; each button: role="radio", aria-checked, aria-label

### 3.3 Cursor Overlay (inside DrawingCanvas)

A `<div>` absolutely positioned over the canvas showing a circle outline matching the eraser size.
- pointer-events: none
- Hidden on touch devices
- Tracks mouse position via requestAnimationFrame
- Circle outline with border and subtle shadow

---

## 4. Updated ColorToolbar Layout

### 4.1 Desktop (sm:w-16, flex-col)

```
┌──────────────┐
│  EraserToggle │
│  ──────────  │  separator
│  ■ ■ swatches │
│  ■ ■ swatches │
│  ──────────  │  separator (only when eraser active)
│  ● S          │
│  ● M sizes    │  EraserSizeSelector (only when eraser active)
│  ● L          │
│  ──────────  │  separator (only when eraser active)
│     🎨        │  custom color picker
└──────────────┘
```

### 4.2 Mobile (horizontal strip, flex-row, overflow-x-auto)

```
EraserToggle │ swatch swatch swatch ... │ S M L │ Custom 🎨
```

---

## 5. Updated HomePage State

**New state variables**:

| State / Ref      | Type      | Default | Purpose                                 |
|------------------|-----------|---------|-----------------------------------------|
| `eraserMode`     | `boolean` | `false` | Whether eraser tool is active           |
| `eraserSize`     | `number`  | `15`    | Current eraser diameter (5, 15, or 30) |
| `eraserModeRef`  | `useRef`  | `false` | Thread-safe mirror of `eraserMode`      |
| `eraserSizeRef`  | `useRef`  | `15`    | Thread-safe mirror of `eraserSize`      |

**Semantic interaction — clicking a color swatch while eraser is active**:
exits eraser mode and selects that color.

---

## 6. Visual Design Details

| Element                      | Color                            | Tailwind class              |
|------------------------------|----------------------------------|-----------------------------|
| Eraser icon (inactive)       | #8892b0 (scribble-muted)        | fill-scribble-muted         |
| Eraser icon (active)         | #c4b5fd (light purple)          | fill-purple-300             |
| Toggle active background     | #6c63ff at 20% opacity          | bg-scribble-primary/20      |
| Toggle active ring           | #6c63ff (scribble-primary)      | ring-scribble-primary       |
| Size dot (inactive)          | #8892b0 (scribble-muted)        | bg-scribble-muted           |
| Size dot (active)            | #6c63ff (scribble-primary)      | bg-scribble-primary         |
| Separator lines              | #0f3460 (scribble-border)       | border-scribble-border      |
| Cursor overlay outline       | rgba(255,255,255,0.6)           | border-white/60             |

---

## 7. Accessibility

| Element             | Role         | ARIA Attributes                                      |
|---------------------|--------------|------------------------------------------------------|
| Toolbar             | `toolbar`    | `aria-label="Drawing toolbar"`                       |
| EraserToggle        | `checkbox`   | `aria-checked`, `aria-label="Eraser tool"`           |
| EraserSizeSelector  | `radiogroup` | `aria-label="Eraser size"`                           |
| Size button (each)  | `radio`      | `aria-checked`, `aria-label="Eraser size: Small (5 pixels)"` |

---

## 8. File Summary

| File | Action | Purpose |
|------|--------|---------|
| `client/src/components/toolbar/EraserToggle.jsx` | **NEW** | Eraser mode toggle button |
| `client/src/components/toolbar/EraserSizeSelector.jsx` | **NEW** | Size preset selector (S/M/L) |
| `client/src/components/toolbar/ColorToolbar.jsx` | MODIFY | Accept and render new eraser props |
| `client/src/components/HomePage.jsx` | MODIFY | Add eraser state/refs, pass props, handle exit-on-color-pick |
| `client/src/components/canvas/DrawingCanvas.jsx` | MODIFY | Accept eraserModeRef/eraserSizeRef, branch draw(), add cursor overlay, modify redrawAll() |
| `client/src/components/toolbar/__tests__/EraserToggle.test.jsx` | **NEW** | Unit tests |
| `client/src/components/toolbar/__tests__/EraserSizeSelector.test.jsx` | **NEW** | Unit tests |
| `client/src/components/canvas/__tests__/DrawingCanvas.test.jsx` | MODIFY | Tests for eraser drawing, stroke type, redraw |
| `client/src/components/__tests__/HomePage.test.jsx` | MODIFY | Tests for eraser state, color-exit integration |
