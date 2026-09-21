import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Icon } from '../common/Icon';
import { doctorService } from '../../services/doctorService';

const DAYS_OF_WEEK = [
  { key: 'MONDAY', label: 'Monday' },
  { key: 'TUESDAY', label: 'Tuesday' },
  { key: 'WEDNESDAY', label: 'Wednesday' },
  { key: 'THURSDAY', label: 'Thursday' },
  { key: 'FRIDAY', label: 'Friday' },
  { key: 'SATURDAY', label: 'Saturday' },
  { key: 'SUNDAY', label: 'Sunday' },
];

const SLOT_DURATIONS = [15, 20, 30, 45, 60];

/**
 * Doctor Weekly Schedule & Office Hours Modal
 * Enables doctors to configure recurring availability, consultation windows,
 * and slot intervals across the standard Monday-Sunday working cycle.
 */
export function DoctorScheduleModal({ isOpen, onClose, onScheduleUpdated }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [scheduleData, setScheduleData] = useState(
    DAYS_OF_WEEK.map((d) => ({
      dayOfWeek: d.key,
      day: d.label,
      isActive: false,
      startTime: '09:00',
      endTime: '17:00',
      slotDurationMinutes: 30,
    }))
  );

  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setSuccess(null);
      return;
    }

    let isMounted = true;
    async function loadSchedule() {
      setLoading(true);
      setError(null);
      try {
        const rows = await doctorService.getSchedule();
        if (isMounted && Array.isArray(rows) && rows.length > 0) {
          const rowMap = new Map(rows.map((r) => [r.dayOfWeek.toUpperCase(), r]));
          setScheduleData(
            DAYS_OF_WEEK.map((d) => {
              const existing = rowMap.get(d.key);
              if (existing) {
                return {
                  dayOfWeek: d.key,
                  day: d.label,
                  isActive: Boolean(existing.isActive),
                  startTime: (existing.startTime || '09:00').slice(0, 5),
                  endTime: (existing.endTime || '17:00').slice(0, 5),
                  slotDurationMinutes: existing.slotDurationMinutes || 30,
                };
              }
              return {
                dayOfWeek: d.key,
                day: d.label,
                isActive: false,
                startTime: '09:00',
                endTime: '17:00',
                slotDurationMinutes: 30,
              };
            })
          );
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Failed to load weekly schedule.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadSchedule();
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  const handleToggleDay = (dayKey) => {
    setScheduleData((prev) =>
      prev.map((item) =>
        item.dayOfWeek === dayKey ? { ...item, isActive: !item.isActive } : item
      )
    );
  };

  const handleFieldChange = (dayKey, field, value) => {
    setScheduleData((prev) =>
      prev.map((item) =>
        item.dayOfWeek === dayKey ? { ...item, [field]: value } : item
      )
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    // Client-side validation
    for (const item of scheduleData) {
      if (item.isActive) {
        if (!item.startTime || !item.endTime) {
          setError(`Please provide both start and end times for ${item.day}.`);
          setSaving(false);
          return;
        }

        const [sh, sm] = item.startTime.split(':').map((n) => parseInt(n, 10));
        const [eh, em] = item.endTime.split(':').map((n) => parseInt(n, 10));
        const startMins = sh * 60 + sm;
        const endMins = eh * 60 + em;

        if (startMins >= endMins) {
          setError(`Start time must be earlier than end time on ${item.day}.`);
          setSaving(false);
          return;
        }

        const windowMins = endMins - startMins;
        if (item.slotDurationMinutes > windowMins) {
          setError(`Slot duration cannot exceed working window (${windowMins} mins) on ${item.day}.`);
          setSaving(false);
          return;
        }
      }
    }

    try {
      const updated = await doctorService.updateSchedule(scheduleData);
      setSuccess('Weekly schedule and office hours updated successfully!');
      if (onScheduleUpdated) {
        onScheduleUpdated(updated);
      }
      setTimeout(() => {
        setSuccess(null);
      }, 3500);
    } catch (err) {
      setError(err.message || 'Failed to update schedule. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Manage Office Hours & Schedule"
      maxWidth="max-w-3xl"
    >
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3 text-primary">
          <Icon name="progress_activity" className="animate-spin text-3xl" />
          <p className="text-sm font-medium text-on-surface-variant">Loading schedule...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Notification Banners */}
          {error && (
            <div className="p-3.5 rounded-xl bg-error-container/40 border border-error/20 flex items-center gap-3 text-on-error-container text-sm">
              <Icon name="error" className="text-error text-xl shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3.5 rounded-xl bg-secondary-container/40 border border-secondary/30 flex items-center gap-3 text-secondary text-sm">
              <Icon name="check_circle" className="text-secondary text-xl shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <p className="text-xs text-on-surface-variant">
            Configure your recurring weekly availability. Patient booking slots and search listings will align strictly with these active working hours.
          </p>

          {/* Schedule Days List */}
          <div className="space-y-3">
            {scheduleData.map((item) => (
              <div
                key={item.dayOfWeek}
                className={`p-3.5 rounded-xl border transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                  item.isActive
                    ? 'bg-surface-container-low border-primary/20'
                    : 'bg-surface border-outline-variant/20 opacity-70'
                }`}
              >
                {/* Day Name & Toggle */}
                <div className="flex items-center gap-3 min-w-[140px]">
                  <input
                    type="checkbox"
                    id={`toggle-${item.dayOfWeek}`}
                    checked={item.isActive}
                    onChange={() => handleToggleDay(item.dayOfWeek)}
                    className="w-4 h-4 text-primary rounded border-outline focus:ring-primary"
                  />
                  <label
                    htmlFor={`toggle-${item.dayOfWeek}`}
                    className="font-label-lg font-semibold text-on-surface cursor-pointer select-none"
                  >
                    {item.day}
                  </label>
                </div>

                {/* Day Configuration Controls */}
                {item.isActive ? (
                  <div className="flex flex-wrap items-center gap-3 flex-1 md:justify-end">
                    {/* Start Time */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-on-surface-variant font-medium">From:</span>
                      <input
                        type="time"
                        value={item.startTime}
                        onChange={(e) => handleFieldChange(item.dayOfWeek, 'startTime', e.target.value)}
                        required
                        className="px-2.5 py-1.5 rounded-lg border border-outline-variant bg-surface-container-lowest text-xs font-semibold text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                      />
                    </div>

                    {/* End Time */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-on-surface-variant font-medium">To:</span>
                      <input
                        type="time"
                        value={item.endTime}
                        onChange={(e) => handleFieldChange(item.dayOfWeek, 'endTime', e.target.value)}
                        required
                        className="px-2.5 py-1.5 rounded-lg border border-outline-variant bg-surface-container-lowest text-xs font-semibold text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                      />
                    </div>

                    {/* Slot Duration */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-on-surface-variant font-medium">Slot:</span>
                      <select
                        value={item.slotDurationMinutes}
                        onChange={(e) =>
                          handleFieldChange(
                            item.dayOfWeek,
                            'slotDurationMinutes',
                            parseInt(e.target.value, 10)
                          )
                        }
                        className="px-2.5 py-1.5 rounded-lg border border-outline-variant bg-surface-container-lowest text-xs font-medium text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                      >
                        {SLOT_DURATIONS.map((dur) => (
                          <option key={dur} value={dur}>
                            {dur} mins
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-on-surface-variant italic md:text-right flex-1">
                    Unavailable / Day Off
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-outline-variant/20">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={saving}
              iconLeading={saving ? 'progress_activity' : 'save'}
            >
              {saving ? 'Saving...' : 'Save Schedule'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
