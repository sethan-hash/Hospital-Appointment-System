import { pool } from '../config/db.js';

// Columns that are safe to return for user listings — password_hash is never included
const USER_SAFE_COLS = 'u.id, u.role, u.full_name, u.email, u.phone, u.status, u.created_at, u.updated_at';

/**
 * Admin Service
 * Queries live data across patients, doctors, appointments, invoices, and hospital resources.
 * Identity is strictly verified using the authenticated admin user's JWT ID.
 */

/**
 * Retrieves aggregate system metrics, recent appointments, and resources for the Admin Dashboard.
 *
 * @param {number} adminUserId - Authenticated admin's user ID from JWT
 * @returns {Promise<object>} Dashboard metrics payload
 */
export async function getAdminDashboardMetrics(adminUserId) {
  // 1. Verify admin user identity and status
  const [adminRows] = await pool.query(
    'SELECT id, role, full_name, email, phone, status FROM users WHERE id = ? AND role = "ADMIN" LIMIT 1;',
    [adminUserId]
  );

  if (adminRows.length === 0 || adminRows[0].status !== 'ACTIVE') {
    const error = new Error('Admin profile not found or account is inactive.');
    error.statusCode = 403;
    throw error;
  }

  const adminUser = adminRows[0];

  // 2. Fetch counts in parallel across tables
  const [
    [patientsCountRows],
    [doctorsCountRows],
    [activeDoctorsRows],
    [todayAptRows],
    [upcomingAptRows],
    [completedAptRows],
    [cancelledAptRows],
    [totalAptRows],
    [totalInvoicesRows],
    [paidInvoicesRows],
    [pendingInvoicesRows],
    [totalResourcesRows],
    [availableResourcesRows],
    [occupiedResourcesRows],
    [recentAppointmentsRows],
    [resourcesListRows],
  ] = await Promise.all([
    pool.query('SELECT COUNT(*) AS count FROM patients;'),
    pool.query('SELECT COUNT(*) AS count FROM doctors;'),
    pool.query('SELECT COUNT(*) AS count FROM doctors WHERE is_available = TRUE;'),
    pool.query('SELECT COUNT(*) AS count FROM appointments WHERE appointment_date = CURDATE();'),
    pool.query('SELECT COUNT(*) AS count FROM appointments WHERE appointment_date >= CURDATE() AND status = "SCHEDULED";'),
    pool.query('SELECT COUNT(*) AS count FROM appointments WHERE status = "COMPLETED";'),
    pool.query('SELECT COUNT(*) AS count FROM appointments WHERE status = "CANCELLED";'),
    pool.query('SELECT COUNT(*) AS count FROM appointments;'),
    pool.query('SELECT COUNT(*) AS count FROM invoices;'),
    pool.query('SELECT COUNT(*) AS count, COALESCE(SUM(total_amount), 0) AS total FROM invoices WHERE payment_status = "PAID";'),
    pool.query('SELECT COUNT(*) AS count, COALESCE(SUM(total_amount), 0) AS total FROM invoices WHERE payment_status = "PENDING";'),
    pool.query('SELECT COUNT(*) AS count FROM resources;'),
    pool.query('SELECT COUNT(*) AS count FROM resources WHERE status = "AVAILABLE";'),
    pool.query('SELECT COUNT(*) AS count FROM resources WHERE status = "OCCUPIED";'),
    pool.query(`
      SELECT 
        a.id,
        a.appointment_date,
        a.appointment_time,
        a.status,
        a.type,
        a.reason_for_visit,
        p.id AS patient_id,
        u_p.full_name AS patient_name,
        d.id AS doctor_id,
        u_d.full_name AS doctor_name,
        d.department,
        d.specialization
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      JOIN users u_p ON p.user_id = u_p.id
      JOIN doctors d ON a.doctor_id = d.id
      JOIN users u_d ON d.user_id = u_d.id
      ORDER BY a.appointment_date DESC, a.appointment_time DESC
      LIMIT 5;
    `),
    pool.query(`
      SELECT 
        id,
        resource_type,
        resource_code,
        hospital_name,
        location_ward,
        status
      FROM resources
      ORDER BY id ASC;
    `),
  ]);

  const totalPatients = Number(patientsCountRows[0]?.count || 0);
  const totalDoctors = Number(doctorsCountRows[0]?.count || 0);
  const activeDoctors = Number(activeDoctorsRows[0]?.count || 0);
  const todayAppointments = Number(todayAptRows[0]?.count || 0);
  const upcomingAppointments = Number(upcomingAptRows[0]?.count || 0);
  const completedAppointments = Number(completedAptRows[0]?.count || 0);
  const cancelledAppointments = Number(cancelledAptRows[0]?.count || 0);
  const totalAppointments = Number(totalAptRows[0]?.count || 0);

  const totalInvoices = Number(totalInvoicesRows[0]?.count || 0);
  const paidCount = Number(paidInvoicesRows[0]?.count || 0);
  const paidRevenue = parseFloat(paidInvoicesRows[0]?.total || 0);
  const pendingCount = Number(pendingInvoicesRows[0]?.count || 0);
  const pendingRevenue = parseFloat(pendingInvoicesRows[0]?.total || 0);

  const totalResources = Number(totalResourcesRows[0]?.count || 0);
  const availableResources = Number(availableResourcesRows[0]?.count || 0);
  const occupiedResources = Number(occupiedResourcesRows[0]?.count || 0);

  // Map recent appointments into camelCase format
  const recentAppointments = recentAppointmentsRows.map((row) => ({
    id: row.id,
    appointmentDate: row.appointment_date,
    appointmentTime: row.appointment_time,
    status: row.status,
    type: row.type,
    reasonForVisit: row.reason_for_visit,
    patientId: row.patient_id,
    patientName: row.patient_name,
    doctorId: row.doctor_id,
    doctorName: row.doctor_name,
    department: row.department,
    specialization: row.specialization,
  }));

  // Map resources into camelCase format
  const resources = resourcesListRows.map((row) => ({
    id: row.id,
    resourceType: row.resource_type,
    resourceCode: row.resource_code,
    hospitalName: row.hospital_name,
    locationWard: row.location_ward,
    status: row.status,
  }));

  return {
    admin: {
      id: adminUser.id,
      fullName: adminUser.full_name,
      email: adminUser.email,
      phone: adminUser.phone,
      role: adminUser.role,
    },
    statistics: {
      totalPatients,
      totalDoctors,
      activeDoctors,
      todayAppointments,
      upcomingAppointments,
      completedAppointments,
      cancelledAppointments,
      totalAppointments,
      billing: {
        totalInvoices,
        paidCount,
        paidRevenue,
        pendingCount,
        pendingRevenue,
        currency: 'INR',
      },
      resources: {
        total: totalResources,
        available: availableResources,
        occupied: occupiedResources,
      },
    },
    recentAppointments,
    resources,
  };
}

/**
 * Returns a paginated, filterable list of all platform users.
 * Safe fields only — password_hash is never included.
 *
 * @param {object} filters
 * @param {string} [filters.search]  - Partial match on full_name or email (case-insensitive)
 * @param {string} [filters.role]    - Exact role filter: PATIENT|DOCTOR|RECEPTIONIST|ADMIN
 * @param {string} [filters.status]  - Exact status filter: ACTIVE|INACTIVE|SUSPENDED
 * @returns {Promise<object[]>}
 */
export async function listUsers({ search = '', role = '', status = '' } = {}) {
  const conditions = [];
  const params = [];

  if (search) {
    conditions.push('(u.full_name LIKE ? OR u.email LIKE ?)');
    const pattern = `%${search}%`;
    params.push(pattern, pattern);
  }

  if (role) {
    conditions.push('u.role = ?');
    params.push(role.toUpperCase());
  }

  if (status) {
    conditions.push('u.status = ?');
    params.push(status.toUpperCase());
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const [rows] = await pool.query(
    `SELECT
       ${USER_SAFE_COLS},
       -- Optional linked profile summary
       d.specialization,
       d.department,
       d.hospital_name AS hospitalName,
       p.gender AS patientGender,
       p.city AS patientCity
     FROM users u
     LEFT JOIN doctors d ON d.user_id = u.id
     LEFT JOIN patients p ON p.user_id = u.id
     ${whereClause}
     ORDER BY u.id ASC;`,
    params
  );

  return rows.map((row) => ({
    id: row.id,
    role: row.role,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    // Include linked profile info where relevant
    ...(row.role === 'DOCTOR' && {
      profile: {
        specialization: row.specialization,
        department: row.department,
        hospitalName: row.hospitalName,
      },
    }),
    ...(row.role === 'PATIENT' && {
      profile: {
        gender: row.patientGender,
        city: row.patientCity,
      },
    }),
  }));
}

/**
 * Updates a user's account status (ACTIVE | INACTIVE | SUSPENDED).
 * Prevents deactivating the last active ADMIN account to avoid lockout.
 *
 * @param {number} adminUserId  - ID of the requesting admin (from JWT); used for lockout guard
 * @param {number} targetUserId - ID of the user to update
 * @param {string} newStatus    - 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'
 * @returns {Promise<object>}   - Updated safe user record
 */
export async function updateUserStatus(adminUserId, targetUserId, newStatus) {
  const ALLOWED_STATUSES = ['ACTIVE', 'INACTIVE', 'SUSPENDED'];
  const normalizedStatus = (newStatus || '').toUpperCase();

  if (!ALLOWED_STATUSES.includes(normalizedStatus)) {
    const err = new Error(`Invalid status value. Allowed: ${ALLOWED_STATUSES.join(', ')}.`);
    err.statusCode = 400;
    throw err;
  }

  // 1. Fetch the target user to ensure they exist
  const [targetRows] = await pool.query(
    `SELECT id, role, full_name, email, phone, status FROM users WHERE id = ? LIMIT 1;`,
    [targetUserId]
  );

  if (targetRows.length === 0) {
    const err = new Error('User not found.');
    err.statusCode = 404;
    throw err;
  }

  const target = targetRows[0];

  // 2. Lockout guard — prevent deactivating/suspending the last active ADMIN
  if (target.role === 'ADMIN' && normalizedStatus !== 'ACTIVE') {
    const [[{ activeAdminCount }]] = await pool.query(
      `SELECT COUNT(*) AS activeAdminCount FROM users WHERE role = 'ADMIN' AND status = 'ACTIVE';`
    );

    if (Number(activeAdminCount) <= 1) {
      const err = new Error(
        'Cannot deactivate or suspend the last active administrator account. ' +
        'Promote another user to ADMIN first.'
      );
      err.statusCode = 409;
      throw err;
    }
  }

  // 3. Persist the status change
  await pool.query(
    `UPDATE users SET status = ? WHERE id = ?;`,
    [normalizedStatus, targetUserId]
  );

  return {
    id: target.id,
    role: target.role,
    fullName: target.full_name,
    email: target.email,
    phone: target.phone,
    previousStatus: target.status,
    newStatus: normalizedStatus,
  };
}

const ALLOWED_INVOICE_STATUSES = ['PENDING', 'PAID', 'PARTIALLY_PAID', 'CANCELLED', 'REFUNDED'];
const ALLOWED_PAYMENT_METHODS = ['UPI', 'CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'NET_BANKING', 'INSURANCE'];
const ALLOWED_RESOURCE_STATUSES = ['AVAILABLE', 'OCCUPIED', 'UNDER_MAINTENANCE', 'RESERVED'];
const ALLOWED_RESOURCE_TYPES = ['ICU_BED', 'GENERAL_BED', 'VENTILATOR', 'OXYGEN_CYLINDER', 'AMBULANCE', 'OPERATION_THEATRE'];

/**
 * Returns a filterable list of all hospital invoices, including patient and appointment metadata.
 * Safe fields only — no password_hash or sensitive user information.
 *
 * @param {object} [filters]
 * @param {string} [filters.search]        - Search invoice_number, patient name, or patient email
 * @param {string} [filters.status]        - Payment status: PENDING|PAID|PARTIALLY_PAID|CANCELLED|REFUNDED
 * @param {string} [filters.paymentMethod] - Payment method: UPI|CASH|CREDIT_CARD|DEBIT_CARD|NET_BANKING|INSURANCE
 * @param {string} [filters.dateFrom]      - Issue date from (YYYY-MM-DD)
 * @param {string} [filters.dateTo]        - Issue date to (YYYY-MM-DD)
 * @returns {Promise<{ invoices: object[], summary: object }>}
 */
export async function listInvoices({ search = '', status = '', paymentMethod = '', dateFrom = '', dateTo = '' } = {}) {
  const conditions = [];
  const params = [];

  if (search && search.trim()) {
    conditions.push('(i.invoice_number LIKE ? OR u_p.full_name LIKE ? OR u_p.email LIKE ?)');
    const term = `%${search.trim()}%`;
    params.push(term, term, term);
  }

  if (status && status.trim()) {
    const normStatus = status.trim().toUpperCase();
    if (ALLOWED_INVOICE_STATUSES.includes(normStatus)) {
      conditions.push('i.payment_status = ?');
      params.push(normStatus);
    }
  }

  if (paymentMethod && paymentMethod.trim()) {
    const normMethod = paymentMethod.trim().toUpperCase();
    if (ALLOWED_PAYMENT_METHODS.includes(normMethod)) {
      conditions.push('i.payment_method = ?');
      params.push(normMethod);
    }
  }

  if (dateFrom && dateFrom.trim()) {
    conditions.push('i.issue_date >= ?');
    params.push(dateFrom.trim());
  }

  if (dateTo && dateTo.trim()) {
    conditions.push('i.issue_date <= ?');
    params.push(dateTo.trim());
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const [rows] = await pool.query(
    `SELECT
       i.id,
       i.invoice_number,
       i.patient_id,
       i.appointment_id,
       i.consultation_fee,
       i.procedure_fee,
       i.medicine_fee,
       i.tax_amount,
       i.total_amount,
       i.currency,
       i.payment_status,
       i.payment_method,
       i.issue_date,
       i.paid_at,
       i.created_at,
       i.updated_at,
       u_p.full_name AS patient_name,
       u_p.email AS patient_email,
       u_p.phone AS patient_phone,
       p.gender AS patient_gender,
       p.blood_group AS patient_blood_group,
       a.appointment_date,
       a.appointment_time,
       a.type AS appointment_type,
       u_d.full_name AS doctor_name,
       d.department AS doctor_department,
       d.specialization AS doctor_specialization
     FROM invoices i
     JOIN patients p ON i.patient_id = p.id
     JOIN users u_p ON p.user_id = u_p.id
     LEFT JOIN appointments a ON i.appointment_id = a.id
     LEFT JOIN doctors d ON a.doctor_id = d.id
     LEFT JOIN users u_d ON d.user_id = u_d.id
     ${whereClause}
     ORDER BY i.issue_date DESC, i.id DESC;`,
    params
  );

  const [summaryRows] = await pool.query(
    `SELECT
       COUNT(*) AS totalCount,
       COALESCE(SUM(total_amount), 0) AS totalRevenue,
       COALESCE(SUM(CASE WHEN payment_status = 'PAID' THEN 1 ELSE 0 END), 0) AS paidCount,
       COALESCE(SUM(CASE WHEN payment_status = 'PAID' THEN total_amount ELSE 0 END), 0) AS paidRevenue,
       COALESCE(SUM(CASE WHEN payment_status = 'PENDING' THEN 1 ELSE 0 END), 0) AS pendingCount,
       COALESCE(SUM(CASE WHEN payment_status = 'PENDING' THEN total_amount ELSE 0 END), 0) AS pendingRevenue,
       COALESCE(SUM(CASE WHEN payment_method = 'INSURANCE' THEN 1 ELSE 0 END), 0) AS insuranceCount,
       COALESCE(SUM(CASE WHEN payment_method = 'INSURANCE' THEN total_amount ELSE 0 END), 0) AS insuranceRevenue
     FROM invoices;`
  );

  const summary = {
    totalInvoices: Number(summaryRows[0]?.totalCount || 0),
    totalRevenue: parseFloat(summaryRows[0]?.totalRevenue || 0),
    paidCount: Number(summaryRows[0]?.paidCount || 0),
    paidRevenue: parseFloat(summaryRows[0]?.paidRevenue || 0),
    pendingCount: Number(summaryRows[0]?.pendingCount || 0),
    pendingRevenue: parseFloat(summaryRows[0]?.pendingRevenue || 0),
    insuranceCount: Number(summaryRows[0]?.insuranceCount || 0),
    insuranceRevenue: parseFloat(summaryRows[0]?.insuranceRevenue || 0),
    currency: 'INR',
  };

  const invoices = rows.map((row) => ({
    id: row.id,
    invoiceNumber: row.invoice_number,
    patientId: row.patient_id,
    appointmentId: row.appointment_id,
    consultationFee: parseFloat(row.consultation_fee),
    procedureFee: parseFloat(row.procedure_fee),
    medicineFee: parseFloat(row.medicine_fee),
    taxAmount: parseFloat(row.tax_amount),
    totalAmount: parseFloat(row.total_amount),
    currency: row.currency,
    paymentStatus: row.payment_status,
    paymentMethod: row.payment_method,
    issueDate: row.issue_date,
    paidAt: row.paid_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    patient: {
      id: row.patient_id,
      fullName: row.patient_name,
      email: row.patient_email,
      phone: row.patient_phone,
      gender: row.patient_gender,
      bloodGroup: row.patient_blood_group,
    },
    appointment: row.appointment_id
      ? {
          id: row.appointment_id,
          date: row.appointment_date,
          time: row.appointment_time,
          type: row.appointment_type,
          doctorName: row.doctor_name,
          department: row.doctor_department,
          specialization: row.doctor_specialization,
        }
      : null,
  }));

  return { invoices, summary };
}

/**
 * Retrieves full details for a single invoice.
 *
 * @param {number} invoiceId
 * @returns {Promise<object>}
 */
export async function getInvoiceById(invoiceId) {
  if (!invoiceId || !Number.isInteger(invoiceId) || invoiceId <= 0) {
    const err = new Error('Invalid invoice ID.');
    err.statusCode = 400;
    throw err;
  }

  const [rows] = await pool.query(
    `SELECT
       i.id,
       i.invoice_number,
       i.patient_id,
       i.appointment_id,
       i.consultation_fee,
       i.procedure_fee,
       i.medicine_fee,
       i.tax_amount,
       i.total_amount,
       i.currency,
       i.payment_status,
       i.payment_method,
       i.issue_date,
       i.paid_at,
       i.created_at,
       i.updated_at,
       u_p.full_name AS patient_name,
       u_p.email AS patient_email,
       u_p.phone AS patient_phone,
       p.gender AS patient_gender,
       p.blood_group AS patient_blood_group,
       a.appointment_date,
       a.appointment_time,
       a.type AS appointment_type,
       u_d.full_name AS doctor_name,
       d.department AS doctor_department,
       d.specialization AS doctor_specialization
     FROM invoices i
     JOIN patients p ON i.patient_id = p.id
     JOIN users u_p ON p.user_id = u_p.id
     LEFT JOIN appointments a ON i.appointment_id = a.id
     LEFT JOIN doctors d ON a.doctor_id = d.id
     LEFT JOIN users u_d ON d.user_id = u_d.id
     WHERE i.id = ?
     LIMIT 1;`,
    [invoiceId]
  );

  if (rows.length === 0) {
    const err = new Error('Invoice not found.');
    err.statusCode = 404;
    throw err;
  }

  const row = rows[0];
  return {
    id: row.id,
    invoiceNumber: row.invoice_number,
    patientId: row.patient_id,
    appointmentId: row.appointment_id,
    consultationFee: parseFloat(row.consultation_fee),
    procedureFee: parseFloat(row.procedure_fee),
    medicineFee: parseFloat(row.medicine_fee),
    taxAmount: parseFloat(row.tax_amount),
    totalAmount: parseFloat(row.total_amount),
    currency: row.currency,
    paymentStatus: row.payment_status,
    paymentMethod: row.payment_method,
    issueDate: row.issue_date,
    paidAt: row.paid_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    patient: {
      id: row.patient_id,
      fullName: row.patient_name,
      email: row.patient_email,
      phone: row.patient_phone,
      gender: row.patient_gender,
      bloodGroup: row.patient_blood_group,
    },
    appointment: row.appointment_id
      ? {
          id: row.appointment_id,
          date: row.appointment_date,
          time: row.appointment_time,
          type: row.appointment_type,
          doctorName: row.doctor_name,
          department: row.doctor_department,
          specialization: row.doctor_specialization,
        }
      : null,
  };
}

/**
 * Updates an invoice's payment status and/or payment method.
 *
 * @param {number} adminUserId
 * @param {number} invoiceId
 * @param {object} updates
 * @param {string} updates.paymentStatus
 * @param {string|null} [updates.paymentMethod]
 * @returns {Promise<object>} Updated invoice record
 */
export async function updateInvoiceStatus(adminUserId, invoiceId, { paymentStatus, paymentMethod }) {
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
  if (!ALLOWED_INVOICE_STATUSES.includes(normStatus)) {
    const err = new Error(`Invalid paymentStatus. Allowed: ${ALLOWED_INVOICE_STATUSES.join(', ')}.`);
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
        const err = new Error(`Invalid paymentMethod. Allowed: ${ALLOWED_PAYMENT_METHODS.join(', ')}.`);
        err.statusCode = 400;
        throw err;
      }
      normMethod = parsed;
    }
  }

  const [existing] = await pool.query(
    'SELECT id, payment_status, payment_method, paid_at FROM invoices WHERE id = ? LIMIT 1;',
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
  } else if (normStatus === 'PENDING' || normStatus === 'CANCELLED') {
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

  return getInvoiceById(invoiceId);
}

/**
 * Returns a filterable list of all hospital infrastructure resources.
 * Safe fields only — includes allocated patient metadata when occupied.
 *
 * @param {object} [filters]
 * @param {string} [filters.search] - Search resource code, ward/location, or hospital name
 * @param {string} [filters.type]   - Resource type filter
 * @param {string} [filters.status] - Resource status filter
 * @returns {Promise<{ resources: object[], summary: object }>}
 */
export async function listResources({ search = '', type = '', status = '' } = {}) {
  const conditions = [];
  const params = [];

  if (search && search.trim()) {
    conditions.push('(r.resource_code LIKE ? OR r.location_ward LIKE ? OR r.hospital_name LIKE ?)');
    const term = `%${search.trim()}%`;
    params.push(term, term, term);
  }

  if (type && type.trim()) {
    const normType = type.trim().toUpperCase();
    if (ALLOWED_RESOURCE_TYPES.includes(normType)) {
      conditions.push('r.resource_type = ?');
      params.push(normType);
    }
  }

  if (status && status.trim()) {
    const normStatus = status.trim().toUpperCase();
    if (ALLOWED_RESOURCE_STATUSES.includes(normStatus)) {
      conditions.push('r.status = ?');
      params.push(normStatus);
    }
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const [rows] = await pool.query(
    `SELECT
       r.id,
       r.resource_type,
       r.resource_code,
       r.hospital_name,
       r.location_ward,
       r.status,
       r.allocated_patient_id,
       r.last_inspected_at,
       r.created_at,
       r.updated_at,
       u_p.full_name AS allocated_patient_name,
       u_p.email AS allocated_patient_email,
       u_p.phone AS allocated_patient_phone
     FROM resources r
     LEFT JOIN patients p ON r.allocated_patient_id = p.id
     LEFT JOIN users u_p ON p.user_id = u_p.id
     ${whereClause}
     ORDER BY r.id ASC;`,
    params
  );

  const [summaryRows] = await pool.query(
    `SELECT
       COUNT(*) AS total,
       COALESCE(SUM(CASE WHEN status = 'AVAILABLE' THEN 1 ELSE 0 END), 0) AS available,
       COALESCE(SUM(CASE WHEN status = 'OCCUPIED' THEN 1 ELSE 0 END), 0) AS occupied,
       COALESCE(SUM(CASE WHEN status = 'UNDER_MAINTENANCE' THEN 1 ELSE 0 END), 0) AS underMaintenance,
       COALESCE(SUM(CASE WHEN status = 'RESERVED' THEN 1 ELSE 0 END), 0) AS reserved
     FROM resources;`
  );

  const summary = {
    total: Number(summaryRows[0]?.total || 0),
    available: Number(summaryRows[0]?.available || 0),
    occupied: Number(summaryRows[0]?.occupied || 0),
    underMaintenance: Number(summaryRows[0]?.underMaintenance || 0),
    reserved: Number(summaryRows[0]?.reserved || 0),
  };

  const resources = rows.map((row) => ({
    id: row.id,
    resourceType: row.resource_type,
    resourceCode: row.resource_code,
    hospitalName: row.hospital_name,
    locationWard: row.location_ward,
    status: row.status,
    allocatedPatientId: row.allocated_patient_id,
    allocatedPatient: row.allocated_patient_id
      ? {
          id: row.allocated_patient_id,
          fullName: row.allocated_patient_name,
          email: row.allocated_patient_email,
          phone: row.allocated_patient_phone,
        }
      : null,
    lastInspectedAt: row.last_inspected_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  return { resources, summary };
}

/**
 * Updates a hospital infrastructure resource's status and optional allocated patient.
 * Prevents invalid resource states:
 * - Setting AVAILABLE or UNDER_MAINTENANCE clears allocated_patient_id to NULL.
 * - Setting OCCUPIED or RESERVED with a patient validates patient existence in DB.
 *
 * @param {number} adminUserId
 * @param {number} resourceId
 * @param {object} updates
 * @param {string} updates.status
 * @param {number|null} [updates.allocatedPatientId]
 * @returns {Promise<object>} Updated resource record
 */
export async function updateResourceStatus(adminUserId, resourceId, { status, allocatedPatientId } = {}) {
  if (!resourceId || !Number.isInteger(resourceId) || resourceId <= 0) {
    const err = new Error('Invalid resource ID.');
    err.statusCode = 400;
    throw err;
  }

  if (!status || typeof status !== 'string') {
    const err = new Error('A valid status is required.');
    err.statusCode = 400;
    throw err;
  }

  const normStatus = status.trim().toUpperCase();
  if (!ALLOWED_RESOURCE_STATUSES.includes(normStatus)) {
    const err = new Error(`Invalid status. Allowed: ${ALLOWED_RESOURCE_STATUSES.join(', ')}.`);
    err.statusCode = 400;
    throw err;
  }

  const [existing] = await pool.query(
    'SELECT id, resource_type, resource_code, status, allocated_patient_id FROM resources WHERE id = ? LIMIT 1;',
    [resourceId]
  );

  if (existing.length === 0) {
    const err = new Error('Resource not found.');
    err.statusCode = 404;
    throw err;
  }

  const current = existing[0];
  let newPatientId = null;

  if (normStatus === 'AVAILABLE' || normStatus === 'UNDER_MAINTENANCE') {
    newPatientId = null;
  } else if (normStatus === 'OCCUPIED' || normStatus === 'RESERVED') {
    if (allocatedPatientId !== undefined) {
      if (allocatedPatientId === null || allocatedPatientId === '') {
        newPatientId = null;
      } else {
        const pId = Number(allocatedPatientId);
        if (!Number.isInteger(pId) || pId <= 0) {
          const err = new Error('Invalid allocatedPatientId.');
          err.statusCode = 400;
          throw err;
        }

        const [patRows] = await pool.query('SELECT id FROM patients WHERE id = ? LIMIT 1;', [pId]);
        if (patRows.length === 0) {
          const err = new Error('Allocated patient not found.');
          err.statusCode = 400;
          throw err;
        }
        newPatientId = pId;
      }
    } else {
      newPatientId = current.allocated_patient_id;
    }
  }

  await pool.query(
    `UPDATE resources 
     SET status = ?, allocated_patient_id = ?, last_inspected_at = CURRENT_TIMESTAMP
     WHERE id = ?;`,
    [normStatus, newPatientId, resourceId]
  );

  const [updatedRows] = await pool.query(
    `SELECT
       r.id,
       r.resource_type,
       r.resource_code,
       r.hospital_name,
       r.location_ward,
       r.status,
       r.allocated_patient_id,
       r.last_inspected_at,
       r.created_at,
       r.updated_at,
       u_p.full_name AS allocated_patient_name,
       u_p.email AS allocated_patient_email,
       u_p.phone AS allocated_patient_phone
     FROM resources r
     LEFT JOIN patients p ON r.allocated_patient_id = p.id
     LEFT JOIN users u_p ON p.user_id = u_p.id
     WHERE r.id = ? LIMIT 1;`,
    [resourceId]
  );

  const row = updatedRows[0];
  return {
    id: row.id,
    resourceType: row.resource_type,
    resourceCode: row.resource_code,
    hospitalName: row.hospital_name,
    locationWard: row.location_ward,
    status: row.status,
    allocatedPatientId: row.allocated_patient_id,
    allocatedPatient: row.allocated_patient_id
      ? {
          id: row.allocated_patient_id,
          fullName: row.allocated_patient_name,
          email: row.allocated_patient_email,
          phone: row.allocated_patient_phone,
        }
      : null,
    lastInspectedAt: row.last_inspected_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
