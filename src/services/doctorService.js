import { MOCK_DOCTORS } from '../data/mockDoctors';

/**
 * Doctor Service
 * Abstracts doctor retrieval and filtering so real API calls can be swapped in seamlessly.
 */
export const doctorService = {
  /**
   * Get all active doctors
   * @returns {Promise<Array>}
   */
  async getAllDoctors() {
    return new Promise((resolve) => {
      setTimeout(() => resolve([...MOCK_DOCTORS]), 150);
    });
  },

  /**
   * Get doctor by identifier
   * @param {string} id 
   * @returns {Promise<Object|null>}
   */
  async getDoctorById(id) {
    return new Promise((resolve) => {
      const doctor = MOCK_DOCTORS.find((d) => d.id === id) || MOCK_DOCTORS[0];
      setTimeout(() => resolve(doctor ? { ...doctor } : null), 100);
    });
  },

  /**
   * Search and filter doctors by query text and specialty
   * @param {string} query 
   * @param {string|null} specialtyId 
   * @returns {Promise<Array>}
   */
  async searchDoctors(query = '', specialtyId = null) {
    return new Promise((resolve) => {
      const lowerQuery = query.toLowerCase().trim();

      const filtered = MOCK_DOCTORS.filter((doc) => {
        const matchesQuery =
          !lowerQuery ||
          doc.name.toLowerCase().includes(lowerQuery) ||
          doc.title.toLowerCase().includes(lowerQuery) ||
          doc.department.toLowerCase().includes(lowerQuery) ||
          doc.location.toLowerCase().includes(lowerQuery);

        const matchesSpecialty =
          !specialtyId || doc.specialtyId === specialtyId;

        return matchesQuery && matchesSpecialty;
      });

      setTimeout(() => resolve(filtered), 150);
    });
  },
};
