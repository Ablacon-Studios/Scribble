import { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import SplashScreen from './SplashScreen';
import Navbar from './layout/Navbar';
import DrawingCanvas from './canvas/DrawingCanvas';
import ColorIndicator from './canvas/ColorIndicator';
import ColorToolbar from './toolbar/ColorToolbar';

function HomePage() {
  const { user } = useAuth();
  const [activeColor, setActiveColor] = useState('#7c3aed');
  const colorRef = useRef('#7c3aed');

  // Eraser state
  const [eraserMode, setEraserMode] = useState(false);
  const eraserModeRef = useRef(false);
  const [eraserSize, setEraserSize] = useState(15);
  const eraserSizeRef = useRef(15);

  // Brush state
  const [brushSize, setBrushSize] = useState(3);
  const brushSizeRef = useRef(3);

  const handleColorChange = (newColor) => {
    colorRef.current = newColor;  // Sync instantly — before re-render
    setActiveColor(newColor);     // Trigger re-render for UI

    // When eraser is active, picking a color exits eraser mode
    if (eraserModeRef.current) {
      eraserModeRef.current = false;
      setEraserMode(false);
    }
  };

  const handleEraserToggle = (newValue) => {
    eraserModeRef.current = newValue;  // Sync instantly — before re-render
    setEraserMode(newValue);           // Trigger re-render for UI
  };

  const handleEraserSizeChange = (newSize) => {
    eraserSizeRef.current = newSize;  // Sync instantly
    setEraserSize(newSize);           // Trigger re-render for UI
  };

  const handleBrushSizeChange = (newSize) => {
    brushSizeRef.current = newSize;  // Sync instantly
    setBrushSize(newSize);           // Trigger re-render for UI
  };

  if (!user) {
    return <SplashScreen />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-scribble-bg">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <ColorToolbar
          currentColor={activeColor}
          onColorChange={handleColorChange}
          eraserMode={eraserMode}
          onEraserToggle={handleEraserToggle}
          eraserSize={eraserSize}
          onEraserSizeChange={handleEraserSizeChange}
          brushSize={brushSize}
          onBrushSizeChange={handleBrushSizeChange}
        />
        <main className="flex-1 flex flex-col items-center justify-center px-4 py-8">
            <DrawingCanvas
              colorRef={colorRef}
              eraserModeRef={eraserModeRef}
              eraserSizeRef={eraserSizeRef}
              brushSizeRef={brushSizeRef}
            />
          <ColorIndicator color={activeColor} />
        </main>
      </div>
    </div>
  );
}

export default HomePage;
