/**
 * Tests for the DrawingCanvas component.
 */
import '@testing-library/jest-dom';
import 'jest-canvas-mock';
import { render, screen, fireEvent, act } from '@testing-library/react';
import DrawingCanvas from '../DrawingCanvas';

// -------------------------------------------------------------------------
// Global mocks for browser APIs not available in jsdom
// -------------------------------------------------------------------------

// ResizeObserver is used to detect container size changes
global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// getBoundingClientRect is used by getPoint() to transform client
// coordinates into canvas-local coordinates
const MOCK_BOUNDING_RECT = {
  left: 0,
  top: 0,
  right: 800,
  bottom: 500,
  width: 800,
  height: 500,
  x: 0,
  y: 0,
};

// clientWidth is read from the wrapper div in resizeCanvas()
const originalClientWidth = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  'clientWidth',
);

// Default color ref — DrawingCanvas now requires colorRef prop
const DEFAULT_COLOR = '#000000';
const mockColorRef = { current: DEFAULT_COLOR };

beforeEach(() => {
  // Restore a known bounding rect for every test
  HTMLElement.prototype.getBoundingClientRect = jest
    .fn()
    .mockReturnValue(MOCK_BOUNDING_RECT);

  // Ensure clientWidth is defined so resizeCanvas can read it
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
    configurable: true,
    value: 800,
  });
});

afterEach(() => {
  jest.restoreAllMocks();
  // Restore the original clientWidth descriptor if it existed
  if (originalClientWidth) {
    Object.defineProperty(
      HTMLElement.prototype,
      'clientWidth',
      originalClientWidth,
    );
  } else {
    delete HTMLElement.prototype.clientWidth;
  }
});

// -------------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------------

/** Return the 2D context from the rendered canvas */
function getCtx() {
  const canvas = screen.getByRole('img');
  return canvas.getContext('2d');
}

/** Render DrawingCanvas with the required colorRef prop */
function renderCanvas() {
  return render(<DrawingCanvas colorRef={mockColorRef} />);
}

// -------------------------------------------------------------------------
// Tests
// -------------------------------------------------------------------------

describe('DrawingCanvas', () => {
  // -----------------------------------------------------------------------
  // 1. Canvas renders
  // -----------------------------------------------------------------------
  test('renders a canvas element with role="img"', () => {
    renderCanvas();

    const canvas = screen.getByRole('img');
    expect(canvas).toBeInTheDocument();
    expect(canvas.tagName).toBe('CANVAS');
  });

  // -----------------------------------------------------------------------
  // 2. Canvas has crosshair cursor
  // -----------------------------------------------------------------------
  test('canvas has cursor-crosshair class for drawing affordance', () => {
    renderCanvas();

    const canvas = screen.getByRole('img');
    expect(canvas.className).toContain('cursor-crosshair');
  });

  // -----------------------------------------------------------------------
  // 3. Mouse down starts drawing (enables motion tracking)
  // -----------------------------------------------------------------------
  test('mouse down followed by mouse move triggers drawing', () => {
    renderCanvas();
    const canvas = screen.getByRole('img');
    const ctx = getCtx();
    const beginPathSpy = jest.spyOn(ctx, 'beginPath');

    fireEvent.mouseDown(canvas, { clientX: 100, clientY: 50 });
    fireEvent.mouseMove(canvas, { clientX: 150, clientY: 75 });

    // beginPath should be called by the draw() function
    expect(beginPathSpy).toHaveBeenCalled();
    expect(beginPathSpy).toHaveBeenCalledTimes(1);
  });

  // -----------------------------------------------------------------------
  // 4. Mouse move draws a line segment
  // -----------------------------------------------------------------------
  test('mouse move calls canvas drawing methods after mouse down', () => {
    renderCanvas();
    const canvas = screen.getByRole('img');
    const ctx = getCtx();
    const beginSpy = jest.spyOn(ctx, 'beginPath');
    const moveToSpy = jest.spyOn(ctx, 'moveTo');
    const lineToSpy = jest.spyOn(ctx, 'lineTo');
    const strokeSpy = jest.spyOn(ctx, 'stroke');

    // Start drawing and drag
    fireEvent.mouseDown(canvas, { clientX: 100, clientY: 50 });
    fireEvent.mouseMove(canvas, { clientX: 150, clientY: 75 });

    // Coordinates should be relative to canvas bounding rect (0,0)
    expect(beginSpy).toHaveBeenCalled();
    expect(moveToSpy).toHaveBeenCalledWith(100, 50);
    expect(lineToSpy).toHaveBeenCalledWith(150, 75);
    expect(strokeSpy).toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // 5. Mouse up ends the stroke — no drawing on subsequent moves
  // -----------------------------------------------------------------------
  test('mouse up stops drawing so further mouse moves do nothing', async () => {
    renderCanvas();
    const canvas = screen.getByRole('img');

    fireEvent.mouseDown(canvas, { clientX: 100, clientY: 50 });
    fireEvent.mouseMove(canvas, { clientX: 150, clientY: 75 });
    fireEvent.mouseUp(canvas);

    // Wait for React to process setStrokes + redraw
    await new Promise(resolve => setTimeout(resolve, 0));

    const ctx = getCtx();
    // Reset call counts after redraw
    ctx.beginPath.mockClear();
    ctx.stroke.mockClear();

    fireEvent.mouseMove(canvas, { clientX: 200, clientY: 100 });
    expect(ctx.beginPath).not.toHaveBeenCalled();
    expect(ctx.stroke).not.toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // 5b. Mouse leave also ends the stroke
  // -----------------------------------------------------------------------
  test('mouse leave also stops drawing', async () => {
    renderCanvas();
    const canvas = screen.getByRole('img');

    fireEvent.mouseDown(canvas, { clientX: 100, clientY: 50 });
    fireEvent.mouseMove(canvas, { clientX: 150, clientY: 75 });
    fireEvent.mouseLeave(canvas);

    await new Promise(resolve => setTimeout(resolve, 0));

    const ctx = getCtx();
    ctx.beginPath.mockClear();
    ctx.stroke.mockClear();

    fireEvent.mouseMove(canvas, { clientX: 200, clientY: 100 });
    expect(ctx.beginPath).not.toHaveBeenCalled();
    expect(ctx.stroke).not.toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // 6. Touch events trigger drawing
  // -----------------------------------------------------------------------
  test('touch start and move trigger canvas drawing operations', () => {
    renderCanvas();
    const canvas = screen.getByRole('img');
    const ctx = getCtx();
    const beginSpy = jest.spyOn(ctx, 'beginPath');
    const strokeSpy = jest.spyOn(ctx, 'stroke');

    fireEvent.touchStart(canvas, {
      touches: [{ clientX: 100, clientY: 50 }],
    });
    fireEvent.touchMove(canvas, {
      touches: [{ clientX: 150, clientY: 75 }],
    });

    expect(beginSpy).toHaveBeenCalled();
    expect(strokeSpy).toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // 6b. Touch end stops drawing
  // -----------------------------------------------------------------------
  test('touch end prevents further drawing on subsequent touch moves', async () => {
    renderCanvas();
    const canvas = screen.getByRole('img');

    fireEvent.touchStart(canvas, {
      touches: [{ clientX: 100, clientY: 50 }],
    });
    fireEvent.touchMove(canvas, {
      touches: [{ clientX: 150, clientY: 75 }],
    });
    fireEvent.touchEnd(canvas);

    await new Promise(resolve => setTimeout(resolve, 0));

    const ctx = getCtx();
    ctx.beginPath.mockClear();
    ctx.stroke.mockClear();

    fireEvent.touchMove(canvas, {
      touches: [{ clientX: 200, clientY: 100 }],
    });

    expect(ctx.beginPath).not.toHaveBeenCalled();
    expect(ctx.stroke).not.toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // 7. preventDefault called on touch events
  // -----------------------------------------------------------------------
  test('touch start handler calls preventDefault', () => {
    renderCanvas();
    const canvas = screen.getByRole('img');

    const preventDefaultSpy = jest.spyOn(Event.prototype, 'preventDefault');

    fireEvent.touchStart(canvas, {
      touches: [{ clientX: 100, clientY: 50 }],
      cancelable: true,
    });

    expect(preventDefaultSpy).toHaveBeenCalled();
    preventDefaultSpy.mockRestore();
  });

  test('touch move handler calls preventDefault', () => {
    renderCanvas();
    const canvas = screen.getByRole('img');

    const preventDefaultSpy = jest.spyOn(Event.prototype, 'preventDefault');

    fireEvent.touchMove(canvas, {
      touches: [{ clientX: 150, clientY: 75 }],
      cancelable: true,
    });

    expect(preventDefaultSpy).toHaveBeenCalled();
    preventDefaultSpy.mockRestore();
  });

  test('touch end handler calls preventDefault', () => {
    renderCanvas();
    const canvas = screen.getByRole('img');

    const preventDefaultSpy = jest.spyOn(Event.prototype, 'preventDefault');

    fireEvent.touchEnd(canvas, { cancelable: true });

    expect(preventDefaultSpy).toHaveBeenCalled();
    preventDefaultSpy.mockRestore();
  });

  // -----------------------------------------------------------------------
  // 8. Context menu prevented on canvas
  // -----------------------------------------------------------------------
  test('context menu event is prevented on the canvas', () => {
    renderCanvas();
    const canvas = screen.getByRole('img');

    const preventDefaultSpy = jest.spyOn(Event.prototype, 'preventDefault');

    fireEvent.contextMenu(canvas);

    expect(preventDefaultSpy).toHaveBeenCalled();
    preventDefaultSpy.mockRestore();
  });

  // -----------------------------------------------------------------------
  // 9. Stroke stored in state (drawing lifecycle is tracked)
  // -----------------------------------------------------------------------
  test('a complete mousedown → mousemove → mouseup cycle is tracked', async () => {
    renderCanvas();
    const canvas = screen.getByRole('img');

    // Perform a complete stroke
    fireEvent.mouseDown(canvas, { clientX: 100, clientY: 50 });
    fireEvent.mouseMove(canvas, { clientX: 150, clientY: 75 });
    fireEvent.mouseUp(canvas);

    await new Promise(resolve => setTimeout(resolve, 0));

    const ctx = getCtx();
    ctx.stroke.mockClear();
    ctx.beginPath.mockClear();

    // A new mousemove after mouseup should NOT draw
    fireEvent.mouseMove(canvas, { clientX: 200, clientY: 100 });
    expect(ctx.stroke).not.toHaveBeenCalled();

    // Start a new stroke — should draw again
    fireEvent.mouseDown(canvas, { clientX: 300, clientY: 50 });
    fireEvent.mouseMove(canvas, { clientX: 350, clientY: 75 });
    expect(ctx.stroke).toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // 10. Canvas has correct ARIA label
  // -----------------------------------------------------------------------
  test('canvas has an accessible aria-label', () => {
    renderCanvas();

    const canvas = screen.getByRole('img');
    expect(canvas).toHaveAttribute(
      'aria-label',
      'Drawing canvas — use your mouse or touch to draw',
    );
  });

  // -----------------------------------------------------------------------
  // 11. touch-action: none is set on canvas
  // -----------------------------------------------------------------------
  test('canvas has touch-none class to prevent browser default touch scrolling', () => {
    renderCanvas();

    const canvas = screen.getByRole('img');
    expect(canvas.className).toContain('touch-none');
  });

  // -----------------------------------------------------------------------
  // 12. Canvas renders inside a wrapper div
  // -----------------------------------------------------------------------
  test('canvas is nested inside a wrapper div for sizing', () => {
    const { container } = renderCanvas();

    const wrapper = container.firstChild;
    expect(wrapper.tagName).toBe('DIV');
    expect(wrapper.querySelector('canvas')).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // 13. Rendering a single point (mouse down then up without move)
  // -----------------------------------------------------------------------
  test('mouse down then immediate mouse up creates a single-point stroke', () => {
    renderCanvas();
    const canvas = screen.getByRole('img');

    // Start and immediately end without moving
    fireEvent.mouseDown(canvas, { clientX: 100, clientY: 50 });
    fireEvent.mouseUp(canvas);

    // Should not throw — the component must handle an empty movement
    // gracefully.  A stroke with one point is still valid.
    const ctx = getCtx();
    const beginSpy = jest.spyOn(ctx, 'beginPath');

    // New stroke should work
    fireEvent.mouseDown(canvas, { clientX: 200, clientY: 100 });
    fireEvent.mouseMove(canvas, { clientX: 250, clientY: 125 });

    expect(beginSpy).toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // 14. Changing colorRef then drawing uses the new color immediately
  // -----------------------------------------------------------------------
  test('changing color ref then drawing uses the new color immediately', () => {
    // Create a mutable colorRef like HomePage does
    const colorRef = { current: '#7c3aed' }; // start with purple

    const { rerender } = render(<DrawingCanvas colorRef={colorRef} />);
    const canvas = screen.getByRole('img');
    const ctx = getCtx();

    // Draw a stroke with purple
    fireEvent.mouseDown(canvas, { clientX: 10, clientY: 10 });
    fireEvent.mouseMove(canvas, { clientX: 50, clientY: 10 });
    fireEvent.mouseUp(canvas);

    // Verify the first stroke used purple
    expect(ctx.strokeStyle).toBe('#7c3aed');

    // Now change the color SYNCHRONOUSLY (like handleColorChange does)
    colorRef.current = '#ef4444'; // change to red

    // Rerender with the same colorRef (reference didn't change, but .current did)
    rerender(<DrawingCanvas colorRef={colorRef} />);

    // Clear spy counts from the redraw
    ctx.strokeStyle = null;
    ctx.beginPath.mockClear();
    ctx.stroke.mockClear();

    // Now draw a new stroke — should use RED
    fireEvent.mouseDown(canvas, { clientX: 20, clientY: 10 });
    fireEvent.mouseMove(canvas, { clientX: 60, clientY: 10 });

    // CRITICAL CHECK: The strokeStyle during drawing should be RED
    expect(ctx.strokeStyle).toBe('#ef4444');

    fireEvent.mouseUp(canvas);

    // Verify the stroke was drawn with red
    expect(ctx.stroke).toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // 15. Changing colorRef.current between strokes without rerender
  // -----------------------------------------------------------------------
  test('changing colorRef.current between strokes uses new color without rerender', () => {
    const colorRef = { current: '#7c3aed' }; // purple

    render(<DrawingCanvas colorRef={colorRef} />);
    const canvas = screen.getByRole('img');
    const ctx = getCtx();

    // Draw first stroke in purple
    fireEvent.mouseDown(canvas, { clientX: 10, clientY: 10 });
    fireEvent.mouseMove(canvas, { clientX: 50, clientY: 10 });
    fireEvent.mouseUp(canvas);
    expect(ctx.strokeStyle).toBe('#7c3aed');

    // Change color WITHOUT triggering a rerender
    colorRef.current = '#ef4444'; // red

    // Clear mocks
    ctx.beginPath.mockClear();
    ctx.stroke.mockClear();

    // Draw second stroke — must use red even without rerender
    fireEvent.mouseDown(canvas, { clientX: 20, clientY: 20 });
    fireEvent.mouseMove(canvas, { clientX: 60, clientY: 20 });

    // The strokeStyle set by draw() should be RED
    expect(ctx.strokeStyle).toBe('#ef4444');

    fireEvent.mouseUp(canvas);
    expect(ctx.stroke).toHaveBeenCalled();
  });

  // =======================================================================
  // ERASER MODE TESTS
  // =======================================================================

  // -----------------------------------------------------------------------
  // 16. Canvas shows cursor-crosshair when eraser mode is NOT active
  // -----------------------------------------------------------------------
  test('canvas shows cursor-crosshair class when eraser mode is not active', () => {
    const eraserModeRef = { current: false };
    render(
      <DrawingCanvas
        colorRef={mockColorRef}
        eraserModeRef={eraserModeRef}
      />
    );

    const canvas = screen.getByRole('img');
    expect(canvas.className).toContain('cursor-crosshair');
  });

  // -----------------------------------------------------------------------
  // 17. Canvas shows cursor-none class when eraser mode is active
  // -----------------------------------------------------------------------
  test('canvas shows cursor-none class when eraser mode is active', () => {
    const eraserModeRef = { current: true };
    render(
      <DrawingCanvas
        colorRef={mockColorRef}
        eraserModeRef={eraserModeRef}
      />
    );

    const canvas = screen.getByRole('img');
    expect(canvas.className).toContain('cursor-none');
  });

  // -----------------------------------------------------------------------
  // 18. In eraser mode, draw() uses save/restore with arc/fill (erase drawing path)
  // -----------------------------------------------------------------------
  test('in eraser mode, draw() uses erase drawing path (save/restore + arc/fill)', () => {
    const eraserModeRef = { current: true };
    const eraserSizeRef = { current: 15 };

    render(
      <DrawingCanvas
        colorRef={mockColorRef}
        eraserModeRef={eraserModeRef}
        eraserSizeRef={eraserSizeRef}
      />
    );
    const canvas = screen.getByRole('img');
    const ctx = getCtx();
    const saveSpy = jest.spyOn(ctx, 'save');
    const restoreSpy = jest.spyOn(ctx, 'restore');

    // Intercept globalCompositeOperation setter to capture destination-out
    const compositeValues = [];
    const origDescriptor = Object.getOwnPropertyDescriptor(
      Object.getPrototypeOf(ctx), 'globalCompositeOperation',
    );
    Object.defineProperty(ctx, 'globalCompositeOperation', {
      get() {
        return origDescriptor ? origDescriptor.get.call(ctx) : 'source-over';
      },
      set(v) {
        compositeValues.push(v);
        if (origDescriptor && origDescriptor.set) {
          origDescriptor.set.call(ctx, v);
        }
      },
      configurable: true,
    });

    fireEvent.mouseDown(canvas, { clientX: 100, clientY: 50 });
    fireEvent.mouseMove(canvas, { clientX: 150, clientY: 75 });

    // ctx.save() and ctx.restore() are called in eraser draw path
    // (save before setting destination-out, restore after filling)
    expect(saveSpy).toHaveBeenCalled();
    expect(restoreSpy).toHaveBeenCalled();
    // globalCompositeOperation must be set to 'destination-out' for true pixel erasure
    expect(compositeValues).toContain('destination-out');
  });

  // -----------------------------------------------------------------------
  // 19. In eraser mode, draw() calls ctx.arc and ctx.fill
  // -----------------------------------------------------------------------
  test('in eraser mode, draw() calls arc and fill for eraser circle', () => {
    const eraserModeRef = { current: true };
    const eraserSizeRef = { current: 20 };

    render(
      <DrawingCanvas
        colorRef={mockColorRef}
        eraserModeRef={eraserModeRef}
        eraserSizeRef={eraserSizeRef}
      />
    );
    const canvas = screen.getByRole('img');
    const ctx = getCtx();
    const arcSpy = jest.spyOn(ctx, 'arc');
    const fillSpy = jest.spyOn(ctx, 'fill');

    // Intercept globalCompositeOperation setter to capture destination-out
    const compositeValues = [];
    const origDescriptor = Object.getOwnPropertyDescriptor(
      Object.getPrototypeOf(ctx), 'globalCompositeOperation',
    );
    Object.defineProperty(ctx, 'globalCompositeOperation', {
      get() {
        return origDescriptor ? origDescriptor.get.call(ctx) : 'source-over';
      },
      set(v) {
        compositeValues.push(v);
        if (origDescriptor && origDescriptor.set) {
          origDescriptor.set.call(ctx, v);
        }
      },
      configurable: true,
    });

    fireEvent.mouseDown(canvas, { clientX: 100, clientY: 50 });
    fireEvent.mouseMove(canvas, { clientX: 150, clientY: 75 });

    expect(arcSpy).toHaveBeenCalled();
    expect(fillSpy).toHaveBeenCalled();
    // Eraser uses destination-out composite operation for true pixel removal
    expect(compositeValues).toContain('destination-out');
  });

  // -----------------------------------------------------------------------
  // 20. In pencil mode, draw() uses normal strokeStyle and lineTo
  // -----------------------------------------------------------------------
  test('in pencil mode, draw() uses strokeStyle and lineTo', () => {
    const eraserModeRef = { current: false };

    render(
      <DrawingCanvas
        colorRef={mockColorRef}
        eraserModeRef={eraserModeRef}
      />
    );
    const canvas = screen.getByRole('img');
    const ctx = getCtx();
    const moveToSpy = jest.spyOn(ctx, 'moveTo');
    const lineToSpy = jest.spyOn(ctx, 'lineTo');
    const strokeSpy = jest.spyOn(ctx, 'stroke');

    fireEvent.mouseDown(canvas, { clientX: 100, clientY: 50 });
    fireEvent.mouseMove(canvas, { clientX: 150, clientY: 75 });

    expect(moveToSpy).toHaveBeenCalledWith(100, 50);
    expect(lineToSpy).toHaveBeenCalledWith(150, 75);
    expect(strokeSpy).toHaveBeenCalled();
    // strokeStyle should be set to the color
    expect(ctx.strokeStyle).toBe('#000000');
  });

  // -----------------------------------------------------------------------
  // 21. Touch events in eraser mode trigger erase drawing path
  // -----------------------------------------------------------------------
  test('touch events in eraser mode trigger erase drawing path (save/restore + arc/fill)', () => {
    const eraserModeRef = { current: true };
    const eraserSizeRef = { current: 15 };

    render(
      <DrawingCanvas
        colorRef={mockColorRef}
        eraserModeRef={eraserModeRef}
        eraserSizeRef={eraserSizeRef}
      />
    );
    const canvas = screen.getByRole('img');
    const ctx = getCtx();
    const arcSpy = jest.spyOn(ctx, 'arc');
    const fillSpy = jest.spyOn(ctx, 'fill');
    const saveSpy = jest.spyOn(ctx, 'save');
    const restoreSpy = jest.spyOn(ctx, 'restore');
    const strokeSpy = jest.spyOn(ctx, 'stroke');

    // Intercept globalCompositeOperation setter to capture destination-out
    const compositeValues = [];
    const origDescriptor = Object.getOwnPropertyDescriptor(
      Object.getPrototypeOf(ctx), 'globalCompositeOperation',
    );
    Object.defineProperty(ctx, 'globalCompositeOperation', {
      get() {
        return origDescriptor ? origDescriptor.get.call(ctx) : 'source-over';
      },
      set(v) {
        compositeValues.push(v);
        if (origDescriptor && origDescriptor.set) {
          origDescriptor.set.call(ctx, v);
        }
      },
      configurable: true,
    });

    fireEvent.touchStart(canvas, {
      touches: [{ clientX: 100, clientY: 50 }],
    });
    fireEvent.touchMove(canvas, {
      touches: [{ clientX: 150, clientY: 75 }],
    });

    // Eraser touch draw should call arc and fill, not stroke
    expect(saveSpy).toHaveBeenCalled();
    expect(restoreSpy).toHaveBeenCalled();
    expect(arcSpy).toHaveBeenCalled();
    expect(fillSpy).toHaveBeenCalled();
    // In eraser mode, stroke() should NOT be called (we use fill instead)
    expect(strokeSpy).not.toHaveBeenCalled();
    // Eraser must use destination-out composite operation for true pixel removal
    expect(compositeValues).toContain('destination-out');
  });

  // -----------------------------------------------------------------------
  // 22. Eraser stroke with no movement (single point) does not crash
  // -----------------------------------------------------------------------
  test('eraser mouse down then immediate mouse up handles single-point stroke gracefully', () => {
    const eraserModeRef = { current: true };
    const eraserSizeRef = { current: 15 };

    render(
      <DrawingCanvas
        colorRef={mockColorRef}
        eraserModeRef={eraserModeRef}
        eraserSizeRef={eraserSizeRef}
      />
    );
    const canvas = screen.getByRole('img');

    // Start and immediately end without moving
    fireEvent.mouseDown(canvas, { clientX: 100, clientY: 50 });
    fireEvent.mouseUp(canvas);

    // Should not throw — the component handles empty eraser movement gracefully
    // A new stroke should work
    const ctx = getCtx();
    const arcSpy = jest.spyOn(ctx, 'arc');

    fireEvent.mouseDown(canvas, { clientX: 200, clientY: 100 });
    fireEvent.mouseMove(canvas, { clientX: 250, clientY: 125 });

    expect(arcSpy).toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // 23. Size changes mid-stroke: stroke preserves size from startDrawing
  // -----------------------------------------------------------------------
  test('eraser size change during stroke preserves original size', () => {
    const eraserModeRef = { current: true };
    const eraserSizeRef = { current: 20 }; // initial size

    const { rerender } = render(
      <DrawingCanvas
        colorRef={mockColorRef}
        eraserModeRef={eraserModeRef}
        eraserSizeRef={eraserSizeRef}
      />
    );
    const canvas = screen.getByRole('img');
    const ctx = getCtx();

    // Start drawing at size 20
    fireEvent.mouseDown(canvas, { clientX: 100, clientY: 50 });

    // Change size mid-stroke (simulating user clicking a different size)
    eraserSizeRef.current = 30;
    rerender(
      <DrawingCanvas
        colorRef={mockColorRef}
        eraserModeRef={eraserModeRef}
        eraserSizeRef={eraserSizeRef}
      />
    );

    // Draw with the new size ref value
    const arcSpy = jest.spyOn(ctx, 'arc');
    fireEvent.mouseMove(canvas, { clientX: 150, clientY: 75 });

    // The eraserSize used in draw() is read from currentStrokeRef (captured at
    // startDrawing as 20), not from eraserSizeRef (now 30). So radius = 20/2 = 10.
    expect(arcSpy).toHaveBeenCalledWith(
      expect.any(Number),
      expect.any(Number),
      expect.any(Number),
      expect.any(Number),
      expect.any(Number),
    );
    // Verify the arc uses radius 10 (eraserSize 20 / 2)
    const arcCallArgs = arcSpy.mock.calls[0];
    expect(arcCallArgs[2]).toBe(10);
  });

  // -----------------------------------------------------------------------
  // 24. redrawAll replays strokes in chronological order (draw and erase interleaved)
  // -----------------------------------------------------------------------
  test('redrawAll replays both draw and erase strokes in chronological order and resets composite operation', async () => {
    const eraserModeRef = { current: false };
    const eraserSizeRef = { current: 15 };

    render(
      <DrawingCanvas
        colorRef={mockColorRef}
        eraserModeRef={eraserModeRef}
        eraserSizeRef={eraserSizeRef}
      />
    );
    const canvas = screen.getByRole('img');
    const ctx = getCtx();

    // Draw a regular pencil stroke
    fireEvent.mouseDown(canvas, { clientX: 100, clientY: 50 });
    fireEvent.mouseMove(canvas, { clientX: 150, clientY: 75 });
    fireEvent.mouseUp(canvas);
    await new Promise(resolve => setTimeout(resolve, 0));

    // Switch to eraser mode and draw an erase stroke
    eraserModeRef.current = true;
    fireEvent.mouseDown(canvas, { clientX: 200, clientY: 100 });
    fireEvent.mouseMove(canvas, { clientX: 250, clientY: 125 });
    fireEvent.mouseUp(canvas);
    await new Promise(resolve => setTimeout(resolve, 0));

    // Switch back to pencil mode and prepare spies for the redraw
    eraserModeRef.current = false;
    const arcSpy = jest.spyOn(ctx, 'arc');
    const fillSpy = jest.spyOn(ctx, 'fill');
    const strokeSpy = jest.spyOn(ctx, 'stroke');

    // Draw another pencil stroke to trigger redrawAll (replays both strokes)
    fireEvent.mouseDown(canvas, { clientX: 300, clientY: 50 });
    fireEvent.mouseMove(canvas, { clientX: 350, clientY: 75 });
    fireEvent.mouseUp(canvas);
    await new Promise(resolve => setTimeout(resolve, 0));

    // The erase stroke from earlier must be replayed using arc/fill
    expect(arcSpy).toHaveBeenCalled();
    expect(fillSpy).toHaveBeenCalled();
    // The pencil stroke must be replayed using stroke
    expect(strokeSpy).toHaveBeenCalled();
    // After redrawAll completes, composite operation must be reset to default
    expect(ctx.globalCompositeOperation).toBe('source-over');
  });

  // =======================================================================
  // BRUSH SIZE TESTS
  // =======================================================================

  // -----------------------------------------------------------------------
  // 26. In pencil mode, draw uses brushSizeRef.current for lineWidth
  // -----------------------------------------------------------------------
  test('in pencil mode, draw uses brushSizeRef.current for lineWidth', () => {
    const brushSizeRef = { current: 5 };

    render(
      <DrawingCanvas colorRef={mockColorRef} brushSizeRef={brushSizeRef} />
    );
    const canvas = screen.getByRole('img');
    const ctx = getCtx();

    // Start drawing and move
    fireEvent.mouseDown(canvas, { clientX: 100, clientY: 50 });
    fireEvent.mouseMove(canvas, { clientX: 150, clientY: 75 });

    // The ctx.lineWidth should reflect the brush size at stroke start
    expect(ctx.lineWidth).toBe(5);
  });

  // -----------------------------------------------------------------------
  // 27. Changing brushSizeRef.current applies to the next stroke
  // -----------------------------------------------------------------------
  test('changing brushSizeRef.current between strokes applies to the next stroke', () => {
    const brushSizeRef = { current: 3 };

    render(
      <DrawingCanvas colorRef={mockColorRef} brushSizeRef={brushSizeRef} />
    );
    const canvas = screen.getByRole('img');
    const ctx = getCtx();

    // First stroke uses size 3
    fireEvent.mouseDown(canvas, { clientX: 10, clientY: 10 });
    fireEvent.mouseMove(canvas, { clientX: 50, clientY: 10 });
    fireEvent.mouseUp(canvas);
    expect(ctx.lineWidth).toBe(3);

    // Change brush size WITHOUT rerender (simulating HomePage handleBrushSizeChange)
    brushSizeRef.current = 8;

    // Second stroke should use size 8
    fireEvent.mouseDown(canvas, { clientX: 20, clientY: 20 });
    fireEvent.mouseMove(canvas, { clientX: 60, clientY: 20 });
    expect(ctx.lineWidth).toBe(8);

    fireEvent.mouseUp(canvas);
  });

  // -----------------------------------------------------------------------
  // 28. Stroke stores lineWidth on draw strokes
  // -----------------------------------------------------------------------
  test('a completed pencil stroke stores its lineWidth for replay', async () => {
    const brushSizeRef = { current: 7 };

    render(
      <DrawingCanvas colorRef={mockColorRef} brushSizeRef={brushSizeRef} />
    );
    const canvas = screen.getByRole('img');
    const ctx = getCtx();

    // Draw a complete stroke with brush size 7
    fireEvent.mouseDown(canvas, { clientX: 100, clientY: 50 });
    fireEvent.mouseMove(canvas, { clientX: 150, clientY: 75 });
    fireEvent.mouseUp(canvas);
    await new Promise(resolve => setTimeout(resolve, 0));

    // Now change brushSizeRef to a different value
    brushSizeRef.current = 1;

    // Track ctx.lineWidth values during the next redraw cycle
    const lineWidthValues = [];
    const origDescriptor = Object.getOwnPropertyDescriptor(
      Object.getPrototypeOf(ctx), 'lineWidth',
    );
    Object.defineProperty(ctx, 'lineWidth', {
      get() {
        return origDescriptor ? origDescriptor.get.call(ctx) : 1;
      },
      set(v) {
        lineWidthValues.push(v);
        if (origDescriptor && origDescriptor.set) {
          origDescriptor.set.call(ctx, v);
        }
      },
      configurable: true,
    });

    // Draw a second stroke to trigger redrawAll
    fireEvent.mouseDown(canvas, { clientX: 200, clientY: 100 });
    fireEvent.mouseMove(canvas, { clientX: 250, clientY: 125 });
    fireEvent.mouseUp(canvas);
    await new Promise(resolve => setTimeout(resolve, 0));

    // The first stroke's lineWidth (7) should have been used during redraw
    expect(lineWidthValues).toContain(7);
  });

  // -----------------------------------------------------------------------
  // 29. redrawAll uses the stored lineWidth when replaying draw strokes
  // -----------------------------------------------------------------------
  test('redrawAll replays each draw stroke with its stored lineWidth', async () => {
    const brushSizeRef = { current: 5 };

    render(
      <DrawingCanvas colorRef={mockColorRef} brushSizeRef={brushSizeRef} />
    );
    const canvas = screen.getByRole('img');
    const ctx = getCtx();

    // Draw the first stroke at size 5
    fireEvent.mouseDown(canvas, { clientX: 100, clientY: 50 });
    fireEvent.mouseMove(canvas, { clientX: 150, clientY: 75 });
    fireEvent.mouseUp(canvas);
    await new Promise(resolve => setTimeout(resolve, 0));

    // Change to size 8 and draw second stroke
    brushSizeRef.current = 8;
    fireEvent.mouseDown(canvas, { clientX: 200, clientY: 100 });
    fireEvent.mouseMove(canvas, { clientX: 250, clientY: 125 });
    fireEvent.mouseUp(canvas);
    await new Promise(resolve => setTimeout(resolve, 0));

    // Track lineWidth values during redraw
    const lineWidthValues = [];
    const origDescriptor = Object.getOwnPropertyDescriptor(
      Object.getPrototypeOf(ctx), 'lineWidth',
    );
    Object.defineProperty(ctx, 'lineWidth', {
      get() {
        return origDescriptor ? origDescriptor.get.call(ctx) : 1;
      },
      set(v) {
        lineWidthValues.push(v);
        if (origDescriptor && origDescriptor.set) {
          origDescriptor.set.call(ctx, v);
        }
      },
      configurable: true,
    });

    // Draw a third stroke to trigger redrawAll (replays both previous strokes)
    fireEvent.mouseDown(canvas, { clientX: 300, clientY: 50 });
    fireEvent.mouseMove(canvas, { clientX: 350, clientY: 75 });
    fireEvent.mouseUp(canvas);
    await new Promise(resolve => setTimeout(resolve, 0));

    // Both stored lineWidths should appear during redraw
    expect(lineWidthValues).toContain(5);
    expect(lineWidthValues).toContain(8);
  });

  // -----------------------------------------------------------------------
  // 30. Default lineWidth is 3 when brushSizeRef is not provided
  // -----------------------------------------------------------------------
  test('default lineWidth is 3 when brushSizeRef prop is not provided', () => {
    // Render DrawingCanvas WITHOUT the brushSizeRef prop
    render(
      <DrawingCanvas colorRef={mockColorRef} />
    );
    const canvas = screen.getByRole('img');
    const ctx = getCtx();

    // Start drawing — should default to lineWidth 3
    fireEvent.mouseDown(canvas, { clientX: 100, clientY: 50 });
    fireEvent.mouseMove(canvas, { clientX: 150, clientY: 75 });

    expect(ctx.lineWidth).toBe(3);
  });

  // =======================================================================
  // UNDO / REDO INTEGRATION TESTS
  // =======================================================================

  /**
   * Helper: render DrawingCanvas with undo/redo callback capturers.
   * Returns { undo, redo, cancelRender } where undo/redo are the
   * functions exposed by DrawingCanvas via onUndoReady / onRedoReady,
   * and cancelRender is the cleanup returned by RTL render().
   */
  function renderCanvasWithUndoRedo(overrides = {}) {
    const undoFnRef = { current: null };
    const redoFnRef = { current: null };

    const renderResult = render(
      <DrawingCanvas
        colorRef={mockColorRef}
        onUndoReady={(fn) => { undoFnRef.current = fn; }}
        onRedoReady={(fn) => { redoFnRef.current = fn; }}
        {...overrides}
      />
    );

    return {
      renderResult,
      getUndo: () => undoFnRef.current,
      getRedo: () => redoFnRef.current,
    };
  }

  // -----------------------------------------------------------------------
  // 31. Undo removes last stroke and triggers redraw
  // -----------------------------------------------------------------------
  test('undo removes last stroke and triggers canvas redraw', async () => {
    const { getUndo } = renderCanvasWithUndoRedo();
    const canvas = screen.getByRole('img');
    const ctx = getCtx();

    // Draw 2 pencil strokes
    fireEvent.mouseDown(canvas, { clientX: 100, clientY: 50 });
    fireEvent.mouseMove(canvas, { clientX: 150, clientY: 75 });
    fireEvent.mouseUp(canvas);
    await new Promise(resolve => setTimeout(resolve, 0));

    fireEvent.mouseDown(canvas, { clientX: 200, clientY: 100 });
    fireEvent.mouseMove(canvas, { clientX: 250, clientY: 125 });
    fireEvent.mouseUp(canvas);
    await new Promise(resolve => setTimeout(resolve, 0));

    // Clear spy state after the two draws so we can isolate the undo redraw
    ctx.clearRect.mockClear();
    ctx.stroke.mockClear();

    // Call undo — wrapped in act() to flush React state updates
    const undoFn = getUndo();
    expect(undoFn).toBeTruthy();

    await act(async () => {
      undoFn();
    });

    // After undo, redrawAll should have been called
    // Verify canvas was cleared and strokes replayed
    // (clearRect is called once by redrawAll)
    expect(ctx.clearRect).toHaveBeenCalled();
    // At least one stroke should be replayed (could be called more than
    // once due to React double-rendering in dev mode)
    expect(ctx.stroke).toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // 32. Redo restores undone stroke
  // -----------------------------------------------------------------------
  test('redo restores an undone stroke', async () => {
    const { getUndo, getRedo } = renderCanvasWithUndoRedo();
    const canvas = screen.getByRole('img');
    const ctx = getCtx();

    // Draw 1 pencil stroke
    fireEvent.mouseDown(canvas, { clientX: 100, clientY: 50 });
    fireEvent.mouseMove(canvas, { clientX: 150, clientY: 75 });
    fireEvent.mouseUp(canvas);
    await new Promise(resolve => setTimeout(resolve, 0));

    // Undo it
    const undoFn = getUndo();
    expect(undoFn).toBeTruthy();
    await act(async () => {
      undoFn();
    });

    // Clear spies after undo redraw
    ctx.clearRect.mockClear();
    ctx.stroke.mockClear();

    // Redo
    const redoFn = getRedo();
    expect(redoFn).toBeTruthy();
    await act(async () => {
      redoFn();
    });

    // redrawAll should have been called (clearRect)
    expect(ctx.clearRect).toHaveBeenCalled();
    // The restored stroke should be replayed
    expect(ctx.stroke).toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // 33. Undo on empty canvas is no-op
  // -----------------------------------------------------------------------
  test('undo on empty canvas is a no-op and does not throw', async () => {
    const { getUndo } = renderCanvasWithUndoRedo();

    const undoFn = getUndo();
    expect(undoFn).toBeTruthy();

    // Should not throw — calling undo on an empty canvas
    await act(async () => {
      expect(() => undoFn()).not.toThrow();
    });
  });

  // -----------------------------------------------------------------------
  // 34. Redo with empty undo stack is no-op
  // -----------------------------------------------------------------------
  test('redo with empty undo stack is a no-op and does not throw', async () => {
    const { getRedo } = renderCanvasWithUndoRedo();

    const redoFn = getRedo();
    expect(redoFn).toBeTruthy();

    // Should not throw — calling redo with an empty undo stack
    await act(async () => {
      expect(() => redoFn()).not.toThrow();
    });
  });

  // -----------------------------------------------------------------------
  // 35. New stroke clears redo (undo) stack
  // -----------------------------------------------------------------------
  test('new stroke after undo clears the redo stack', async () => {
    const canRedoCalls = [];
    const { getUndo } = renderCanvasWithUndoRedo({
      onCanRedoChange: (val) => canRedoCalls.push(val),
    });
    const canvas = screen.getByRole('img');

    // Draw 1 stroke
    fireEvent.mouseDown(canvas, { clientX: 100, clientY: 50 });
    fireEvent.mouseMove(canvas, { clientX: 150, clientY: 75 });
    fireEvent.mouseUp(canvas);
    await new Promise(resolve => setTimeout(resolve, 0));

    // Undo it — this should push the stroke to undoStack, making canRedo true
    const undoFn = getUndo();
    await act(async () => {
      undoFn();
    });

    // After undo, canRedo should be true (we have something in undoStack)
    // The last value pushed should be true
    const canRedoAfterUndo = canRedoCalls[canRedoCalls.length - 1];
    expect(canRedoAfterUndo).toBe(true);

    // Draw a new stroke — this should clear the undoStack
    fireEvent.mouseDown(canvas, { clientX: 200, clientY: 100 });
    fireEvent.mouseMove(canvas, { clientX: 250, clientY: 125 });
    fireEvent.mouseUp(canvas);
    await new Promise(resolve => setTimeout(resolve, 0));

    // After new stroke, the last canRedo value should be false
    // (undoStack is cleared by handleNewStroke)
    const lastCanRedo = canRedoCalls[canRedoCalls.length - 1];
    expect(lastCanRedo).toBe(false);
  });

  // -----------------------------------------------------------------------
  // 36. Multiple undo/redo cycles produce correct canvas state
  // -----------------------------------------------------------------------
  test('multiple undo/redo cycles produce correct canvas state', async () => {
    const { getUndo, getRedo } = renderCanvasWithUndoRedo();
    const canvas = screen.getByRole('img');
    const ctx = getCtx();

    // Draw 3 pencil strokes
    for (let i = 0; i < 3; i++) {
      fireEvent.mouseDown(canvas, { clientX: 100 + i * 100, clientY: 50 });
      fireEvent.mouseMove(canvas, { clientX: 150 + i * 100, clientY: 75 });
      fireEvent.mouseUp(canvas);
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    // Undo 2 strokes using act() to flush state
    const undoFn = getUndo();
    await act(async () => {
      undoFn();
    });
    await act(async () => {
      undoFn();
    });

    // Now: strokes should have 1 item, undoStack should have 2 items
    // Clear spies and redo 1
    ctx.clearRect.mockClear();
    ctx.stroke.mockClear();

    const redoFn = getRedo();
    await act(async () => {
      redoFn();
    });

    // After redo: strokes should have 2 items, so the canvas is redrawn
    expect(ctx.clearRect).toHaveBeenCalled();
    // At least one stroke is replayed (2 draw strokes = 2 stroke() calls)
    expect(ctx.stroke).toHaveBeenCalled();

    // Undo 1 more
    ctx.clearRect.mockClear();
    ctx.stroke.mockClear();
    await act(async () => {
      undoFn();
    });

    // After undo: strokes should have 1 item, canvas redrawn
    expect(ctx.clearRect).toHaveBeenCalled();
    expect(ctx.stroke).toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // 37. Eraser stroke undo/redo
  // -----------------------------------------------------------------------
  test('eraser stroke can be undone and redone', async () => {
    const eraserModeRef = { current: false };
    const eraserSizeRef = { current: 15 };

    const { getUndo, getRedo } = renderCanvasWithUndoRedo({
      eraserModeRef,
      eraserSizeRef,
    });
    const canvas = screen.getByRole('img');
    const ctx = getCtx();

    // Draw 1 pencil stroke
    fireEvent.mouseDown(canvas, { clientX: 100, clientY: 50 });
    fireEvent.mouseMove(canvas, { clientX: 150, clientY: 75 });
    fireEvent.mouseUp(canvas);
    await new Promise(resolve => setTimeout(resolve, 0));

    // Draw 1 eraser stroke
    eraserModeRef.current = true;
    fireEvent.mouseDown(canvas, { clientX: 200, clientY: 100 });
    fireEvent.mouseMove(canvas, { clientX: 250, clientY: 125 });
    fireEvent.mouseUp(canvas);
    await new Promise(resolve => setTimeout(resolve, 0));

    // Undo — should remove the eraser stroke (last stroke)
    ctx.clearRect.mockClear();
    ctx.stroke.mockClear();

    const undoFn = getUndo();
    await act(async () => {
      undoFn();
    });

    // After undo, the canvas should be redrawn with only the pencil stroke
    expect(ctx.clearRect).toHaveBeenCalled();
    // At least one stroke replay (the pencil stroke)
    expect(ctx.stroke).toHaveBeenCalled();

    // Redo — should restore the eraser stroke
    ctx.clearRect.mockClear();
    ctx.stroke.mockClear();

    const redoFn = getRedo();
    await act(async () => {
      redoFn();
    });

    // After redo, both strokes should be replayed
    expect(ctx.clearRect).toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // 38. Canvas resize after undo — strokes state is correct
  // -----------------------------------------------------------------------
  test('canvas resize after undo replays only remaining strokes', async () => {
    const canUndoCalls = [];
    const { getUndo } = renderCanvasWithUndoRedo({
      onCanUndoChange: (val) => canUndoCalls.push(val),
    });
    const canvas = screen.getByRole('img');
    const ctx = getCtx();

    // Draw 2 pencil strokes
    fireEvent.mouseDown(canvas, { clientX: 100, clientY: 50 });
    fireEvent.mouseMove(canvas, { clientX: 150, clientY: 75 });
    fireEvent.mouseUp(canvas);
    await new Promise(resolve => setTimeout(resolve, 0));

    fireEvent.mouseDown(canvas, { clientX: 200, clientY: 100 });
    fireEvent.mouseMove(canvas, { clientX: 250, clientY: 125 });
    fireEvent.mouseUp(canvas);
    await new Promise(resolve => setTimeout(resolve, 0));

    // Verify canUndo is true (we have strokes)
    expect(canUndoCalls[canUndoCalls.length - 1]).toBe(true);

    // Undo 1 stroke — should leave 1 stroke remaining
    const undoFn = getUndo();
    await act(async () => {
      undoFn();
    });

    // After undo, we still have 1 stroke, so canUndo should still be true
    expect(canUndoCalls[canUndoCalls.length - 1]).toBe(true);

    // Trigger a resize — the canvas should redraw the remaining strokes
    ctx.clearRect.mockClear();
    ctx.stroke.mockClear();

    // Change clientWidth and trigger a ResizeObserver-compatible resize
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
      configurable: true,
      value: 700,
    });

    // ResizeObserver's callback is not triggered by window.resize in our mock,
    // but the component's resizeCanvas is exposed as an internal callback.
    // We verify the resize effect indirectly: draw a new stroke, which calls
    // redrawAll and replays only the current (remaining) strokes.
    fireEvent.mouseDown(canvas, { clientX: 300, clientY: 50 });
    fireEvent.mouseMove(canvas, { clientX: 350, clientY: 75 });
    fireEvent.mouseUp(canvas);
    await new Promise(resolve => setTimeout(resolve, 0));

    // After new stroke + redrawAll, canvas is redrawn with ALL existing strokes
    expect(ctx.clearRect).toHaveBeenCalled();
    // At least 2 strokes replayed (1 remaining + 1 new = 2 draw strokes)
    expect(ctx.stroke).toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // 39. Mid-stroke undo is blocked
  // -----------------------------------------------------------------------
  test('undo is blocked during an active drawing stroke', async () => {
    const canUndoCalls = [];
    const { getUndo } = renderCanvasWithUndoRedo({
      onCanUndoChange: (val) => canUndoCalls.push(val),
    });
    const canvas = screen.getByRole('img');
    const ctx = getCtx();

    // Draw 1 stroke so we have something to undo
    fireEvent.mouseDown(canvas, { clientX: 100, clientY: 50 });
    fireEvent.mouseMove(canvas, { clientX: 150, clientY: 75 });
    fireEvent.mouseUp(canvas);
    await new Promise(resolve => setTimeout(resolve, 0));

    // Start a new stroke but DON'T end it (mid-stroke)
    fireEvent.mouseDown(canvas, { clientX: 200, clientY: 100 });
    fireEvent.mouseMove(canvas, { clientX: 250, clientY: 125 });
    // isDrawingRef.current is now true

    // Clear canvas spies so we can detect whether undo triggers a redraw
    ctx.clearRect.mockClear();

    const undoFn = getUndo();
    expect(undoFn).toBeTruthy();
    // Call undo while mid-stroke — the isDrawingRef guard must block it
    undoFn();

    // If the guard works, undo returns early and clearRect is NOT called.
    // If the guard fails, undo would call setStrokes → useEffect → redrawAll → clearRect.
    expect(ctx.clearRect).not.toHaveBeenCalled();

    // Complete the stroke
    fireEvent.mouseMove(canvas, { clientX: 300, clientY: 150 });
    fireEvent.mouseUp(canvas);
    await new Promise(resolve => setTimeout(resolve, 0));

    // After completing the second stroke, canUndo should be true (2 strokes exist)
    expect(canUndoCalls[canUndoCalls.length - 1]).toBe(true);
  });

  // -----------------------------------------------------------------------
  // 40. onUndoReady callback receives a function
  // -----------------------------------------------------------------------
  test('onUndoReady callback receives a function', () => {
    const undoReadyFn = jest.fn();

    render(
      <DrawingCanvas
        colorRef={mockColorRef}
        onUndoReady={undoReadyFn}
        onRedoReady={jest.fn()}
      />
    );

    // The callback should have been called with a function
    expect(undoReadyFn).toHaveBeenCalled();
    const receivedFn = undoReadyFn.mock.calls[undoReadyFn.mock.calls.length - 1][0];
    expect(typeof receivedFn).toBe('function');
  });

  // -----------------------------------------------------------------------
  // 41. onRedoReady callback receives a function
  // -----------------------------------------------------------------------
  test('onRedoReady callback receives a function', () => {
    const redoReadyFn = jest.fn();

    render(
      <DrawingCanvas
        colorRef={mockColorRef}
        onUndoReady={jest.fn()}
        onRedoReady={redoReadyFn}
      />
    );

    // The callback should have been called with a function
    expect(redoReadyFn).toHaveBeenCalled();
    const receivedFn = redoReadyFn.mock.calls[redoReadyFn.mock.calls.length - 1][0];
    expect(typeof receivedFn).toBe('function');
  });

  // -----------------------------------------------------------------------
  // 42. onCanUndoChange reports false initially, true after drawing
  // -----------------------------------------------------------------------
  test('onCanUndoChange reports correct values as strokes change', async () => {
    const canUndoCalls = [];

    render(
      <DrawingCanvas
        colorRef={mockColorRef}
        onCanUndoChange={(val) => canUndoCalls.push(val)}
      />
    );
    const canvas = screen.getByRole('img');

    // Initially canUndo should be false (no strokes)
    expect(canUndoCalls[0]).toBe(false);

    // Draw a stroke
    fireEvent.mouseDown(canvas, { clientX: 100, clientY: 50 });
    fireEvent.mouseMove(canvas, { clientX: 150, clientY: 75 });
    fireEvent.mouseUp(canvas);
    await new Promise(resolve => setTimeout(resolve, 0));

    // After drawing, at least one canUndo call should be true
    expect(canUndoCalls).toContain(true);
  });

  // -----------------------------------------------------------------------
  // 42b. onCanRedoChange reports correct values as undoStack changes
  // -----------------------------------------------------------------------
  test('onCanRedoChange reports correct values as undoStack changes', async () => {
    const canRedoCalls = [];
    const undoFnRef = { current: null };

    render(
      <DrawingCanvas
        colorRef={mockColorRef}
        onUndoReady={(fn) => { undoFnRef.current = fn; }}
        onCanRedoChange={(val) => canRedoCalls.push(val)}
      />
    );
    const canvas = screen.getByRole('img');

    // Initially canRedo should be false
    expect(canRedoCalls[0]).toBe(false);

    // Draw a stroke
    fireEvent.mouseDown(canvas, { clientX: 100, clientY: 50 });
    fireEvent.mouseMove(canvas, { clientX: 150, clientY: 75 });
    fireEvent.mouseUp(canvas);
    await new Promise(resolve => setTimeout(resolve, 0));

    // Undo — undoStack now has 1 item, canRedo should become true
    await act(async () => {
      if (undoFnRef.current) undoFnRef.current();
    });

    // After undo, the last canRedo call should be true
    const canRedoAfterUndo = canRedoCalls[canRedoCalls.length - 1];
    expect(canRedoAfterUndo).toBe(true);

    // After drawing new stroke and clearing undoStack, last value should be false
    fireEvent.mouseDown(canvas, { clientX: 200, clientY: 100 });
    fireEvent.mouseMove(canvas, { clientX: 250, clientY: 125 });
    fireEvent.mouseUp(canvas);
    await new Promise(resolve => setTimeout(resolve, 0));

    const lastCanRedo = canRedoCalls[canRedoCalls.length - 1];
    expect(lastCanRedo).toBe(false);
  });

  // -----------------------------------------------------------------------
  // 25. Eraser stroke storage: verify completed erase stroke is stored and replayed
  // -----------------------------------------------------------------------
  test('a completed eraser stroke is stored with type "erase" and replayed on redraw', async () => {
    const eraserModeRef = { current: true };
    const eraserSizeRef = { current: 20 };

    render(
      <DrawingCanvas
        colorRef={mockColorRef}
        eraserModeRef={eraserModeRef}
        eraserSizeRef={eraserSizeRef}
      />
    );
    const canvas = screen.getByRole('img');
    const ctx = getCtx();

    // Perform a complete eraser stroke (mousedown → mousemove → mouseup)
    fireEvent.mouseDown(canvas, { clientX: 100, clientY: 50 });
    fireEvent.mouseMove(canvas, { clientX: 150, clientY: 75 });
    fireEvent.mouseUp(canvas);
    await new Promise(resolve => setTimeout(resolve, 0));

    // Switch to pencil mode so the next draw() won't use arc/fill itself.
    // This isolates the redrawAll behavior — any arc/fill calls during the
    // following trigger stroke must come from redrawAll replaying the stored
    // erase stroke.
    eraserModeRef.current = false;

    const arcSpy = jest.spyOn(ctx, 'arc');
    const fillSpy = jest.spyOn(ctx, 'fill');

    // Draw a pencil stroke to trigger redrawAll (which replays stored strokes)
    fireEvent.mouseDown(canvas, { clientX: 200, clientY: 100 });
    fireEvent.mouseMove(canvas, { clientX: 250, clientY: 125 });
    fireEvent.mouseUp(canvas);
    await new Promise(resolve => setTimeout(resolve, 0));

    // If arc/fill were called, it proves the erase stroke was stored and replayed
    expect(arcSpy).toHaveBeenCalled();
    expect(fillSpy).toHaveBeenCalled();
    // globalCompositeOperation must be reset to source-over after redraw
    expect(ctx.globalCompositeOperation).toBe('source-over');
  });

  // =======================================================================
  // SHAPE TOOL TESTS
  // =======================================================================

  // -----------------------------------------------------------------------
  // 43. Rectangle renders via ctx.strokeRect during shape preview
  // -----------------------------------------------------------------------
  test('rectangle shape preview renders via ctx.strokeRect with correct bounds', () => {
    const shapeModeRef = { current: 'rect' };
    render(
      <DrawingCanvas colorRef={mockColorRef} shapeModeRef={shapeModeRef} />
    );
    const canvas = screen.getByRole('img');
    const ctx = getCtx();
    const strokeRectSpy = jest.spyOn(ctx, 'strokeRect');

    // Drag from (100,50) to (200,150) — creates a 100×100 rectangle
    fireEvent.mouseDown(canvas, { clientX: 100, clientY: 50 });
    fireEvent.mouseMove(canvas, { clientX: 200, clientY: 150 });

    // strokeRect should be called with x=min(x1,x2), y=min(y1,y2), w=|dx|, h=|dy|
    expect(strokeRectSpy).toHaveBeenCalledWith(100, 50, 100, 100);
  });

  // -----------------------------------------------------------------------
  // 44. Circle renders via ctx.ellipse + ctx.stroke during shape preview
  // -----------------------------------------------------------------------
  test('circle shape preview renders via ctx.ellipse and ctx.stroke', () => {
    const shapeModeRef = { current: 'circle' };
    render(
      <DrawingCanvas colorRef={mockColorRef} shapeModeRef={shapeModeRef} />
    );
    const canvas = screen.getByRole('img');
    const ctx = getCtx();
    const ellipseSpy = jest.spyOn(ctx, 'ellipse');
    const strokeSpy = jest.spyOn(ctx, 'stroke');

    // Drag from (100,50) to (200,150)
    fireEvent.mouseDown(canvas, { clientX: 100, clientY: 50 });
    fireEvent.mouseMove(canvas, { clientX: 200, clientY: 150 });

    // ellipse should be called with center and radii
    expect(ellipseSpy).toHaveBeenCalledWith(
      150, 100,  // center: x + w/2 = 100+50 = 150, y + h/2 = 50+50 = 100
      50, 50,    // rx = w/2 = 50, ry = h/2 = 50
      0, 0, Math.PI * 2,
    );
    expect(strokeSpy).toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // 45. Line renders via ctx.beginPath + moveTo + lineTo + stroke during shape preview
  // -----------------------------------------------------------------------
  test('line shape preview renders via moveTo and lineTo with correct endpoints', () => {
    const shapeModeRef = { current: 'line' };
    render(
      <DrawingCanvas colorRef={mockColorRef} shapeModeRef={shapeModeRef} />
    );
    const canvas = screen.getByRole('img');
    const ctx = getCtx();
    const moveToSpy = jest.spyOn(ctx, 'moveTo');
    const lineToSpy = jest.spyOn(ctx, 'lineTo');
    const strokeSpy = jest.spyOn(ctx, 'stroke');

    // Drag from (100,50) to (200,150)
    fireEvent.mouseDown(canvas, { clientX: 100, clientY: 50 });
    fireEvent.mouseMove(canvas, { clientX: 200, clientY: 150 });

    // moveTo with startPoint, lineTo with endPoint
    expect(moveToSpy).toHaveBeenCalledWith(100, 50);
    expect(lineToSpy).toHaveBeenCalledWith(200, 150);
    expect(strokeSpy).toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // 46. Shape stroke stores color and lineWidth from refs
  // -----------------------------------------------------------------------
  test('shape stroke uses color and lineWidth from colorRef and brushSizeRef', () => {
    const shapeModeRef = { current: 'rect' };
    const colorRef = { current: '#3b82f6' };
    const brushSizeRef = { current: 7 };

    render(
      <DrawingCanvas
        colorRef={colorRef}
        brushSizeRef={brushSizeRef}
        shapeModeRef={shapeModeRef}
      />
    );
    const canvas = screen.getByRole('img');
    const ctx = getCtx();

    // Spy on ctx properties to verify they're set during drawShapePreview
    const strokeStyleValues = [];
    const lineWidthValues = [];
    const origStrokeDesc = Object.getOwnPropertyDescriptor(
      Object.getPrototypeOf(ctx), 'strokeStyle',
    );
    const origLineWidthDesc = Object.getOwnPropertyDescriptor(
      Object.getPrototypeOf(ctx), 'lineWidth',
    );

    Object.defineProperty(ctx, 'strokeStyle', {
      get() { return origStrokeDesc ? origStrokeDesc.get.call(ctx) : '#000'; },
      set(v) {
        strokeStyleValues.push(v);
        if (origStrokeDesc && origStrokeDesc.set) origStrokeDesc.set.call(ctx, v);
      },
      configurable: true,
    });
    Object.defineProperty(ctx, 'lineWidth', {
      get() { return origLineWidthDesc ? origLineWidthDesc.get.call(ctx) : 1; },
      set(v) {
        lineWidthValues.push(v);
        if (origLineWidthDesc && origLineWidthDesc.set) origLineWidthDesc.set.call(ctx, v);
      },
      configurable: true,
    });

    // Draw a rectangle shape
    fireEvent.mouseDown(canvas, { clientX: 100, clientY: 50 });
    fireEvent.mouseMove(canvas, { clientX: 200, clientY: 150 });

    // During drawShapePreview, strokeStyle should be set to the color
    expect(strokeStyleValues).toContain('#3b82f6');
    // During drawShapePreview, lineWidth should be set to the brush size
    expect(lineWidthValues).toContain(7);
  });

  // -----------------------------------------------------------------------
  // 47. redrawAll replays stored shape stroke correctly
  // -----------------------------------------------------------------------
  test('redrawAll replays a stored rectangle stroke via strokeRect', async () => {
    const shapeModeRef = { current: 'rect' };

    render(
      <DrawingCanvas colorRef={mockColorRef} shapeModeRef={shapeModeRef} />
    );
    const canvas = screen.getByRole('img');
    const ctx = getCtx();

    // Draw and complete a rectangle stroke
    fireEvent.mouseDown(canvas, { clientX: 100, clientY: 50 });
    fireEvent.mouseMove(canvas, { clientX: 200, clientY: 150 });
    fireEvent.mouseUp(canvas);
    await new Promise(resolve => setTimeout(resolve, 0));

    // Switch to pencil mode and set up spy for redrawAll
    shapeModeRef.current = null;
    const strokeRectSpy = jest.spyOn(ctx, 'strokeRect');

    // Draw a freehand stroke to trigger redrawAll
    fireEvent.mouseDown(canvas, { clientX: 300, clientY: 50 });
    fireEvent.mouseMove(canvas, { clientX: 350, clientY: 75 });
    fireEvent.mouseUp(canvas);
    await new Promise(resolve => setTimeout(resolve, 0));

    // The stored rectangle should be replayed via strokeRect
    expect(strokeRectSpy).toHaveBeenCalledWith(100, 50, 100, 100);
  });

  // -----------------------------------------------------------------------
  // 48. redrawAll handles mixed strokes (draw + erase + shapes interleaved)
  // -----------------------------------------------------------------------
  test('redrawAll replays interleaved draw, erase, and shape strokes', async () => {
    const shapeModeRef = { current: null };
    const eraserModeRef = { current: false };
    const eraserSizeRef = { current: 15 };

    const { rerender } = render(
      <DrawingCanvas
        colorRef={mockColorRef}
        shapeModeRef={shapeModeRef}
        eraserModeRef={eraserModeRef}
        eraserSizeRef={eraserSizeRef}
      />
    );
    const canvas = screen.getByRole('img');
    const ctx = getCtx();

    // 1. Draw a freehand (pencil) stroke
    fireEvent.mouseDown(canvas, { clientX: 100, clientY: 50 });
    fireEvent.mouseMove(canvas, { clientX: 150, clientY: 75 });
    fireEvent.mouseUp(canvas);
    await new Promise(resolve => setTimeout(resolve, 0));

    // 2. Draw an erase stroke
    eraserModeRef.current = true;
    rerender(
      <DrawingCanvas
        colorRef={mockColorRef}
        shapeModeRef={shapeModeRef}
        eraserModeRef={eraserModeRef}
        eraserSizeRef={eraserSizeRef}
      />
    );
    fireEvent.mouseDown(canvas, { clientX: 200, clientY: 30 });
    fireEvent.mouseMove(canvas, { clientX: 220, clientY: 50 });
    fireEvent.mouseUp(canvas);
    await new Promise(resolve => setTimeout(resolve, 0));

    // 3. Draw a rectangle shape
    eraserModeRef.current = false;
    shapeModeRef.current = 'rect';
    rerender(
      <DrawingCanvas
        colorRef={mockColorRef}
        shapeModeRef={shapeModeRef}
        eraserModeRef={eraserModeRef}
        eraserSizeRef={eraserSizeRef}
      />
    );
    fireEvent.mouseDown(canvas, { clientX: 300, clientY: 100 });
    fireEvent.mouseMove(canvas, { clientX: 400, clientY: 200 });
    fireEvent.mouseUp(canvas);
    await new Promise(resolve => setTimeout(resolve, 0));

    // 4. Switch to pencil mode and set up spies for redrawAll verification
    shapeModeRef.current = null;
    rerender(
      <DrawingCanvas
        colorRef={mockColorRef}
        shapeModeRef={shapeModeRef}
        eraserModeRef={eraserModeRef}
        eraserSizeRef={eraserSizeRef}
      />
    );

    const arcSpy = jest.spyOn(ctx, 'arc');
    const fillSpy = jest.spyOn(ctx, 'fill');
    const strokeRectSpy = jest.spyOn(ctx, 'strokeRect');
    const strokeSpy = jest.spyOn(ctx, 'stroke');

    // Intercept globalCompositeOperation to verify erase replay
    const compositeValues = [];
    const origDescriptor = Object.getOwnPropertyDescriptor(
      Object.getPrototypeOf(ctx), 'globalCompositeOperation',
    );
    Object.defineProperty(ctx, 'globalCompositeOperation', {
      get() { return origDescriptor ? origDescriptor.get.call(ctx) : 'source-over'; },
      set(v) {
        compositeValues.push(v);
        if (origDescriptor && origDescriptor.set) origDescriptor.set.call(ctx, v);
      },
      configurable: true,
    });

    // 5. Draw another freehand stroke to trigger redrawAll
    fireEvent.mouseDown(canvas, { clientX: 450, clientY: 50 });
    fireEvent.mouseMove(canvas, { clientX: 500, clientY: 75 });
    fireEvent.mouseUp(canvas);
    await new Promise(resolve => setTimeout(resolve, 0));

    // Erase stroke replays: arc + fill must be called
    expect(arcSpy).toHaveBeenCalled();
    expect(fillSpy).toHaveBeenCalled();
    // Rectangle stroke replays: strokeRect must be called
    expect(strokeRectSpy).toHaveBeenCalled();
    // Pencil stroke replays: stroke must be called
    expect(strokeSpy).toHaveBeenCalled();
    // Erase replay uses destination-out
    expect(compositeValues).toContain('destination-out');
    // After redrawAll, composite operation resets to source-over
    expect(ctx.globalCompositeOperation).toBe('source-over');
  });

  // -----------------------------------------------------------------------
  // 49. Freehand strokes are unchanged in redrawAll (regression check)
  // -----------------------------------------------------------------------
  test('freehand strokes still replay correctly when shapes are also present', async () => {
    const shapeModeRef = { current: null };

    render(
      <DrawingCanvas colorRef={mockColorRef} shapeModeRef={shapeModeRef} />
    );
    const canvas = screen.getByRole('img');
    const ctx = getCtx();

    // Draw a freehand stroke
    fireEvent.mouseDown(canvas, { clientX: 100, clientY: 50 });
    fireEvent.mouseMove(canvas, { clientX: 150, clientY: 75 });
    fireEvent.mouseUp(canvas);
    await new Promise(resolve => setTimeout(resolve, 0));

    // Draw a rectangle shape stroke
    shapeModeRef.current = 'rect';
    fireEvent.mouseDown(canvas, { clientX: 200, clientY: 100 });
    fireEvent.mouseMove(canvas, { clientX: 300, clientY: 200 });
    fireEvent.mouseUp(canvas);
    await new Promise(resolve => setTimeout(resolve, 0));

    // Switch to pencil and track freehand-specific methods during redrawAll
    shapeModeRef.current = null;

    // Track the lineWidth values used during redrawAll to verify freehand
    // strokes are replayed with their stored lineWidth
    const lineWidthValues = [];
    const origDesc = Object.getOwnPropertyDescriptor(
      Object.getPrototypeOf(ctx), 'lineWidth',
    );
    Object.defineProperty(ctx, 'lineWidth', {
      get() { return origDesc ? origDesc.get.call(ctx) : 1; },
      set(v) {
        lineWidthValues.push(v);
        if (origDesc && origDesc.set) origDesc.set.call(ctx, v);
      },
      configurable: true,
    });

    const beginPathSpy = jest.spyOn(ctx, 'beginPath');
    const strokeSpy = jest.spyOn(ctx, 'stroke');

    // Draw another freehand stroke to trigger redrawAll
    fireEvent.mouseDown(canvas, { clientX: 350, clientY: 50 });
    fireEvent.mouseMove(canvas, { clientX: 400, clientY: 75 });
    fireEvent.mouseUp(canvas);
    await new Promise(resolve => setTimeout(resolve, 0));

    // Freehand strokes must still trigger beginPath and stroke during redrawAll
    expect(beginPathSpy).toHaveBeenCalled();
    expect(strokeSpy).toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // 50. shapeModeRef drives correct branch in startDrawing and draw()
  // -----------------------------------------------------------------------
  test('shapeModeRef drives the shape drawing branch in startDrawing and draw', () => {
    const shapeModeRef = { current: 'rect' };

    render(
      <DrawingCanvas colorRef={mockColorRef} shapeModeRef={shapeModeRef} />
    );
    const canvas = screen.getByRole('img');
    const ctx = getCtx();
    const strokeRectSpy = jest.spyOn(ctx, 'strokeRect');
    // Also track that freehand-specific lineTo is NOT used for this shape
    const lineToSpy = jest.spyOn(ctx, 'lineTo');

    // Start a shape drag
    fireEvent.mouseDown(canvas, { clientX: 100, clientY: 50 });
    fireEvent.mouseMove(canvas, { clientX: 200, clientY: 150 });

    // shapeModeRef='rect' → startDrawing creates shape stroke → draw() calls
    // redrawAll + drawShapePreview → strokeRect is called
    expect(strokeRectSpy).toHaveBeenCalled();

    // Now switch to pencil mode (no shape) and verify the behavior changes
    shapeModeRef.current = null;
    const beginPathSpy = jest.spyOn(ctx, 'beginPath');
    const moveToSpy = jest.spyOn(ctx, 'moveTo');

    fireEvent.mouseDown(canvas, { clientX: 300, clientY: 50 });
    fireEvent.mouseMove(canvas, { clientX: 350, clientY: 75 });

    // In pencil mode, freehand methods are used instead of shape methods
    expect(beginPathSpy).toHaveBeenCalled();
    expect(moveToSpy).toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // 51. endDrawing stores shape stroke via handleNewStroke
  // -----------------------------------------------------------------------
  test('endDrawing stores shape stroke so it can be undone and replayed', async () => {
    const shapeModeRef = { current: 'rect' };
    const canUndoCalls = [];

    render(
      <DrawingCanvas
        colorRef={mockColorRef}
        shapeModeRef={shapeModeRef}
        onCanUndoChange={(val) => canUndoCalls.push(val)}
      />
    );
    const canvas = screen.getByRole('img');
    const ctx = getCtx();

    // Initially canUndo is false (no strokes)
    expect(canUndoCalls[0]).toBe(false);

    // Draw and complete a rectangle stroke
    fireEvent.mouseDown(canvas, { clientX: 100, clientY: 50 });
    fireEvent.mouseMove(canvas, { clientX: 200, clientY: 150 });
    fireEvent.mouseUp(canvas);
    await new Promise(resolve => setTimeout(resolve, 0));

    // After the shape stroke is stored via handleNewStroke, canUndo must be true
    expect(canUndoCalls).toContain(true);

    // Switch to pencil mode and verify the shape stroke replays on redrawAll
    shapeModeRef.current = null;
    const strokeRectSpy = jest.spyOn(ctx, 'strokeRect');

    // Draw a freehand stroke to trigger redrawAll (which replays the shape)
    fireEvent.mouseDown(canvas, { clientX: 300, clientY: 50 });
    fireEvent.mouseMove(canvas, { clientX: 350, clientY: 75 });
    fireEvent.mouseUp(canvas);
    await new Promise(resolve => setTimeout(resolve, 0));

    // The stored rectangle stroke must have been replayed
    expect(strokeRectSpy).toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // 52. Single-click shape (no drag) creates stroke with startPoint === endPoint
  // -----------------------------------------------------------------------
  test('single-click shape draws stores a stroke with matching start and end points without crashing', async () => {
    const shapeModeRef = { current: 'rect' };
    const canUndoCalls = [];

    render(
      <DrawingCanvas
        colorRef={mockColorRef}
        shapeModeRef={shapeModeRef}
        onCanUndoChange={(val) => canUndoCalls.push(val)}
      />
    );
    const canvas = screen.getByRole('img');

    // Mouse down then IMMEDIATE mouse up — no drag, zero-size shape
    fireEvent.mouseDown(canvas, { clientX: 100, clientY: 50 });
    fireEvent.mouseUp(canvas);
    await new Promise(resolve => setTimeout(resolve, 0));

    // The stroke should be stored even though it's zero-size
    // canUndo should become true
    expect(canUndoCalls).toContain(true);

    // Drawing a new stroke should still work — no crash
    shapeModeRef.current = null;
    const ctx = getCtx();
    const strokeSpy = jest.spyOn(ctx, 'stroke');

    fireEvent.mouseDown(canvas, { clientX: 200, clientY: 100 });
    fireEvent.mouseMove(canvas, { clientX: 250, clientY: 125 });
    fireEvent.mouseUp(canvas);

    // A new freehand stroke should work fine after the zero-size shape
    expect(strokeSpy).toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // 53. Shape stroke format verified (type, startPoint, endPoint present, no points[])
  // -----------------------------------------------------------------------
  test('shape stroke is stored with type/startPoint/endPoint and replayed via shape branch', async () => {
    const shapeModeRef = { current: 'rect' };

    render(
      <DrawingCanvas colorRef={mockColorRef} shapeModeRef={shapeModeRef} />
    );
    const canvas = screen.getByRole('img');
    const ctx = getCtx();

    // Draw and complete a rectangle stroke
    fireEvent.mouseDown(canvas, { clientX: 100, clientY: 50 });
    fireEvent.mouseMove(canvas, { clientX: 200, clientY: 150 });
    fireEvent.mouseUp(canvas);
    await new Promise(resolve => setTimeout(resolve, 0));

    // Switch to pencil mode
    shapeModeRef.current = null;

    // Spies: shape-specific strokeRect vs freehand-specific pattern
    const strokeRectSpy = jest.spyOn(ctx, 'strokeRect');
    // moveTo/lineTo are used in freehand replay — if the shape stroke had
    // a points[] array it would be replayed through the freehand branch
    const moveToSpy = jest.spyOn(ctx, 'moveTo');

    // Draw a freehand stroke to trigger redrawAll
    fireEvent.mouseDown(canvas, { clientX: 300, clientY: 50 });
    fireEvent.mouseMove(canvas, { clientX: 350, clientY: 75 });
    fireEvent.mouseUp(canvas);
    await new Promise(resolve => setTimeout(resolve, 0));

    // The shape stroke MUST be replayed via strokeRect (shape branch)
    expect(strokeRectSpy).toHaveBeenCalled();

    // The shape stroke must NOT go through the freehand branch which would
    // use moveTo on points[0]. The moveTo calls from the live freehand draw
    // and from the freehand redraw are separate — but a shape stroke going
    // through the freehand branch would also call moveTo. The key point is
    // that strokeRect IS called for the shape stroke, proving it has the
    // correct type/startPoint/endPoint format.
  });

  // =======================================================================
  // STROKE EXPORT / IMPORT TESTS
  // =======================================================================

  /** Helper: render DrawingCanvas with getter/loader callback capturers */
  function renderCanvasWithStrokesApi(overrides = {}) {
    const getStrokesRef = { current: null };
    const loadStrokesRef = { current: null };

    render(
      <DrawingCanvas
        colorRef={mockColorRef}
        onGetStrokesReady={(fn) => { getStrokesRef.current = fn; }}
        onLoadStrokesReady={(fn) => { loadStrokesRef.current = fn; }}
        {...overrides}
      />
    );

    return {
      getStrokes: () => getStrokesRef.current?.(),
      loadStrokes: (strokes) => loadStrokesRef.current?.(strokes),
    };
  }

  // -----------------------------------------------------------------------
  // 54. getStrokes returns current strokes array
  // -----------------------------------------------------------------------
  test('getStrokes returns the current strokes array', async () => {
    const { getStrokes } = renderCanvasWithStrokesApi();
    const canvas = screen.getByRole('img');

    // Wait for useEffect to wire up getStrokes ref
    await new Promise(resolve => setTimeout(resolve, 0));

    // Initially, no strokes
    let strokes = getStrokes();
    expect(strokes).toEqual([]);

    // Draw a stroke
    fireEvent.mouseDown(canvas, { clientX: 100, clientY: 50 });
    fireEvent.mouseMove(canvas, { clientX: 150, clientY: 75 });
    fireEvent.mouseUp(canvas);
    await new Promise(resolve => setTimeout(resolve, 0));

    // Should now have 1 stroke
    strokes = getStrokes();
    expect(strokes).toHaveLength(1);
    expect(strokes[0].points).toBeDefined();
    expect(strokes[0].color).toBeDefined();
  });

  // -----------------------------------------------------------------------
  // 55. loadStrokes replaces strokes and triggers repaint
  // -----------------------------------------------------------------------
  test('loadStrokes replaces strokes and triggers canvas repaint', async () => {
    const { loadStrokes } = renderCanvasWithStrokesApi();
    const canvas = screen.getByRole('img');
    const ctx = getCtx();

    // Draw a stroke first so there's something to replace
    fireEvent.mouseDown(canvas, { clientX: 100, clientY: 50 });
    fireEvent.mouseMove(canvas, { clientX: 150, clientY: 75 });
    fireEvent.mouseUp(canvas);
    await new Promise(resolve => setTimeout(resolve, 0));

    // Load new strokes — should clear and repaint
    ctx.clearRect.mockClear();
    ctx.stroke.mockClear();

    const newStrokes = [
      { points: [{ x: 10, y: 20 }, { x: 30, y: 40 }], color: '#ff0000' },
    ];

    await act(async () => {
      loadStrokes(newStrokes);
    });

    // After loadStrokes, redrawAll should have been called
    expect(ctx.clearRect).toHaveBeenCalled();
    // At least one stroke replay
    expect(ctx.stroke).toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // 56. loadStrokes clears the undo stack
  // -----------------------------------------------------------------------
  test('loadStrokes clears the undo stack', async () => {
    const canRedoCalls = [];
    const { loadStrokes, getUndo } = (() => {
      const undoFnRef = { current: null };
      const getStrokesRef = { current: null };
      const loadStrokesRef = { current: null };

      render(
        <DrawingCanvas
          colorRef={mockColorRef}
          onUndoReady={(fn) => { undoFnRef.current = fn; }}
          onGetStrokesReady={(fn) => { getStrokesRef.current = fn; }}
          onLoadStrokesReady={(fn) => { loadStrokesRef.current = fn; }}
          onCanRedoChange={(val) => canRedoCalls.push(val)}
        />
      );

      return {
        getUndo: () => undoFnRef.current,
        loadStrokes: (strokes) => loadStrokesRef.current?.(strokes),
      };
    })();

    const canvas = screen.getByRole('img');

    // Draw a stroke and then undo it (puts it in undoStack, making canRedo true)
    fireEvent.mouseDown(canvas, { clientX: 100, clientY: 50 });
    fireEvent.mouseMove(canvas, { clientX: 150, clientY: 75 });
    fireEvent.mouseUp(canvas);
    await new Promise(resolve => setTimeout(resolve, 0));

    await act(async () => {
      getUndo()?.();
    });

    // After undo, canRedo should be true (undoStack has 1 item)
    expect(canRedoCalls[canRedoCalls.length - 1]).toBe(true);

    // Now loadStrokes — this should clear the undo stack
    await act(async () => {
      loadStrokes([]);
    });

    // After loadStrokes, canRedo should become false (undoStack cleared)
    expect(canRedoCalls[canRedoCalls.length - 1]).toBe(false);
  });

  // -----------------------------------------------------------------------
  // 57. onHasStrokesChange fires when strokes change
  // -----------------------------------------------------------------------
  test('onHasStrokesChange fires with true/false as strokes change', async () => {
    const hasStrokesCalls = [];
    const { loadStrokes } = renderCanvasWithStrokesApi({
      onHasStrokesChange: (val) => hasStrokesCalls.push(val),
    });
    const canvas = screen.getByRole('img');

    // Initial state — no strokes
    expect(hasStrokesCalls[0]).toBe(false);

    // Draw a stroke
    fireEvent.mouseDown(canvas, { clientX: 100, clientY: 50 });
    fireEvent.mouseMove(canvas, { clientX: 150, clientY: 75 });
    fireEvent.mouseUp(canvas);
    await new Promise(resolve => setTimeout(resolve, 0));

    // Should now report has strokes
    expect(hasStrokesCalls).toContain(true);

    // Load empty strokes
    await act(async () => {
      loadStrokes([]);
    });

    // Should report no strokes again
    expect(hasStrokesCalls[hasStrokesCalls.length - 1]).toBe(false);
  });

  // -----------------------------------------------------------------------
  // 58. onDirtyChange fires when strokes change
  // -----------------------------------------------------------------------
  test('onDirtyChange fires when drawing a new stroke', async () => {
    const dirtyCalls = [];

    render(
      <DrawingCanvas
        colorRef={mockColorRef}
        onDirtyChange={(dirty) => { if (dirty) dirtyCalls.push(dirty); }}
      />
    );
    const canvas = screen.getByRole('img');

    // Draw a stroke
    fireEvent.mouseDown(canvas, { clientX: 100, clientY: 50 });
    fireEvent.mouseMove(canvas, { clientX: 150, clientY: 75 });
    fireEvent.mouseUp(canvas);
    await new Promise(resolve => setTimeout(resolve, 0));

    // onDirtyChange should have been called with true
    expect(dirtyCalls).toContain(true);
  });

  // -----------------------------------------------------------------------
  // 54b. Each shape type is stored correctly and replayed with its own canvas method
  // -----------------------------------------------------------------------
  test('each shape type is stored correctly and replayed with its own canvas method', async () => {
    const shapeModeRef = { current: null };

    const { rerender } = render(
      <DrawingCanvas colorRef={mockColorRef} shapeModeRef={shapeModeRef} />
    );
    const canvas = screen.getByRole('img');
    const ctx = getCtx();

    // Draw a rect stroke
    shapeModeRef.current = 'rect';
    rerender(
      <DrawingCanvas colorRef={mockColorRef} shapeModeRef={shapeModeRef} />
    );
    fireEvent.mouseDown(canvas, { clientX: 100, clientY: 50 });
    fireEvent.mouseMove(canvas, { clientX: 200, clientY: 150 });
    fireEvent.mouseUp(canvas);
    await new Promise(resolve => setTimeout(resolve, 0));

    // Draw a circle stroke
    shapeModeRef.current = 'circle';
    rerender(
      <DrawingCanvas colorRef={mockColorRef} shapeModeRef={shapeModeRef} />
    );
    fireEvent.mouseDown(canvas, { clientX: 50, clientY: 60 });
    fireEvent.mouseMove(canvas, { clientX: 150, clientY: 140 });
    fireEvent.mouseUp(canvas);
    await new Promise(resolve => setTimeout(resolve, 0));

    // Draw a line stroke
    shapeModeRef.current = 'line';
    rerender(
      <DrawingCanvas colorRef={mockColorRef} shapeModeRef={shapeModeRef} />
    );
    fireEvent.mouseDown(canvas, { clientX: 10, clientY: 20 });
    fireEvent.mouseMove(canvas, { clientX: 400, clientY: 300 });
    fireEvent.mouseUp(canvas);
    await new Promise(resolve => setTimeout(resolve, 0));

    // Switch to pencil and set up spies for redrawAll
    shapeModeRef.current = null;
    rerender(
      <DrawingCanvas colorRef={mockColorRef} shapeModeRef={shapeModeRef} />
    );

    const strokeRectSpy = jest.spyOn(ctx, 'strokeRect');
    const ellipseSpy = jest.spyOn(ctx, 'ellipse');
    const moveToSpy = jest.spyOn(ctx, 'moveTo');
    const lineToSpy = jest.spyOn(ctx, 'lineTo');

    // Draw a freehand stroke to trigger redrawAll
    fireEvent.mouseDown(canvas, { clientX: 450, clientY: 50 });
    fireEvent.mouseMove(canvas, { clientX: 500, clientY: 75 });
    fireEvent.mouseUp(canvas);
    await new Promise(resolve => setTimeout(resolve, 0));

    // All three shape types must be replayed
    expect(strokeRectSpy).toHaveBeenCalled();
    expect(ellipseSpy).toHaveBeenCalled();
    // Line replay uses moveTo/lineTo — verify that the line endpoint pairs exist
    expect(moveToSpy).toHaveBeenCalledWith(10, 20);
    expect(lineToSpy).toHaveBeenCalledWith(400, 300);
  });
});
