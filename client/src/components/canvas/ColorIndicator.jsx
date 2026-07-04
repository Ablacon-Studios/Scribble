function ColorIndicator({ color }) {
  return (
    <div className="flex items-center justify-center gap-2 mt-3">
      <div
        className="w-4 h-4 rounded-full border border-scribble-border"
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />
      <span className="text-xs text-scribble-muted" aria-live="polite">Drawing color</span>
    </div>
  );
}

export default ColorIndicator;
