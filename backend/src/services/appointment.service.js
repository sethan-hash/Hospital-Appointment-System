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
  };
}

/**
 * Books a new appointment for an authenticated patient.
 *
 * Booking validation sequence:
 *  1. Resolve patient_id from the JWT user id.
 *  2. Verify doctor exists and is active.
 *  3. Validate appointment date (not past).
 *  4. Determine weekday of requested date.
 *  5. Find an active doctor_schedules row for that doctor + weekday.
 *  6. Validate start time is within schedule window.
 *  7. Validate start time aligns with slot_duration_minutes boundaries.
 *  8. Compute end_time (start + slot_duration).
 *  9. Acquire application named lock (GET_LOCK) to serialize concurrent bookings.
 * 10. Start transaction, check for overlapping SCHEDULED appointment (FOR UPDATE).
 * 11. Insert appointment into MySQL.
 * 12. Commit transaction and release named lock.
 *
 * @param {object} params
 * @param {number} params.userId          - JWT user id (never client-supplied patient id)
 * @param {number} params.doctorId
 * @param {string} params.appointmentDate - "YYYY-MM-DD"
 * @param {string} params.startTime       - "HH:MM" or "H:MM AM/PM"
 * @param {string} [params.reason]
 * @returns {Promise<object>} Normalized created appointment
 */
export async function bookAppointment({ userId, doctorId, appointmentDate, startTime, reason }) {
  // ── Step 1: Resolve patient record from JWT user id ──────────────────────
  const [patientRows] = await pool.query(
    'SELECT id FROM patients WHERE user_id = ? LIMIT 1;',
    [userId]
  );
  if (patientRows.length === 0) {
    const err = new Error('Patient record not found for this account.');
    err.statusCode = 404;
    throw err;
  }
  const patientId = patientRows[0].id;

  // ── Step 2: Verify doctor ─────────────────────────────────────────────────
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

  // ── Step 3: Date not in the past ─────────────────────────────────────────
  const [y, m, d] = appointmentDate.split('-').map(Number);
  const requestedDate = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (requestedDate < today) {
    const err = new Error('Appointment date cannot be in the past.');
    err.statusCode = 400;
    throw err;
  }

  // ── Step 4: Determine weekday ─────────────────────────────────────────────
  const dayEnum = JS_DAY_TO_ENUM[requestedDate.getDay()]; // e.g. "MONDAY"

  // ── Step 5: Find active schedule for this doctor + weekday ────────────────
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

  // ── Step 6: Validate start time within window ─────────────────────────────
  const reqStartMins = hmToMinutes(startTime);
  const reqEndMins   = reqStartMins + slotDurMins;

  if (reqStartMins < schedStartMins || reqEndMins > schedEndMins) {
    const err = new Error(
      "The requested time is outside the doctor's schedule window for that day."
    );
    err.statusCode = 400;
    throw err;
  }

  // ── Step 7: Validate slot alignment ──────────────────────────────────────
  const offsetFromStart = reqStartMins - schedStartMins;
  if (offsetFromStart % slotDurMins !== 0) {
    const err = new Error(
      `Appointment time must align with the doctor's ${slotDurMins}-minute slot boundaries.`
    );
    err.statusCode = 400;
    throw err;
  }

  // ── Step 8: Compute MySQL-ready time strings ──────────────────────────────
  const startTimeStr = minutesToTimeStr(reqStartMins);   // "HH:MM:00"

  // ── Step 9 & 10: Concurrency lock + Transaction with row-level check ───────
  const lockKey = `medlink_apt_${doctorId}_${appointmentDate}_${startTimeStr}`;
  const connection = await pool.getConnection();
  let lockAcquired = false;

  try {
    // Application-level named lock serialized per doctor/date/time across all connections
    const [lockRows] = await connection.query('SELECT GET_LOCK(?, 10) AS acquired;', [lockKey]);
    if (lockRows[0]?.acquired === 1) {
      lockAcquired = true;
    }

    await connection.beginTransaction();

    // Check for existing active (SCHEDULED) appointment for this slot
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
      const err = new Error(
        'This time slot is already booked. Please choose a different time.'
      );
      err.statusCode = 409;
      throw err;
    }

    // Insert the new appointment
    const [insertResult] = await connection.query(
      `INSERT INTO appointments
         (patient_id, doctor_id, appointment_date, appointment_time, status, type, reason_for_visit)
       VALUES (?, ?, ?, ?, 'SCHEDULED', 'IN_PERSON', ?);`,
      [patientId, doctorId, appointmentDate, startTimeStr, (reason || '').trim() || null]
    );

    await connection.commit();

    // Fetch the created record with safe date formatting
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
