import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PatientLayout } from '../../layouts/PatientLayout';
import { AppointmentCard } from '../../components/patient/AppointmentCard';
import { StatCard } from '../../components/patient/StatCard';
import { VisitListItem } from '../../components/patient/VisitListItem';
import { RescheduleModal } from '../../components/patient/RescheduleModal';
import { VisitDetailModal } from '../../components/patient/VisitDetailModal';
import { Button } from '../../components/common/Button';
import { usePatientProfile } from '../../hooks/usePatientProfile';
import { useAppointments } from '../../hooks/useAppointments';

export function PatientDashboardPage() {
  const navigate = useNavigate();
  const { profile, pastVisits } = usePatientProfile();
  const { upcomingAppointment, rescheduleAppointment } = useAppointments();

  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState(null);

  return (
    <PatientLayout>
      <div className="space-y-6">
        {/* Greeting Section */}
        <section className="flex items-center gap-4">
          <img
            src={
              profile?.avatar ||
              'https://lh3.googleusercontent.com/aida-public/AB6AXuBwv7YvACnpxvfONcpHV6SwsdxDqAGb3L18VU93o1FllMvHljBvvDVh23T8_jnk4a02dQcZ15lpPvp8smnPFR3I-KXwsl3MVhhwCSeQutdoiKVg0UXDMh8oTAJTIVYU4vC9HfmJg7EEOo0eH7toaARnWiywQx0LV9GFmBvdGDXDaD_P_h7_LqumXJQyxugqXA6pu7WaN7Xe2LtIpHGrE3Pbm-CKLt63RjxivCu8DWKlPgTAsKklqGbE'
            }
            alt="Patient Profile"
            className="w-16 h-16 rounded-full object-cover shadow-sm border border-outline-variant/30 flex-shrink-0"
          />
          <div>
            <h2 className="font-headline-lg-mobile text-headline-lg-mobile md:font-headline-lg md:text-headline-lg text-on-surface font-bold">
              Hello, {profile?.name || 'John Doe'}
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Here is a summary of your care plan.
            </p>
          </div>
        </section>

        {/* Upcoming Appointment Bento Card */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
              Upcoming Appointment
            </h3>
            <Link
              to="/patient/appointments"
              className="text-primary font-label-md text-label-md font-semibold hover:underline"
            >
              View All
            </Link>
          </div>

          {upcomingAppointment ? (
            <AppointmentCard
              appointment={upcomingAppointment}
              onRescheduleClick={() => setIsRescheduleOpen(true)}
            />
          ) : (
            <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/30 text-center">
              <p className="font-body-md text-body-md text-on-surface-variant mb-4">
                You have no scheduled upcoming appointments.
              </p>
              <Button
                variant="primary"
                onClick={() => navigate('/patient/doctors')}
              >
                Find a Doctor
              </Button>
            </div>
          )}
        </section>

        {/* Quick Stats Bento Grid */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon="monitor_weight"
            iconColor="secondary"
            value={profile?.vitals?.weight || '165 lbs'}
            label="Last Recorded"
          />

          <StatCard
            icon="favorite"
            iconColor="error"
            value={profile?.vitals?.bloodPressure || '120/80'}
            label="Blood Pressure"
          />

          <StatCard
            icon="science"
            iconColor="primary"
            value={`${profile?.vitals?.pendingLabResultsCount || 2} pending`}
            label="Lab Results"
          />

          <StatCard
            icon="description"
            iconColor="tertiary"
            value="View All"
            label="Medical Records"
            onClick={() => navigate('/patient/visits')}
          />
        </section>

        {/* Past Visits List */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
              Past Visits
            </h3>
            <Link
              to="/patient/visits"
              className="text-primary font-label-md text-label-md font-semibold hover:underline"
            >
              See All
            </Link>
          </div>

          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 shadow-sm overflow-hidden">
            {pastVisits.slice(0, 3).map((visit, index) => (
              <VisitListItem
                key={visit.id}
                visit={visit}
                onViewSummary={(v) => setSelectedVisit(v)}
                isLast={index === Math.min(pastVisits.length, 3) - 1}
              />
            ))}
          </div>
        </section>
      </div>

      {/* Reschedule Appointment Modal */}
      <RescheduleModal
        isOpen={isRescheduleOpen}
        onClose={() => setIsRescheduleOpen(false)}
        appointment={upcomingAppointment}
        onReschedule={rescheduleAppointment}
      />

      {/* Visit Summary Detail Modal */}
      <VisitDetailModal
        visit={selectedVisit}
        onClose={() => setSelectedVisit(null)}
      />
    </PatientLayout>
  );
}
