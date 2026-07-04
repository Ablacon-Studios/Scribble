/**
 * Tests for the DrawingCanvas component.
 */
import '@testing-library/jest-dom';
import 'jest-canvas-mock';
import { render, screen, fireEvent } from '@testing-library/react';
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
});
