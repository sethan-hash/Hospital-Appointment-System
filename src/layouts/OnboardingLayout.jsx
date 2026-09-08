import React from 'react';
import { TopAppBar } from '../components/navigation/TopAppBar';

/**
 * Onboarding Layout
 * Header with back navigation, centered container for progressive profile completion steps.
 */
export function OnboardingLayout({
  children,
  showBack = true,
  onBack,
  title = 'MedLink Care',
}) {
  return (
    <div className="min-h-screen bg-surface text-on-surface flex flex-col font-body-md antialiased pb-xl">
      <TopAppBar showBack={showBack} onBack={onBack} title={title} showActions={false} />
      <main className="flex-grow flex items-center justify-center p-margin-mobile md:p-xl animate-entrance">
        <div className="w-full max-w-xl">{children}</div>
      </main>
    </div>
  );
}
