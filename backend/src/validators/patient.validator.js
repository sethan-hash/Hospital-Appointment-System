/**
 * Patient request validators.
 * Validates incoming profile update payloads before passing them to the service layer.
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

/**
 * Validates patient profile update requests.
 */
export function validateProfileUpdate(req, res, next) {
  const {
    name,
    fullName,
    email,
    phone,
    bloodType,
    bloodGroup,
    emergencyContactName,
    emergencyContactPhone,
    emergencyContact,
  } = req.body;

  const errors = [];

  // Name (full_name)
  const patientName = name || fullName;
  if (patientName !== undefined) {
    if (typeof patientName !== 'string' || patientName.trim().length < 2) {
      errors.push({ field: 'name', message: 'Full name must be at least 2 characters long.' });
    }
  }

  // Email
  if (email !== undefined) {
    if (typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
      errors.push({ field: 'email', message: 'Please provide a valid email address.' });
    }
  }

  // Phone
  if (phone !== undefined) {
    if (typeof phone !== 'string' || phone.trim().length < 6) {
      errors.push({ field: 'phone', message: 'Phone number must be at least 6 characters long.' });
    }
  }

  // Blood Group / Blood Type
  const blood = bloodGroup || bloodType;
  if (blood !== undefined && blood !== null && blood !== '') {
    if (!VALID_BLOOD_GROUPS.includes(blood)) {
      errors.push({
        field: 'bloodType',
        message: `Blood type must be one of: ${VALID_BLOOD_GROUPS.join(', ')}.`,
      });
    }
  }

  // Emergency contact fields validation
  const ecName = emergencyContactName !== undefined ? emergencyContactName : emergencyContact?.name;
  if (ecName !== undefined && ecName !== null && ecName !== '') {
    if (typeof ecName !== 'string' || ecName.trim().length < 2) {
      errors.push({ field: 'emergencyContactName', message: 'Emergency contact name must be at least 2 characters long.' });
    }
  }

  const ecPhone = emergencyContactPhone !== undefined ? emergencyContactPhone : emergencyContact?.phone;
  if (ecPhone !== undefined && ecPhone !== null && ecPhone !== '') {
    if (typeof ecPhone !== 'string' || ecPhone.trim().length < 6) {
      errors.push({ field: 'emergencyContactPhone', message: 'Emergency contact phone number must be at least 6 characters long.' });
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed.',
      errors,
    });
  }

  next();
}
