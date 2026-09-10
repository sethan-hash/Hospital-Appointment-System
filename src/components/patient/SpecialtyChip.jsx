import React from 'react';
import { FilterChip } from '../common/FilterChip';

/**
 * Specialty Category Filter Chip
 */
export function SpecialtyChip({ specialty, isSelected, onClick }) {
  return (
    <FilterChip
      label={specialty.name}
      icon={specialty.icon}
      isSelected={isSelected}
      onClick={onClick}
    />
  );
}
