import { useRef, useState, useEffect, useCallback } from 'react';

function DrawingCanvas({
  colorRef,
  eraserModeRef = { current: false },
  eraserSizeRef = { current: 15 },
  brushSizeRef = { current: 3 },
}) {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const [strokes, setStrokes] = useState([]);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef(null);
  const wrapperRef = useRef(null);
  const currentStrokeRef = useRef(null);

  // Cursor overlay state
  const cursorPosRef = useRef(null);
  const cursorDirtyRef = useRef(false);
  const [cursorPos, setCursorPos] = useState(null);
  const rafIdRef = useRef(null);

  // Touch device detection for hiding cursor overlay
  const [isTouchDevice] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(hover: none) and (pointer: coarse)').matches;
  });

  // Get coordinates relative to canvas in CSS pixel space.
  // The context already has dpr scaling applied, so coordinates
  // must be in CSS (not internal-canvas) pixels.
  const getPoint = useCallback((clientX, clientY) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  }, []);

  // Initialize context with drawing defaults
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = colorRef.current;
    ctx.lineWidth = brushSizeRef.current;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctxRef.current = ctx;
  }, []);

  // rAF loop for smooth cursor overlay tracking
  useEffect(() => {
    const loop = () => {
      if (cursorDirtyRef.current && cursorPosRef.current && eraserModeRef.current) {
        setCursorPos({
          x: cursorPosRef.current.x,
          y: cursorPosRef.current.y,
        });
        cursorDirtyRef.current = false;
      }
      rafIdRef.current = requestAnimationFrame(loop);
    };
    rafIdRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  // Redraw all strokes onto the given context in chronological order
  const redrawAll = useCallback((ctx, allStrokes) => {
    const dpr = window.devicePixelRatio || 1;
    // clearRect operates in the scaled coordinate system,
    // so divide canvas dimensions by dpr to cover the full area
    ctx.clearRect(0, 0, ctx.canvas.width / dpr, ctx.canvas.height / dpr);

    // Replay strokes in chronological order
    for (const stroke of allStrokes) {
      if (stroke.points.length === 0) continue;

      if (stroke.type === 'erase') {
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        const radius = (stroke.eraserSize || 15) / 2;
        for (const point of stroke.points) {
          ctx.beginPath();
          ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = stroke.color || colorRef.current;
        ctx.lineWidth = stroke.lineWidth || 3;
        ctx.beginPath();
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        for (let i = 1; i < stroke.points.length; i++) {
          ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
        }
        ctx.stroke();
      }
    }

    // Reset composite operation to default
    ctx.globalCompositeOperation = 'source-over';
  }, [colorRef]);

  // Resize handler — recalculates canvas pixel dimensions and redraws
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) return;

    const dpr = window.devicePixelRatio || 1;
    const width = wrapper.clientWidth;
    const isMobile = window.innerWidth < 640;
    const height = isMobile ? window.innerHeight * 0.6 : width * 0.625;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.strokeStyle = colorRef.current;
    ctx.lineWidth = brushSizeRef.current;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctxRef.current = ctx;

    redrawAll(ctx, strokes);
  }, [strokes, redrawAll, colorRef]);

  // ResizeObserver to respond to viewport / container changes
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    resizeCanvas();
    const observer = new ResizeObserver(() => resizeCanvas());
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, [resizeCanvas]);

  // --- Drawing state transitions ---

  const startDrawing = (clientX, clientY) => {
    const point = getPoint(clientX, clientY);
    isDrawingRef.current = true;
    lastPointRef.current = point;
    if (eraserModeRef.current) {
      currentStrokeRef.current = {
        type: 'erase',
        points: [point],
        eraserSize: eraserSizeRef.current,
      };
    } else {
      currentStrokeRef.current = { points: [point], color: colorRef.current, lineWidth: brushSizeRef.current };
    }
  };

  const draw = (clientX, clientY) => {
    if (!isDrawingRef.current) return;
    const point = getPoint(clientX, clientY);
    const ctx = ctxRef.current;
    if (!ctx) return;

    if (eraserModeRef.current) {
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      const radius = (currentStrokeRef.current.eraserSize || 15) / 2;
      ctx.beginPath();
      ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else {
      ctx.strokeStyle = colorRef.current;
      ctx.lineWidth = currentStrokeRef.current.lineWidth || 3;
      ctx.beginPath();
      ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
    }

    lastPointRef.current = point;
    currentStrokeRef.current.points.push(point);
  };

  const endDrawing = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    const completedStroke = currentStrokeRef.current;
    currentStrokeRef.current = null;
    lastPointRef.current = null;
    if (completedStroke && completedStroke.points.length > 0) {
      if (completedStroke.type !== 'erase') {
        completedStroke.color = colorRef.current;
      }
      setStrokes((prev) => [...prev, completedStroke]);
    }
  };

  // --- Mouse event handlers ---

  const handleMouseDown = (e) => {
    startDrawing(e.clientX, e.clientY);
  };

  const handleMouseMove = (e) => {
    draw(e.clientX, e.clientY);

    // Always track cursor position so the eraser overlay appears immediately on toggle
    if (wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      cursorPosRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
      cursorDirtyRef.current = true;
    }
  };

  const handleMouseUp = () => {
    endDrawing();
  };

  // --- Touch event handlers ---

  const handleTouchStart = (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    startDrawing(touch.clientX, touch.clientY);
  };

  const handleTouchMove = (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    draw(touch.clientX, touch.clientY);
  };

  const handleTouchEnd = (e) => {
    e.preventDefault();
    endDrawing();
  };

  // Determine cursor class and whether to show overlay
  const showCursorOverlay = eraserModeRef.current && !isTouchDevice && cursorPos;
  const cursorClass = eraserModeRef.current ? 'cursor-none' : 'cursor-crosshair';

  return (
    <div ref={wrapperRef} className="relative w-full max-w-[960px] mx-auto">
      <canvas
        ref={canvasRef}
        className={`w-full h-auto block bg-white border border-scribble-border rounded-xl shadow-lg shadow-black/20 touch-none ${cursorClass}`}
        style={{ aspectRatio: '16 / 10', minHeight: '60vh' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onContextMenu={(e) => e.preventDefault()}
        role="img"
        aria-label="Drawing canvas — use your mouse or touch to draw"
      />
      {/* Cursor overlay for eraser mode (desktop only) */}
      {showCursorOverlay && (
        <div
          aria-hidden="true"
          className="absolute pointer-events-none z-10"
          style={{
            left: `${cursorPos.x - eraserSizeRef.current / 2}px`,
            top: `${cursorPos.y - eraserSizeRef.current / 2}px`,
            width: `${eraserSizeRef.current}px`,
            height: `${eraserSizeRef.current}px`,
            borderRadius: '50%',
            border: '2px solid #7c3aed',
            backgroundColor: 'rgba(124, 58, 237, 0.15)',
            boxShadow: '0 0 6px rgba(124, 58, 237, 0.4)',
          }}
        >
          {/* Center crosshair dot */}
          <div
            className="absolute rounded-full"
            style={{
              width: '3px',
              height: '3px',
              backgroundColor: '#7c3aed',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
            }}
          />
        </div>
      )}
    </div>
  );
}

export default DrawingCanvas;
