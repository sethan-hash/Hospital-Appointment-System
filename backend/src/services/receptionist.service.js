import bcrypt from 'bcryptjs';
import { pool } from '../config/db.js';
import {
  BLOCKING_STATUSES,
  validateSlotAgainstDoctorSchedule,
} from './appointment.service.js';

// Operational payment statuses permitted for front-desk collection
const RECEPTIONIST_ALLOWED_PAYMENT_STATUSES = ['PAID', 'PENDING'];
// All payment methods available at front desk
const ALLOWED_PAYMENT_METHODS = ['UPI', 'CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'NET_BANKING', 'INSURANCE'];

/**
 * Normalizes appointment database rows for receptionist payloads.
 * Excludes sensitive user fields (password_hash).
 */
function normalizeReceptionistAppointment(row) {
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
    patientName: row.patient_name || null,
    patientEmail: row.patient_email || null,
    patientPhone: row.patient_phone || null,
    patientGender: row.patient_gender || null,
    patientCity: row.patient_city || null,
    doctorId: row.doctor_id,
    doctorName: row.doctor_name || null,
    doctorSpecialization: row.doctor_specialization || null,
    doctorDepartment: row.doctor_department || null,
    hospitalName: row.hospital_name || null,
    date: dateStr,
    appointmentDate: dateStr,
    time: displayTime,
    startTimeRaw: rawTime,
    status: row.status,
    type: row.type,
    reason: row.reason_for_visit || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    invoice: row.invoice_id
      ? {
          id: row.invoice_id,
          invoiceNumber: row.invoice_number,
          totalAmount: parseFloat(row.invoice_total_amount),
          paymentStatus: row.invoice_payment_status,
          paymentMethod: row.invoice_payment_method,
          issueDate: row.invoice_issue_date,
          paidAt: row.invoice_paid_at,
        }
      : null,
  };
}

/**
 * Lists appointments with date, doctor, and status filters.
 * If date is omitted, defaults to today's date in YYYY-MM-DD.
 *
 * @param {object} params
 * @param {string} [params.date]
 * @param {number} [params.doctorId]
 * @param {string} [params.status]
 * @returns {Promise<object[]>}
 */
export async function listAppointments({ date = '', doctorId = '', status = '' } = {}) {
  let targetDate = date;
  if (!targetDate) {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    targetDate = `${y}-${m}-${d}`;
  }

  const conditions = ['a.appointment_date = ?'];
  const params = [targetDate];

  if (doctorId) {
    conditions.push('a.doctor_id = ?');
    params.push(Number(doctorId));
  }

  if (status) {
    conditions.push('a.status = ?');
    params.push(String(status).toUpperCase());
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

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
       pu.full_name AS patient_name,
       pu.email AS patient_email,
       pu.phone AS patient_phone,
       p.gender AS patient_gender,
       p.city AS patient_city,
       du.full_name AS doctor_name,
       d.specialization AS doctor_specialization,
       d.department AS doctor_department,
       d.hospital_name AS hospital_name,
       i.id AS invoice_id,
       i.invoice_number,
       i.total_amount AS invoice_total_amount,
       i.payment_status AS invoice_payment_status,
       i.payment_method AS invoice_payment_method,
       DATE_FORMAT(i.issue_date, '%Y-%m-%d') AS invoice_issue_date,
       i.paid_at AS invoice_paid_at
     FROM appointments a
     INNER JOIN patients p ON p.id = a.patient_id
     INNER JOIN users pu ON pu.id = p.user_id
     INNER JOIN doctors d ON d.id = a.doctor_id
     INNER JOIN users du ON du.id = d.user_id
     LEFT JOIN invoices i ON i.appointment_id = a.id
     ${whereClause}
     ORDER BY a.appointment_date ASC, a.appointment_time ASC;`,
    params
  );

  return rows.map(normalizeReceptionistAppointment);
}

/**
 * Searches patients by full_name, email, or phone.
 *
 * @param {object} params
 * @param {string} [params.search='']
 * @returns {Promise<object[]>}
 */
export async function searchPatients({ search = '' } = {}) {
  const conditions = ["u.role = 'PATIENT'"];
  const params = [];

  if (search && search.trim()) {
    conditions.push('(u.full_name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)');
    const pattern = `%${search.trim()}%`;
    params.push(pattern, pattern, pattern);
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  const [rows] = await pool.query(
    `SELECT
       p.id,
       p.user_id AS userId,
       u.full_name AS fullName,
       u.email,
       u.phone,
       u.status,
       DATE_FORMAT(p.date_of_birth, '%Y-%m-%d') AS dateOfBirth,
       p.gender,
       p.blood_group AS bloodGroup,
       p.address,
       p.city,
       p.state,
       p.pincode,
       p.emergency_contact_name AS emergencyContactName,
       p.emergency_contact_phone AS emergencyContactPhone,
       p.allergies,
       p.chronic_conditions AS chronicConditions,
       p.created_at AS createdAt
     FROM patients p
     INNER JOIN users u ON u.id = p.user_id
     ${whereClause}
     ORDER BY u.full_name ASC;`,
    params
  );

  return rows;
}

/**
 * Registers a walk-in or new patient atomically without issuing a JWT or session.
 *
 * @param {object} data
 * @returns {Promise<object>} Created patient profile
 */
export async function registerPatient(data) {
  const fullName = data.fullName.trim();
  const email = data.email.trim().toLowerCase();
  const phone = data.phone.trim();
  const rawPassword = data.password ? data.password.trim() : 'Patient123!';
  const gender = (data.gender || 'OTHER').toUpperCase();
  const dateOfBirth = data.dateOfBirth || null;
  const bloodGroup = data.bloodGroup ? data.bloodGroup.toUpperCase() : null;
  const address = data.address ? data.address.trim() : null;
  const city = (data.city || 'Bengaluru').trim();
  const state = (data.state || 'Karnataka').trim();
  const pincode = data.pincode ? data.pincode.trim() : null;
  const emergencyContactName = data.emergencyContactName ? data.emergencyContactName.trim() : null;
  const emergencyContactPhone = data.emergencyContactPhone ? data.emergencyContactPhone.trim() : null;
  const allergies = data.allergies ? data.allergies.trim() : null;
  const chronicConditions = data.chronicConditions ? data.chronicConditions.trim() : null;

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Conflict checks for email and phone
    const [existingEmail] = await connection.query(
      'SELECT id FROM users WHERE email = ? LIMIT 1;',
      [email]
    );
    if (existingEmail.length > 0) {
      const err = new Error('Email address is already registered.');
      err.statusCode = 409;
      throw err;
    }

    const [existingPhone] = await connection.query(
      'SELECT id FROM users WHERE phone = ? LIMIT 1;',
      [phone]
    );
    if (existingPhone.length > 0) {
      const err = new Error('Phone number is already registered.');
      err.statusCode = 409;
      throw err;
    }

    // 2. Hash password
    const passwordHash = await bcrypt.hash(rawPassword, 10);

    // 3. Insert users record
    const [userResult] = await connection.query(
      `INSERT INTO users (role, full_name, email, phone, password_hash, status)
       VALUES ('PATIENT', ?, ?, ?, ?, 'ACTIVE');`,
      [fullName, email, phone, passwordHash]
    );
    const userId = userResult.insertId;

    // 4. Insert patients record
    const [patientResult] = await connection.query(
      `INSERT INTO patients (
         user_id, date_of_birth, gender, blood_group, address, city, state,
         pincode, emergency_contact_name, emergency_contact_phone, allergies, chronic_conditions
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        userId,
        dateOfBirth,
        gender,
        bloodGroup,
        address,
        city,
        state,
        pincode,
        emergencyContactName,
        emergencyContactPhone,
        allergies,
        chronicConditions,
      ]
    );
    const patientId = patientResult.insertId;

    await connection.commit();

    return {
      id: patientId,
      userId,
      fullName,
      email,
      phone,
      gender,
      dateOfBirth,
      bloodGroup,
      city,
      state,
      address,
    };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

/**
 * Books an appointment on behalf of an explicit patientId.
 * Reuses doctor slot schedule validation and advisory concurrency lock.
 *
 * @param {object} params
 * @param {number} params.patientId
 * @param {number} params.doctorId
 * @param {string} params.appointmentDate
 * @param {string} params.startTime
 * @param {string} [params.reason]
 * @param {string} [params.type='IN_PERSON']
 * @returns {Promise<object>}
 */
export async function bookAppointment({
  patientId,
  doctorId,
  appointmentDate,
  startTime,
  reason = '',
  type = 'IN_PERSON',
}) {
  // 1. Verify patient exists and is active
  const [patientRows] = await pool.query(
    `SELECT p.id, u.status
     FROM patients p
     INNER JOIN users u ON u.id = p.user_id
     WHERE p.id = ?
     LIMIT 1;`,
    [patientId]
  );
  if (patientRows.length === 0) {
    const err = new Error('Patient record not found.');
    err.statusCode = 404;
    throw err;
  }
  if (patientRows[0].status !== 'ACTIVE') {
    const err = new Error('Patient account is not active.');
    err.statusCode = 400;
    throw err;
  }

  // 2. Validate schedule slot against doctor's hours
  const { startTimeStr } = await validateSlotAgainstDoctorSchedule(
    doctorId,
    appointmentDate,
    startTime
  );

  // 3. Concurrency lock on slot
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
       VALUES (?, ?, ?, ?, 'SCHEDULED', ?, ?);`,
      [
        patientId,
        doctorId,
        appointmentDate,
        startTimeStr,
        type.toUpperCase(),
        (reason || '').trim() || null,
      ]
    );

    await connection.commit();

    // 4. Fetch created appointment details
    const [newAptRows] = await pool.query(
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
         pu.full_name AS patient_name,
         pu.email AS patient_email,
         pu.phone AS patient_phone,
         p.gender AS patient_gender,
         p.city AS patient_city,
         du.full_name AS doctor_name,
         d.specialization AS doctor_specialization,
         d.department AS doctor_department,
         d.hospital_name AS hospital_name
       FROM appointments a
       INNER JOIN patients p ON p.id = a.patient_id
       INNER JOIN users pu ON pu.id = p.user_id
       INNER JOIN doctors d ON d.id = a.doctor_id
       INNER JOIN users du ON du.id = d.user_id
       WHERE a.id = ?
       LIMIT 1;`,
      [insertResult.insertId]
    );

    return normalizeReceptionistAppointment(newAptRows[0]);
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    if (lockAcquired) {
      try {
        await connection.query('SELECT RELEASE_LOCK(?);', [lockKey]);
      } catch {
        /* ignore */
      }
    }
    connection.release();
  }
}

/**
 * Reschedules an appointment to a new date and time.
 *
 * @param {object} params
 * @param {number} params.appointmentId
 * @param {string} params.appointmentDate
 * @param {string} params.startTime
 * @returns {Promise<object>}
 */
export async function rescheduleAppointment({ appointmentId, appointmentDate, startTime }) {
  const [aptRows] = await pool.query(
    'SELECT id, patient_id, doctor_id, status FROM appointments WHERE id = ? LIMIT 1;',
    [appointmentId]
  );

  if (aptRows.length === 0) {
    const err = new Error('Appointment not found.');
    err.statusCode = 404;
    throw err;
  }

  const existing = aptRows[0];
  if (existing.status !== 'SCHEDULED') {
    const err = new Error('Only scheduled appointments can be rescheduled.');
    err.statusCode = 409;
    throw err;
  }

  const { startTimeStr } = await validateSlotAgainstDoctorSchedule(
    existing.doctor_id,
    appointmentDate,
    startTime
  );

  const lockKey = `medlink_apt_${existing.doctor_id}_${appointmentDate}_${startTimeStr}`;
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
         AND id != ?
       LIMIT 1
       FOR UPDATE;`,
      [existing.doctor_id, appointmentDate, startTimeStr, ...BLOCKING_STATUSES, appointmentId]
    );

    if (conflictRows.length > 0) {
      await connection.rollback();
      const err = new Error('This time slot is already booked. Please choose a different time.');
      err.statusCode = 409;
      throw err;
    }

    await connection.query(
      `UPDATE appointments
       SET appointment_date = ?, appointment_time = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?;`,
      [appointmentDate, startTimeStr, appointmentId]
    );

    await connection.commit();

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
         pu.full_name AS patient_name,
         pu.email AS patient_email,
         pu.phone AS patient_phone,
         p.gender AS patient_gender,
         p.city AS patient_city,
         du.full_name AS doctor_name,
         d.specialization AS doctor_specialization,
         d.department AS doctor_department,
         d.hospital_name AS hospital_name
       FROM appointments a
       INNER JOIN patients p ON p.id = a.patient_id
       INNER JOIN users pu ON pu.id = p.user_id
       INNER JOIN doctors d ON d.id = a.doctor_id
       INNER JOIN users du ON du.id = d.user_id
       WHERE a.id = ?
       LIMIT 1;`,
      [appointmentId]
    );

    return normalizeReceptionistAppointment(updatedRows[0]);
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    if (lockAcquired) {
      try {
        await connection.query('SELECT RELEASE_LOCK(?);', [lockKey]);
      } catch {
        /* ignore */
      }
    }
    connection.release();
  }
}

/**
 * Cancels a scheduled appointment.
 *
 * @param {object} params
 * @param {number} params.appointmentId
 * @returns {Promise<object>}
 */
export async function cancelAppointment({ appointmentId }) {
  const [aptRows] = await pool.query(
    'SELECT id, status FROM appointments WHERE id = ? LIMIT 1;',
    [appointmentId]
  );

  if (aptRows.length === 0) {
    const err = new Error('Appointment not found.');
    err.statusCode = 404;
    throw err;
  }

  const existing = aptRows[0];
  if (existing.status !== 'SCHEDULED') {
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
       pu.full_name AS patient_name,
       pu.email AS patient_email,
       pu.phone AS patient_phone,
       p.gender AS patient_gender,
       p.city AS patient_city,
       du.full_name AS doctor_name,
       d.specialization AS doctor_specialization,
       d.department AS doctor_department,
       d.hospital_name AS hospital_name
     FROM appointments a
     INNER JOIN patients p ON p.id = a.patient_id
     INNER JOIN users pu ON pu.id = p.user_id
     INNER JOIN doctors d ON d.id = a.doctor_id
     INNER JOIN users du ON du.id = d.user_id
     WHERE a.id = ?
     LIMIT 1;`,
    [appointmentId]
  );

  return normalizeReceptionistAppointment(updatedRows[0]);
}

/**
 * Updates an appointment's status with valid lifecycle transition rules.
 *
 * @param {object} params
 * @param {number} params.appointmentId
 * @param {string} params.newStatus
 * @returns {Promise<object>}
 */
export async function updateAppointmentStatus({ appointmentId, newStatus }) {
  const allowed = ['SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'];
  const targetStatus = newStatus.toUpperCase();

  if (!allowed.includes(targetStatus)) {
    const err = new Error(`Invalid status. Allowed statuses: ${allowed.join(', ')}.`);
    err.statusCode = 400;
    throw err;
  }

  const [aptRows] = await pool.query(
    'SELECT id, status FROM appointments WHERE id = ? LIMIT 1;',
    [appointmentId]
  );

  if (aptRows.length === 0) {
    const err = new Error('Appointment not found.');
    err.statusCode = 404;
    throw err;
  }

  const currentStatus = aptRows[0].status;

  if (currentStatus === targetStatus) {
    const [existingRows] = await pool.query(
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
         pu.full_name AS patient_name,
         pu.email AS patient_email,
         pu.phone AS patient_phone,
         p.gender AS patient_gender,
         p.city AS patient_city,
         du.full_name AS doctor_name,
         d.specialization AS doctor_specialization,
         d.department AS doctor_department,
         d.hospital_name AS hospital_name
       FROM appointments a
       INNER JOIN patients p ON p.id = a.patient_id
       INNER JOIN users pu ON pu.id = p.user_id
       INNER JOIN doctors d ON d.id = a.doctor_id
       INNER JOIN users du ON du.id = d.user_id
       WHERE a.id = ?
       LIMIT 1;`,
      [appointmentId]
    );
    return normalizeReceptionistAppointment(existingRows[0]);
  }

  // Lifecycle validation:
  if (currentStatus === 'CANCELLED' && targetStatus !== 'SCHEDULED') {
    const err = new Error(`Cancelled appointments cannot be changed to ${targetStatus}.`);
    err.statusCode = 409;
    throw err;
  }

  if (currentStatus === 'COMPLETED' && (targetStatus === 'CANCELLED' || targetStatus === 'NO_SHOW')) {
    const err = new Error(`Completed appointments cannot be changed to ${targetStatus}.`);
    err.statusCode = 409;
    throw err;
  }

  await pool.query(
    `UPDATE appointments
     SET status = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?;`,
    [targetStatus, appointmentId]
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
       pu.full_name AS patient_name,
       pu.email AS patient_email,
       pu.phone AS patient_phone,
       p.gender AS patient_gender,
       p.city AS patient_city,
       du.full_name AS doctor_name,
       d.specialization AS doctor_specialization,
       d.department AS doctor_department,
       d.hospital_name AS hospital_name
     FROM appointments a
     INNER JOIN patients p ON p.id = a.patient_id
     INNER JOIN users pu ON pu.id = p.user_id
     INNER JOIN doctors d ON d.id = a.doctor_id
     INNER JOIN users du ON du.id = d.user_id
     WHERE a.id = ?
     LIMIT 1;`,
    [appointmentId]
  );

  return normalizeReceptionistAppointment(updatedRows[0]);
}

/**
 * Updates an invoice's payment status and/or payment method.
 * Restricted to front-desk operational statuses: PAID and PENDING only.
 * Admin-only transitions (CANCELLED, REFUNDED, PARTIALLY_PAID) are forbidden.
 * Never returns hospital-wide financial summary or revenue metrics.
 *
 * @param {number} invoiceId
 * @param {object} updates
 * @param {string} updates.paymentStatus - 'PAID' | 'PENDING'
 * @param {string|null} [updates.paymentMethod] - payment method or null
 * @returns {Promise<object>} Updated invoice record (operational fields only)
 */
export async function updateInvoicePayment(invoiceId, { paymentStatus, paymentMethod }) {
  if (!invoiceId || !Number.isInteger(invoiceId) || invoiceId <= 0) {
    const err = new Error('Invalid invoice ID.');
    err.statusCode = 400;
    throw err;
  }

  if (!paymentStatus || typeof paymentStatus !== 'string') {
    const err = new Error('A valid paymentStatus is required.');
    err.statusCode = 400;
    throw err;
  }

  const normStatus = paymentStatus.trim().toUpperCase();
  if (!RECEPTIONIST_ALLOWED_PAYMENT_STATUSES.includes(normStatus)) {
    const err = new Error(
      `Invalid paymentStatus for front-desk update. Allowed: ${RECEPTIONIST_ALLOWED_PAYMENT_STATUSES.join(', ')}.`
    );
    err.statusCode = 400;
    throw err;
  }

  let normMethod;
  if (paymentMethod !== undefined) {
    if (paymentMethod === null || paymentMethod === '') {
      normMethod = null;
    } else {
      const parsed = String(paymentMethod).trim().toUpperCase();
      if (!ALLOWED_PAYMENT_METHODS.includes(parsed)) {
        const err = new Error(
          `Invalid paymentMethod. Allowed: ${ALLOWED_PAYMENT_METHODS.join(', ')}.`
        );
        err.statusCode = 400;
        throw err;
      }
      normMethod = parsed;
    }
  }

  const [existing] = await pool.query(
    'SELECT id, invoice_number, payment_status, payment_method, total_amount, paid_at FROM invoices WHERE id = ? LIMIT 1;',
    [invoiceId]
  );

  if (existing.length === 0) {
    const err = new Error('Invoice not found.');
    err.statusCode = 404;
    throw err;
  }

  const current = existing[0];
  const setClauses = ['payment_status = ?'];
  const updateParams = [normStatus];

  if (normStatus === 'PAID') {
    if (!current.paid_at) {
      setClauses.push('paid_at = CURRENT_TIMESTAMP');
    }
  } else if (normStatus === 'PENDING') {
    setClauses.push('paid_at = NULL');
  }

  if (normMethod !== undefined) {
    setClauses.push('payment_method = ?');
    updateParams.push(normMethod);
  }

  updateParams.push(invoiceId);

  await pool.query(
    `UPDATE invoices SET ${setClauses.join(', ')} WHERE id = ?;`,
    updateParams
  );

  // Return only operational invoice fields — never expose hospital-wide revenue summary
  const [updatedRows] = await pool.query(
    `SELECT
       i.id,
       i.invoice_number,
       i.appointment_id,
       i.total_amount,
       i.currency,
       i.payment_status,
       i.payment_method,
       DATE_FORMAT(i.issue_date, '%Y-%m-%d') AS issue_date,
       i.paid_at,
       i.updated_at
     FROM invoices i
     WHERE i.id = ?
     LIMIT 1;`,
    [invoiceId]
  );

  const row = updatedRows[0];
  return {
    id: row.id,
    invoiceNumber: row.invoice_number,
    appointmentId: row.appointment_id,
    totalAmount: parseFloat(row.total_amount),
    currency: row.currency,
    paymentStatus: row.payment_status,
    paymentMethod: row.payment_method,
    issueDate: row.issue_date,
    paidAt: row.paid_at,
    updatedAt: row.updated_at,
  };
}
