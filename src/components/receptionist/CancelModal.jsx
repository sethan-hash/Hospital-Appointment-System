import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Icon } from '../common/Icon';
import { receptionistService } from '../../services/receptionistService';

export function CancelModal({
  isOpen,
  onClose,
  appointment,
  onSuccess,
}) {
  const [isCancelling, setIsCancelling] = useState(false);
  const [error, setError] = useState(null);

  if (!appointment) return null;

  const handleCancel = async () => {
    setIsCancelling(true);
    setError(null);

    try {
      const updated = await receptionistService.cancelAppointment(appointment.id);
      if (onSuccess) {
        onSuccess(updated);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to cancel appointment.');
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cancel Appointment"
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        {error && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-error-container/20 border border-error/20 text-error">
            <Icon name="error" className="text-lg flex-shrink-0 mt-0.5" />
            <span className="text-body-sm">{error}</span>
          </div>
        )}

        <div className="flex items-center gap-3 p-3 rounded-xl bg-error-container/10 border border-error/20 text-on-surface">
          <div className="w-10 h-10 rounded-full bg-error/15 text-error flex items-center justify-center flex-shrink-0">
            <Icon name="warning" className="text-xl" />
          </div>
          <div>
            <p className="font-semibold text-body-md text-error">
              Are you sure you want to cancel this appointment?
            </p>
            <p className="text-xs text-on-surface-variant">
              This will release the doctor's reserved slot and mark the appointment as cancelled.
            </p>
          </div>
        </div>

        <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/30 space-y-1.5 text-body-sm">
          <p>
            <span className="text-on-surface-variant">Patient:</span>{' '}
            <strong className="text-on-surface">{appointment.patientName}</strong>
          </p>
          <p>
            <span className="text-on-surface-variant">Doctor:</span>{' '}
            <strong className="text-on-surface">{appointment.doctorName}</strong>
          </p>
          <p>
            <span className="text-on-surface-variant">Scheduled for:</span>{' '}
            <span className="text-on-surface font-medium">{appointment.date} at {appointment.time}</span>
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-outline-variant/20">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isCancelling}
          >
            Keep Appointment
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={handleCancel}
            loading={isCancelling}
            iconLeading="cancel"
          >
            Yes, Cancel Appointment
          </Button>
        </div>
      </div>
    </Modal>
  );
}
