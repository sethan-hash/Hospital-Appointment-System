import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PatientLayout } from '../../layouts/PatientLayout';
import { AppointmentCard } from '../../components/patient/AppointmentCard';
import { RescheduleModal } from '../../components/patient/RescheduleModal';
import { Button } from '../../components/common/Button';
import { PageHeader } from '../../components/common/PageHeader';
import { EmptyState } from '../../components/feedback/EmptyState';
import { useAppointments } from '../../hooks/useAppointments';

export function UpcomingAppointmentsPage() {
  const navigate = useNavigate();
  const { allAppointments, rescheduleAppointment, loading } = useAppointments();

  const [activeRescheduleApt, setActiveRescheduleApt] = useState(null);

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

        {loading ? (
          <div className="p-12 text-center text-primary">Loading appointments...</div>
        ) : allAppointments.length > 0 ? (
          <div className="space-y-4">
            {allAppointments.map((apt) => (
              <AppointmentCard
                key={apt.id}
                appointment={apt}
                onRescheduleClick={() => setActiveRescheduleApt(apt)}
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
        onReschedule={rescheduleAppointment}
      />
    </PatientLayout>
  );
}
