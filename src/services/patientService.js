import { authService } from './authService';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

/**
 * Formats a YYYY-MM-DD date string into Indian-friendly display format (e.g. 10 Sep 2026)
 * without triggering JavaScript Date UTC timezone shifts.
 */
function formatVisitDate(dateStr) {
  if (!dateStr) return '';
  const parts = String(dateStr).split('T')[0].split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const mIdx = parseInt(month, 10) - 1;
    if (mIdx >= 0 && mIdx < 12) {
      return `${parseInt(day, 10)} ${months[mIdx]} ${year}`;
    }
  }
  return dateStr;
}

/**
 * Determines category filter type for UI matching.
 */
function determineRecordType(record) {
  const text = `${record.diagnosis || ''} ${record.reasonForVisit || ''} ${record.department || ''}`.toLowerCase();
  if (text.includes('vaccin') || text.includes('immuniz')) return 'vaccine';
  if (text.includes('x-ray') || text.includes('radiolog') || text.includes('scan') || text.includes('mri') || text.includes('ct')) return 'radiology';
  return 'checkup';
}

/**
 * Determines icon name for UI display.
 */
function determineRecordIcon(record) {
  const type = determineRecordType(record);
  if (type === 'vaccine') return 'vaccines';
  if (type === 'radiology') return 'radiology';
  return 'medical_services';
}

/**
 * Adapts API medical record payload for UI components.
 */
function mapRecordForUi(record) {
  return {
    ...record,
    date: formatVisitDate(record.visitDate || record.date),
    rawDate: record.visitDate || record.date,
    title: record.reasonForVisit || record.diagnosis?.split(';')[0] || 'Medical Consultation',
    doctor: record.doctorName || record.doctor || 'Doctor',
    type: determineRecordType(record),
    icon: determineRecordIcon(record),
  };
}

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
   * Retrieves past medical visits and records for the authenticated patient from MySQL.
   * @returns {Promise<Array>}
   */
  async getPastVisits() {
    const token = authService.getToken();
    if (!token) {
      return [];
    }

    const response = await fetch(`${API_BASE_URL}/patients/medical-records`, {
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
      throw new Error(errorData.message || `Failed to fetch medical records (${response.status})`);
    }

    const payload = await response.json();
    const records = payload.data?.records || [];
    return records.map(mapRecordForUi);
  },

  /**
   * Retrieves a single medical record by ID.
   * @param {number|string} id
   * @returns {Promise<Object|null>}
   */
  async getMedicalRecordById(id) {
    const token = authService.getToken();
    if (!token) {
      return null;
    }

    const response = await fetch(`${API_BASE_URL}/patients/medical-records/${id}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404 || response.status === 401 || response.status === 403) {
        return null;
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to fetch medical record (${response.status})`);
    }

    const payload = await response.json();
    const record = payload.data?.record;
    return record ? mapRecordForUi(record) : null;
  },
};

