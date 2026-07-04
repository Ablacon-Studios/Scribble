const SIZE_OPTIONS = [
  { label: 'Small', value: 5, visual: 6 },
  { label: 'Medium', value: 15, visual: 12 },
  { label: 'Large', value: 30, visual: 18 },
];

function EraserSizeSelector({ currentSize, onChange, visible }) {
  if (!visible) return null;

  return (
    <div
      role="radiogroup"
      aria-label="Eraser size"
      className="flex sm:flex-col gap-1 sm:gap-2 items-center"
    >
      {SIZE_OPTIONS.map((opt) => {
        const isActive = currentSize === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            aria-label={`Eraser size: ${opt.label} (${opt.value} pixels)`}
            title={`${opt.label} (${opt.value}px)`}
            onClick={() => onChange(opt.value)}
            className={`
              rounded-full cursor-pointer transition-all duration-150 outline-none
              flex items-center justify-center
              w-9 h-9 sm:w-8 sm:h-8
              focus-visible:ring-2 focus-visible:ring-scribble-primary focus-visible:ring-offset-2 focus-visible:ring-offset-scribble-surface
              hover:bg-scribble-border/30
            `}
          >
            <span
              className={`block rounded-full transition-colors duration-150 ${
                isActive ? 'bg-scribble-primary' : 'bg-scribble-muted'
              }`}
              style={{
                width: `${opt.visual}px`,
                height: `${opt.visual}px`,
              }}
            />
          </button>
        );
      })}
    </div>
  );
}

export default EraserSizeSelector;
