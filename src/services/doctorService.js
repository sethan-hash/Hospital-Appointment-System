import { authService } from './authService';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

/**
 * Doctor Service
 * Fetches real doctor data from the authenticated backend API.
 * Keeps appointment booking and doctor availability out of scope (Phase 4B).
 */
export const doctorService = {
  /**
   * Searches active doctors with optional name and specialty filters.
   * Maps to GET /api/doctors?search=&specialty=
   *
   * @param {string} [query='']      - Partial name/specialty/department match
   * @param {string|null} [specialtyId=null] - Specialty string to filter by (e.g. 'cardiology')
   * @returns {Promise<object[]>}
   */
  async searchDoctors(query = '', specialtyId = null) {
    const token = authService.getToken();
    if (!token) {
      // Not authenticated — return empty list gracefully without throwing
      return [];
    }

    const params = new URLSearchParams();
    if (query && query.trim()) {
      params.set('search', query.trim());
    }
    if (specialtyId) {
      params.set('specialty', specialtyId);
    }

    const url = `${API_BASE_URL}/doctors${params.toString() ? `?${params}` : ''}`;

    const response = await fetch(url, {
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
      throw new Error(errorData.message || `Failed to fetch doctors (${response.status})`);
    }

    const payload = await response.json();
    return payload.data?.doctors || [];
  },

  /**
   * Retrieves a single doctor's full profile by their database ID.
   * Maps to GET /api/doctors/:id
   *
   * @param {string|number} id
   * @returns {Promise<object|null>}
   */
  async getDoctorById(id) {
    const token = authService.getToken();
    if (!token) {
      return null;
    }

    const response = await fetch(`${API_BASE_URL}/doctors/${id}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) return null;
      if (response.status === 401 || response.status === 403) return null;
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to fetch doctor (${response.status})`);
    }

    const payload = await response.json();
    return payload.data?.doctor || null;
  },

  /**
   * Retrieves the weekly availability schedule for a doctor.
   * Maps to GET /api/doctors/:id/availability
   *
   * @param {string|number} id
   * @returns {Promise<object[]>} Array of { day, hours, available, slotDurationMinutes }
   */
  async getDoctorAvailability(id) {
    const token = authService.getToken();
    if (!token) {
      return [];
    }

    const response = await fetch(`${API_BASE_URL}/doctors/${id}/availability`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) return [];
      if (response.status === 401 || response.status === 403) return [];
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to fetch availability (${response.status})`);
    }

    const payload = await response.json();
    return payload.data?.schedule || [];
  },

  /**
   * Retrieves the authenticated doctor's dashboard data.
   * Doctor identity is derived server-side from the JWT — no doctorId param needed.
   * Maps to GET /api/doctor/dashboard
   *
   * @returns {Promise<object|null>} { doctor, todayAppointments, statistics } or null
   */
  async getDashboard() {
    const token = authService.getToken();
    if (!token) return null;

    const response = await fetch(`${API_BASE_URL}/doctor/dashboard`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403 || response.status === 404) {
        return null;
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to fetch dashboard (${response.status})`);
    }

    const payload = await response.json();
    return payload.data || null;
  },

  /**
   * Retrieves full appointment and patient details for a doctor's appointment.
   * Derives doctor authorization from JWT.
   *
   * @param {number|string} id - Appointment ID
   * @returns {Promise<{ appointment: object, patient: object }>}
   */
  async getAppointmentDetails(id) {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      throw new Error('Authentication required.');
    }

    const response = await fetch(`${API_BASE_URL}/doctor/appointments/${id}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error = new Error(errorData.message || `Failed to fetch appointment details (${response.status})`);
      error.status = response.status;
      throw error;
    }

    const payload = await response.json();
    return payload.data || null;
  },

  /**
   * Retrieves the clinical record, vitals, and medications for an appointment.
   * GET /api/doctor/appointments/:appointmentId/clinical-record
   */
  async getClinicalRecord(appointmentId) {
    const token = localStorage.getItem('auth_token');
    if (!token) throw new Error('Authentication required.');

    const response = await fetch(`${API_BASE_URL}/doctor/appointments/${appointmentId}/clinical-record`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error = new Error(errorData.message || `Failed to fetch clinical record (${response.status})`);
      error.status = response.status;
      throw error;
    }

    const payload = await response.json();
    return payload.data;
  },

  /**
   * Creates or updates the clinical consultation record (diagnosis, treatmentPlan, doctorNotes).
   * PUT /api/doctor/appointments/:appointmentId/clinical-record
   */
  async saveClinicalRecord(appointmentId, data) {
    const token = localStorage.getItem('auth_token');
    if (!token) throw new Error('Authentication required.');

    const response = await fetch(`${API_BASE_URL}/doctor/appointments/${appointmentId}/clinical-record`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error = new Error(errorData.message || `Failed to save clinical record (${response.status})`);
      error.status = response.status;
      throw error;
    }

    const payload = await response.json();
    return payload.data;
  },

  /**
   * Creates or updates physiological vitals for an appointment.
   * PUT /api/doctor/appointments/:appointmentId/vitals
   */
  async saveVitals(appointmentId, data) {
    const token = localStorage.getItem('auth_token');
    if (!token) throw new Error('Authentication required.');

    const response = await fetch(`${API_BASE_URL}/doctor/appointments/${appointmentId}/vitals`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error = new Error(errorData.message || `Failed to save vitals (${response.status})`);
      error.status = response.status;
      throw error;
    }

    const payload = await response.json();
    return payload.data;
  },

  /**
   * Adds a prescribed medication to a clinical record.
   * POST /api/doctor/medical-records/:recordId/medications
   */
  async addMedication(recordId, data) {
    const token = localStorage.getItem('auth_token');
    if (!token) throw new Error('Authentication required.');

    const response = await fetch(`${API_BASE_URL}/doctor/medical-records/${recordId}/medications`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error = new Error(errorData.message || `Failed to add medication (${response.status})`);
      error.status = response.status;
      throw error;
    }

    const payload = await response.json();
    return payload.data;
  },

  /**
   * Updates an existing medication prescription.
   * PUT /api/doctor/medications/:id
   */
  async updateMedication(id, data) {
    const token = localStorage.getItem('auth_token');
    if (!token) throw new Error('Authentication required.');

    const response = await fetch(`${API_BASE_URL}/doctor/medications/${id}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error = new Error(errorData.message || `Failed to update medication (${response.status})`);
      error.status = response.status;
      throw error;
    }

    const payload = await response.json();
    return payload.data;
  },

  /**
   * Deletes a medication prescription.
   * DELETE /api/doctor/medications/:id
   */
  async deleteMedication(id) {
    const token = localStorage.getItem('auth_token');
    if (!token) throw new Error('Authentication required.');

    const response = await fetch(`${API_BASE_URL}/doctor/medications/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error = new Error(errorData.message || `Failed to delete medication (${response.status})`);
      error.status = response.status;
      throw error;
    }

    const payload = await response.json();
    return payload.data;
  },
};


