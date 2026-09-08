import React from 'react';
import { generateDateStrip } from '../../utils/dateUtils';
import { Icon } from '../common/Icon';

/**
 * Horizontal Date Picker Strip Component
 * Directly replicates Stitch: Month header with chevrons, horizontal day cards, active teal dot, disabled styling.
 */
export function DatePickerStrip({ selectedDate, onSelectDate }) {
  const days = generateDateStrip(new Date(), 7);
  const currentMonth = days[0]?.monthName || 'October';
  const currentYear = days[0]?.year || '2026';

  return (
    <div className="mb-lg">
      <div className="flex justify-between items-center mb-4">
        <span className="font-label-lg text-label-lg text-on-surface-variant font-semibold">
          {currentMonth} {currentYear}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            className="p-1 rounded-full hover:bg-surface-container text-on-surface-variant transition-colors"
            aria-label="Previous month"
          >
            <Icon name="chevron_left" />
          </button>
          <button
            type="button"
            className="p-1 rounded-full hover:bg-surface-container text-on-surface-variant transition-colors"
            aria-label="Next month"
          >
            <Icon name="chevron_right" />
          </button>
        </div>
      </div>

      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 snap-x">
        {days.map((day) => {
          const isSelected = selectedDate === day.isoDate;
          const isAvailable = day.isAvailable;

          if (!isAvailable) {
            return (
              <button
                key={day.isoDate}
                type="button"
                disabled
                className="snap-start flex-shrink-0 w-16 h-20 rounded-lg flex flex-col items-center justify-center border border-outline-variant/30 text-outline cursor-not-allowed opacity-50 select-none bg-surface-container-lowest"
              >
                <span className="font-label-md text-label-md">{day.dayName}</span>
                <span className="font-headline-sm text-headline-sm mt-1">{day.dayNumber}</span>
              </button>
            );
          }

          return (
            <button
              key={day.isoDate}
              type="button"
              onClick={() => onSelectDate(day.isoDate)}
              className={`
                snap-start flex-shrink-0 w-16 h-20 rounded-lg flex flex-col items-center justify-center transition-all duration-150 relative select-none
                ${
                  isSelected
                    ? 'border border-primary bg-primary text-on-primary shadow-md'
                    : 'border border-outline-variant/30 text-on-surface-variant hover:bg-surface-container bg-surface-container-lowest'
                }
              `}
            >
              <span className="font-label-md text-label-md">{day.dayName}</span>
              <span className="font-headline-sm text-headline-sm mt-1 font-bold">
                {day.dayNumber}
              </span>
              {isSelected && (
                <div className="absolute -bottom-1 w-1.5 h-1.5 bg-secondary-fixed rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
