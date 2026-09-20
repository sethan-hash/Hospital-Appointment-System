import { pool } from '../config/db.js';

/**
 * Base SELECT for doctor listings.
 * Joins doctors with users to get the doctor's display name and status.
 * Excludes password_hash and all authentication secrets.
 */
const DOCTOR_SELECT = `
  SELECT
    d.id,
    d.user_id           AS userId,
    u.full_name         AS name,
    d.specialization,
    d.qualification,
    d.department,
    d.hospital_name     AS location,
    d.consultation_fee  AS consultationFee,
    d.experience_years  AS experienceYears,
    d.bio,
    d.is_available      AS isAvailable
  FROM doctors d
  INNER JOIN users u ON u.id = d.user_id
  WHERE u.status = 'ACTIVE'
    AND d.is_available = 1
`;

/**
 * Normalizes a raw database row into the client-facing doctor shape
 * expected by DoctorCard and the Find Doctor UI.
 *
 * @param {object} row - Raw query result row
 * @returns {object}
 */
function normalizeDoctorRow(row) {
  return {
    id: row.id,
    userId: row.userId,
    // DoctorCard reads: name, title, location, rating, image
    name: row.name,
    title: row.specialization,            // subtitle in DoctorCard (e.g. "Cardiology")
    department: `${row.department} Dept.`,
    specialtyId: row.specialization.toLowerCase(), // matches MOCK_SPECIALTIES id values
    location: row.location,
    // DoctorProfilePage reads 'education' and 'clinicName' — map from DB columns
    qualification: row.qualification,
    education: row.qualification,         // alias: DoctorProfilePage uses doctor.education
    clinicName: row.location,             // alias: DoctorProfilePage uses doctor.clinicName
    consultationFee: parseFloat(row.consultationFee),
    experience: `${row.experienceYears}+ Years Exp`,
    experienceYears: row.experienceYears,
    bio: row.bio || '',
    isAvailable: Boolean(row.isAvailable),
    // rating/reviews: no DB columns yet — defaults shown until reviews feature is built
    rating: 4.8,
    reviewCount: 0,
    reviews: [],
    // image: no DB column — DoctorCard/DoctorProfilePage handle null with a placeholder
    image: null,
  };
}

/**
 * Searches active, available doctors with optional name and specialty filters.
 * Both filters are independent — either may be absent.
 *
 * @param {object} params
 * @param {string} [params.search='']    - Partial match against doctor name, specialization, or department
 * @param {string} [params.specialty=''] - Exact match against specialization (case-insensitive)
 * @returns {Promise<object[]>} Normalized doctor list
 */
export async function searchDoctors({ search = '', specialty = '' } = {}) {
  const conditions = [];
  const values = [];

  if (search) {
    conditions.push(`(
      u.full_name   LIKE ? OR
      d.specialization LIKE ? OR
      d.department  LIKE ?
    )`);
    const pattern = `%${search}%`;
    values.push(pattern, pattern, pattern);
  }

  if (specialty) {
    conditions.push('LOWER(d.specialization) = LOWER(?)');
    values.push(specialty);
  }

  const whereClause =
    conditions.length > 0 ? ` AND ${conditions.join(' AND ')}` : '';

  const sql = `${DOCTOR_SELECT}${whereClause} ORDER BY u.full_name ASC;`;

  const [rows] = await pool.query(sql, values);
  return rows.map(normalizeDoctorRow);
}

/**
 * Retrieves a single active doctor by their doctors.id.
 * Returns null if the doctor does not exist or is inactive.
 *
 * @param {number|string} doctorId
 * @returns {Promise<object|null>}
 */
export async function getDoctorById(doctorId) {
  const sql = `${DOCTOR_SELECT} AND d.id = ? LIMIT 1;`;
  const [rows] = await pool.query(sql, [doctorId]);

  if (rows.length === 0) {
    return null;
  }

  return normalizeDoctorRow(rows[0]);
}

/**
 * Day ordering for display — Monday first, Sunday last.
 * Matches the order used on the DoctorProfilePage Office Hours section.
 */
const DAY_ORDER = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

/**
 * Formats a TIME column value (HH:MM:SS or HH:MM) into 12-hour display (e.g. "9:00 AM").
 * @param {string} t
 * @returns {string}
 */
function formatTime(t) {
  if (!t) return '';
  const [hStr, mStr] = String(t).split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
}

/**
 * Capitalises only the first letter of a day name (e.g. "MONDAY" -> "Monday").
 * @param {string} day
 * @returns {string}
 */
function formatDay(day) {
  if (!day) return '';
  return day.charAt(0) + day.slice(1).toLowerCase();
}

/**
 * Retrieves the weekly schedule for a doctor from doctor_schedules.
 * Returns schedule rows in Monday-first order.
 * Only active rows (is_active = 1) are returned.
 *
 * Shape returned matches DoctorProfilePage's doctor.schedule expectation:
 *   { day: string, hours: string, available: boolean }
 *
 * @param {number|string} doctorId
 * @returns {Promise<{ schedule: object[], doctorExists: boolean }>}
 */
export async function getDoctorAvailability(doctorId) {
  // Verify the doctor exists first
  const doctor = await getDoctorById(doctorId);
  if (!doctor) {
    return { doctorExists: false, schedule: [] };
  }

  const [rows] = await pool.query(
    `SELECT
       day_of_week,
       start_time,
       end_time,
       slot_duration_minutes,
       is_active
     FROM doctor_schedules
     WHERE doctor_id = ?
       AND is_active = 1
     ORDER BY FIELD(day_of_week,
       'MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY'
     );`,
    [doctorId]
  );

  // Build a full 7-day display — days with no row show as unavailable
  const scheduledDays = new Map(
    rows.map((r) => [r.day_of_week, r])
  );

  const schedule = DAY_ORDER.map((dayKey) => {
    const row = scheduledDays.get(dayKey);
    if (row) {
      return {
        day: formatDay(dayKey),
        hours: `${formatTime(row.start_time)} - ${formatTime(row.end_time)}`,
        available: true,
        slotDurationMinutes: row.slot_duration_minutes,
      };
    }
    return {
      day: formatDay(dayKey),
      hours: 'Unavailable',
      available: false,
      slotDurationMinutes: null,
    };
  });

  return { doctorExists: true, schedule };
}

/**
 * Resolves the doctors.id for a given users.id.
 * Returns null if no doctor profile exists for that user.
 *
 * @param {number} userId
 * @returns {Promise<number|null>}
 */
export async function getDoctorIdByUserId(userId) {
  const [rows] = await pool.query(
    'SELECT id FROM doctors WHERE user_id = ? LIMIT 1;',
    [userId]
  );
  return rows.length > 0 ? rows[0].id : null;
}

/**
 * Retrieves doctor dashboard data derived exclusively from the authenticated userId.
 * Never trusts a client-supplied doctor ID.
 *
 * Returns:
 *   - doctor profile (name, specialization, department, hospital, experience)
 *   - todayAppointments: all appointments for today sorted by appointment_time ASC
 *   - statistics:
 *       - todayCount        — appointments scheduled for today
 *       - completedToday    — appointments with status COMPLETED and today's date
 *       - upcomingTotal     — SCHEDULED appointments with appointment_date >= today
 *       - totalPatients     — distinct patient_ids seen in this doctor's appointments
 *
 * @param {number} userId - From req.user.id
 * @returns {Promise<object|null>}  null if the user has no doctor profile
 */
export async function getDashboardData(userId) {
  // 1. Resolve doctor identity from userId — never from client input
  const [[doctorRow]] = await pool.query(
    `SELECT
       d.id,
       u.full_name         AS name,
       u.email,
       d.specialization,
       d.department,
       d.hospital_name     AS hospitalName,
       d.qualification,
       d.experience_years  AS experienceYears,
       d.bio,
       d.is_available      AS isAvailable
     FROM doctors d
     INNER JOIN users u ON u.id = d.user_id
     WHERE d.user_id = ?
     LIMIT 1;`,
    [userId]
  );

  if (!doctorRow) {
    return null;
  }

  const doctorId = doctorRow.id;

  // 2. Today's date in YYYY-MM-DD (server local date)
  const today = new Date();
  const todayStr = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0'),
  ].join('-');

  // 3. Today's appointments (all statuses, sorted chronologically)
  const [todayRows] = await pool.query(
    `SELECT
       a.id,
       DATE_FORMAT(a.appointment_date, '%Y-%m-%d') AS appointmentDate,
       TIME_FORMAT(a.appointment_time, '%H:%i')     AS appointmentTime,
       a.status,
       a.type,
       a.reason_for_visit  AS reasonForVisit,
       p.id                AS patientId,
       u.full_name         AS patientName
     FROM appointments a
     INNER JOIN patients p ON p.id = a.patient_id
     INNER JOIN users u    ON u.id = p.user_id
     WHERE a.doctor_id = ?
       AND a.appointment_date = ?
     ORDER BY a.appointment_time ASC;`,
    [doctorId, todayStr]
  );

  // 4. Statistics from DB — only what the schema can support
  const [[statsRow]] = await pool.query(
    `SELECT
       COUNT(CASE WHEN a.appointment_date = ? THEN 1 END)                            AS todayCount,
       COUNT(CASE WHEN a.appointment_date = ? AND a.status = 'COMPLETED' THEN 1 END) AS completedToday,
       COUNT(CASE WHEN a.appointment_date >= ? AND a.status = 'SCHEDULED' THEN 1 END) AS upcomingTotal,
       COUNT(DISTINCT a.patient_id)                                                   AS totalPatients
     FROM appointments a
     WHERE a.doctor_id = ?;`,
    [todayStr, todayStr, todayStr, doctorId]
  );

  return {
    doctor: {
      id: doctorId,
      name: doctorRow.name,
      email: doctorRow.email,
      specialization: doctorRow.specialization,
      department: doctorRow.department,
      hospitalName: doctorRow.hospitalName,
      qualification: doctorRow.qualification,
      experienceYears: doctorRow.experienceYears,
      bio: doctorRow.bio || '',
      isAvailable: Boolean(doctorRow.isAvailable),
    },
    todayAppointments: todayRows,
    statistics: {
      todayCount: Number(statsRow.todayCount),
      completedToday: Number(statsRow.completedToday),
      upcomingTotal: Number(statsRow.upcomingTotal),
      totalPatients: Number(statsRow.totalPatients),
    },
  };
}

/**
 * Retrieves details for a specific appointment belonging to the authenticated doctor,
 * along with the patient's basic profile details.
 *
 * Strict doctor ownership is enforced:
 *   WHERE a.id = ? AND a.doctor_id = ?
 * If the appointment belongs to another doctor or does not exist, returns null.
 *
 * @param {number} userId - From req.user.id (JWT)
 * @param {number} appointmentId - The appointment ID to inspect
 * @returns {Promise<object|null>}
 */
export async function getDoctorAppointmentDetails(userId, appointmentId) {
  const doctorId = await getDoctorIdByUserId(userId);
  if (!doctorId) {
    return null;
  }

  const [rows] = await pool.query(
    `SELECT
       a.id,
       DATE_FORMAT(a.appointment_date, '%Y-%m-%d') AS appointmentDate,
       TIME_FORMAT(a.appointment_time, '%H:%i')     AS appointmentTime,
       a.status,
       a.type,
       a.reason_for_visit                          AS reason,
       d.hospital_name                             AS location,
       a.created_at                                AS createdAt,
       p.id                                        AS patientId,
       u.full_name                                 AS patientName,
       u.email                                     AS patientEmail,
       u.phone                                     AS patientPhone,
       DATE_FORMAT(p.date_of_birth, '%Y-%m-%d')    AS patientDateOfBirth,
       p.gender                                    AS patientGender,
       p.blood_group                               AS patientBloodGroup,
       p.address                                   AS patientAddress,
       p.city                                      AS patientCity,
       p.state                                     AS patientState,
       p.pincode                                   AS patientPincode,
       p.emergency_contact_name                    AS emergencyContactName,
       p.emergency_contact_phone                   AS emergencyContactPhone,
       p.allergies                                 AS patientAllergies,
       p.chronic_conditions                        AS patientChronicConditions
     FROM appointments a
     INNER JOIN doctors d  ON d.id = a.doctor_id
     INNER JOIN patients p ON p.id = a.patient_id
     INNER JOIN users u    ON u.id = p.user_id
     WHERE a.id = ?
       AND a.doctor_id = ?
     LIMIT 1;`,
    [appointmentId, doctorId]
  );

  if (rows.length === 0) {
    return null;
  }

  const row = rows[0];

  const formatTime12 = (t) => {
    if (!t) return '';
    const [hStr, mStr] = t.split(':');
    const h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);
    const suffix = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
  };

  return {
    appointment: {
      id: row.id,
      date: row.appointmentDate,
      appointmentDate: row.appointmentDate,
      time: formatTime12(row.appointmentTime),
      appointmentTime: row.appointmentTime,
      status: row.status,
      type: row.type,
      reason: row.reason || '',
      location: row.location || '',
      createdAt: row.createdAt,
    },
    patient: {
      id: row.patientId,
      name: row.patientName,
      email: row.patientEmail,
      phone: row.patientPhone,
      dateOfBirth: row.patientDateOfBirth || null,
      gender: row.patientGender || null,
      bloodGroup: row.patientBloodGroup || null,
      address: row.patientAddress || null,
      city: row.patientCity || null,
      state: row.patientState || null,
      pincode: row.patientPincode || null,
      emergencyContactName: row.emergencyContactName || null,
      emergencyContactPhone: row.emergencyContactPhone || null,
      allergies: row.patientAllergies || null,
      chronicConditions: row.patientChronicConditions || null,
    },
  };
}

