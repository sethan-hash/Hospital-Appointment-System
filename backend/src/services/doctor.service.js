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
    title: row.specialization,           // displayed as subtitle (e.g. "Cardiology")
    department: `${row.department} Dept.`,
    specialtyId: row.specialization.toLowerCase(), // matches MOCK_SPECIALTIES id values
    location: row.location,
    qualification: row.qualification,
    consultationFee: parseFloat(row.consultationFee),
    experience: `${row.experienceYears}+ Years Exp`,
    experienceYears: row.experienceYears,
    bio: row.bio || '',
    isAvailable: Boolean(row.isAvailable),
    // rating: DB has no rating column; default shown in card until reviews are added
    rating: 4.8,
    reviewCount: 0,
    // image: DB has no image column; frontend uses a default placeholder avatar
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
