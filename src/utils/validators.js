/**
 * Form Validation Utilities
 * Pure validation helper functions for input fields.
 */

/**
 * Validate email address format
 * @param {string} email 
 * @returns {boolean}
 */
export function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Validate minimum password strength (at least 6 characters)
 * @param {string} password 
 * @returns {boolean}
 */
export function isValidPassword(password) {
  return typeof password === 'string' && password.trim().length >= 6;
}

/**
 * Validate non-empty string
 * @param {string} value 
 * @returns {boolean}
 */
export function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}
