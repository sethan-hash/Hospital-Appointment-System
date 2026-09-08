import React from 'react';
import { Icon } from '../common/Icon';

/**
 * Specialty Category Filter Chip
 */
export function SpecialtyChip({ specialty, isSelected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        px-4 py-2 rounded-full font-label-lg text-label-lg transition-all duration-150 flex items-center gap-2 select-none shrink-0 active:scale-95
        ${
          isSelected
            ? 'bg-primary text-on-primary shadow-sm font-semibold'
            : 'bg-surface-container-lowest border border-outline-variant text-on-surface hover:bg-surface-container'
        }
      `}
    >
      <Icon name={specialty.icon} className="text-[18px]" />
      <span>{specialty.name}</span>
    </button>
  );
}
