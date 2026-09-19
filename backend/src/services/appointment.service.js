import { pool } from '../config/db.js';

/**
 * Converts a TIME value from MySQL (HH:MM:SS or HH:MM:00) to total minutes since midnight.
 * @param {string} t - e.g. "09:00:00"
 * @returns {number}
 */
function timeToMinutes(t) {
  const parts = String(t).split(':');
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}

/**
 * Converts "HH:MM" or "H:MM AM/PM" string to minutes since midnight.
 * @param {string} t - e.g. "09:30" or "9:30 AM" or "2:30 PM"
 * @returns {number}
 */
function hmToMinutes(t) {
  const match = String(t).trim().match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM|am|pm))?$/i);
  if (!match) return 0;
  let h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const period = match[3] ? match[3].toUpperCase() : null;
  if (period === 'PM' && h !== 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  return h * 60 + m;
}

/**
 * Converts total minutes since midnight to "HH:MM:SS" for MySQL TIME column.
 * @param {number} mins
 * @returns {string}
 */
function minutesToTimeStr(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
}

/**
 * Maps JavaScript Date.getDay() (0=Sun) to the doctor_schedules day_of_week enum.
 */
const JS_DAY_TO_ENUM = [
  'SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY',
];

/**
 * Appointment statuses that occupy a slot — only SCHEDULED counts.
 * COMPLETED, CANCELLED, NO_SHOW do not block a new booking.
 */
const BLOCKING_STATUSES = ['SCHEDULED'];

/**
 * Normalizes an appointments DB row into a safe client payload.
 * Never exposes password_hash or any user authentication field.
 * @param {object} row
 * @returns {object}
 */
function normalizeAppointment(row) {
  const rawTime = row.appointment_time || '';
  const [hStr, mStr] = rawTime.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  const displayTime = `${h12}:${String(m).padStart(2, '0')} ${suffix}`;

  let dateStr = row.appointment_date;
  if (dateStr instanceof Date) {
    const y = dateStr.getFullYear();
    const mo = String(dateStr.getMonth() + 1).padStart(2, '0');
    const d = String(dateStr.getDate()).padStart(2, '0');
    dateStr = `${y}-${mo}-${d}`;
  } else if (typeof dateStr === 'string') {
    dateStr = dateStr.split('T')[0];
  }

  return {
    id: row.id,
    patientId: row.patient_id,
    doctorId: row.doctor_id,
    doctorName: row.doctor_name || null,
    doctorTitle: row.doctor_title || null,
    department: row.doctor_title || row.specialization || 'Cardiology',
    date: dateStr,
    time: displayTime,
    startTimeRaw: rawTime,
    status: row.status,
    type: row.type,
    location: row.location || null,
    reason: row.reason_for_visit || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Validates a requested appointment date and time against a doctor's active weekly schedule.
 * Shared between booking and rescheduling to guarantee identical schedule validation.
 *
 * @param {number} doctorId
 * @param {string} appointmentDate - "YYYY-MM-DD"
 * @param {string} startTime       - "HH:MM" or "H:MM AM/PM"
 * @returns {Promise<{ doctor: object, sched: object, reqStartMins: number, startTimeStr: string }>}
 */
async function validateSlotAgainstDoctorSchedule(doctorId, appointmentDate, startTime) {
  // 1. Verify doctor exists and is active
  const [doctorRows] = await pool.query(
    `SELECT d.id, d.hospital_name, d.specialization,
            u.full_name, u.status
     FROM doctors d
     INNER JOIN users u ON u.id = d.user_id
     WHERE d.id = ? AND d.is_available = 1 AND u.status = 'ACTIVE'
     LIMIT 1;`,
    [doctorId]
  );
  if (doctorRows.length === 0) {
    const err = new Error('Doctor not found or is not currently available.');
    err.statusCode = 404;
    throw err;
  }
  const doctor = doctorRows[0];

  // 2. Validate date not in the past
  const [y, m, d] = appointmentDate.split('-').map(Number);
  const requestedDate = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (requestedDate < today) {
    const err = new Error('Appointment date cannot be in the past.');
    err.statusCode = 400;
    throw err;
  }

  // 3. Determine weekday
  const dayEnum = JS_DAY_TO_ENUM[requestedDate.getDay()];

  // 4. Find active schedule for this doctor + weekday
  const [scheduleRows] = await pool.query(
    `SELECT start_time, end_time, slot_duration_minutes
     FROM doctor_schedules
     WHERE doctor_id = ? AND day_of_week = ? AND is_active = 1
     LIMIT 1;`,
    [doctorId, dayEnum]
  );
  if (scheduleRows.length === 0) {
    const dayDisplay = dayEnum.charAt(0) + dayEnum.slice(1).toLowerCase();
    const err = new Error(
      `${doctor.full_name} is not available on ${dayDisplay}s. Please choose a different date.`
    );
    err.statusCode = 400;
    throw err;
  }
  const sched = scheduleRows[0];
  const schedStartMins = timeToMinutes(sched.start_time);
  const schedEndMins   = timeToMinutes(sched.end_time);
  const slotDurMins    = sched.slot_duration_minutes;

  // 5. Validate start time within window
  const reqStartMins = hmToMinutes(startTime);
  const reqEndMins   = reqStartMins + slotDurMins;

  if (reqStartMins < schedStartMins || reqEndMins > schedEndMins) {
    const err = new Error(
      "The requested time is outside the doctor's schedule window for that day."
    );
    err.statusCode = 400;
    throw err;
  }

  // 6. Validate slot alignment
  const offsetFromStart = reqStartMins - schedStartMins;
  if (offsetFromStart % slotDurMins !== 0) {
    const err = new Error(
      `Appointment time must align with the doctor's ${slotDurMins}-minute slot boundaries.`
    );
    err.statusCode = 400;
    throw err;
  }

  const startTimeStr = minutesToTimeStr(reqStartMins); // "HH:MM:00"

  return { doctor, sched, reqStartMins, startTimeStr };
}

/**
 * Resolves patient record ID from authenticated JWT user ID.
 * @param {number} userId
 * @returns {Promise<number>} patientId
 */
async function resolvePatientId(userId) {
  const [patientRows] = await pool.query(
    'SELECT id FROM patients WHERE user_id = ? LIMIT 1;',
    [userId]
  );
  if (patientRows.length === 0) {
    const err = new Error('Patient record not found for this account.');
    err.statusCode = 404;
    throw err;
  }
  return patientRows[0].id;
}

/**
 * Books a new appointment for an authenticated patient.
 */
export async function bookAppointment({ userId, doctorId, appointmentDate, startTime, reason }) {
  const patientId = await resolvePatientId(userId);
  const { startTimeStr } = await validateSlotAgainstDoctorSchedule(doctorId, appointmentDate, startTime);

  const lockKey = `medlink_apt_${doctorId}_${appointmentDate}_${startTimeStr}`;
  const connection = await pool.getConnection();
  let lockAcquired = false;

  try {
    const [lockRows] = await connection.query('SELECT GET_LOCK(?, 10) AS acquired;', [lockKey]);
    if (lockRows[0]?.acquired === 1) {
      lockAcquired = true;
    }

    await connection.beginTransaction();

    const [conflictRows] = await connection.query(
      `SELECT id FROM appointments
       WHERE doctor_id = ?
         AND appointment_date = ?
         AND appointment_time = ?
         AND status IN (${BLOCKING_STATUSES.map(() => '?').join(',')})
       LIMIT 1
       FOR UPDATE;`,
      [doctorId, appointmentDate, startTimeStr, ...BLOCKING_STATUSES]
    );

    if (conflictRows.length > 0) {
      await connection.rollback();
      const err = new Error('This time slot is already booked. Please choose a different time.');
      err.statusCode = 409;
      throw err;
    }

    const [insertResult] = await connection.query(
      `INSERT INTO appointments
         (patient_id, doctor_id, appointment_date, appointment_time, status, type, reason_for_visit)
       VALUES (?, ?, ?, ?, 'SCHEDULED', 'IN_PERSON', ?);`,
      [patientId, doctorId, appointmentDate, startTimeStr, (reason || '').trim() || null]
    );

    await connection.commit();

    const [created] = await pool.query(
      `SELECT
         a.id,
         a.patient_id,
         a.doctor_id,
         DATE_FORMAT(a.appointment_date, '%Y-%m-%d') AS appointment_date,
         a.appointment_time,
         a.status,
         a.type,
         a.reason_for_visit,
         a.created_at,
         a.updated_at,
         u.full_name      AS doctor_name,
         d.specialization AS doctor_title,
         d.hospital_name  AS location
       FROM appointments a
       INNER JOIN doctors d ON d.id = a.doctor_id
       INNER JOIN users u ON u.id = d.user_id
       WHERE a.id = ?
       LIMIT 1;`,
      [insertResult.insertId]
    );

    return normalizeAppointment(created[0]);

  } catch (err) {
    if (connection) {
      try { await connection.rollback(); } catch { /* ignore rollback error */ }
    }
    throw err;
  } finally {
    if (lockAcquired) {
      try {
        await connection.query('SELECT RELEASE_LOCK(?);', [lockKey]);
      } catch { /* ignore release error */ }
    }
    connection.release();
  }
}

/**
 * Retrieves all upcoming scheduled appointments for the authenticated patient.
 * Sorted chronologically: earliest upcoming appointment first.
 *
 * @param {number} userId - JWT user id
 * @returns {Promise<object[]>}
 */
export async function getUpcomingAppointments(userId) {
  const patientId = await resolvePatientId(userId);

  // Use local calendar date to prevent UTC shift
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const todayStr = `${y}-${m}-${d}`;

  const [rows] = await pool.query(
    `SELECT
       a.id,
       a.patient_id,
       a.doctor_id,
       DATE_FORMAT(a.appointment_date, '%Y-%m-%d') AS appointment_date,
       a.appointment_time,
       a.status,
       a.type,
       a.reason_for_visit,
       a.created_at,
       a.updated_at,
       u.full_name      AS doctor_name,
       d.specialization AS doctor_title,
       d.hospital_name  AS location
     FROM appointments a
     INNER JOIN doctors d ON d.id = a.doctor_id
     INNER JOIN users u ON u.id = d.user_id
     WHERE a.patient_id = ?
       AND a.status = 'SCHEDULED'
       AND a.appointment_date >= ?
     ORDER BY a.appointment_date ASC, a.appointment_time ASC;`,
    [patientId, todayStr]
  );

  return rows.map(normalizeAppointment);
}

/**
 * Reschedules an existing scheduled appointment to a new date and time slot.
 * Ensures appointment ownership, schedule validity, and concurrency protection.
 *
 * @param {object} params
 * @param {number} params.userId
 * @param {number} params.appointmentId
 * @param {string} params.appointmentDate
 * @param {string} params.startTime
 * @returns {Promise<object>}
 */
export async function rescheduleAppointment({ userId, appointmentId, appointmentDate, startTime }) {
  const patientId = await resolvePatientId(userId);

  // Verify appointment exists and belongs to authenticated patient
  const [aptRows] = await pool.query(
    'SELECT * FROM appointments WHERE id = ? LIMIT 1;',
    [appointmentId]
  );

  if (aptRows.length === 0 || aptRows[0].patient_id !== patientId) {
    const err = new Error('Appointment not found.');
    err.statusCode = 404;
    throw err;
  }

  const existingApt = aptRows[0];

  // Only SCHEDULED appointments can be rescheduled
  if (existingApt.status !== 'SCHEDULED') {
    const err = new Error('Only scheduled appointments can be rescheduled.');
    err.statusCode = 409;
    throw err;
  }

  // Validate destination slot against doctor's weekly schedule
  const { startTimeStr } = await validateSlotAgainstDoctorSchedule(
    existingApt.doctor_id,
    appointmentDate,
    startTime
  );

  // Concurrency lock + Transaction check on the destination slot
  const lockKey = `medlink_apt_${existingApt.doctor_id}_${appointmentDate}_${startTimeStr}`;
  const connection = await pool.getConnection();
  let lockAcquired = false;

  try {
    const [lockRows] = await connection.query('SELECT GET_LOCK(?, 10) AS acquired;', [lockKey]);
    if (lockRows[0]?.acquired === 1) {
      lockAcquired = true;
    }

    await connection.beginTransaction();

    // Check conflict on destination slot excluding the current appointment
    const [conflictRows] = await connection.query(
      `SELECT id FROM appointments
       WHERE doctor_id = ?
         AND appointment_date = ?
         AND appointment_time = ?
         AND status IN (${BLOCKING_STATUSES.map(() => '?').join(',')})
         AND id != ?
       LIMIT 1
       FOR UPDATE;`,
      [existingApt.doctor_id, appointmentDate, startTimeStr, ...BLOCKING_STATUSES, appointmentId]
    );

    if (conflictRows.length > 0) {
      await connection.rollback();
      const err = new Error('This time slot is already booked. Please choose a different time.');
      err.statusCode = 409;
      throw err;
    }

    // Update appointment date and time
    await connection.query(
      `UPDATE appointments
       SET appointment_date = ?, appointment_time = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?;`,
      [appointmentDate, startTimeStr, appointmentId]
    );

    await connection.commit();

    // Fetch and return the updated appointment
    const [updatedRows] = await pool.query(
      `SELECT
         a.id,
         a.patient_id,
         a.doctor_id,
         DATE_FORMAT(a.appointment_date, '%Y-%m-%d') AS appointment_date,
         a.appointment_time,
         a.status,
         a.type,
         a.reason_for_visit,
         a.created_at,
         a.updated_at,
         u.full_name      AS doctor_name,
         d.specialization AS doctor_title,
         d.hospital_name  AS location
       FROM appointments a
       INNER JOIN doctors d ON d.id = a.doctor_id
       INNER JOIN users u ON u.id = d.user_id
       WHERE a.id = ?
       LIMIT 1;`,
      [appointmentId]
    );

    return normalizeAppointment(updatedRows[0]);

  } catch (err) {
    if (connection) {
      try { await connection.rollback(); } catch { /* ignore rollback error */ }
    }
    throw err;
  } finally {
    if (lockAcquired) {
      try {
        await connection.query('SELECT RELEASE_LOCK(?);', [lockKey]);
      } catch { /* ignore release error */ }
    }
    connection.release();
  }
}

/**
 * Cancels an existing scheduled appointment for the authenticated patient.
 *
 * @param {object} params
 * @param {number} params.userId
 * @param {number} params.appointmentId
 * @returns {Promise<object>}
 */
export async function cancelAppointment({ userId, appointmentId }) {
  const patientId = await resolvePatientId(userId);

  const [aptRows] = await pool.query(
    'SELECT * FROM appointments WHERE id = ? LIMIT 1;',
    [appointmentId]
  );

  if (aptRows.length === 0 || aptRows[0].patient_id !== patientId) {
    const err = new Error('Appointment not found.');
    err.statusCode = 404;
    throw err;
  }

  const existingApt = aptRows[0];

  if (existingApt.status !== 'SCHEDULED') {
    const err = new Error('Only scheduled appointments can be cancelled.');
    err.statusCode = 409;
    throw err;
  }

  await pool.query(
    `UPDATE appointments
     SET status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP
     WHERE id = ?;`,
    [appointmentId]
  );

  const [updatedRows] = await pool.query(
    `SELECT
       a.id,
       a.patient_id,
       a.doctor_id,
       DATE_FORMAT(a.appointment_date, '%Y-%m-%d') AS appointment_date,
       a.appointment_time,
       a.status,
       a.type,
       a.reason_for_visit,
       a.created_at,
       a.updated_at,
       u.full_name      AS doctor_name,
       d.specialization AS doctor_title,
       d.hospital_name  AS location
     FROM appointments a
     INNER JOIN doctors d ON d.id = a.doctor_id
     INNER JOIN users u ON u.id = d.user_id
     WHERE a.id = ?
     LIMIT 1;`,
    [appointmentId]
  );

  return normalizeAppointment(updatedRows[0]);
}
