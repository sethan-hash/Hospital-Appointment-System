import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { Button } from '../common/Button';
import { Icon } from '../common/Icon';
import { receptionistService } from '../../services/receptionistService';
import { generateSlotsForDate } from './slotUtils';

export function BookAppointmentModal({
  isOpen,
  onClose,
  initialPatient = null,
  onSuccess,
}) {
  const todayStr = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }, []);

  // Form State
  const [selectedPatient, setSelectedPatient] = useState(initialPatient);
  const [patientSearch, setPatientSearch] = useState('');
  const [patientResults, setPatientResults] = useState([]);
  const [isSearchingPatient, setIsSearchingPatient] = useState(false);

  const [doctors, setDoctors] = useState([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [appointmentDate, setAppointmentDate] = useState(todayStr);

  const [doctorSchedule, setDoctorSchedule] = useState([]);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState('');

  const [type, setType] = useState('IN_PERSON');
  const [reason, setReason] = useState('');

  const [isBooking, setIsBooking] = useState(false);
  const [error, setError] = useState(null);

  // Sync initial patient if provided
  useEffect(() => {
    if (initialPatient) {
      setSelectedPatient(initialPatient);
    }
  }, [initialPatient]);

  // Load doctors on modal open
  useEffect(() => {
    if (isOpen) {
      setError(null);
      receptionistService
        .getDoctors()
        .then((docList) => {
          setDoctors(docList);
          if (docList.length > 0 && !selectedDoctorId) {
            setSelectedDoctorId(String(docList[0].id));
          }
        })
        .catch((err) => {
          console.error('Failed to load doctors:', err);
          setError('Failed to load doctors list.');
        });
    }
  }, [isOpen]);

  // Search patients
  const handleSearchPatients = useCallback(async (query) => {
    setPatientSearch(query);
    if (!query || query.trim().length < 2) {
      setPatientResults([]);
      return;
    }
    setIsSearchingPatient(true);
    try {
      const results = await receptionistService.searchPatients(query);
      setPatientResults(results);
    } catch (err) {
      console.error('Patient search error:', err);
    } finally {
      setIsSearchingPatient(false);
    }
  }, []);

  // Load doctor availability when doctor changes
  useEffect(() => {
    if (isOpen && selectedDoctorId) {
      setIsLoadingSchedule(true);
      setSelectedSlot('');
      receptionistService
        .getDoctorAvailability(selectedDoctorId)
        .then((schedule) => {
          setDoctorSchedule(schedule);
        })
        .catch((err) => {
          console.error('Failed to load doctor schedule:', err);
          setDoctorSchedule([]);
        })
        .finally(() => {
          setIsLoadingSchedule(false);
        });
    }
  }, [isOpen, selectedDoctorId]);

  // Calculate available slots based on doctor's schedule and chosen date
  const availableSlots = useMemo(() => {
    if (!doctorSchedule || doctorSchedule.length === 0 || !appointmentDate) {
      return [];
    }
    return generateSlotsForDate(doctorSchedule, appointmentDate);
  }, [doctorSchedule, appointmentDate]);

  // Reset selected slot if it's no longer in available slots
  useEffect(() => {
    if (availableSlots.length > 0 && !availableSlots.includes(selectedSlot)) {
      setSelectedSlot(availableSlots[0]);
    } else if (availableSlots.length === 0) {
      setSelectedSlot('');
    }
  }, [availableSlots]);

  const handleClose = () => {
    setSelectedPatient(null);
    setPatientSearch('');
    setPatientResults([]);
    setSelectedSlot('');
    setReason('');
    setError(null);
    onClose();
  };

  const handleBook = async (e) => {
    e.preventDefault();
    if (!selectedPatient) {
      setError('Please select or search for a patient.');
      return;
    }
    if (!selectedDoctorId) {
      setError('Please select a doctor.');
      return;
    }
    if (!appointmentDate) {
      setError('Please select an appointment date.');
      return;
    }
    if (!selectedSlot) {
      setError('Please select an available time slot.');
      return;
    }

    setIsBooking(true);
    setError(null);

    try {
      const appointment = await receptionistService.bookAppointment({
        patientId: selectedPatient.id || selectedPatient.patientId,
        doctorId: Number(selectedDoctorId),
        appointmentDate,
        startTime: selectedSlot,
        type,
        reason: reason.trim() || undefined,
      });

      handleClose();
      if (onSuccess) {
        onSuccess(appointment);
      }
    } catch (err) {
      setError(err.message || 'Failed to book appointment.');
    } finally {
      setIsBooking(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Book Patient Appointment"
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleBook} className="space-y-5">
        {error && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-error-container/20 border border-error/20 text-error">
            <Icon name="error" className="text-lg flex-shrink-0 mt-0.5" />
            <span className="text-body-sm">{error}</span>
          </div>
        )}

        {/* 1. Patient Selection */}
        <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/30 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-label-lg font-semibold text-on-surface">1. Patient</span>
            {selectedPatient && (
              <button
                type="button"
                onClick={() => setSelectedPatient(null)}
                className="text-xs text-primary hover:underline font-medium"
              >
                Change Patient
              </button>
            )}
          </div>

          {selectedPatient ? (
            <div className="flex items-center gap-3 bg-surface-container-lowest p-3 rounded-lg border border-outline-variant/20">
              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                <Icon name="person" className="text-xl" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-on-surface text-body-md truncate">
                  {selectedPatient.fullName}
                </p>
                <p className="text-xs text-on-surface-variant truncate">
                  Phone: {selectedPatient.phone} | Email: {selectedPatient.email}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Input
                id="search-patient-input"
                placeholder="Search patient by name, phone or email…"
                value={patientSearch}
                onChange={(e) => handleSearchPatients(e.target.value)}
                iconLeading="search"
              />

              {isSearchingPatient && (
                <p className="text-xs text-on-surface-variant flex items-center gap-1">
                  <Icon name="progress_activity" className="animate-spin text-sm" />
                  Searching patients…
                </p>
              )}

              {patientResults.length > 0 && (
                <div className="max-h-40 overflow-y-auto bg-surface-container-lowest rounded-lg border border-outline-variant/20 divide-y divide-outline-variant/10 shadow-sm">
                  {patientResults.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => {
                        setSelectedPatient(p);
                        setPatientResults([]);
                        setPatientSearch('');
                      }}
                      className="p-2.5 hover:bg-surface-container transition-colors cursor-pointer flex items-center justify-between"
                    >
                      <div>
                        <p className="font-medium text-body-sm text-on-surface">{p.fullName}</p>
                        <p className="text-xs text-on-surface-variant">{p.phone} • {p.email}</p>
                      </div>
                      <span className="text-xs text-primary font-semibold">Select</span>
                    </div>
                  ))}
                </div>
              )}

              {patientSearch.length >= 2 && !isSearchingPatient && patientResults.length === 0 && (
                <p className="text-xs text-on-surface-variant italic">
                  No matching patients found. Register as walk-in first.
                </p>
              )}
            </div>
          )}
        </div>

        {/* 2. Doctor and Consultation Type */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            id="book-doctor"
            label="Doctor"
            required
            value={selectedDoctorId}
            onChange={(e) => setSelectedDoctorId(e.target.value)}
            options={doctors.map((d) => ({
              value: String(d.id),
              label: `${d.name} (${d.specialization || d.department})`,
            }))}
          />

          <Select
            id="book-type"
            label="Consultation Type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            options={[
              { value: 'IN_PERSON', label: 'In-Person Consultation' },
              { value: 'TELECONSULT', label: 'Teleconsultation' },
            ]}
          />
        </div>

        {/* 3. Date Selection */}
        <Input
          id="book-date"
          label="Appointment Date"
          type="date"
          min={todayStr}
          value={appointmentDate}
          onChange={(e) => {
            setAppointmentDate(e.target.value);
            setSelectedSlot('');
          }}
          required
          iconLeading="calendar_today"
        />

        {/* 4. Time Slots */}
        <div className="space-y-2">
          <label className="font-label-md text-label-md text-on-surface-variant font-medium ml-1">
            Available Time Slot <span className="text-error">*</span>
          </label>

          {isLoadingSchedule ? (
            <div className="p-4 bg-surface-container-low rounded-xl text-center text-xs text-on-surface-variant flex items-center justify-center gap-2">
              <Icon name="progress_activity" className="animate-spin text-sm" />
              Loading doctor schedule…
            </div>
          ) : availableSlots.length > 0 ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1">
              {availableSlots.map((slot) => {
                const isSelected = selectedSlot === slot;
                return (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setSelectedSlot(slot)}
                    className={`
                      py-2 px-3 rounded-lg text-body-sm font-medium text-center transition-all
                      ${
                        isSelected
                          ? 'bg-primary text-on-primary shadow-sm font-semibold'
                          : 'bg-surface-container-low hover:bg-surface-container text-on-surface border border-outline-variant/30'
                      }
                    `}
                  >
                    {slot}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="p-4 bg-surface-container-low rounded-xl text-center text-body-sm text-on-surface-variant border border-outline-variant/20">
              No available slots found for this doctor on {appointmentDate}. Please choose a different date.
            </div>
          )}
        </div>

        {/* 5. Reason for Visit (Optional) */}
        <div>
          <label htmlFor="book-reason" className="font-label-md text-label-md text-on-surface-variant font-medium ml-1 block mb-1">
            Reason for Visit <span className="font-normal text-xs text-on-surface-variant/70">(Optional)</span>
          </label>
          <textarea
            id="book-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            placeholder="e.g. Regular checkup, headache, fever..."
            className="w-full px-3 py-2 text-body-sm bg-surface-container-lowest border border-outline-variant rounded-lg text-on-surface focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary resize-none"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-outline-variant/20">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isBooking}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={isBooking}
            disabled={!selectedPatient || !selectedSlot || isBooking}
            iconLeading="event_available"
          >
            Confirm Booking
          </Button>
        </div>
      </form>
    </Modal>
  );
}
