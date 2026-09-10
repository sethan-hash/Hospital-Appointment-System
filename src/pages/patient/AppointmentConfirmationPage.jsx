import React from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { PatientLayout } from '../../layouts/PatientLayout';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Icon } from '../../components/common/Icon';
import { formatDate } from '../../utils/dateUtils';

export function AppointmentConfirmationPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const appointment = location.state?.appointment;

  const demoAppointment = {
    doctorName: 'Dr. Priya Nair',
    doctorTitle: 'Senior Cardiologist',
    department: 'Cardiology Dept.',
    date: '2026-10-24',
    time: '10:30 AM',
    location: 'Apollo Heart Institute, Apollo Hospitals, Bengaluru – Room 304',
    status: 'Confirmed',
  };

  const apt = appointment || demoAppointment;

  return (
    <PatientLayout showBack={false} title="Booking Confirmation">
      <div className="flex flex-col items-center max-w-lg mx-auto py-4">
        {/* Animated Success Badge */}
        <div className="relative w-20 h-20 mb-4 flex items-center justify-center">
          <div className="absolute inset-0 bg-secondary-container rounded-full animate-pulse-soft opacity-70" />
          <Icon
            name="check_circle"
            filled={true}
            className="text-5xl text-secondary relative z-10"
          />
        </div>

        <h1 className="font-headline-lg text-headline-lg text-on-surface font-bold text-center mb-1">
          Appointment Confirmed!
        </h1>
        <p className="font-body-md text-body-md text-on-surface-variant text-center mb-6">
          We sent a confirmation email with all details to your inbox.
        </p>

        {/* Appointment Ticket Card */}
        <Card className="w-full p-6 space-y-4 border-2 border-primary/20 shadow-card">
          <div className="flex justify-between items-start border-b border-outline-variant/20 pb-4">
            <div>
              <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider font-semibold">
                Healthcare Provider
              </span>
              <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold mt-0.5">
                {apt.doctorName}
              </h3>
              <p className="font-body-sm text-body-sm text-primary">
                {apt.doctorTitle || apt.department}
              </p>
            </div>
            <Badge variant="confirmed" icon="verified">
              Confirmed
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-4 border-b border-outline-variant/20 pb-4">
            <div>
              <span className="font-label-md text-label-md text-on-surface-variant">
                Date
              </span>
              <p className="font-body-md text-body-md text-on-surface font-semibold flex items-center gap-1 mt-0.5">
                <Icon name="calendar_today" className="text-primary text-base" />
                {formatDate(apt.date)}
              </p>
            </div>

            <div>
              <span className="font-label-md text-label-md text-on-surface-variant">
                Time
              </span>
              <p className="font-body-md text-body-md text-on-surface font-semibold flex items-center gap-1 mt-0.5">
                <Icon name="schedule" className="text-primary text-base" />
                {apt.time}
              </p>
            </div>
          </div>

          <div>
            <span className="font-label-md text-label-md text-on-surface-variant">
              Location
            </span>
            <p className="font-body-md text-body-md text-on-surface flex items-center gap-1 mt-0.5 font-medium">
              <Icon name="location_on" className="text-primary text-base" />
              {apt.location || 'MedCenter Main Campus, Room 304'}
            </p>
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="w-full mt-6 space-y-3">
          <Button
            variant="primary"
            size="lg"
            rounded="xl"
            fullWidth
            onClick={() => navigate('/patient/dashboard')}
          >
            Go to Patient Dashboard
          </Button>

          <Link to="/patient/appointments" className="block">
            <Button variant="outline" size="md" rounded="xl" fullWidth>
              View Upcoming Appointments
            </Button>
          </Link>
        </div>
      </div>
    </PatientLayout>
  );
}
