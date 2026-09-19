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

          {(visit.treatmentPlan || visit.treatment) && (
            <div>
              <h4 className="font-label-lg text-label-lg text-on-surface font-semibold mb-1">
                Treatment Plan
              </h4>
              <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                {visit.treatmentPlan || visit.treatment}
              </p>
            </div>
          )}

          {(visit.notes || visit.doctorNotes) && (
            <div>
              <h4 className="font-label-lg text-label-lg text-on-surface font-semibold mb-1">
                Physician Notes &amp; Recommendations
              </h4>
              <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                {visit.notes || visit.doctorNotes}
              </p>
            </div>
          )}

          {visit.vitals && (
            <div>
              <h4 className="font-label-lg text-label-lg text-on-surface font-semibold mb-1">
                Recorded Vitals
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-body-sm text-on-surface-variant">
                {visit.vitals.bloodPressure && (
                  <div className="p-2 bg-surface-container-low rounded border border-outline-variant/20">
                    <span className="block font-medium text-on-surface text-label-sm">Blood Pressure</span>
                    <span>{visit.vitals.bloodPressure}</span>
                  </div>
                )}
                {visit.vitals.heartRateBpm && (
                  <div className="p-2 bg-surface-container-low rounded border border-outline-variant/20">
                    <span className="block font-medium text-on-surface text-label-sm">Heart Rate</span>
                    <span>{visit.vitals.heartRateBpm} bpm</span>
                  </div>
                )}
                {visit.vitals.temperatureCelsius && (
                  <div className="p-2 bg-surface-container-low rounded border border-outline-variant/20">
                    <span className="block font-medium text-on-surface text-label-sm">Temperature</span>
                    <span>{visit.vitals.temperatureCelsius} °C</span>
                  </div>
                )}
                {visit.vitals.spo2Percentage && (
                  <div className="p-2 bg-surface-container-low rounded border border-outline-variant/20">
                    <span className="block font-medium text-on-surface text-label-sm">SpO2</span>
                    <span>{visit.vitals.spo2Percentage}%</span>
                  </div>
                )}
                {visit.vitals.weightKg && (
                  <div className="p-2 bg-surface-container-low rounded border border-outline-variant/20">
                    <span className="block font-medium text-on-surface text-label-sm">Weight</span>
                    <span>{visit.vitals.weightKg} kg</span>
                  </div>
                )}
                {visit.vitals.bmi && (
                  <div className="p-2 bg-surface-container-low rounded border border-outline-variant/20">
                    <span className="block font-medium text-on-surface text-label-sm">BMI</span>
                    <span>{visit.vitals.bmi}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {visit.prescriptions && visit.prescriptions.length > 0 && (
            <div>
              <h4 className="font-label-lg text-label-lg text-on-surface font-semibold mb-1">
                Active Prescriptions
              </h4>
              <ul className="list-disc list-inside text-body-sm text-on-surface-variant space-y-1">
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
