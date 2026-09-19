import { authService } from './authService';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

/**
 * Appointment Service
 * Connects to the real backend appointment API.
 * All mock state has been replaced with authenticated HTTP calls.
 */
export const appointmentService = {
  /**
   * Get all appointments for the authenticated patient.
   * Maps to GET /api/appointments (Phase 4E scope — returns empty array for now).
   * @returns {Promise<Array>}
   */
  async getAppointments() {
    return [];
  },

  /**
   * Get the primary upcoming appointment for the patient dashboard widget.
   * Phase 4E scope: returns null for now.
   * @returns {Promise<Object|null>}
   */
  async getUpcomingAppointment() {
    return null;
  },

  /**
   * Books a new appointment for the authenticated patient.
   * Maps to POST /api/appointments
   *
   * @param {object} appointmentData
   * @param {number|string} appointmentData.doctorId
   * @param {string} [appointmentData.appointmentDate] - "YYYY-MM-DD"
   * @param {string} [appointmentData.date]            - "YYYY-MM-DD" (alias)
   * @param {string} [appointmentData.startTime]       - "HH:MM"
   * @param {string} [appointmentData.time]            - "HH:MM" (alias)
   * @param {string} [appointmentData.reason]
   * @returns {Promise<object>} Created appointment from the backend
   */
  async bookAppointment({ doctorId, appointmentDate, date, startTime, time, reason }) {
    const token = authService.getToken();
    if (!token) {
      throw new Error('You must be logged in to book an appointment.');
    }

    const resolvedDate = appointmentDate || date;
    const resolvedTime = startTime || time;
    const parsedDoctorId = typeof doctorId === 'string' && doctorId.startsWith('doc-')
      ? Number(doctorId.replace('doc-', ''))
      : Number(doctorId);

    const response = await fetch(`${API_BASE_URL}/appointments`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        doctorId: parsedDoctorId,
        appointmentDate: resolvedDate,
        startTime: resolvedTime,
        reason,
      }),
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      const err = new Error(payload.message || `Booking failed (${response.status})`);
      err.statusCode = response.status;
      throw err;
    }

    return payload.data?.appointment || payload;
  },

  /**
   * Reschedule an existing appointment.
   * Out of scope for Phase 4D — placeholder to prevent runtime errors.
   */
  async rescheduleAppointment() {
    throw new Error('Reschedule is not yet supported.');
  },
};
