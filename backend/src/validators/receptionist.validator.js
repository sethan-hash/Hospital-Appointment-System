/**
 * Receptionist Portal Request Validators
 * Validates request payloads for receptionist endpoints.
 */

const VALID_TIME_RE = /^\d{1,2}:\d{2}(?:\s*(?:AM|PM|am|pm))?$/;
const VALID_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[\d\s-]{6,20}$/;
const ALLOWED_GENDERS = ['MALE', 'FEMALE', 'OTHER'];
const ALLOWED_BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const ALLOWED_APPOINTMENT_STATUSES = ['SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'];
const ALLOWED_APPOINTMENT_TYPES = ['IN_PERSON', 'TELECONSULTATION'];

/**
 * Middleware: validates patient registration body submitted by receptionist.
 */
export function validateReceptionistPatientRegistration(req, res, next) {
  const errors = [];
  const { fullName, email, phone, gender, bloodGroup, dateOfBirth } = req.body;

  // fullName: required, min 2 chars
  if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 2) {
    errors.push({ field: 'fullName', message: 'Full name is required (min 2 characters).' });
  }

  // email: required, valid email
  if (!email || typeof email !== 'string' || !EMAIL_RE.test(email.trim())) {
    errors.push({ field: 'email', message: 'A valid email address is required.' });
  }

  // phone: required, min 6 digits
  if (!phone || typeof phone !== 'string' || !PHONE_RE.test(phone.trim())) {
    errors.push({ field: 'phone', message: 'A valid phone number is required (min 6 digits).' });
  }

  // gender: required, MALE | FEMALE | OTHER
  if (!gender || typeof gender !== 'string' || !ALLOWED_GENDERS.includes(gender.trim().toUpperCase())) {
    errors.push({ field: 'gender', message: `Gender is required. Allowed: ${ALLOWED_GENDERS.join(', ')}.` });
  }

  // bloodGroup: optional, must be valid enum if present
  if (bloodGroup && !ALLOWED_BLOOD_GROUPS.includes(String(bloodGroup).trim().toUpperCase())) {
    errors.push({ field: 'bloodGroup', message: `Invalid blood group. Allowed: ${ALLOWED_BLOOD_GROUPS.join(', ')}.` });
  }

  // dateOfBirth: optional, must be YYYY-MM-DD if present
  if (dateOfBirth && !VALID_DATE_RE.test(String(dateOfBirth).trim())) {
    errors.push({ field: 'dateOfBirth', message: 'Date of birth must be in YYYY-MM-DD format.' });
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: errors[0].message,
      errors,
    });
  }

  next();
}

/**
 * Middleware: validates appointment booking request body submitted by receptionist.
 */
export function validateReceptionistAppointmentBooking(req, res, next) {
  const errors = [];
  const { patientId, doctorId, appointmentDate, startTime, type } = req.body;

  // patientId: required positive integer
  if (patientId === undefined || patientId === null || patientId === '') {
    errors.push({ field: 'patientId', message: 'Patient ID is required.' });
  } else if (!Number.isInteger(Number(patientId)) || Number(patientId) < 1) {
    errors.push({ field: 'patientId', message: 'Patient ID must be a positive integer.' });
  }

  // doctorId: required positive integer
  if (doctorId === undefined || doctorId === null || doctorId === '') {
    errors.push({ field: 'doctorId', message: 'Doctor ID is required.' });
  } else if (!Number.isInteger(Number(doctorId)) || Number(doctorId) < 1) {
    errors.push({ field: 'doctorId', message: 'Doctor ID must be a positive integer.' });
  }

  // appointmentDate: required, YYYY-MM-DD, not in past
  if (!appointmentDate) {
    errors.push({ field: 'appointmentDate', message: 'Appointment date is required.' });
  } else if (!VALID_DATE_RE.test(appointmentDate)) {
    errors.push({ field: 'appointmentDate', message: 'Appointment date must be in YYYY-MM-DD format.' });
  } else {
    const [y, m, d] = appointmentDate.split('-').map(Number);
    const parsed = new Date(y, m - 1, d);
    if (isNaN(parsed.getTime()) || parsed.getFullYear() !== y || parsed.getMonth() !== m - 1 || parsed.getDate() !== d) {
      errors.push({ field: 'appointmentDate', message: 'Appointment date is not a valid calendar date.' });
    } else {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (parsed < today) {
        errors.push({ field: 'appointmentDate', message: 'Appointment date cannot be in the past.' });
      }
    }
  }

  // startTime: required, valid time
  if (!startTime) {
    errors.push({ field: 'startTime', message: 'Start time is required.' });
  } else if (!VALID_TIME_RE.test(String(startTime).trim())) {
    errors.push({ field: 'startTime', message: 'Start time must be in HH:MM format.' });
  }

  // type: optional, IN_PERSON | TELECONSULTATION
  if (type && !ALLOWED_APPOINTMENT_TYPES.includes(String(type).trim().toUpperCase())) {
    errors.push({ field: 'type', message: `Invalid appointment type. Allowed: ${ALLOWED_APPOINTMENT_TYPES.join(', ')}.` });
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: errors[0].message,
      errors,
    });
  }

  next();
}

/**
 * Middleware: validates reschedule request body.
 */
export function validateReceptionistReschedule(req, res, next) {
  const errors = [];
  const { appointmentDate, startTime } = req.body;

  if (!appointmentDate) {
    errors.push({ field: 'appointmentDate', message: 'Appointment date is required.' });
  } else if (!VALID_DATE_RE.test(appointmentDate)) {
    errors.push({ field: 'appointmentDate', message: 'Appointment date must be in YYYY-MM-DD format.' });
  } else {
    const [y, m, d] = appointmentDate.split('-').map(Number);
    const parsed = new Date(y, m - 1, d);
    if (isNaN(parsed.getTime()) || parsed.getFullYear() !== y || parsed.getMonth() !== m - 1 || parsed.getDate() !== d) {
      errors.push({ field: 'appointmentDate', message: 'Appointment date is not a valid calendar date.' });
    } else {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (parsed < today) {
        errors.push({ field: 'appointmentDate', message: 'Appointment date cannot be in the past.' });
      }
    }
  }

  if (!startTime) {
    errors.push({ field: 'startTime', message: 'Start time is required.' });
  } else if (!VALID_TIME_RE.test(String(startTime).trim())) {
    errors.push({ field: 'startTime', message: 'Start time must be in HH:MM format.' });
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: errors[0].message,
      errors,
    });
  }

  next();
}

/**
 * Middleware: validates appointment status transition body.
 */
export function validateReceptionistStatusUpdate(req, res, next) {
  const { status } = req.body;

  if (!status || typeof status !== 'string') {
    return res.status(400).json({
      success: false,
      message: 'Status is required.',
      errors: [{ field: 'status', message: 'Status is required.' }],
    });
  }

  const normalized = status.trim().toUpperCase();
  if (!ALLOWED_APPOINTMENT_STATUSES.includes(normalized)) {
    return res.status(400).json({
      success: false,
      message: `Invalid status. Allowed statuses: ${ALLOWED_APPOINTMENT_STATUSES.join(', ')}.`,
      errors: [{ field: 'status', message: `Allowed statuses: ${ALLOWED_APPOINTMENT_STATUSES.join(', ')}.` }],
    });
  }

  req.body.status = normalized;
  next();
}

/**
 * Middleware: validates :id param is a positive integer.
 */
export function validateAppointmentIdParam(req, res, next) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({
      success: false,
      message: 'Appointment ID must be a positive integer.',
      errors: [{ field: 'id', message: 'Appointment ID must be a positive integer.' }],
    });
  }
  next();
}

// ============================================================================
// Invoice payment validators (Phase 7D-3)
// ============================================================================

const RECEPTIONIST_ALLOWED_PAYMENT_STATUSES = ['PAID', 'PENDING'];
const ALLOWED_PAYMENT_METHODS = ['UPI', 'CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'NET_BANKING', 'INSURANCE'];

/**
 * Middleware: validates invoice :id param is a positive integer.
 */
export function validateInvoiceIdParam(req, res, next) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({
      success: false,
      message: 'Invoice ID must be a positive integer.',
      errors: [{ field: 'id', message: 'Invoice ID must be a positive integer.' }],
    });
  }
  next();
}

/**
 * Middleware: validates payment update body for receptionist front-desk collection.
 * Only PAID and PENDING are permitted — CANCELLED/REFUNDED/PARTIALLY_PAID require Admin.
 */
export function validateReceptionistPaymentUpdate(req, res, next) {
  const { paymentStatus, paymentMethod } = req.body;

  if (!paymentStatus || typeof paymentStatus !== 'string') {
    return res.status(400).json({
      success: false,
      message: 'paymentStatus is required.',
      errors: [{ field: 'paymentStatus', message: 'paymentStatus is required.' }],
    });
  }

  const normStatus = paymentStatus.trim().toUpperCase();
  if (!RECEPTIONIST_ALLOWED_PAYMENT_STATUSES.includes(normStatus)) {
    return res.status(400).json({
      success: false,
      message: `Invalid paymentStatus for front-desk update. Allowed: ${RECEPTIONIST_ALLOWED_PAYMENT_STATUSES.join(', ')}.`,
      errors: [{ field: 'paymentStatus', message: `Allowed: ${RECEPTIONIST_ALLOWED_PAYMENT_STATUSES.join(', ')}.` }],
    });
  }

  if (paymentMethod !== undefined && paymentMethod !== null && paymentMethod !== '') {
    const normMethod = String(paymentMethod).trim().toUpperCase();
    if (!ALLOWED_PAYMENT_METHODS.includes(normMethod)) {
      return res.status(400).json({
        success: false,
        message: `Invalid paymentMethod. Allowed: ${ALLOWED_PAYMENT_METHODS.join(', ')}.`,
        errors: [{ field: 'paymentMethod', message: `Allowed: ${ALLOWED_PAYMENT_METHODS.join(', ')}.` }],
      });
    }
    req.body.paymentMethod = normMethod;
  }

  req.body.paymentStatus = normStatus;
  next();
}
