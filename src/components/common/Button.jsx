import React from 'react';
import { Icon } from './Icon';

/**
 * Reusable Button Component
 * Matches Stitch "Clinical Clarity" button specifications:
 * - Minimum height of 52px for primary mobile tap accuracy (or 48px/40px for compact).
 * - Primary, secondary-outline, tonal, and ghost variants.
 */
export function Button({
  children,
  type = 'button',
  variant = 'primary', // 'primary' | 'secondary' | 'outline' | 'ghost' | 'tonal'
  size = 'md', // 'sm' | 'md' | 'lg' | 'icon'
  fullWidth = false,
  rounded = 'lg', // 'lg' | 'full' | 'default'
  iconLeading = null,
  iconTrailing = null,
  disabled = false,
  loading = false,
  className = '',
  onClick,
  ...rest
}) {
  const baseStyles =
    'inline-flex items-center justify-center font-label-lg font-semibold transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100';

  const sizeStyles = {
    sm: 'h-10 px-4 text-label-md min-h-[40px]',
    md: 'h-12 px-6 text-label-lg min-h-[48px] md:min-h-[52px]',
    lg: 'h-14 px-8 text-body-md min-h-[52px]',
    icon: 'w-12 h-12 min-h-[48px] p-2',
  };

  const roundedStyles = {
    default: 'rounded-lg',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    full: 'rounded-full',
  };

  const variantStyles = {
    primary:
      'bg-primary text-on-primary hover:bg-primary/90 shadow-[0px_4px_12px_0px_rgba(15,82,186,0.12)] hover:shadow-[0px_8px_16px_0px_rgba(15,82,186,0.18)]',
    secondary:
      'border border-secondary text-secondary hover:bg-secondary/10 bg-transparent',
    outline:
      'border border-outline-variant text-on-surface hover:bg-surface-variant/40 bg-surface-container-lowest',
    ghost:
      'text-primary hover:bg-primary-container/10 bg-transparent shadow-none',
    tonal:
      'bg-primary-container/10 text-primary hover:bg-primary-container/20 shadow-none',
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`
        ${baseStyles}
        ${sizeStyles[size] || sizeStyles.md}
        ${roundedStyles[rounded] || roundedStyles.lg}
        ${variantStyles[variant] || variantStyles.primary}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      {...rest}
    >
      {loading ? (
        <span className="inline-block animate-spin mr-2">
          <Icon name="progress_activity" />
        </span>
      ) : iconLeading ? (
        <Icon name={iconLeading} className="mr-2 text-xl" />
      ) : null}

      {children}

      {!loading && iconTrailing && (
        <Icon name={iconTrailing} className="ml-2 text-xl" />
      )}
    </button>
  );
}
