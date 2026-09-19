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
};
