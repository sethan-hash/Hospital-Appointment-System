import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PatientLayout } from '../../layouts/PatientLayout';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Icon } from '../../components/common/Icon';
import { DatePickerStrip } from '../../components/patient/DatePickerStrip';
import { TimeSlotPicker } from '../../components/patient/TimeSlotPicker';
import { useDoctor } from '../../hooks/useDoctor';
import { useAppointments } from '../../hooks/useAppointments';
import { formatRating } from '../../utils/formatters';

export function BookAppointmentPage() {
  const { doctorId } = useParams();
  const navigate = useNavigate();
  const { bookNewAppointment } = useAppointments();

  const { doctor, loading } = useDoctor(doctorId || 'doc-1');
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [selectedSlot, setSelectedSlot] = useState('10:00 AM');
  const [isBooking, setIsBooking] = useState(false);

  useEffect(() => {
    if (doctor?.availableSlots?.length) {
      setSelectedSlot(doctor.availableSlots[0]);
    }
  }, [doctor]);

  const handleConfirmAppointment = async () => {
    if (!doctor || !selectedDate || !selectedSlot) return;

    setIsBooking(true);
    try {
      const newApt = await bookNewAppointment({
        doctorId: doctor.id,
        doctorName: doctor.name,
        doctorTitle: doctor.title,
        department: doctor.department,
        doctorImage: doctor.image,
        date: selectedDate,
        time: selectedSlot,
        location: `${doctor.clinicName}, Room 304`,
      });

      navigate('/patient/appointments/confirmation', {
        state: { appointment: newApt },
      });
    } catch (err) {
      console.error('Booking failed:', err);
    } finally {
      setIsBooking(false);
    }
  };

  if (loading) {
    return (
      <PatientLayout showBack={true} onBack={() => navigate(-1)} title="Book Appointment">
        <div className="flex items-center justify-center min-h-[50vh]">
          <Icon name="progress_activity" className="animate-spin text-3xl text-primary" />
        </div>
      </PatientLayout>
    );
  }

  if (!doctor) {
    return (
      <PatientLayout showBack={true} onBack={() => navigate('/patient/doctors')} title="Book Appointment">
        <div className="text-center py-12">
          <p>Doctor details could not be loaded.</p>
          <Button variant="primary" onClick={() => navigate('/patient/doctors')} className="mt-4">
            Find Doctors
          </Button>
        </div>
      </PatientLayout>
    );
  }

  return (
    <PatientLayout showBack={true} onBack={() => navigate(-1)} title="Book Appointment">
      <div className="space-y-6 pb-20 md:pb-6">
        {/* Doctor Summary Glass Card */}
        <Card glass={true} className="p-4 md:p-6 flex flex-col md:flex-row gap-4 md:gap-6 relative overflow-hidden">
          {/* Subtle background glow from Stitch */}
          <div className="absolute -right-20 -top-20 w-64 h-64 bg-primary-fixed-dim/30 rounded-full blur-3xl -z-10 pointer-events-none" />

          <div className="flex-shrink-0 flex justify-center md:justify-start">
            <div className="relative">
              <img
                src={doctor.image}
                alt={doctor.name}
                className="w-28 h-28 md:w-36 md:h-36 rounded-xl object-cover shadow-sm border border-outline-variant/30"
              />
              <div className="absolute -bottom-2 -right-2 bg-secondary text-on-secondary px-2.5 py-0.5 rounded-full font-label-md text-label-md flex items-center gap-1 shadow-sm">
                <Icon name="star" filled={true} className="text-[14px]" />
                <span>{formatRating(doctor.rating)}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-center flex-grow space-y-2">
            <div>
              <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                {doctor.name}
              </h2>
              <p className="font-body-md text-body-md text-on-surface-variant flex items-center gap-1 mt-0.5">
                <Icon name="psychology" className="text-primary text-[18px]" />
                {doctor.title}
              </p>
            </div>

            <div className="flex flex-wrap gap-1.5 pt-1">
              <span className="bg-surface-container-high text-on-surface-variant font-label-md text-label-md px-3 py-1 rounded-full">
                {doctor.experience}
              </span>
              <span className="bg-surface-container-high text-on-surface-variant font-label-md text-label-md px-3 py-1 rounded-full">
                {doctor.clinicName}
              </span>
              <span className="bg-surface-container-high text-on-surface-variant font-label-md text-label-md px-3 py-1 rounded-full">
                {doctor.languages?.join(', ')}
              </span>
            </div>

            <p className="font-body-sm text-body-sm text-on-surface-variant mt-2 leading-relaxed">
              {doctor.bio}
            </p>
          </div>
        </Card>

        {/* Date & Time Selection Section */}
        <section className="space-y-4">
          <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
            Select Date &amp; Time
          </h3>

          <Card className="p-4 md:p-6">
            <DatePickerStrip
              selectedDate={selectedDate}
              onSelectDate={(date) => setSelectedDate(date)}
            />

            <TimeSlotPicker
              availableSlots={doctor.availableSlots || []}
              selectedSlot={selectedSlot}
              onSelectSlot={(slot) => setSelectedSlot(slot)}
            />
          </Card>
        </section>

        {/* Patient Review Snippet */}
        {doctor.reviews?.length > 0 && (
          <section className="space-y-3 pt-2">
            <div className="flex justify-between items-center">
              <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                Patient Reviews
              </h3>
              <span className="font-label-md text-label-md text-on-surface-variant">
                Verified Feedback
              </span>
            </div>

            <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/20 shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-tertiary-fixed rounded-full flex items-center justify-center text-on-tertiary-fixed font-headline-sm font-bold text-sm">
                    {doctor.reviews[0].initials}
                  </div>
                  <div>
                    <p className="font-label-lg text-label-lg text-on-surface font-semibold">
                      {doctor.reviews[0].author}
                    </p>
                    <p className="font-label-md text-label-md text-on-surface-variant text-[11px]">
                      {doctor.reviews[0].date}
                    </p>
                  </div>
                </div>

                <div className="flex text-[#F59E0B] text-sm">
                  {[...Array(5)].map((_, i) => (
                    <Icon key={i} name="star" filled={true} className="text-base" />
                  ))}
                </div>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                "{doctor.reviews[0].comment}"
              </p>
            </div>
          </section>
        )}

        {/* Sticky Mobile / Bottom Confirm Action Bar */}
        <div className="fixed md:static bottom-0 left-0 w-full p-margin-mobile md:p-0 bg-white/90 md:bg-transparent backdrop-blur-md md:backdrop-blur-none border-t border-outline-variant/20 md:border-none z-40 md:mt-6">
          <Button
            variant="primary"
            size="lg"
            rounded="xl"
            fullWidth
            loading={isBooking}
            iconTrailing="event_available"
            onClick={handleConfirmAppointment}
            className="py-4 shadow-lg min-h-[52px]"
          >
            Confirm Appointment
          </Button>
        </div>
      </div>
    </PatientLayout>
  );
}
