import { authService } from './authService';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

/**
 * Admin Service
 * Handles API communication with the /api/admin endpoints.
 */
export const adminService = {
  /**
   * Retrieves Admin Dashboard metrics, recent appointments, and resources.
   * Maps to GET /api/admin/dashboard
   *
   * @returns {Promise<object>}
   */
  async getDashboard() {
    const token = authService.getToken();
    if (!token) {
      throw new Error('Authentication required.');
    }

    const response = await fetch(`${API_BASE_URL}/admin/dashboard`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to fetch admin dashboard (${response.status})`);
    }

    const payload = await response.json();
    return payload.data;
  },
};
