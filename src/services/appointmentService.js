import { authService } from './authService';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

/**
 * Appointment Service
 * Connects to the real backend appointment API.
 * All mock state has been replaced with authenticated HTTP calls.
 */
export const appointmentService = {
  /**
   * Get all upcoming scheduled appointments for the authenticated patient.
   * Maps to GET /api/appointments/upcoming
   * @returns {Promise<Array>}
   */
  async getAppointments() {
    const token = authService.getToken();
    if (!token) {
      return [];
    }

    const response = await fetch(`${API_BASE_URL}/appointments/upcoming`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        return [];
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to fetch appointments (${response.status})`);
    }

    const payload = await response.json();
    return payload.data?.appointments || [];
  },

  /**
   * Get the primary upcoming appointment for the patient dashboard widget.
   * Resolves the earliest scheduled appointment from the upcoming list.
   * @returns {Promise<Object|null>}
   */
  async getUpcomingAppointment() {
    const appointments = await this.getAppointments();
    return appointments.length > 0 ? appointments[0] : null;
  },

  /**
   * Books a new appointment for the authenticated patient.
   * Maps to POST /api/appointments
   *
   * @param {object} appointmentData
   * @param {number|string} appointmentData.doctorId
   * @param {string} [appointmentData.appointmentDate] - "YYYY-MM-DD"
   * @param {string} [appointmentData.date]            - "YYYY-MM-DD" (alias)
   * @param {string} [appointmentData.startTime]       - "HH:MM" or "H:MM AM/PM"
   * @param {string} [appointmentData.time]            - "HH:MM" or "H:MM AM/PM" (alias)
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
   * Reschedules an existing scheduled appointment.
   * Maps to PUT /api/appointments/:id/reschedule
   *
   * @param {number|string} id - Appointment ID
   * @param {string} newDate   - "YYYY-MM-DD"
   * @param {string} newTime   - "HH:MM" or "H:MM AM/PM"
   * @returns {Promise<object>} Updated appointment
   */
  async rescheduleAppointment(id, newDate, newTime) {
    const token = authService.getToken();
    if (!token) {
      throw new Error('You must be logged in to reschedule an appointment.');
    }

    const response = await fetch(`${API_BASE_URL}/appointments/${id}/reschedule`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        appointmentDate: newDate,
        startTime: newTime,
      }),
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      const err = new Error(payload.message || `Rescheduling failed (${response.status})`);
      err.statusCode = response.status;
      throw err;
    }

    return payload.data?.appointment || payload;
  },

  /**
   * Cancels an existing scheduled appointment.
   * Maps to PUT /api/appointments/:id/cancel
   *
   * @param {number|string} id - Appointment ID
   * @returns {Promise<object>} Cancelled appointment
   */
  async cancelAppointment(id) {
    const token = authService.getToken();
    if (!token) {
      throw new Error('You must be logged in to cancel an appointment.');
    }

    const response = await fetch(`${API_BASE_URL}/appointments/${id}/cancel`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      const err = new Error(payload.message || `Cancellation failed (${response.status})`);
      err.statusCode = response.status;
      throw err;
    }

    return payload.data?.appointment || payload;
  },
};
