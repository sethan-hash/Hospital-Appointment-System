import React from 'react';

/**
 * Reusable Card Component
 * Supports standard bento styling, glassmorphism, and subtle border outlines from Stitch.
 */
export function Card({
  children,
  glass = false,
  hoverable = false,
  className = '',
  onClick,
  ...rest
}) {
  return (
    <div
      onClick={onClick}
      className={`
        rounded-xl overflow-hidden
        ${
          glass
            ? 'glass-panel shadow-card'
            : 'bg-surface-container-lowest border border-outline-variant/30 shadow-card'
        }
        ${hoverable ? 'hover:-translate-y-0.5 hover:shadow-card-hover transition-all duration-200 cursor-pointer' : ''}
        ${className}
      `}
      {...rest}
    >
      {children}
    </div>
  );
}
