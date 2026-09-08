import React from 'react';
import { Icon } from '../common/Icon';

/**
 * Empty State Feedback Component
 */
export function EmptyState({
  icon = 'search_off',
  title = 'No items found',
  description = 'Try adjusting your search criteria or filters.',
  action = null,
}) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-surface-container-lowest rounded-xl border border-outline-variant/30 my-6">
      <div className="w-16 h-16 rounded-full bg-surface-container-low flex items-center justify-center text-outline mb-4">
        <Icon name={icon} className="text-3xl" />
      </div>
      <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold mb-1">
        {title}
      </h3>
      <p className="font-body-sm text-body-sm text-on-surface-variant max-w-sm mb-6">
        {description}
      </p>
      {action}
    </div>
  );
}
