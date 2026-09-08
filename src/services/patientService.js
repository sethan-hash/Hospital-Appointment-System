import { MOCK_PATIENT } from '../data/mockPatient';
import { MOCK_VISITS } from '../data/mockVisits';

let patientState = { ...MOCK_PATIENT };
let visitsState = [...MOCK_VISITS];

/**
 * Patient Service
 * Manages patient demographic, vitals, medical records, and onboarding information.
 */
export const patientService = {
  /**
   * Get active patient profile
   * @returns {Promise<Object>}
   */
  async getProfile() {
    return new Promise((resolve) => {
      setTimeout(() => resolve({ ...patientState }), 100);
    });
  },

  /**
   * Update patient profile information
   * @param {Object} updates 
   * @returns {Promise<Object>}
   */
  async updateProfile(updates) {
    return new Promise((resolve) => {
      patientState = {
        ...patientState,
        ...updates,
      };
      setTimeout(() => resolve({ ...patientState }), 150);
    });
  },

  /**
   * Get past visits and medical records
   * @returns {Promise<Array>}
   */
  async getPastVisits() {
    return new Promise((resolve) => {
      setTimeout(() => resolve([...visitsState]), 150);
    });
  },
};
