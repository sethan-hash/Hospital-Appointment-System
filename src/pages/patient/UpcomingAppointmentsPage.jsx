import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PatientLayout } from '../../layouts/PatientLayout';
import { AppointmentCard } from '../../components/patient/AppointmentCard';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { EmptyState } from '../../components/feedback/EmptyState';
import { useAppointments } from '../../hooks/useAppointments';

export function UpcomingAppointmentsPage() {
  const navigate = useNavigate();
  const { allAppointments, rescheduleAppointment, loading } = useAppointments();

  const [activeRescheduleApt, setActiveRescheduleApt] = useState(null);
  const [rescheduleData, setRescheduleData] = useState({
    date: '2026-10-30',
    time: '11:00 AM',
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleReschedule = async (e) => {
    e.preventDefault();
    if (!activeRescheduleApt) return;

    setIsSaving(true);
    try {
      await rescheduleAppointment(
        activeRescheduleApt.id,
        rescheduleData.date,
        rescheduleData.time
      );
      setActiveRescheduleApt(null);
    } catch (err) {
      console.error('Failed to reschedule:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <PatientLayout showBack={true} onBack={() => navigate('/patient/dashboard')} title="Appointments">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface font-bold">
              Upcoming Appointments
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Manage and reschedule your scheduled consultations.
            </p>
          </div>

          <Button
            variant="primary"
            size="md"
            iconLeading="add"
            onClick={() => navigate('/patient/doctors')}
          >
            Book New
          </Button>
        </div>

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
      <Modal
        isOpen={!!activeRescheduleApt}
        onClose={() => setActiveRescheduleApt(null)}
        title="Reschedule Appointment"
      >
        {activeRescheduleApt && (
          <form onSubmit={handleReschedule} className="space-y-4">
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Provider:{' '}
              <strong className="text-on-surface">
                {activeRescheduleApt.doctorName}
              </strong>
            </p>

            <Input
              label="Select New Date"
              id="reschedule-date"
              type="date"
              value={rescheduleData.date}
              onChange={(e) =>
                setRescheduleData((prev) => ({ ...prev, date: e.target.value }))
              }
              required
            />

            <Select
              label="Select Time Slot"
              id="reschedule-time"
              options={[
                '09:00 AM',
                '09:30 AM',
                '10:00 AM',
                '10:30 AM',
                '11:00 AM',
                '02:00 PM',
                '03:00 PM',
              ]}
              value={rescheduleData.time}
              onChange={(e) =>
                setRescheduleData((prev) => ({ ...prev, time: e.target.value }))
              }
              required
            />

            <div className="pt-2 flex gap-3 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setActiveRescheduleApt(null)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={isSaving}>
                Confirm Reschedule
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </PatientLayout>
  );
}
