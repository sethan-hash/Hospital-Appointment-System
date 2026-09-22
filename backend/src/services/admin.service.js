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
