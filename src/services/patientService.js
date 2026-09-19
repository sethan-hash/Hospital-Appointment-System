import { authService } from './authService';
import { MOCK_VISITS } from '../data/mockVisits';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
let visitsState = [...MOCK_VISITS];

/**
 * Patient Service
 * Coordinates patient demographic and medical profile requests with the backend API.
 */
export const patientService = {
  /**
   * Retrieves the authenticated patient's profile from the backend.
   * @returns {Promise<Object|null>}
   */
  async getProfile() {
    const token = authService.getToken();
    if (!token) {
      return null;
    }

    const response = await fetch(`${API_BASE_URL}/patients/profile`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        return null;
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to fetch patient profile (${response.status})`);
    }

    const payload = await response.json();
    return payload.data?.profile || null;
  },

  /**
   * Updates the authenticated patient's profile details.
   * @param {Object} updates
   * @returns {Promise<Object>}
   */
  async updateProfile(updates) {
    const token = authService.getToken();
    if (!token) {
      throw new Error('Authentication required to update profile.');
    }

    const response = await fetch(`${API_BASE_URL}/patients/profile`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (errorData.errors && Array.isArray(errorData.errors) && errorData.errors.length > 0) {
        throw new Error(errorData.errors.map((e) => e.message).join(' '));
      }
      throw new Error(errorData.message || `Failed to update profile (${response.status})`);
    }

    const payload = await response.json();
    return payload.data?.profile;
  },

  /**
   * Get past visits and medical records (mock for current phase)
   * @returns {Promise<Array>}
   */
  async getPastVisits() {
    return new Promise((resolve) => {
      setTimeout(() => resolve([...visitsState]), 150);
    });
  },
};
