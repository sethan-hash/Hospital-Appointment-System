/**
 * Authentication request validators.
 * Ensures all required input fields are validated before reaching the service layer.
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_GENDERS = ['MALE', 'FEMALE', 'OTHER'];
const VALID_BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

/**
 * Validates registration request body.
 */
export function validateRegistration(req, res, next) {
  const {
    fullName,
    email,
    password,
    phone,
    dob,
    dateOfBirth,
    gender,
    bloodType,
    bloodGroup,
    emergencyContact,
    emergencyContactName,
    emergencyContactPhone,
  } = req.body;

  const errors = [];

  // Full Name
  if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 2) {
    errors.push({ field: 'fullName', message: 'Full name is required and must be at least 2 characters.' });
  }

  // Email
  if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
    errors.push({ field: 'email', message: 'A valid email address is required.' });
  }

  // Password
  if (!password || typeof password !== 'string' || password.length < 6) {
    errors.push({ field: 'password', message: 'Password is required and must be at least 6 characters.' });
  }

  // Phone
  const patientPhone = phone || req.body.phoneNumber;
  if (!patientPhone || typeof patientPhone !== 'string' || patientPhone.trim().length < 6) {
    errors.push({ field: 'phone', message: 'Phone number is required.' });
  }

  // Gender
  const selectedGender = (gender || '').toUpperCase();
  if (!selectedGender || !VALID_GENDERS.includes(selectedGender)) {
    errors.push({ field: 'gender', message: `Gender must be one of: ${VALID_GENDERS.join(', ')}.` });
  }

  // Blood Group (optional, but if provided must match)
  const selectedBlood = bloodGroup || bloodType;
  if (selectedBlood && !VALID_BLOOD_GROUPS.includes(selectedBlood)) {
    errors.push({ field: 'bloodGroup', message: `Blood group must be one of: ${VALID_BLOOD_GROUPS.join(', ')}.` });
  }

  // Date of birth (optional format check if present)
  const birthDate = dob || dateOfBirth;
  if (birthDate && isNaN(Date.parse(birthDate))) {
    errors.push({ field: 'dob', message: 'Date of birth must be a valid date (YYYY-MM-DD).' });
  }

  // Emergency Contact
  const ecName = emergencyContact?.name || emergencyContactName;
  const ecPhone = emergencyContact?.phone || emergencyContactPhone;
  if (!ecName || typeof ecName !== 'string' || ecName.trim().length < 2) {
    errors.push({ field: 'emergencyContact.name', message: 'Emergency contact name is required.' });
  }
  if (!ecPhone || typeof ecPhone !== 'string' || ecPhone.trim().length < 6) {
    errors.push({ field: 'emergencyContact.phone', message: 'Emergency contact phone number is required.' });
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

/**
 * Validates login request body.
 */
export function validateLogin(req, res, next) {
  const { email, password } = req.body;
  const errors = [];

  if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
    errors.push({ field: 'email', message: 'Please provide a valid email address.' });
  }

  if (!password || typeof password !== 'string' || password.trim().length === 0) {
    errors.push({ field: 'password', message: 'Password is required.' });
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
