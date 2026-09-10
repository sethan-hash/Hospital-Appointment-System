/**
 * Formatting Utilities
 * Formats strings, telephone numbers, ratings, and currencies.
 */

/**
 * Format raw digits to Indian +91 XXXXX XXXXX format.
 * Accepts 10-digit mobile numbers (with or without country code).
 * @param {string} value
 * @returns {string}
 */
export function formatPhoneNumber(value) {
  if (!value) return '';
  const digits = value.replace(/\D/g, '');
  // Strip leading 91 country code if present
  const mobile = digits.startsWith('91') && digits.length === 12 ? digits.slice(2) : digits;
  if (mobile.length <= 5) return `+91 ${mobile}`;
  return `+91 ${mobile.slice(0, 5)} ${mobile.slice(5, 10)}`;
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
