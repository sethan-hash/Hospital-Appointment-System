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
