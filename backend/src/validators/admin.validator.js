/**
 * Admin Request Validators
 * Validates request payloads for administrative actions such as doctor creation.
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validates doctor creation request body.
 * Ensures all schema-mandated fields for users and doctors tables are properly structured.
 */
export function validateCreateDoctor(req, res, next) {
  const {
    fullName,
    name,
    email,
    phone,
    phoneNumber,
    password,
    specialization,
    specialty,
    department,
    qualification,
    qualifications,
    experienceYears,
    experience,
    consultationFee,
    hospitalName,
    bio,
  } = req.body;

  const errors = [];

  // 1. Full Name / Name
  const docName = fullName || name;
  if (!docName || typeof docName !== 'string' || docName.trim().length < 2) {
    errors.push({ field: 'fullName', message: 'Doctor full name is required (minimum 2 characters).' });
  } else if (docName.trim().length > 100) {
    errors.push({ field: 'fullName', message: 'Doctor full name must not exceed 100 characters.' });
  }

  // 2. Email
  if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
    errors.push({ field: 'email', message: 'A valid email address is required.' });
  } else if (email.trim().length > 150) {
    errors.push({ field: 'email', message: 'Email address must not exceed 150 characters.' });
  }

  // 3. Phone
  const docPhone = phone || phoneNumber;
  if (!docPhone || typeof docPhone !== 'string' || docPhone.trim().length < 6) {
    errors.push({ field: 'phone', message: 'A valid phone number is required (minimum 6 digits).' });
  } else if (docPhone.trim().length > 20) {
    errors.push({ field: 'phone', message: 'Phone number must not exceed 20 characters.' });
  }

  // 4. Password (optional initial password; if provided must be >= 6 chars)
  if (password !== undefined && password !== null && password !== '') {
    if (typeof password !== 'string' || password.length < 6) {
      errors.push({ field: 'password', message: 'Initial password must be at least 6 characters.' });
    }
  }

  // 5. Specialization
  const docSpec = specialization || specialty;
  if (!docSpec || typeof docSpec !== 'string' || docSpec.trim().length < 2) {
    errors.push({ field: 'specialization', message: 'Specialization is required.' });
  } else if (docSpec.trim().length > 100) {
    errors.push({ field: 'specialization', message: 'Specialization must not exceed 100 characters.' });
  }

  // 6. Qualification
  const docQual = qualification || qualifications;
  if (!docQual || typeof docQual !== 'string' || docQual.trim().length < 2) {
    errors.push({ field: 'qualification', message: 'Qualification is required (e.g. MBBS, MD).' });
  } else if (docQual.trim().length > 150) {
    errors.push({ field: 'qualification', message: 'Qualification must not exceed 150 characters.' });
  }

  // 7. Department (optional - defaults to specialization if not given)
  if (department && (typeof department !== 'string' || department.trim().length > 100)) {
    errors.push({ field: 'department', message: 'Department must not exceed 100 characters.' });
  }

  // 8. Experience Years
  const expVal = experienceYears !== undefined ? experienceYears : experience;
  if (expVal !== undefined && expVal !== null && expVal !== '') {
    const numExp = Number(expVal);
    if (!Number.isInteger(numExp) || numExp < 0 || numExp > 70) {
      errors.push({ field: 'experienceYears', message: 'Experience must be an integer between 0 and 70 years.' });
    }
  }

  // 9. Consultation Fee
  if (consultationFee !== undefined && consultationFee !== null && consultationFee !== '') {
    const numFee = Number(consultationFee);
    if (isNaN(numFee) || numFee < 0) {
      errors.push({ field: 'consultationFee', message: 'Consultation fee must be a non-negative number.' });
    }
  }

  // 10. Hospital Name
  if (hospitalName && (typeof hospitalName !== 'string' || hospitalName.trim().length > 150)) {
    errors.push({ field: 'hospitalName', message: 'Hospital name must not exceed 150 characters.' });
  }

  // 11. Bio
  if (bio && (typeof bio !== 'string' || bio.length > 2000)) {
    errors.push({ field: 'bio', message: 'Bio must not exceed 2000 characters.' });
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
