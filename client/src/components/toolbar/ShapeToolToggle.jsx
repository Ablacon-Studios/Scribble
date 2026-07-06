import PropTypes from 'prop-types';

const SHAPE_ICONS = {
  rect: (
    <rect x="4" y="5" width="16" height="14" rx="1" />
  ),
  circle: (
    <circle cx="12" cy="12" r="8" />
  ),
  line: (
    <line x1="6" y1="18" x2="18" y2="6" />
  ),
};

function ShapeToolToggle({ shapeType, active, onClick, label }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`
        w-9 h-9 rounded-lg cursor-pointer transition-all duration-150 outline-none
        flex items-center justify-center
        focus-visible:ring-2 focus-visible:ring-scribble-primary focus-visible:ring-offset-2 focus-visible:ring-offset-scribble-surface
        ${active
          ? 'bg-scribble-primary/20 ring-2 ring-scribble-primary ring-offset-2 ring-offset-scribble-surface'
          : 'bg-transparent hover:bg-scribble-border/30'
        }
      `}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        width="18"
        height="18"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className={active ? 'text-purple-300' : 'text-scribble-muted'}
      >
        {SHAPE_ICONS[shapeType]}
      </svg>
    </button>
  );
}

ShapeToolToggle.propTypes = {
  shapeType: PropTypes.oneOf(['rect', 'circle', 'line']).isRequired,
  active: PropTypes.bool.isRequired,
  onClick: PropTypes.func.isRequired,
  label: PropTypes.string.isRequired,
};

export default ShapeToolToggle;
