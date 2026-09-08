import React from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';

/**
 * Visit Detail Modal Component
 * Displays comprehensive summary of a past medical visit including consultation details,
 * diagnosis, clinical notes/recommendations, and active prescriptions.
 *
 * @param {Object} props
 * @param {Object|null} props.visit - The visit record to inspect
 * @param {Function} props.onClose - Callback triggered when the modal is closed
 * @param {boolean} [props.isOpen] - Optional visibility override, defaults to Boolean(visit)
 * @param {string} [props.title] - Optional custom title, defaults to visit.title or 'Visit Summary'
 */
export function VisitDetailModal({
  visit,
  onClose,
  isOpen,
  title,
}) {
  const isModalOpen = isOpen !== undefined ? isOpen : Boolean(visit);

  return (
    <Modal
      isOpen={isModalOpen}
      onClose={onClose}
      title={title || visit?.title || 'Visit Summary'}
    >
      {visit && (
        <div className="space-y-4">
          <div className="p-3 bg-surface-container-low rounded-lg border border-outline-variant/20">
            <span className="font-label-md text-label-md text-on-surface-variant">
              Consultation Info
            </span>
            <p className="font-body-md text-body-md text-on-surface font-semibold mt-0.5">
              {visit.date} • {visit.doctor}
            </p>
          </div>

          <div>
            <h4 className="font-label-lg text-label-lg text-on-surface font-semibold mb-1">
              Clinical Diagnosis
            </h4>
            <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
              {visit.diagnosis}
            </p>
          </div>

          <div>
            <h4 className="font-label-lg text-label-lg text-on-surface font-semibold mb-1">
              Physician Notes &amp; Recommendations
            </h4>
            <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
              {visit.notes}
            </p>
          </div>

          {visit.prescriptions && visit.prescriptions.length > 0 && (
            <div>
              <h4 className="font-label-lg text-label-lg text-on-surface font-semibold mb-1">
                Active Prescriptions
              </h4>
              <ul className="list-disc list-inside text-body-sm text-on-surface-variant">
                {visit.prescriptions.map((prescription, index) => (
                  <li key={index}>{prescription}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="pt-2">
            <Button
              variant="primary"
              fullWidth
              onClick={onClose}
            >
              Close Summary
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
