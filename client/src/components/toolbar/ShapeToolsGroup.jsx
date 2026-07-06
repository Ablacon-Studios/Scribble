import PropTypes from 'prop-types';
import ShapeToolToggle from './ShapeToolToggle';

const SHAPE_TOOLS = [
  { type: 'rect', label: 'Rectangle tool' },
  { type: 'circle', label: 'Circle tool' },
  { type: 'line', label: 'Line tool' },
];

function ShapeToolsGroup({ shapeMode, onShapeModeChange }) {
  const handleClick = (type) => {
    if (shapeMode === type) {
      onShapeModeChange(null);
    } else {
      onShapeModeChange(type);
    }
  };

  return (
    <div
      role="radiogroup"
      aria-label="Shape tools"
      className="flex sm:flex-col items-center gap-1 shrink-0"
    >
      {SHAPE_TOOLS.map(({ type, label }) => (
        <ShapeToolToggle
          key={type}
          shapeType={type}
          label={label}
          active={shapeMode === type}
          onClick={() => handleClick(type)}
        />
      ))}
    </div>
  );
}

ShapeToolsGroup.propTypes = {
  shapeMode: PropTypes.oneOf(['rect', 'circle', 'line', null]),
  onShapeModeChange: PropTypes.func.isRequired,
};

export default ShapeToolsGroup;
