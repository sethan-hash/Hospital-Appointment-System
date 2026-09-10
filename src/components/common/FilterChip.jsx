import React from 'react';
import { Icon } from './Icon';

/**
 * Reusable Filter Chip Component
 * Standardized pill button for category filtering and option selection.
 *
 * @param {Object} props
 * @param {string|React.ReactNode} props.label - Chip display text
 * @param {boolean} [props.isSelected=false] - Whether the chip is currently active
 * @param {Function} props.onClick - Click handler callback
 * @param {string} [props.icon] - Optional Material icon name displayed before the label
 * @param {string} [props.className=''] - Optional additional CSS classes
 */
export function FilterChip({
  label,
  isSelected = false,
  onClick,
  icon,
  className = '',
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        px-4 py-2 rounded-full font-label-lg text-label-lg transition-all duration-150 flex items-center gap-2 select-none shrink-0 active:scale-95
        ${
          isSelected
            ? 'bg-primary text-on-primary font-semibold shadow-sm'
            : 'bg-surface-container-lowest border border-outline-variant text-on-surface hover:bg-surface-container'
        }
        ${className}
      `}
    >
      {icon ? <Icon name={icon} className="text-[18px]" /> : null}
      <span>{label}</span>
    </button>
  );
}
