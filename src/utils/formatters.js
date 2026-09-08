/**
 * Formatting Utilities
 * Formats strings, telephone numbers, ratings, and currencies.
 */

/**
 * Format raw 10-digit number to (555) 000-0000 format
 * @param {string} value 
 * @returns {string}
 */
export function formatPhoneNumber(value) {
  if (!value) return '';
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}

/**
 * Format number into fixed decimal rating string (e.g. 4.9)
 * @param {number} rating 
 * @returns {string}
 */
export function formatRating(rating) {
  if (typeof rating !== 'number' || isNaN(rating)) return '0.0';
  return rating.toFixed(1);
}
