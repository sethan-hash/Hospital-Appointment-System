import React from 'react';
import { Icon } from '../common/Icon';

/**
 * Quick Stats Bento Card
 * @param {Object} props
 * @param {string} props.icon - Material symbol name
 * @param {string} props.iconColor - 'secondary' | 'error' | 'primary' | 'tertiary'
 * @param {string} props.value - Stat primary value (e.g. '165 lbs', '120/80')
 * @param {string} props.label - Stat label text
 * @param {Function} [props.onClick] - Optional click handler
 */
export function StatCard({
  icon,
  iconColor = 'primary',
  value,
  label,
  onClick,
}) {
  const colorMap = {
    primary: {
      text: 'text-primary',
      bg: 'bg-primary/10',
    },
    secondary: {
      text: 'text-secondary',
      bg: 'bg-secondary/10',
    },
    error: {
      text: 'text-error',
      bg: 'bg-error/10',
    },
    tertiary: {
      text: 'text-tertiary',
      bg: 'bg-tertiary/10',
    },
  };

  const selectedColor = colorMap[iconColor] || colorMap.primary;

  return (
    <div
      onClick={onClick}
      className={`
        bg-surface-container-low p-md rounded-xl border border-outline-variant/10 flex flex-col justify-center items-start
        ${onClick ? 'cursor-pointer hover:bg-surface-container-high transition-colors active:scale-[0.98]' : ''}
      `}
    >
      <span
        className={`
          material-symbols-outlined text-2xl mb-2 p-2 rounded-lg select-none
          ${selectedColor.text} ${selectedColor.bg}
        `}
        style={{ fontVariationSettings: "'FILL' 1" }}
      >
        {icon}
      </span>
      <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">
        {value}
      </span>
      <span className="font-label-md text-label-md text-on-surface-variant">
        {label}
      </span>
    </div>
  );
}
