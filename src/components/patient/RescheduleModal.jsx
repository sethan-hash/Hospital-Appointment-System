import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { DEFAULT_RESCHEDULE_TIME_SLOTS } from '../../utils/constants';

/**
 * Reschedule Appointment Modal Component
 * Reusable modal for rescheduling appointments with date input and time slot picker.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal dialog is visible
 * @param {Function} props.onClose - Callback triggered when the modal is closed
 * @param {Object|null} props.appointment - Appointment object to reschedule
 * @param {Function} props.onReschedule - Callback receiving (appointmentId, newDate, newTime)
 * @param {string[]} [props.timeSlots] - Optional list of available time slots
 */
export function RescheduleModal({
  isOpen,
  onClose,
  appointment,
  onReschedule,
  timeSlots = DEFAULT_RESCHEDULE_TIME_SLOTS,
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
          timeSlots={timeSlots}
        />
      ) : null}
    </Modal>
  );
}

function RescheduleForm({
  appointment,
  onClose,
  onReschedule,
  timeSlots,
}) {
  const [date, setDate] = useState(appointment.date || '2026-10-28');
  const [time, setTime] = useState(appointment.time || timeSlots[4] || '11:00 AM');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!appointment || !onReschedule) return;

    setIsSubmitting(true);
    try {
      await onReschedule(appointment.id, date, time);
      onClose();
    } catch (error) {
      console.error('Failed to reschedule appointment:', error);
    } finally {
      setIsSubmitting(false);
    }
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
        value={date}
        onChange={(e) => setDate(e.target.value)}
        required
      />

      <Select
        label="Select Time Slot"
        id="reschedule-time"
        options={timeSlots}
        value={time}
        onChange={(e) => setTime(e.target.value)}
        required
      />

      <div className="pt-2 flex gap-3 justify-end">
        <Button
          type="button"
          variant="outline"
          size="md"
          onClick={onClose}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          size="md"
          loading={isSubmitting}
        >
          Confirm Reschedule
        </Button>
      </div>
    </form>
  );
}
