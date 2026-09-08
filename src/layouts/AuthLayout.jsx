import React from 'react';

/**
 * Authentication Layout
 * Minimal layout for login, register, and success confirmation.
 */
export function AuthLayout({ children }) {
  return (
    <div className="min-h-screen bg-background text-on-background flex flex-col items-center justify-center p-4 md:p-8 animate-entrance relative overflow-hidden">
      {/* Background radial gradient for subtle depth from Stitch */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-colors-surface-container-high),_transparent_55%)] opacity-50 pointer-events-none" />
      <div className="w-full max-w-md relative z-10">{children}</div>
    </div>
  );
}
