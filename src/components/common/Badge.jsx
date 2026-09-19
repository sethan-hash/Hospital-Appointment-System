import React from 'react';
import { Icon } from './Icon';

/**
 * Status Badge Component
 * @param {Object} props
 * @param {string} [props.variant='default'] - 'confirmed' | 'scheduled' | 'cancelled' | 'pending' | 'completed' | 'in_progress' | 'verified' | 'rating'
 * @param {string} [props.icon] - Optional leading icon
 * @param {string} [props.className]
 */
export function Badge({
  children,
  variant = 'default',
  icon = null,
  className = '',
}) {
  const variantStyles = {
    default: 'bg-surface-container text-on-surface-variant',
    confirmed: 'bg-secondary-fixed text-on-secondary-fixed font-semibold',
    scheduled: 'bg-secondary-fixed text-on-secondary-fixed font-semibold',
    pending: 'bg-[#fff3e0] text-[#e65100] font-semibold',
    completed: 'bg-[#e8f5e9] text-[#2e7d32] font-semibold',
    cancelled: 'bg-error-container/40 text-error font-semibold',
    in_progress: 'bg-[#e8f5e9] text-[#2e7d32] font-semibold',
    verified: 'bg-secondary text-on-secondary font-semibold',
    rating: 'bg-surface-container text-on-surface font-semibold',
  };

  return (
    <span
      className={`
        inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-label-md text-label-md
        ${variantStyles[variant.toLowerCase()] || variantStyles.default}
        ${className}
      `}
    >
      {icon && <Icon name={icon} className="text-[14px]" />}
      {children}
    </span>
  );
}
