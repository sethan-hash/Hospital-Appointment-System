import React from 'react';

/**
 * Step Progress Indicator for Onboarding Flows
 * @param {Object} props
 * @param {number} props.step - Current step (1-indexed)
 * @param {number} props.totalSteps - Total steps
 * @param {string} props.title - Step title text
 */
export function ProgressBar({ step = 1, totalSteps = 3, title = '' }) {
  const percentage = Math.min(100, Math.round((step / totalSteps) * 100));

  return (
    <div className="w-full mb-6">
      <div className="flex justify-between items-center mb-2">
        <span className="font-label-md text-label-md text-on-surface-variant font-medium">
          Step {step} of {totalSteps}
        </span>
        {title && (
          <span className="font-label-md text-label-md text-primary font-semibold">
            {title}
          </span>
        )}
      </div>
      <div className="w-full bg-surface-variant rounded-full h-2 overflow-hidden">
        <div
          className="bg-primary h-2 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
