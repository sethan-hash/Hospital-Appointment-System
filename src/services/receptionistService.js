import { authService } from './authService';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

function authHeaders() {
  const token = authService.getToken();
  if (!token) {
    throw new Error('Authentication required.');
  }
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

async function parseError(response, defaultMsg) {
  try {
    const data = await response.json();
    return data.message || defaultMsg;
  } catch {
    return defaultMsg;
  }
}

export const receptionistService = {
  /**
   * Retrieves appointments for a given date, doctor, and/or status.
   */
  async getAppointments({ date = '', doctorId = '', status = '' } = {}) {
    const params = new URLSearchParams();
    if (date) params.set('date', date);
    if (doctorId) params.set('doctorId', doctorId);
    if (status) params.set('status', status);

    const url = `${API_BASE_URL}/receptionist/appointments${params.toString() ? `?${params}` : ''}`;
    const res = await fetch(url, { method: 'GET', headers: authHeaders() });

    if (!res.ok) {
      throw new Error(await parseError(res, 'Failed to fetch appointments.'));
    }

    const payload = await res.json();
    return payload.data?.appointments || [];
  },

  /**
   * Searches registered patients by name, email, or phone.
   */
  async searchPatients(query = '') {
    const params = new URLSearchParams();
    if (query && query.trim()) params.set('search', query.trim());

    const url = `${API_BASE_URL}/receptionist/patients${params.toString() ? `?${params}` : ''}`;
    const res = await fetch(url, { method: 'GET', headers: authHeaders() });

    if (!res.ok) {
      throw new Error(await parseError(res, 'Failed to search patients.'));
    }

    const payload = await res.json();
    return payload.data?.patients || [];
  },

  /**
   * Registers a walk-in patient atomically.
   */
  async registerPatient(patientData) {
    const res = await fetch(`${API_BASE_URL}/receptionist/patients`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(patientData),
    });

    if (!res.ok) {
      throw new Error(await parseError(res, 'Failed to register walk-in patient.'));
    }

    const payload = await res.json();
    return payload.data?.patient;
  },

  /**
   * Books an appointment for an explicit patientId.
   */
  async bookAppointment(appointmentData) {
    const res = await fetch(`${API_BASE_URL}/receptionist/appointments`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(appointmentData),
    });

    if (!res.ok) {
      throw new Error(await parseError(res, 'Failed to book appointment.'));
    }

    const payload = await res.json();
    return payload.data?.appointment;
  },

  /**
   * Reschedules an appointment to a new date/time slot.
   */
  async rescheduleAppointment(appointmentId, { appointmentDate, startTime }) {
    const res = await fetch(`${API_BASE_URL}/receptionist/appointments/${appointmentId}/reschedule`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ appointmentDate, startTime }),
    });

    if (!res.ok) {
      throw new Error(await parseError(res, 'Failed to reschedule appointment.'));
    }

    const payload = await res.json();
    return payload.data?.appointment;
  },

  /**
   * Cancels a scheduled appointment.
   */
  async cancelAppointment(appointmentId) {
    const res = await fetch(`${API_BASE_URL}/receptionist/appointments/${appointmentId}/cancel`, {
      method: 'PUT',
      headers: authHeaders(),
    });

    if (!res.ok) {
      throw new Error(await parseError(res, 'Failed to cancel appointment.'));
    }

    const payload = await res.json();
    return payload.data?.appointment;
  },

  /**
   * Updates appointment lifecycle status (e.g. check-in / COMPLETED).
   */
  async updateStatus(appointmentId, status) {
    const res = await fetch(`${API_BASE_URL}/receptionist/appointments/${appointmentId}/status`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ status }),
    });

    if (!res.ok) {
      throw new Error(await parseError(res, 'Failed to update appointment status.'));
    }

    const payload = await res.json();
    return payload.data?.appointment;
  },

  /**
   * Fetches active doctors list for scheduling.
   */
  async getDoctors() {
    const res = await fetch(`${API_BASE_URL}/doctors`, {
      method: 'GET',
      headers: authHeaders(),
    });

    if (!res.ok) {
      throw new Error(await parseError(res, 'Failed to fetch doctors list.'));
    }

    const payload = await res.json();
    return payload.data?.doctors || [];
  },

  /**
   * Fetches doctor availability schedules.
   */
  async getDoctorAvailability(doctorId) {
    const res = await fetch(`${API_BASE_URL}/doctors/${doctorId}/availability`, {
      method: 'GET',
      headers: authHeaders(),
    });

    if (!res.ok) {
      throw new Error(await parseError(res, 'Failed to fetch doctor availability.'));
    }

    const payload = await res.json();
    return payload.data?.schedule || [];
  },

  /**
   * Updates payment status and method for an invoice at the front desk.
   * Only PAID and PENDING are valid statuses — admin-only transitions are server-blocked.
   * Maps to PATCH /api/receptionist/invoices/:id/payment
   *
   * @param {number} invoiceId
   * @param {object} params
   * @param {string} params.paymentStatus - 'PAID' | 'PENDING'
   * @param {string|null} [params.paymentMethod]
   * @returns {Promise<object>} Updated invoice record
   */
  async updatePayment(invoiceId, { paymentStatus, paymentMethod }) {
    const res = await fetch(`${API_BASE_URL}/receptionist/invoices/${invoiceId}/payment`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ paymentStatus, paymentMethod }),
    });

    if (!res.ok) {
      throw new Error(await parseError(res, 'Failed to update invoice payment.'));
    }

    const payload = await res.json();
    return payload.data?.invoice;
  },
};
