import { MOCK_APPOINTMENTS } from '../data/mockAppointments';

// In-memory state for appointments during frontend session
let appointmentsState = [...MOCK_APPOINTMENTS];

/**
 * Appointment Service
 * Handles booking, fetching, and updating appointments.
 */
export const appointmentService = {
  /**
   * Get all patient appointments
   * @returns {Promise<Array>}
   */
  async getAppointments() {
    return new Promise((resolve) => {
      setTimeout(() => resolve([...appointmentsState]), 150);
    });
  },

  /**
   * Get the primary upcoming appointment
   * @returns {Promise<Object|null>}
   */
  async getUpcomingAppointment() {
    return new Promise((resolve) => {
      const upcoming =
        appointmentsState.find((apt) => apt.status === 'Confirmed') ||
        appointmentsState[0] ||
        null;
      setTimeout(() => resolve(upcoming ? { ...upcoming } : null), 100);
    });
  },

  /**
   * Book a new appointment
   * @param {Object} appointmentData 
   * @returns {Promise<Object>}
   */
  async bookAppointment(appointmentData) {
    return new Promise((resolve) => {
      const newAppointment = {
        id: `apt-${Date.now()}`,
        status: 'Confirmed',
        ...appointmentData,
      };
      appointmentsState = [newAppointment, ...appointmentsState];
      setTimeout(() => resolve(newAppointment), 200);
    });
  },

  /**
   * Reschedule an existing appointment
   * @param {string} id 
   * @param {string} newDate 
   * @param {string} newTime 
   * @returns {Promise<Object>}
   */
  async rescheduleAppointment(id, newDate, newTime) {
    return new Promise((resolve, reject) => {
      const index = appointmentsState.findIndex((apt) => apt.id === id);
      if (index === -1) {
        reject(new Error('Appointment not found'));
        return;
      }

      appointmentsState[index] = {
        ...appointmentsState[index],
        date: newDate,
        time: newTime,
        status: 'Confirmed',
      };

      setTimeout(() => resolve(appointmentsState[index]), 150);
    });
  },
};
