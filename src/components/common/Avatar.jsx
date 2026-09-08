import React from 'react';

/**
 * Avatar Component with Image & Initial fallback
 */
export function Avatar({
  src,
  alt = 'User Avatar',
  name = '',
  size = 'md', // 'sm' | 'md' | 'lg' | 'xl'
  className = '',
  onClick,
}) {
  const sizeStyles = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-16 h-16 text-lg',
    xl: 'w-24 h-24 text-2xl',
  };

  const getInitials = (str) => {
    if (!str) return 'U';
    const parts = str.trim().split(' ');
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <div
      onClick={onClick}
      className={`
        relative rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center
        bg-primary-container text-on-primary font-bold select-none
        border border-outline-variant/30 shadow-sm
        ${sizeStyles[size] || sizeStyles.md}
        ${onClick ? 'cursor-pointer hover:opacity-90 active:scale-95 transition-all' : ''}
        ${className}
      `}
    >
      {src ? (
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      ) : (
        <span>{getInitials(name)}</span>
      )}
    </div>
  );
}
