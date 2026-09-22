import { authService } from './authService';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

/**
 * Builds an Authorization header object with the stored Bearer token.
 * Throws if no token is present.
 */
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
    const response = await fetch(`${API_BASE_URL}/admin/dashboard`, {
      method: 'GET',
      headers: authHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to fetch admin dashboard (${response.status})`);
    }

    const payload = await response.json();
    return payload.data;
  },

  /**
   * Lists all platform users with optional filters.
   * Maps to GET /api/admin/users?search=&role=&status=
   *
   * @param {object} [filters]
   * @param {string} [filters.search]
   * @param {string} [filters.role]
   * @param {string} [filters.status]
   * @returns {Promise<{ users: object[], total: number }>}
   */
  async getUsers({ search = '', role = '', status = '' } = {}) {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (role) params.set('role', role);
    if (status) params.set('status', status);

    const qs = params.toString() ? `?${params.toString()}` : '';

    const response = await fetch(`${API_BASE_URL}/admin/users${qs}`, {
      method: 'GET',
      headers: authHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to fetch users (${response.status})`);
    }

    const payload = await response.json();
    return payload.data; // { users, total }
  },

  /**
   * Updates a user's account status.
   * Maps to PATCH /api/admin/users/:id/status
   *
   * @param {number} userId
   * @param {string} newStatus - 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'
   * @returns {Promise<object>}
   */
  async updateUserStatus(userId, newStatus) {
    const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/status`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ status: newStatus }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to update user status (${response.status})`);
    }

    const payload = await response.json();
    return payload.data;
  },
};
