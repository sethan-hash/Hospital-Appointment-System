import React from 'react';
import { TopAppBar } from '../components/navigation/TopAppBar';
import { BottomNavBar } from '../components/navigation/BottomNavBar';

/**
 * Main Patient Application Layout
 * Features sticky TopAppBar, bottom navigation (mobile), responsive canvas margins.
 */
export function PatientLayout({
  children,
  showBack = false,
  title = 'MedLink Care',
  onBack,
}) {
  return (
    <div className="min-h-screen bg-background text-on-background antialiased flex flex-col pb-[84px] md:pb-12">
      <TopAppBar showBack={showBack} title={title} onBack={onBack} showActions={true} />
      <main className="flex-1 max-w-5xl w-full mx-auto p-margin-mobile md:px-lg md:py-6 animate-entrance">
        {children}
      </main>
      <BottomNavBar />
    </div>
  );
}
