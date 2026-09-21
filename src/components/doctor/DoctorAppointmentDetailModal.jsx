import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Icon } from '../common/Icon';
import { Badge } from '../common/Badge';
import { formatDate } from '../../utils/dateUtils';
import { doctorService } from '../../services/doctorService';
import { DoctorClinicalRecordSection } from './DoctorClinicalRecordSection';

/**
 * Maps appointment status to Badge variant
 */
const STATUS_VARIANT = {
  SCHEDULED: 'scheduled',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  NO_SHOW: 'pending',
};

const STATUS_LABEL = {
  SCHEDULED: 'Scheduled',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  NO_SHOW: 'No Show',
};

/**
 * Doctor Appointment & Patient Details Modal
 * Read/Write modal displaying appointment metadata, patient basic profile,
 * and clinical consultation records, vitals, and prescribed medications.
 *
 * @param {Object} props
 * @param {number|string|null} props.appointmentId - The appointment to fetch & display
 * @param {boolean} props.isOpen - Visibility toggle
 * @param {Function} props.onClose - Close callback
 */
export function DoctorAppointmentDetailModal({ appointmentId, isOpen, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'clinical'

  const fetchDetails = () => {
    if (!appointmentId) return;
    setLoading(true);
    setError(null);

    doctorService
      .getAppointmentDetails(appointmentId)
      .then((result) => {
        setData(result);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load appointment details.');
        setLoading(false);
      });
  };

  const handleClose = () => {
    setData(null);
    setError(null);
    setActiveTab('overview');
    onClose();
  };

  useEffect(() => {
    if (!isOpen || !appointmentId) {
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    doctorService
      .getAppointmentDetails(appointmentId)
      .then((result) => {
        if (isMounted) {
          setData(result);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || 'Failed to load appointment details.');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, appointmentId]);

  const appointment = data?.appointment;
  const patient = data?.patient;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Appointment & Clinical Consultation"
      maxWidth="max-w-2xl"
    >
      {/* ── Loading State ── */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-12 gap-3 text-on-surface-variant">
          <Icon name="progress_activity" className="text-4xl text-primary animate-spin" />
          <p className="font-body-md text-sm">Loading appointment details...</p>
        </div>
      )}

      {/* ── Error / Not Found State ── */}
      {!loading && error && (
        <div className="flex flex-col items-center justify-center py-8 px-4 gap-3 bg-error-container/40 rounded-xl border border-error/20 text-center">
          <Icon name="error_outline" className="text-3xl text-error" />
          <p className="font-body-md text-sm text-on-error-container">{error}</p>
          <div className="flex gap-2 mt-2">
            <Button variant="outline" size="sm" onClick={fetchDetails}>
              Retry
            </Button>
            <Button variant="secondary" size="sm" onClick={handleClose}>
              Close
            </Button>
          </div>
        </div>
      )}

      {/* ── Loaded Content ── */}
      {!loading && !error && data && appointment && patient && (
        <div className="space-y-5">
          {/* Navigation Tabs */}
          <div className="flex rounded-xl bg-surface-container p-1 gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                activeTab === 'overview'
                  ? 'bg-surface-container-lowest text-primary shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <Icon name="person" className="text-base" />
              <span>Appointment &amp; Patient</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('clinical')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                activeTab === 'clinical'
                  ? 'bg-surface-container-lowest text-primary shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <Icon name="medical_services" className="text-base" />
              <span>Clinical Record &amp; Rx</span>
            </button>
          </div>

          {activeTab === 'overview' && (
            <div className="space-y-4">
              {/* 1. Appointment Summary Banner */}
              <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant/30 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Icon
                      name={appointment.type === 'TELECONSULTATION' ? 'videocam' : 'local_hospital'}
                      className="text-primary text-xl"
                    />
                    <span className="font-label-lg font-semibold text-on-surface">
                      {appointment.type === 'TELECONSULTATION' ? 'Teleconsultation' : 'In-Person Consultation'}
                    </span>
                  </div>
                  <Badge variant={STATUS_VARIANT[appointment.status] || 'info'}>
                    {STATUS_LABEL[appointment.status] || appointment.status}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1 border-t border-outline-variant/20 text-xs">
                  <div>
                    <span className="text-on-surface-variant block font-medium">Date & Time</span>
                    <span className="text-on-surface font-semibold text-sm">
                      {formatDate(appointment.date)} • {appointment.time}
                    </span>
                  </div>
                  <div>
                    <span className="text-on-surface-variant block font-medium">Location</span>
                    <span className="text-on-surface font-medium truncate block">
                      {appointment.location || 'Apollo Hospitals Bengaluru'}
                    </span>
                  </div>
                </div>

                {appointment.reason && (
                  <div className="pt-2 border-t border-outline-variant/20">
                    <span className="text-on-surface-variant text-xs block font-medium">Reason for Visit</span>
                    <p className="text-on-surface text-sm mt-0.5">{appointment.reason}</p>
                  </div>
                )}
              </div>

              {/* 2. Patient Profile Card */}
              <div className="p-4 bg-surface-container-lowest rounded-xl border border-outline-variant/30 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-lg shrink-0">
                    {patient.name
                      ? patient.name
                          .split(' ')
                          .slice(0, 2)
                          .map((w) => w[0])
                          .join('')
                      : 'P'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-title-md font-bold text-on-surface truncate">
                        {patient.name}
                      </h4>
                      <span className="text-xs bg-surface-container px-2 py-0.5 rounded text-on-surface-variant font-mono">
                        ID #{patient.id}
                      </span>
                    </div>
                    <p className="text-xs text-on-surface-variant">
                      {patient.gender || 'Not specified'} · Blood Group: {patient.bloodGroup || 'Unknown'}
                    </p>
                  </div>
                </div>

                {/* Demographics & Contact Grid */}
                <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-outline-variant/20">
                  <div>
                    <span className="text-on-surface-variant block font-medium">Phone</span>
                    <span className="text-on-surface font-medium">{patient.phone || '—'}</span>
                  </div>
                  <div>
                    <span className="text-on-surface-variant block font-medium">Email</span>
                    <span className="text-on-surface font-medium truncate block">{patient.email || '—'}</span>
                  </div>
                  <div>
                    <span className="text-on-surface-variant block font-medium">Date of Birth</span>
                    <span className="text-on-surface font-medium">
                      {patient.dateOfBirth ? formatDate(patient.dateOfBirth) : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-on-surface-variant block font-medium">City / State</span>
                    <span className="text-on-surface font-medium">
                      {[patient.city, patient.state].filter(Boolean).join(', ') || '—'}
                    </span>
                  </div>
                </div>

                {/* Address */}
                {patient.address && (
                  <div className="text-xs pt-2 border-t border-outline-variant/20">
                    <span className="text-on-surface-variant block font-medium">Address</span>
                    <p className="text-on-surface mt-0.5">
                      {patient.address}
                      {patient.pincode ? ` - ${patient.pincode}` : ''}
                    </p>
                  </div>
                )}

                {/* Emergency Contact */}
                {(patient.emergencyContactName || patient.emergencyContactPhone) && (
                  <div className="text-xs pt-2 border-t border-outline-variant/20">
                    <span className="text-on-surface-variant block font-medium">Emergency Contact</span>
                    <p className="text-on-surface mt-0.5 font-medium">
                      {patient.emergencyContactName || 'Contact'} ({patient.emergencyContactPhone || '—'})
                    </p>
                  </div>
                )}

                {/* Medical Alerts */}
                {(patient.allergies || patient.chronicConditions) && (
                  <div className="p-3 bg-surface-container-low rounded-lg border border-outline-variant/20 space-y-2 text-xs">
                    <div className="flex items-center gap-1 text-primary font-semibold">
                      <Icon name="medical_information" className="text-sm" />
                      <span>Clinical Alerts (Recorded Health Profile)</span>
                    </div>
                    {patient.allergies && (
                      <div>
                        <span className="text-on-surface-variant font-medium">Allergies: </span>
                        <span className="text-on-surface">{patient.allergies}</span>
                      </div>
                    )}
                    {patient.chronicConditions && (
                      <div>
                        <span className="text-on-surface-variant font-medium">Chronic Conditions: </span>
                        <span className="text-on-surface">{patient.chronicConditions}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="primary"
                  className="flex-1"
                  onClick={() => setActiveTab('clinical')}
                >
                  Manage Clinical Record &amp; Rx →
                </Button>
                <Button variant="outline" onClick={handleClose}>
                  Close
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'clinical' && (
            <div className="space-y-4">
              <DoctorClinicalRecordSection appointmentId={appointment.id} />

              <div className="flex justify-between pt-2 border-t border-outline-variant/20">
                <Button variant="outline" size="sm" onClick={() => setActiveTab('overview')}>
                  ← Back to Patient Overview
                </Button>
                <Button variant="secondary" size="sm" onClick={handleClose}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

