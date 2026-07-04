# Tech Spec: Eraser Tool

**Status**: Planned
**Feature**: #5 — Eraser Tool
**Date**: 2026-07-04

## 1. Overview

Add an eraser tool to Scribble that lets users remove portions of existing
strokes from the canvas. The eraser operates as a toggle-able mode: when
active, dragging on the canvas removes pixels instead of adding color. It
uses the HTML5 Canvas `"destination-out"` composite operation for true
pixel removal rather than painting over with the background color.

Eraser actions are stored as a distinct stroke type (`type: 'erase'`)
alongside regular drawing strokes so that the full drawing history can be
replayed during redraw (e.g., after canvas resize). The eraser toggle
button lives in the sidebar toolbar alongside the color swatches.

No backend changes are required — this is a purely client-side feature,
identical in scope to the color picker.

## 2. Requirements

| ID    | Requirement |
|-------|-------------|
| R5.1  | **Eraser mode toggle** — A button in the ColorToolbar sidebar toggles eraser mode on/off. When active, the button is visually highlighted and the drawing mode switches from "pencil" to "eraser". |
| R5.2  | **True pixel erasure** — In eraser mode, dragging on the canvas removes pixels using `globalCompositeOperation = 'destination-out'` instead of painting white/background on top. |
| R5.3  | **Eraser stroke storage** — Eraser strokes are stored in the strokes array as `{ type: 'erase', points: [{x, y}, ...], eraserSize: number }`. Regular strokes remain `{ points: [...], color: string }`. |
| R5.4  | **Redraw eraser strokes** — The `redrawAll()` function replays eraser strokes using `globalCompositeOperation = 'destination-out'` with the correct eraser line width so that erased areas are preserved across canvas resizes. |
| R5.5  | **Eraser size control** — Three preset eraser sizes are available: Small (5 px), Medium (15 px), and Large (30 px). Only visible/selectable when eraser mode is active. |
| R5.6  | **Cursor feedback** — When eraser mode is active, the canvas cursor changes from `cursor-crosshair` to a distinct eraser cursor (e.g., a custom circle or built-in style) to indicate the active tool. |
| R5.7  | **Mouse + touch parity** — Eraser mode works identically with both mouse and touch input (touch events already prevent default). |
| R5.8  | **Color toolbar integration** — Switching to eraser mode does not clear the selected color; switching back to pencil mode restores the previously selected color automatically. |

## 3. Technical Approach

### 3.1 Erasing Strategy: Composite Operations

When the user drags in eraser mode, the canvas draws using:

```js
ctx.save();
ctx.globalCompositeOperation = 'destination-out';
ctx.beginPath();
ctx.arc(x, y, eraserSize / 2, 0, Math.PI * 2);
ctx.fill();
ctx.restore();
```

This is a **true eraser** — it removes pixel data from the canvas. Unlike
the "white paint" approach, it:
- Does not add opaque strokes that look fine on white but break on
  non-white backgrounds or exported transparent images.
- Works correctly when there are strokes underneath of any color.

### 3.2 Stroke Representation

To support round-tripping through `redrawAll()`, eraser actions are stored
as special strokes:

| Field       | Regular stroke                        | Eraser stroke                          |
|-------------|---------------------------------------|----------------------------------------|
| `type`      | _(absent or `'draw'`)_               | `'erase'`                              |
| `points`    | `[{x, y}, ...]`                      | `[{x, y}, ...]` — center points        |
| `color`     | e.g. `'#7c3aed'`                     | _(absent)_                             |
| `eraserSize`| _(absent)_                           | e.g. `15` (pixels, diameter)           |

Example eraser stroke object:

```js
{
  type: 'erase',
  points: [{ x: 142, y: 88 }, { x: 150, y: 92 }, /* ... */],
  eraserSize: 15
}
```

### 3.3 Redraw Logic

`redrawAll()` is updated with a pre-processing step to separate strokes
into draw-strokes and erase-strokes:

1. Clear the entire canvas.
2. Redraw all **draw strokes** (regular strokes) as currently implemented,
   using `ctx.stroke()` with `globalCompositeOperation = 'source-over'`.
3. Redraw all **erase strokes** using `globalCompositeOperation = 'destination-out'`
   and `ctx.arc()` / `ctx.fill()` with the stored `eraserSize` as diameter.

This two-pass approach avoids the complexity of interleaving operations and
ensures correct rendering regardless of stroke order.

### 3.4 State Management

**HomePage** (parent component) owns:

| State              | Type       | Default     | Description                          |
|--------------------|------------|-------------|--------------------------------------|
| `activeColor`      | `string`   | `'#7c3aed'` | Current pencil color                 |
| `eraserMode`       | `boolean`  | `false`     | Whether eraser tool is active        |
| `eraserSize`       | `number`   | `15`        | Eraser diameter in pixels            |

**Refs** (for thread-safe access in event handlers):

| Ref               | Initial value   | Purpose                                      |
|-------------------|-----------------|----------------------------------------------|
| `colorRef`        | `'#7c3aed'`     | Already exists — tracks current pencil color |
| `eraserModeRef`   | `false`         | Thread-safe eraser mode flag                 |
| `eraserSizeRef`   | `15`            | Thread-safe eraser size                      |

**DrawingCanvas** receives these refs as props and reads them inside
`draw()` to determine the behavior:

```js
function DrawingCanvas({ colorRef, eraserModeRef, eraserSizeRef }) {
  // ...
}
```

## 4. Data Flow

```
User clicks EraserToggle
  → HomePage.handleEraserToggle()
    → eraserModeRef.current = newValue   (sync — before re-render)
    → setEraserMode(newValue)            (triggers re-render for UI)

User clicks EraserSize selector
  → HomePage.handleEraserSizeChange(size)
    → eraserSizeRef.current = size       (sync)
    → setEraserSize(size)                (triggers re-render)

User drags on canvas while eraserModeRef.current === true
  → DrawingCanvas.draw()
    → ctx.globalCompositeOperation = 'destination-out'
    → ctx.arc(...) / ctx.fill()           (true pixel removal)
    → Stroke added with type: 'erase', eraserSize

Canvas resize
  → DrawingCanvas.redrawAll()
    → Pass 1: redraw all draw strokes
    → Pass 2: redraw all erase strokes with composite operation
```

## 5. API Design

No REST endpoints or WebSocket events are added. This is a client-only
feature. (WebSocket sync of strokes including eraser strokes will be
handled in a future collaboration feature.)

## 6. Database Schema

No database changes are needed. Strokes are held in React component state
only and are not persisted to the server.

## 7. Files

### NEW

| File | Purpose |
|------|---------|
| `client/src/components/toolbar/EraserToggle.jsx` | Eraser mode on/off toggle button with visual active state |
| `client/src/components/toolbar/EraserSizeSelector.jsx` | Small / Medium / Large size buttons, only visible when eraser is active |
| `client/src/components/toolbar/__tests__/EraserToggle.test.jsx` | Unit tests for EraserToggle |
| `client/src/components/toolbar/__tests__/EraserSizeSelector.test.jsx` | Unit tests for EraserSizeSelector |

### MODIFY

| File | Changes |
|------|---------|
| `client/src/components/HomePage.jsx` | Add `eraserMode` / `eraserSize` state, `eraserModeRef` / `eraserSizeRef`, pass new props to DrawingCanvas and ColorToolbar |
| `client/src/components/toolbar/ColorToolbar.jsx` | Accept `eraserMode`/`onEraserToggle`/`eraserSize`/`onEraserSizeChange` props; render EraserToggle above swatches and EraserSizeSelector below swatches when eraser is active |
| `client/src/components/canvas/DrawingCanvas.jsx` | Accept `eraserModeRef` and `eraserSizeRef` props; branch in `draw()` for erase mode; update `redrawAll()` for two-pass erase replay; change cursor in erase mode |
| `client/src/components/canvas/__tests__/DrawingCanvas.test.jsx` | Add tests for eraser mode drawing, stroke storage, and redraw |
| `client/src/components/__tests__/HomePage.test.jsx` | Add tests for eraser state management and integration |

## 8. Dependencies

No new Python or JavaScript packages are needed. All functionality uses
standard Canvas 2D API already available in all target browsers.

## 9. Design Considerations

### 9.1 Eraser Cursor

On desktop, the canvas should reflect whether the current tool is pencil or
eraser:

- **Pencil mode**: existing `cursor-crosshair` class
- **Eraser mode**: `cursor-none` class paired with a pseudo‑element or
  canvas‑overlay showing a transparent circle at the cursor position (CSS
  custom cursor or a small `div` that follows `mousemove`).

A simple first implementation: use a CSS custom cursor URL (an inline SVG
data URI of a circle outline) mapped to the selected eraser size.
Alternative: render a translucent circle on a positioned overlay `<div>`
that tracks `mousemove` coordinates, which allows dynamic sizing.

**Recommendation for V1**: Use `cursor: none` on the canvas and render a
cursor-following `<div>` overlay element inside `DrawingCanvas`. This
approach works with any eraser size and avoids the complexity of generating
SVG data URIs at runtime.

### 9.2 Eraser Size Presets

| Label  | Diameter (px) | Radius (px) | Use Case                     |
|--------|---------------|-------------|------------------------------|
| Small  | 5             | 2.5         | Precision erasing, thin lines|
| Medium | 15            | 7.5         | Default, general use         |
| Large  | 30            | 15          | Broad erasing, clearing areas|

### 9.3 Active Color and Eraser Interaction

- When the user enters eraser mode, the **last selected color is remembered**
  but not applied. The color toolbar swatches remain highlighted on the
  last-chosen color.
- When the user exits eraser mode, pencil drawing resumes immediately with
  the remembered color.
- While in eraser mode, clicking a color swatch **exits eraser mode** and
  selects that color (similarly, the custom color picker exits eraser mode).

### 9.4 Touch Devices

On touch devices, the cursor overlay is not rendered (there is no cursor).
The eraser icon in the toolbar serves as the sole mode indicator. Touch
drawing uses the same `destination-out` path as mouse drawing — no special
touch-only logic needed.

## 10. Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| **Toggle eraser mid-stroke** | The current stroke continues with whatever mode was active at `startDrawing()`. Mode changes between strokes are honored. `isDrawingRef.current` is checked at the top of `draw()` — if it's false, no drawing occurs regardless of mode. |
| **Eraser on empty canvas** | No-op. `destination-out` on an empty canvas does nothing visible. No errors thrown. |
| **Resize during eraser mode** | `redrawAll()` correctly replays all strokes including erase strokes. Erasing reapplied correctly after resize. |
| **Rapid mode toggling** | Ref-based mode reading ensures the latest value is always used, even if React hasn't re-rendered yet. No race conditions. |
| **Eraser size change mid-stroke** | The current stroke continues with the size active at `startDrawing()`. Size changes take effect on the next stroke. |
| **All strokes erased** | Canvas displays as empty (transparent pixels). This is correct — a true eraser removes content. If a background color were ever added, it would be unaffected because `destination-out` only removes pixels where strokes were drawn. |
| **Multiple eraser strokes overlapping** | Each eraser pass removes pixels independently. Overlapping erase strokes are harmless — `destination-out` on already-transparent pixels is a no-op. |
| **Eraser stroke with no movement** | A single-point eraser stroke (mouse down + immediate mouse up) applies a small circular erase at that point. This matches single-point pencil behavior. |

## 11. Test Strategy

### 11.1 Unit Tests — EraserToggle (`client/src/components/toolbar/__tests__/EraserToggle.test.jsx`)

- Renders a button with accessible label
- Shows inactive state by default (no highlight)
- `onClick` calls `onToggle` with expected value
- Shows active/highlighted state when `active={true}`
- Renders eraser icon (can test for presence of SVG/icon element or aria-label)

### 11.2 Unit Tests — EraserSizeSelector (`client/src/components/toolbar/__tests__/EraserSizeSelector.test.jsx`)

- Renders three size buttons (Small, Medium, Large)
- Default active size is Medium (15 px)
- Clicking a size button calls `onChange` with the correct size value
- Active size button is visually highlighted
- Keyboard accessible (focus-visible ring)

### 11.3 Integration Tests — DrawingCanvas Eraser Mode (`client/src/components/canvas/__tests__/DrawingCanvas.test.jsx`)

| Test | What it verifies |
|------|------------------|
| **Eraser mode uses destination-out** | In eraser mode, `draw()` sets `globalCompositeOperation = 'destination-out'` and calls `ctx.arc()` / `ctx.fill()` instead of `moveTo` / `lineTo` / `stroke`. |
| **Eraser stroke stored with type 'erase'** | After completing an eraser stroke, verify a stroke object with `type: 'erase'` and `eraserSize` exists in state. |
| **Pencil mode unchanged** | In pencil mode, drawing still uses `source-over` (default) and produces `{ points, color }` strokes. |
| **redrawAll replays eraser strokes** | Manually populate strokes with one draw stroke and one erase stroke, call redrawAll, verify `globalCompositeOperation` was set to `'destination-out'` during erase replay. |
| **Pencil mode after eraser** | Start a stroke in pencil mode (after eraser mode was toggled off), verify it uses `source-over` and produces a regular color stroke. |
| **Cursor class changes** | When eraser mode ref is `true`, canvas renders with eraser cursor class instead of `cursor-crosshair`. |
| **Eraser size applied** | When `eraserSizeRef.current` is set to 30, eraser strokes use arc radius 15. |
| **Touch eraser** | `touchStart → touchMove → touchEnd` in eraser mode triggers `destination-out` drawing. |

### 11.4 Integration Tests — HomePage (`client/src/components/__tests__/HomePage.test.jsx`)

- EraserToggle renders in the toolbar alongside color swatches
- Clicking eraser toggle switches to eraser mode
- Clicking a color swatch while in eraser mode exits eraser mode
- EraserSizeSelector visible only when eraser mode is active
- Changing eraser size and drawing records correct eraser stroke size

### 11.5 Manual Verification Checklist

- [ ] Eraser actually removes pixel data (not paint over with white)
- [ ] Erased areas stay erased after window resize (redraw works)
- [ ] Toolbar on mobile (horizontal strip) shows eraser toggle correctly
- [ ] Toolbar on desktop (vertical sidebar) shows eraser toggle correctly
- [ ] Cursor reflects active tool (crosshair for pencil, circle for eraser)
- [ ] All existing drawing + color picker tests still pass (regression)
- [ ] Touch erasing works on mobile viewport

## 12. Out of Scope

The following features are explicitly excluded from this iteration:

- **Undo/Redo** — Eraser strokes participate in the stroke array, so undo/redo will automatically cover them when that feature is implemented. No special handling needed now.
- **Collaborative sync of eraser strokes** — Eraser strokes stored locally only. WebSocket broadcasting will be addressed in the collaboration feature.
- **Variable eraser size slider** — Only three discrete presets. A continuous slider is future work.
- **Eraser opacity / pressure sensitivity** — Eraser always removes 100% of pixels. Partial erasure is not supported.
- **Layer-specific erasing** — Eraser operates on the single canvas layer. No layer support yet.
- **Shape fill / bucket eraser** — Only freehand stroke-based erasing.

## 13. Risks

| Risk | Mitigation |
|------|------------|
| `destination-out` may behave unexpectedly on some browsers with hardware acceleration | Tested on Chrome, Firefox, Safari, and Edge (all support `globalCompositeOperation` widely). Covered by existing CI browser matrix. |
| Erased areas cannot be "un-erased" without undo | This is expected behavior for a true eraser. Undo/redo (future feature) will handle recovery. |
| Cursor overlay performance on high-frequency mousemove | Use `requestAnimationFrame` to throttle cursor position updates if needed. |
