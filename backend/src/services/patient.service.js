import { pool } from '../config/db.js';

/**
 * Normalizes database query rows into a consistent patient profile payload for client consumption.
 * @param {object} row - Flattened user and patient join row
 * @returns {object|null}
 */
function normalizePatientProfile(row) {
  if (!row) return null;

  const formattedDob = row.date_of_birth
    ? (row.date_of_birth instanceof Date
        ? row.date_of_birth.toISOString().split('T')[0]
        : String(row.date_of_birth).split('T')[0])
    : null;

  return {
    id: row.patient_id,
    userId: row.user_id,
    name: row.full_name,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    status: row.status,
    dob: formattedDob,
    dateOfBirth: formattedDob,
    gender: row.gender,
    bloodType: row.blood_group,
    bloodGroup: row.blood_group,
    address: row.address,
    city: row.city,
    state: row.state,
    pincode: row.pincode,
    allergies: row.allergies || '',
    chronicConditions: row.chronic_conditions || '',
    emergencyContactName: row.emergency_contact_name || '',
    emergencyContactPhone: row.emergency_contact_phone || '',
    emergencyContact: {
      name: row.emergency_contact_name || '',
      phone: row.emergency_contact_phone || '',
    },
    createdAt: row.patient_created_at || row.user_created_at,
  };
}

/**
 * Retrieves the full profile of an authenticated patient by their user ID.
 * @param {number|string} userId - Authenticated user's ID
 * @returns {Promise<object|null>}
 */
export async function getPatientProfileByUserId(userId) {
  const [rows] = await pool.query(
    `SELECT 
       u.id AS user_id,
       u.role,
       u.full_name,
       u.email,
       u.phone,
       u.status,
       u.created_at AS user_created_at,
       p.id AS patient_id,
       p.date_of_birth,
       p.gender,
       p.blood_group,
       p.address,
       p.city,
       p.state,
       p.pincode,
       p.emergency_contact_name,
       p.emergency_contact_phone,
       p.allergies,
       p.chronic_conditions,
       p.created_at AS patient_created_at
     FROM users u
     LEFT JOIN patients p ON p.user_id = u.id
     WHERE u.id = ? AND u.role = 'PATIENT'
     LIMIT 1;`,
    [userId]
  );

  if (rows.length === 0) {
    return null;
  }

  return normalizePatientProfile(rows[0]);
}

/**
 * Updates an authenticated patient's profile details.
 * Atomically updates user details (full_name, email, phone) and patient details
 * (blood_group, allergies, chronic_conditions, emergency contact).
 * @param {number|string} userId
 * @param {object} updates
 * @returns {Promise<object>} updated profile
 */
export async function updatePatientProfile(userId, updates) {
  const existingProfile = await getPatientProfileByUserId(userId);
  if (!existingProfile) {
    const error = new Error('Patient profile not found.');
    error.statusCode = 404;
    throw error;
  }

  const {
    name,
    fullName,
    email,
    phone,
    bloodType,
    bloodGroup,
    allergies,
    chronicConditions,
    emergencyContactName,
    emergencyContactPhone,
    emergencyContact,
  } = updates;

  const newFullName = (name || fullName || '').trim() || existingProfile.fullName;
  const newEmail = email ? email.toLowerCase().trim() : existingProfile.email;
  const newPhone = phone ? phone.trim() : existingProfile.phone;
  const newBloodGroup = (bloodGroup || bloodType || existingProfile.bloodGroup || null);
  const newAllergies = allergies !== undefined ? allergies : existingProfile.allergies;
  const newChronicConditions = chronicConditions !== undefined ? chronicConditions : existingProfile.chronicConditions;
  const newEcName = emergencyContactName !== undefined
    ? emergencyContactName
    : (emergencyContact?.name !== undefined ? emergencyContact.name : existingProfile.emergencyContactName);
  const newEcPhone = emergencyContactPhone !== undefined
    ? emergencyContactPhone
    : (emergencyContact?.phone !== undefined ? emergencyContact.phone : existingProfile.emergencyContactPhone);

  // Check for uniqueness of email and phone against other accounts
  const [duplicateCheck] = await pool.query(
    'SELECT id, email, phone FROM users WHERE (LOWER(email) = LOWER(?) OR phone = ?) AND id != ? LIMIT 1;',
    [newEmail, newPhone, userId]
  );

  if (duplicateCheck.length > 0) {
    const duplicate = duplicateCheck[0];
    const isEmailDup = duplicate.email.toLowerCase() === newEmail.toLowerCase();
    const error = new Error(
      isEmailDup
        ? 'An account with this email address already exists.'
        : 'An account with this phone number already exists.'
    );
    error.statusCode = 409;
    throw error;
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Update users table
    await connection.query(
      `UPDATE users
       SET full_name = ?,
           email = ?,
           phone = ?
       WHERE id = ?;`,
      [newFullName, newEmail, newPhone, userId]
    );

    // 2. Update patients table
    await connection.query(
      `UPDATE patients
       SET blood_group = ?,
           allergies = ?,
           chronic_conditions = ?,
           emergency_contact_name = ?,
           emergency_contact_phone = ?
       WHERE user_id = ?;`,
      [newBloodGroup, newAllergies, newChronicConditions, newEcName, newEcPhone, userId]
    );

    await connection.commit();
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }

  return getPatientProfileByUserId(userId);
}
