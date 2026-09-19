import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Icon } from '../common/Icon';

/**
 * Cancel Appointment Confirmation Modal Component
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether modal is visible
 * @param {Function} props.onClose - Close modal callback
 * @param {Object|null} props.appointment - Appointment to be cancelled
 * @param {Function} props.onConfirmCancel - Async callback receiving appointmentId
 */
export function CancelAppointmentModal({
  isOpen,
  onClose,
  appointment,
  onConfirmCancel,
}) {
  const [isCancelling, setIsCancelling] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const handleConfirm = async () => {
    if (!appointment || !onConfirmCancel) return;

    setIsCancelling(true);
    setErrorMessage(null);
    try {
      await onConfirmCancel(appointment.id);
      onClose();
    } catch (err) {
      console.error('Cancellation failed:', err);
      setErrorMessage(err.message || 'Failed to cancel appointment. Please try again.');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleClose = () => {
    if (!isCancelling) {
      setErrorMessage(null);
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Cancel Appointment"
    >
      {appointment && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-error-container/20 border border-error/20">
            <Icon name="warning" className="text-error text-2xl flex-shrink-0" />
            <p className="font-body-sm text-body-sm text-on-surface">
              Are you sure you want to cancel this appointment? This action cannot be undone and your slot will be released.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/30 space-y-2">
            <div>
              <span className="font-label-md text-label-md text-on-surface-variant uppercase">Doctor</span>
              <p className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                {appointment.doctorName}
              </p>
              <p className="font-body-sm text-body-sm text-primary">
                {appointment.doctorTitle || appointment.department}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-outline-variant/20">
              <div>
                <span className="font-label-md text-label-md text-on-surface-variant">Date</span>
                <p className="font-body-md text-body-md text-on-surface font-semibold">{appointment.date}</p>
              </div>
              <div>
                <span className="font-label-md text-label-md text-on-surface-variant">Time</span>
                <p className="font-body-md text-body-md text-on-surface font-semibold">{appointment.time}</p>
              </div>
            </div>
          </div>

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
              onClick={handleClose}
              disabled={isCancelling}
            >
              Keep Appointment
            </Button>
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={handleConfirm}
              loading={isCancelling}
              className="bg-error hover:bg-error/90 text-on-error border-none"
            >
              Yes, Cancel Appointment
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
