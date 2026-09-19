import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PatientLayout } from '../../layouts/PatientLayout';
import { AppointmentCard } from '../../components/patient/AppointmentCard';
import { RescheduleModal } from '../../components/patient/RescheduleModal';
import { CancelAppointmentModal } from '../../components/patient/CancelAppointmentModal';
import { Button } from '../../components/common/Button';
import { PageHeader } from '../../components/common/PageHeader';
import { EmptyState } from '../../components/feedback/EmptyState';
import { Icon } from '../../components/common/Icon';
import { useAppointments } from '../../hooks/useAppointments';

export function UpcomingAppointmentsPage() {
  const navigate = useNavigate();
  const {
    allAppointments,
    rescheduleAppointment,
    cancelAppointment,
    loading,
  } = useAppointments();

  const [activeRescheduleApt, setActiveRescheduleApt] = useState(null);
  const [activeCancelApt, setActiveCancelApt] = useState(null);
  const [feedbackMessage, setFeedbackMessage] = useState(null);

  const handleReschedule = async (id, newDate, newTime) => {
    const updated = await rescheduleAppointment(id, newDate, newTime);
    setFeedbackMessage(`Appointment rescheduled successfully to ${updated.date} at ${updated.time}.`);
    setTimeout(() => setFeedbackMessage(null), 6000);
    return updated;
  };

  const handleCancel = async (id) => {
    const cancelled = await cancelAppointment(id);
    setFeedbackMessage('Appointment cancelled successfully. The slot has been released.');
    setTimeout(() => setFeedbackMessage(null), 6000);
    return cancelled;
  };

  return (
    <PatientLayout showBack={true} onBack={() => navigate('/patient/dashboard')} title="Appointments">
      <div className="space-y-6">
        <PageHeader
          title="Upcoming Appointments"
          subtitle="Manage and reschedule your scheduled consultations."
          action={
            <Button
              variant="primary"
              size="md"
              iconLeading="add"
              onClick={() => navigate('/patient/doctors')}
            >
              Book New
            </Button>
          }
        />

        {/* Dynamic Success/Feedback Banner */}
        {feedbackMessage && (
          <div className="flex items-center justify-between p-4 rounded-xl bg-secondary-fixed/20 border border-secondary/30 text-on-surface animate-entrance">
            <div className="flex items-center gap-2">
              <Icon name="check_circle" filled={true} className="text-secondary text-xl" />
              <span className="font-body-md text-body-md font-medium">{feedbackMessage}</span>
            </div>
            <button
              onClick={() => setFeedbackMessage(null)}
              className="text-on-surface-variant hover:text-on-surface p-1"
              aria-label="Dismiss message"
            >
              <Icon name="close" className="text-base" />
            </button>
          </div>
        )}

        {loading ? (
          <div className="p-12 text-center text-primary flex items-center justify-center gap-2">
            <Icon name="progress_activity" className="animate-spin text-2xl" />
            <span>Loading appointments...</span>
          </div>
        ) : allAppointments.length > 0 ? (
          <div className="space-y-4">
            {allAppointments.map((apt) => (
              <AppointmentCard
                key={apt.id}
                appointment={apt}
                onRescheduleClick={() => setActiveRescheduleApt(apt)}
                onCancelClick={() => setActiveCancelApt(apt)}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon="calendar_today"
            title="No upcoming appointments"
            description="You do not have any scheduled appointments right now."
            action={
              <Button
                variant="primary"
                onClick={() => navigate('/patient/doctors')}
              >
                Find a Doctor
              </Button>
            }
          />
        )}
      </div>

      {/* Reschedule Modal */}
      <RescheduleModal
        isOpen={Boolean(activeRescheduleApt)}
        onClose={() => setActiveRescheduleApt(null)}
        appointment={activeRescheduleApt}
        onReschedule={handleReschedule}
      />

      {/* Cancel Confirmation Modal */}
      <CancelAppointmentModal
        isOpen={Boolean(activeCancelApt)}
        onClose={() => setActiveCancelApt(null)}
        appointment={activeCancelApt}
        onConfirmCancel={handleCancel}
      />
    </PatientLayout>
  );
}
