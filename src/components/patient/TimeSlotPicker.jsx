import React from 'react';

/**
 * Time Slot Grid Selector Component
 */
export function TimeSlotPicker({
  availableSlots = [],
  selectedSlot,
  onSelectSlot,
}) {
  return (
    <div>
      <span className="font-label-lg text-label-lg text-on-surface-variant block mb-4 font-semibold">
        Available Time Slots
      </span>

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {availableSlots.map((slot) => {
          const isSelected = selectedSlot === slot;

          return (
            <button
              key={slot}
              type="button"
              onClick={() => onSelectSlot(slot)}
              className={`
                py-2.5 px-1 rounded-lg font-body-sm text-body-sm transition-all duration-150 text-center select-none min-h-[44px]
                ${
                  isSelected
                    ? 'border border-primary bg-primary-container/20 text-primary font-bold shadow-sm ring-1 ring-primary'
                    : 'border border-outline-variant/30 text-on-surface-variant hover:border-primary hover:text-primary bg-surface-container-lowest'
                }
              `}
            >
              {slot}
            </button>
          );
        })}
      </div>
    </div>
  );
}
