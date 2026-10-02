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

  /**
   * Creates a new doctor account with user + doctor profile atomically.
   * Maps to POST /api/admin/doctors
   *
   * @param {object} doctorData
   * @returns {Promise<object>}
   */
  async createDoctor(doctorData) {
    const response = await fetch(`${API_BASE_URL}/admin/doctors`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(doctorData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const err = new Error(errorData.message || `Failed to create doctor (${response.status})`);
      err.errors = errorData.errors;
      throw err;
    }

    const payload = await response.json();
    return payload.data;
  },

  /**
   * Removes or archives a doctor account depending on clinical history.
   * Maps to DELETE /api/admin/doctors/:id
   *
   * @param {number} doctorId - Doctor user ID or profile ID
   * @returns {Promise<object>}
   */
  async removeDoctor(doctorId) {
    const response = await fetch(`${API_BASE_URL}/admin/doctors/${doctorId}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to remove doctor (${response.status})`);
    }

    const payload = await response.json();
    return payload.data;
  },


  /**
   * Lists hospital invoices with optional search, status, paymentMethod, and date filters.
   * Maps to GET /api/admin/invoices
   *
   * @param {object} [filters]
   * @param {string} [filters.search]
   * @param {string} [filters.status]
   * @param {string} [filters.paymentMethod]
   * @param {string} [filters.dateFrom]
   * @param {string} [filters.dateTo]
   * @returns {Promise<{ invoices: object[], summary: object, total: number }>}
   */
  async getInvoices({ search = '', status = '', paymentMethod = '', dateFrom = '', dateTo = '' } = {}) {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    if (paymentMethod) params.set('paymentMethod', paymentMethod);
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);

    const qs = params.toString() ? `?${params.toString()}` : '';

    const response = await fetch(`${API_BASE_URL}/admin/invoices${qs}`, {
      method: 'GET',
      headers: authHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to fetch invoices (${response.status})`);
    }

    const payload = await response.json();
    return payload.data;
  },

  /**
   * Retrieves single invoice details by ID.
   * Maps to GET /api/admin/invoices/:id
   *
   * @param {number} invoiceId
   * @returns {Promise<object>}
   */
  async getInvoiceById(invoiceId) {
    const response = await fetch(`${API_BASE_URL}/admin/invoices/${invoiceId}`, {
      method: 'GET',
      headers: authHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to fetch invoice (${response.status})`);
    }

    const payload = await response.json();
    return payload.data.invoice;
  },

  /**
   * Updates invoice payment status and optionally payment method.
   * Maps to PATCH /api/admin/invoices/:id/status
   *
   * @param {number} invoiceId
   * @param {object} params
   * @param {string} params.paymentStatus
   * @param {string|null} [params.paymentMethod]
   * @returns {Promise<object>}
   */
  async updateInvoiceStatus(invoiceId, { paymentStatus, paymentMethod }) {
    const response = await fetch(`${API_BASE_URL}/admin/invoices/${invoiceId}/status`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ paymentStatus, paymentMethod }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to update invoice status (${response.status})`);
    }

    const payload = await response.json();
    return payload.data.invoice;
  },

  /**
   * Lists hospital infrastructure resources with optional search, type, and status filters.
   * Maps to GET /api/admin/resources
   *
   * @param {object} [filters]
   * @param {string} [filters.search]
   * @param {string} [filters.type]
   * @param {string} [filters.status]
   * @returns {Promise<{ resources: object[], summary: object, total: number }>}
   */
  async getResources({ search = '', type = '', status = '' } = {}) {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (type) params.set('type', type);
    if (status) params.set('status', status);

    const qs = params.toString() ? `?${params.toString()}` : '';

    const response = await fetch(`${API_BASE_URL}/admin/resources${qs}`, {
      method: 'GET',
      headers: authHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to fetch resources (${response.status})`);
    }

    const payload = await response.json();
    return payload.data;
  },

  /**
   * Updates hospital resource status and optional patient allocation.
   * Maps to PATCH /api/admin/resources/:id/status
   *
   * @param {number} resourceId
   * @param {object} params
   * @param {string} params.status
   * @param {number|null} [params.allocatedPatientId]
   * @returns {Promise<object>}
   */
  async updateResourceStatus(resourceId, { status, allocatedPatientId }) {
    const response = await fetch(`${API_BASE_URL}/admin/resources/${resourceId}/status`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ status, allocatedPatientId }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to update resource status (${response.status})`);
    }

    const payload = await response.json();
    return payload.data.resource;
  },
};
