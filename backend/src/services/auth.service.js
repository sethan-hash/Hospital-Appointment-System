import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../config/db.js';
import { env } from '../config/env.js';

const SALT_ROUNDS = 10;

/**
 * Hashes a plaintext password using bcrypt.
 * @param {string} plainPassword
 * @returns {Promise<string>}
 */
export async function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

/**
 * Compares a candidate password with a stored bcrypt hash.
 * @param {string} candidatePassword
 * @param {string} storedHash
 * @returns {Promise<boolean>}
 */
export async function verifyPassword(candidatePassword, storedHash) {
  return bcrypt.compare(candidatePassword, storedHash);
}

/**
 * Generates a signed JWT access token for a user.
 * @param {object} user - Safe user object containing id, email, role, and fullName.
 * @returns {string}
 */
export function generateToken(user) {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    fullName: user.fullName || user.full_name,
  };

  return jwt.sign(payload, env.jwt.secret, {
    expiresIn: env.jwt.expiresIn,
  });
}

/**
 * Verifies and decodes a JWT token.
 * @param {string} token
 * @returns {object} decoded token payload
 */
export function verifyToken(token) {
  return jwt.verify(token, env.jwt.secret);
}

/**
 * Finds a user by email address (includes password_hash for authentication verification).
 * @param {string} email
 * @returns {Promise<object|null>}
 */
export async function findUserByEmail(email) {
  const [rows] = await pool.query(
    'SELECT id, role, full_name, email, phone, password_hash, status, created_at, updated_at FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1;',
    [email.trim()]
  );
  return rows[0] || null;
}

/**
 * Retrieves a user by ID without sensitive password hash.
 * Also retrieves patient or doctor profile information if available.
 * @param {number|string} id
 * @returns {Promise<object|null>}
 */
export async function getUserById(id) {
  const [rows] = await pool.query(
    'SELECT id, role, full_name, email, phone, status, created_at, updated_at FROM users WHERE id = ? LIMIT 1;',
    [id]
  );

  const user = rows[0];
  if (!user) return null;

  let profile = null;
  if (user.role === 'PATIENT') {
    const [patientRows] = await pool.query(
      'SELECT id, date_of_birth, gender, blood_group, address, city, state, pincode, emergency_contact_name, emergency_contact_phone, allergies, chronic_conditions FROM patients WHERE user_id = ? LIMIT 1;',
      [user.id]
    );
    profile = patientRows[0] || null;
  } else if (user.role === 'DOCTOR') {
    const [doctorRows] = await pool.query(
      'SELECT id, specialization, qualification, department, hospital_name, consultation_fee, experience_years, bio, is_available FROM doctors WHERE user_id = ? LIMIT 1;',
      [user.id]
    );
    profile = doctorRows[0] || null;
  }

  return {
    id: user.id,
    role: user.role,
    fullName: user.full_name,
    email: user.email,
    phone: user.phone,
    status: user.status,
    profile,
    createdAt: user.created_at,
  };
}

/**
 * Registers a new patient within an atomic MySQL transaction.
 * Creates records in both `users` and `patients` tables.
 * @param {object} registrationData
 * @returns {Promise<{user: object, token: string}>}
 */
export async function registerPatient(registrationData) {
  const {
    fullName,
    email,
    password,
    phone,
    dob,
    dateOfBirth,
    gender,
    bloodType,
    bloodGroup,
    emergencyContact,
    emergencyContactName,
    emergencyContactPhone,
    address,
    city,
    state,
    pincode,
    allergies,
    chronicConditions,
  } = registrationData;

  const normalizedEmail = email.toLowerCase().trim();

  // Check for duplicate email
  const existingUser = await findUserByEmail(normalizedEmail);
  if (existingUser) {
    const error = new Error('An account with this email address already exists.');
    error.statusCode = 409;
    throw error;
  }

  // Hash password
  const passwordHash = await hashPassword(password);

  // Normalize patient profile data
  const normalizedGender = (gender || 'OTHER').toUpperCase();
  const normalizedBlood = bloodGroup || bloodType || null;
  const normalizedDob = dob || dateOfBirth || null;
  const ecName = emergencyContact?.name || emergencyContactName || null;
  const ecPhone = emergencyContact?.phone || emergencyContactPhone || null;
  const patientCity = city || 'Bengaluru';
  const patientState = state || 'Karnataka';

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Insert into users table
    const [userResult] = await connection.query(
      `INSERT INTO users (role, full_name, email, phone, password_hash, status)
       VALUES ('PATIENT', ?, ?, ?, ?, 'ACTIVE');`,
      [fullName.trim(), normalizedEmail, phone.trim(), passwordHash]
    );

    const userId = userResult.insertId;

    // 2. Insert corresponding record into patients table
    const [patientResult] = await connection.query(
      `INSERT INTO patients (
         user_id, date_of_birth, gender, blood_group, address, city, state, pincode,
         emergency_contact_name, emergency_contact_phone, allergies, chronic_conditions
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        userId,
        normalizedDob,
        normalizedGender,
        normalizedBlood,
        address || null,
        patientCity,
        patientState,
        pincode || null,
        ecName,
        ecPhone,
        allergies || null,
        chronicConditions || null,
      ]
    );

    await connection.commit();

    const safeUser = {
      id: userId,
      role: 'PATIENT',
      fullName: fullName.trim(),
      email: normalizedEmail,
      phone: phone.trim(),
      status: 'ACTIVE',
      patientId: patientResult.insertId,
      profile: {
        id: patientResult.insertId,
        dateOfBirth: normalizedDob,
        gender: normalizedGender,
        bloodGroup: normalizedBlood,
        allergies: allergies || null,
        chronicConditions: chronicConditions || null,
      },
    };

    const token = generateToken(safeUser);

    return { user: safeUser, token };
  } catch (err) {
    await connection.rollback();

    // Check for MySQL duplicate key error (ER_DUP_ENTRY)
    if (err.code === 'ER_DUP_ENTRY') {
      const error = new Error(
        err.message.includes('email')
          ? 'An account with this email address already exists.'
          : 'An account with this phone number already exists.'
      );
      error.statusCode = 409;
      throw error;
    }

    throw err;
  } finally {
    connection.release();
  }
}

/**
 * Authenticates a user with email and password.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{user: object, token: string}>}
 */
export async function loginUser(email, password) {
  const user = await findUserByEmail(email);

  // Reject unknown user with generic 401 message
  if (!user) {
    const error = new Error('Invalid email or password.');
    error.statusCode = 401;
    throw error;
  }

  // Reject inactive/suspended user
  if (user.status !== 'ACTIVE') {
    const error = new Error('Your account is currently inactive or suspended. Please contact support.');
    error.statusCode = 403;
    throw error;
  }

  // Verify bcrypt password hash
  const isValid = await verifyPassword(password, user.password_hash);
  if (!isValid) {
    const error = new Error('Invalid email or password.');
    error.statusCode = 401;
    throw error;
  }

  const safeUser = await getUserById(user.id);
  const token = generateToken(safeUser);

  return { user: safeUser, token };
}
