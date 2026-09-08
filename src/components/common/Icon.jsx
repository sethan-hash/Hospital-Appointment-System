import React from 'react';

/**
 * Material Symbol Icon Component
 * @param {Object} props
 * @param {string} props.name - Material symbol name
 * @param {boolean} [props.filled=false] - Whether to fill icon
 * @param {string} [props.className=''] - Additional Tailwind classes
 * @param {string} [props.size] - Custom font size / inline style
 */
export function Icon({ name, filled = false, className = '', style = {}, ...rest }) {
  const fillStyle = filled ? { fontVariationSettings: "'FILL' 1" } : {};

  return (
    <span
      className={`material-symbols-outlined select-none ${className}`}
      style={{ ...fillStyle, ...style }}
      {...rest}
    >
      {name}
    </span>
  );
}
