function ColorSwatch({ color, name, isActive, onSelect }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={isActive}
      aria-label={name}
      className={`
        rounded-full cursor-pointer transition-all duration-150 outline-none
        sm:w-6 sm:h-6 w-8 h-8
        hover:scale-110 hover:brightness-110
        focus-visible:ring-2 focus-visible:ring-scribble-primary focus-visible:ring-offset-2 focus-visible:ring-offset-scribble-surface
        ${isActive ? 'ring-2 ring-white ring-offset-2 ring-offset-scribble-surface scale-105' : ''}
        ${color === '#ffffff' && !isActive ? 'border border-gray-400' : ''}
      `}
      style={{ backgroundColor: color }}
      onClick={() => onSelect(color)}
    />
  );
}

export default ColorSwatch;
