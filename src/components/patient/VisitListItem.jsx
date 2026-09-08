import React from 'react';
import { Button } from '../common/Button';
import { Icon } from '../common/Icon';

/**
 * Past Visit List Item Component
 */
export function VisitListItem({ visit, onViewSummary, isLast = false }) {
  if (!visit) return null;

  return (
    <div
      className={`
        flex flex-col sm:flex-row justify-between items-start sm:items-center p-md hover:bg-surface-container/30 transition-colors
        ${!isLast ? 'border-b border-outline-variant/20' : ''}
      `}
    >
      <div className="flex items-center gap-md mb-3 sm:mb-0">
        {/* Type Icon */}
        <div className="bg-surface-variant text-on-surface rounded-full w-10 h-10 flex items-center justify-center shrink-0">
          <Icon name={visit.icon || 'medical_services'} className="text-xl text-primary" />
        </div>

        {/* Details */}
        <div>
          <h4 className="font-body-lg text-body-lg text-on-surface font-semibold">
            {visit.title}
          </h4>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            {visit.date} • {visit.doctor}
          </p>
        </div>
      </div>

      {/* Summary Action */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => onViewSummary(visit)}
        className="w-full sm:w-auto min-h-[48px] sm:min-h-0 font-medium"
      >
        View Summary
      </Button>
    </div>
  );
}
