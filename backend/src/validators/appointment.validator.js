/**
 * Appointment Validator
 * Validates POST /api/appointments and PUT /api/appointments/:id routes.
 */

// Supports 24-hour "HH:MM" or 12-hour "H:MM AM/PM"
const VALID_TIME_RE = /^\d{1,2}:\d{2}(?:\s*(?:AM|PM|am|pm))?$/;
const VALID_DATE_RE = /^\d{4}-\d{2}-\d{2}$/; // YYYY-MM-DD

/**
 * Middleware: validates the appointment booking request body.
 * Rejects malformed or missing fields with HTTP 400.
 */
export function validateAppointmentBooking(req, res, next) {
  const errors = [];
  const { doctorId, appointmentDate, startTime, reason } = req.body;

  // doctorId: required, positive integer
  if (doctorId === undefined || doctorId === null || doctorId === '') {
    errors.push({ field: 'doctorId', message: 'Doctor ID is required.' });
  } else if (!Number.isInteger(Number(doctorId)) || Number(doctorId) < 1) {
    errors.push({ field: 'doctorId', message: 'Doctor ID must be a positive integer.' });
  }

  // appointmentDate: required, YYYY-MM-DD format, not in the past
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

  // startTime: required, HH:MM or H:MM AM/PM format
  if (!startTime) {
    errors.push({ field: 'startTime', message: 'Start time is required.' });
  } else if (!VALID_TIME_RE.test(startTime.trim())) {
    errors.push({ field: 'startTime', message: 'Start time must be in HH:MM format.' });
  } else {
    const match = startTime.trim().match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM|am|pm))?$/);
    if (!match) {
      errors.push({ field: 'startTime', message: 'Start time contains invalid hours or minutes.' });
    } else {
      const h = Number(match[1]);
      const m = Number(match[2]);
      const is12 = Boolean(match[3]);
      if (is12) {
        if (h < 1 || h > 12 || m < 0 || m > 59) {
          errors.push({ field: 'startTime', message: 'Start time contains invalid hours or minutes.' });
        }
      } else {
        if (h < 0 || h > 23 || m < 0 || m > 59) {
          errors.push({ field: 'startTime', message: 'Start time contains invalid hours or minutes.' });
        }
      }
    }
  }

  // reason: optional, max 255 chars if provided
  if (reason !== undefined && reason !== null) {
    if (typeof reason !== 'string') {
      errors.push({ field: 'reason', message: 'Reason must be a string.' });
    } else if (reason.trim().length > 255) {
      errors.push({ field: 'reason', message: 'Reason cannot exceed 255 characters.' });
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, message: errors[0].message, errors });
  }

  next();
}

/**
 * Middleware: validates the appointment reschedule request.
 * Rejects malformed appointment ID or date/time with HTTP 400.
 */
export function validateReschedule(req, res, next) {
  const errors = [];
  const { id } = req.params;
  const { appointmentDate, startTime } = req.body;

  // id param: required, positive integer
  if (!id || !Number.isInteger(Number(id)) || Number(id) < 1) {
    errors.push({ field: 'id', message: 'Appointment ID must be a positive integer.' });
  }

  // appointmentDate: required, YYYY-MM-DD format, not in the past
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

  // startTime: required, HH:MM or H:MM AM/PM format
  if (!startTime) {
    errors.push({ field: 'startTime', message: 'Start time is required.' });
  } else if (!VALID_TIME_RE.test(startTime.trim())) {
    errors.push({ field: 'startTime', message: 'Start time must be in HH:MM format.' });
  } else {
    const match = startTime.trim().match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM|am|pm))?$/);
    if (!match) {
      errors.push({ field: 'startTime', message: 'Start time contains invalid hours or minutes.' });
    } else {
      const h = Number(match[1]);
      const m = Number(match[2]);
      const is12 = Boolean(match[3]);
      if (is12) {
        if (h < 1 || h > 12 || m < 0 || m > 59) {
          errors.push({ field: 'startTime', message: 'Start time contains invalid hours or minutes.' });
        }
      } else {
        if (h < 0 || h > 23 || m < 0 || m > 59) {
          errors.push({ field: 'startTime', message: 'Start time contains invalid hours or minutes.' });
        }
      }
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, message: errors[0].message, errors });
  }

  next();
}

/**
 * Middleware: validates appointment ID param for cancellation.
 */
export function validateAppointmentId(req, res, next) {
  const { id } = req.params;
  if (!id || !Number.isInteger(Number(id)) || Number(id) < 1) {
    return res.status(400).json({
      success: false,
      message: 'Appointment ID must be a positive integer.',
    });
  }
  next();
}
