/**
 * Date and Time Utilities
 * Pure functions for formatting, parsing, and generating appointment dates.
 */

const MONTH_NAMES_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const MONTH_NAMES_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAY_NAMES_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Format date string into Indian long-form: "24 October 2026"
 * @param {string|Date} dateInput
 * @returns {string}
 */
export function formatDate(dateInput) {
  if (!dateInput) return '';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return String(dateInput);

  const month = MONTH_NAMES_FULL[date.getMonth()];
  const day = date.getDate();
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

/**
 * Format date into month abbreviation and day object for calendar badge
 * e.g. { month: "Oct", day: "24", year: "2023" }
 * @param {string|Date} dateInput 
 * @returns {{ month: string, day: string, year: string }}
 */
export function getAppointmentDateParts(dateInput) {
  if (!dateInput) return { month: 'Oct', day: '24', year: '2023' };
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) {
    return { month: 'Oct', day: '24', year: '2023' };
  }

  return {
    month: MONTH_NAMES_SHORT[date.getMonth()],
    day: String(date.getDate()).padStart(2, '0'),
    year: String(date.getFullYear()),
  };
}

/**
 * Get next N days starting from a base date for the date picker strip
 * @param {Date} startDate 
 * @param {number} count 
 * @returns {Array<{ date: Date, isoDate: string, dayName: string, dayNumber: number, isAvailable: boolean }>}
 */
export function generateDateStrip(startDate = new Date(), count = 7) {
  const days = [];
  const start = new Date(startDate);

  for (let i = 0; i < count; i++) {
    const current = new Date(start);
    current.setDate(start.getDate() + i);

    const dayOfWeek = current.getDay();
    // Example rule: Sunday (0) is unavailable
    const isAvailable = dayOfWeek !== 0;

    days.push({
      date: current,
      isoDate: current.toISOString().split('T')[0],
      dayName: DAY_NAMES_SHORT[dayOfWeek],
      dayNumber: current.getDate(),
      monthName: MONTH_NAMES_FULL[current.getMonth()],
      year: current.getFullYear(),
      isAvailable,
    });
  }

  return days;
}
