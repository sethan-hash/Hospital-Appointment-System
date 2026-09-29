import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { Icon } from '../common/Icon';
import { receptionistService } from '../../services/receptionistService';
import { generateSlotsForDate } from './slotUtils';

export function RescheduleModal({
  isOpen,
  onClose,
  appointment,
  onSuccess,
}) {
  const todayStr = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }, []);

  const [newDate, setNewDate] = useState(todayStr);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [doctorSchedule, setDoctorSchedule] = useState([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && appointment) {
      setNewDate(appointment.date || todayStr);
      setSelectedSlot('');
      setError(null);
      setLoadingSchedule(true);

      receptionistService
        .getDoctorAvailability(appointment.doctorId)
        .then((sched) => {
          setDoctorSchedule(sched);
        })
        .catch((err) => {
          console.error('Failed to load schedule for rescheduling:', err);
          setDoctorSchedule([]);
        })
        .finally(() => {
          setLoadingSchedule(false);
        });
    }
  }, [isOpen, appointment, todayStr]);

  const availableSlots = useMemo(() => {
    if (!doctorSchedule || doctorSchedule.length === 0 || !newDate) {
      return [];
    }
    return generateSlotsForDate(doctorSchedule, newDate);
  }, [doctorSchedule, newDate]);

  useEffect(() => {
    if (availableSlots.length > 0 && !availableSlots.includes(selectedSlot)) {
      setSelectedSlot(availableSlots[0]);
    } else if (availableSlots.length === 0) {
      setSelectedSlot('');
    }
  }, [availableSlots]);

  if (!appointment) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newDate) {
      setError('Please select a new date.');
      return;
    }
    if (!selectedSlot) {
      setError('Please select a time slot.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const updated = await receptionistService.rescheduleAppointment(appointment.id, {
        appointmentDate: newDate,
        startTime: selectedSlot,
      });

      if (onSuccess) {
        onSuccess(updated);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to reschedule appointment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Reschedule Appointment"
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-error-container/20 border border-error/20 text-error">
            <Icon name="error" className="text-lg flex-shrink-0 mt-0.5" />
            <span className="text-body-sm">{error}</span>
          </div>
        )}

        {/* Current appointment info */}
        <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/30 space-y-1">
          <p className="font-semibold text-on-surface text-body-md">
            {appointment.patientName}
          </p>
          <p className="text-xs text-on-surface-variant">
            Doctor: <span className="text-on-surface font-medium">{appointment.doctorName}</span> ({appointment.doctorDepartment || appointment.doctorSpecialization})
          </p>
          <p className="text-xs text-on-surface-variant">
            Current: <span className="font-medium text-primary">{appointment.date} at {appointment.time}</span>
          </p>
        </div>

        <Input
          id="reschedule-date"
          label="New Appointment Date"
          type="date"
          min={todayStr}
          value={newDate}
          onChange={(e) => {
            setNewDate(e.target.value);
            setSelectedSlot('');
          }}
          required
          iconLeading="calendar_today"
        />

        <div className="space-y-2">
          <label className="font-label-md text-label-md text-on-surface-variant font-medium ml-1">
            Select New Time Slot <span className="text-error">*</span>
          </label>

          {loadingSchedule ? (
            <div className="p-4 bg-surface-container-low rounded-xl text-center text-xs text-on-surface-variant flex items-center justify-center gap-2">
              <Icon name="progress_activity" className="animate-spin text-sm" />
              Loading availability…
            </div>
          ) : availableSlots.length > 0 ? (
            <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1">
              {availableSlots.map((slot) => {
                const isSelected = selectedSlot === slot;
                return (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setSelectedSlot(slot)}
                    className={`
                      py-2 px-3 rounded-lg text-body-sm font-medium text-center transition-all
                      ${
                        isSelected
                          ? 'bg-primary text-on-primary shadow-sm font-semibold'
                          : 'bg-surface-container-low hover:bg-surface-container text-on-surface border border-outline-variant/30'
                      }
                    `}
                  >
                    {slot}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="p-4 bg-surface-container-low rounded-xl text-center text-body-sm text-on-surface-variant border border-outline-variant/20">
              No available slots on this day. Please pick another date.
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-outline-variant/20">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={isSubmitting}
            disabled={!selectedSlot || isSubmitting}
            iconLeading="edit_calendar"
          >
            Confirm Reschedule
          </Button>
        </div>
      </form>
    </Modal>
  );
}
