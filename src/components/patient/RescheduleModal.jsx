import React, { useMemo, useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { Icon } from '../common/Icon';
import { useDoctorAvailability } from '../../hooks/useDoctorAvailability';

/**
 * Reschedule Appointment Modal Component
 * Reusable modal for rescheduling appointments with real doctor schedule validation.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal dialog is visible
 * @param {Function} props.onClose - Callback triggered when the modal is closed
 * @param {Object|null} props.appointment - Appointment object to reschedule
 * @param {Function} props.onReschedule - Callback receiving (appointmentId, newDate, newTime)
 */
export function RescheduleModal({
  isOpen,
  onClose,
  appointment,
  onReschedule,
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Reschedule Appointment"
    >
      {appointment ? (
        <RescheduleForm
          key={appointment.id}
          appointment={appointment}
          onClose={onClose}
          onReschedule={onReschedule}
        />
      ) : null}
    </Modal>
  );
}

function RescheduleForm({
  appointment,
  onClose,
  onReschedule,
}) {
  const { schedule, loading: scheduleLoading } = useDoctorAvailability(appointment?.doctorId);

  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(appointment?.date || today);
  const [slotOverride, setSlotOverride] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  /**
   * Derive valid available slots for the selected date from real doctor schedule.
   */
  const availableSlots = useMemo(() => {
    if (!schedule || schedule.length === 0 || !date) return [];

    const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const [y, m, d] = date.split('-').map(Number);
    const dayName = DAY_NAMES[new Date(y, m - 1, d).getDay()];
    const dayEntry = schedule.find((s) => s.day === dayName && s.available);
    if (!dayEntry) return [];

    const parseTime12 = (str) => {
      const [timePart, period] = str.trim().split(' ');
      let [h, min] = timePart.split(':').map(Number);
      if (period === 'PM' && h !== 12) h += 12;
      if (period === 'AM' && h === 12) h = 0;
      return h * 60 + min;
    };
    const [startStr, endStr] = dayEntry.hours.split(' - ');
    const startMins = parseTime12(startStr);
    const endMins   = parseTime12(endStr);
    const step      = dayEntry.slotDurationMinutes || 30;

    const slots = [];
    for (let mins = startMins; mins + step <= endMins; mins += step) {
      const h24 = Math.floor(mins / 60);
      const min = mins % 60;
      const suffix = h24 >= 12 ? 'PM' : 'AM';
      const h12 = h24 % 12 || 12;
      slots.push(`${h12}:${String(min).padStart(2, '0')} ${suffix}`);
    }
    return slots;
  }, [schedule, date]);

  const activeTime =
    slotOverride !== null && availableSlots.includes(slotOverride)
      ? slotOverride
      : availableSlots.length > 0
      ? availableSlots[0]
      : '';

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!appointment || !onReschedule || !activeTime) return;

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await onReschedule(appointment.id, date, activeTime);
      onClose();
    } catch (error) {
      console.error('Failed to reschedule appointment:', error);
      setErrorMessage(error.message || 'Failed to reschedule appointment. Please choose another slot.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDateChange = (e) => {
    setDate(e.target.value);
    setSlotOverride(null);
    setErrorMessage(null);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="font-body-sm text-body-sm text-on-surface-variant">
        Rescheduling with{' '}
        <strong className="text-on-surface">
          {appointment?.doctorName}
        </strong>
      </p>

      <Input
        label="Select New Date"
        id="reschedule-date"
        type="date"
        min={today}
        value={date}
        onChange={handleDateChange}
        required
      />

      {scheduleLoading ? (
        <p className="text-body-sm text-on-surface-variant py-2">Loading doctor schedule…</p>
      ) : availableSlots.length > 0 ? (
        <Select
          label="Select Time Slot"
          id="reschedule-time"
          options={availableSlots}
          value={activeTime}
          onChange={(e) => {
            setSlotOverride(e.target.value);
            setErrorMessage(null);
          }}
          required
        />
      ) : (
        <p className="text-body-sm text-error bg-error-container/20 border border-error/20 p-2.5 rounded-lg">
          {schedule.length === 0
            ? 'No schedule found for this doctor.'
            : 'Doctor is not available on this day. Please choose another date.'}
        </p>
      )}

      {errorMessage && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-error-container/20 border border-error/20">
          <Icon name="error" className="text-error text-lg flex-shrink-0 mt-0.5" />
          <p className="text-body-sm text-error">{errorMessage}</p>
        </div>
      )}

      <div className="pt-2 flex gap-3 justify-end">
        <Button
          type="button"
          variant="outline"
          size="md"
          onClick={onClose}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          size="md"
          loading={isSubmitting}
          disabled={availableSlots.length === 0 || isSubmitting}
        >
          Confirm Reschedule
        </Button>
      </div>
    </form>
  );
}
