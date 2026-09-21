import React, { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PatientLayout } from '../../layouts/PatientLayout';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Icon } from '../../components/common/Icon';
import { RatingStars } from '../../components/common/RatingStars';
import { DatePickerStrip } from '../../components/patient/DatePickerStrip';
import { TimeSlotPicker } from '../../components/patient/TimeSlotPicker';
import { useDoctor } from '../../hooks/useDoctor';
import { useDoctorAvailability } from '../../hooks/useDoctorAvailability';
import { useDoctorReviews } from '../../hooks/useDoctorReviews';
import { useAppointments } from '../../hooks/useAppointments';
import { formatRating } from '../../utils/formatters';

export function BookAppointmentPage() {
  const { doctorId } = useParams();
  const navigate = useNavigate();
  const { bookNewAppointment } = useAppointments();

  const { doctor, loading } = useDoctor(doctorId || 'doc-1');
  const { schedule } = useDoctorAvailability(doctorId);
  const { reviews, averageRating, reviewCount } = useDoctorReviews(doctorId);

  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [slotOverride, setSlotOverride] = useState(null);
  const [reason, setReason] = useState('');
  const [isBooking, setIsBooking] = useState(false);
  const [bookingError, setBookingError] = useState(null);

  /**
   * Generates slot strings ("H:MM AM/PM") for the selected date's weekday
   * from the real doctor_schedules data returned by useDoctorAvailability.
   * Returns an empty array when the doctor doesn't work on that weekday.
   */
  const availableSlots = useMemo(() => {
    if (!schedule || schedule.length === 0 || !selectedDate) return [];

    const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const [y, m, d] = selectedDate.split('-').map(Number);
    const dayName = DAY_NAMES[new Date(y, m - 1, d).getDay()];
    const dayEntry = schedule.find((s) => s.day === dayName && s.available);
    if (!dayEntry) return [];

    // Parse "H:MM AM/PM - H:MM AM/PM" from the schedule entry
    const parseTime12 = (str) => {
      const [timePart, period] = str.trim().split(' ');
      let [h, min] = timePart.split(':').map(Number);
      if (period === 'PM' && h !== 12) h += 12;
      if (period === 'AM' && h === 12) h = 0;
      return h * 60 + min;
    };
    const [startStr, endStr] = dayEntry.hours.split(' - ');
    const startMins = parseTime12(startStr);
    const endMins   = parseTime12(endStr);
    const step      = dayEntry.slotDurationMinutes || 30;

    const slots = [];
    for (let mins = startMins; mins + step <= endMins; mins += step) {
      const h24 = Math.floor(mins / 60);
      const min = mins % 60;
      const suffix = h24 >= 12 ? 'PM' : 'AM';
      const h12 = h24 % 12 || 12;
      slots.push(`${h12}:${String(min).padStart(2, '0')} ${suffix}`);
    }
    return slots;
  }, [schedule, selectedDate]);

  // Derive active selected slot directly — avoids unnecessary effect renders
  const selectedSlot =
    slotOverride !== null && availableSlots.includes(slotOverride)
      ? slotOverride
      : availableSlots.length > 0
      ? availableSlots[0]
      : null;

  const handleSelectDate = (date) => {
    setSelectedDate(date);
    setSlotOverride(null);
    setBookingError(null);
  };

  const handleSelectSlot = (slot) => {
    setSlotOverride(slot);
    setBookingError(null);
  };

  const handleConfirmAppointment = async () => {
    if (!doctor || !selectedDate || !selectedSlot) return;

    setIsBooking(true);
    setBookingError(null);
    try {
      const newApt = await bookNewAppointment({
        doctorId: doctor.id,
        appointmentDate: selectedDate,
        date: selectedDate,
        startTime: selectedSlot,
        time: selectedSlot,
        reason: reason.trim() || undefined,
        doctorName: doctor.name,
        doctorTitle: doctor.title,
        department: doctor.department,
        doctorImage: doctor.image,
        location: doctor.clinicName ? `${doctor.clinicName}, Apollo Hospitals, Bengaluru – Room 304` : 'Apollo Hospitals, Bengaluru – Room 304',
      });

      navigate('/patient/appointments/confirmation', {
        state: {
          appointment: {
            ...newApt,
            doctorName: newApt.doctorName || doctor.name,
            doctorTitle: newApt.doctorTitle || doctor.title,
            department: newApt.department || doctor.department,
            date: newApt.date || selectedDate,
            time: newApt.time || selectedSlot,
            location: newApt.location || doctor.clinicName || 'Apollo Hospitals, Bengaluru – Room 304',
            status: newApt.status || 'Confirmed',
          },
        },
      });
    } catch (err) {
      console.error('Booking failed:', err);
      setBookingError(err.message || 'Failed to book appointment. Please choose a different time slot.');
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
              {/* Null-safe avatar — DB doctors have no stored photo */}
              <div className="w-28 h-28 md:w-36 md:h-36 rounded-xl overflow-hidden bg-surface-container flex items-center justify-center shadow-sm border border-outline-variant/30">
                {doctor.image ? (
                  <img
                    src={doctor.image}
                    alt={doctor.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="material-symbols-rounded text-[52px] text-on-surface-variant select-none">
                    person
                  </span>
                )}
              </div>
              <div className="absolute -bottom-2 -right-2 bg-secondary text-on-secondary px-2.5 py-0.5 rounded-full font-label-md text-label-md flex items-center gap-1 shadow-sm">
                <Icon name="star" filled={true} className="text-[14px]" />
                <span>{reviewCount > 0 ? formatRating(averageRating) : '—'}</span>
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
              onSelectDate={handleSelectDate}
            />

            {availableSlots.length > 0 ? (
              <TimeSlotPicker
                availableSlots={availableSlots}
                selectedSlot={selectedSlot}
                onSelectSlot={handleSelectSlot}
              />
            ) : (
              <p className="text-body-sm text-on-surface-variant text-center py-4 mt-2">
                {schedule.length === 0
                  ? 'Loading schedule…'
                  : 'Doctor is not available on this day. Please choose another date.'}
              </p>
            )}

            {/* Optional Reason for Visit */}
            <div className="mt-5 pt-4 border-t border-outline-variant/20">
              <label htmlFor="booking-reason" className="font-label-lg text-label-lg text-on-surface-variant block mb-2 font-semibold">
                Reason for Visit <span className="font-normal text-on-surface-variant/70 text-xs">(optional)</span>
              </label>
              <textarea
                id="booking-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Briefly describe your symptoms or reason for visit…"
                maxLength={255}
                rows={2}
                className="w-full px-3 py-2 text-body-sm bg-surface-container-lowest border border-outline-variant/30 rounded-lg text-on-surface focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary resize-none"
              />
            </div>

            {bookingError && (
              <div className="mt-4 flex items-start gap-2 p-3 rounded-lg bg-error-container/20 border border-error/20">
                <Icon name="error" className="text-error text-lg flex-shrink-0 mt-0.5" />
                <p className="text-body-sm text-error">{bookingError}</p>
              </div>
            )}
          </Card>
        </section>

        {/* Patient Review Snippet */}
        {reviews.length > 0 && (
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
                    {reviews[0].initials}
                  </div>
                  <div>
                    <p className="font-label-lg text-label-lg text-on-surface font-semibold">
                      {reviews[0].author}
                    </p>
                    <p className="font-label-md text-label-md text-on-surface-variant text-[11px]">
                      {reviews[0].date}
                    </p>
                  </div>
                </div>

                <RatingStars rating={reviews[0].rating} size="md" />
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                "{reviews[0].comment}"
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
            disabled={!selectedSlot || isBooking}
            className="py-4 shadow-lg min-h-[52px]"
          >
            Confirm Appointment
          </Button>
        </div>
      </div>
    </PatientLayout>
  );
}
