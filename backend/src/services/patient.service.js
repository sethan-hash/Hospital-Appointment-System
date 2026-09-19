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

/**
 * Normalizes a raw medical record row with its matching vitals and medications.
 * @param {object} record
 * @param {object|null} vitals
 * @param {Array<object>} medications
 * @returns {object|null}
 */
function normalizeMedicalRecord(record, vitals = null, medications = []) {
  if (!record) return null;

  const normalizedVitals = vitals
    ? {
        id: vitals.id,
        patientId: vitals.patient_id,
        appointmentId: vitals.appointment_id,
        recordedAt: vitals.recorded_at,
        bloodPressureSystolic: vitals.blood_pressure_systolic,
        bloodPressureDiastolic: vitals.blood_pressure_diastolic,
        bloodPressure:
          vitals.blood_pressure_systolic && vitals.blood_pressure_diastolic
            ? `${vitals.blood_pressure_systolic}/${vitals.blood_pressure_diastolic} mmHg`
            : null,
        heartRateBpm: vitals.heart_rate_bpm,
        respiratoryRateBpm: vitals.respiratory_rate_bpm,
        temperatureCelsius:
          vitals.temperature_celsius !== null ? Number(vitals.temperature_celsius) : null,
        spo2Percentage:
          vitals.spo2_percentage !== null ? Number(vitals.spo2_percentage) : null,
        weightKg: vitals.weight_kg !== null ? Number(vitals.weight_kg) : null,
        heightCm: vitals.height_cm !== null ? Number(vitals.height_cm) : null,
        bmi: vitals.bmi !== null ? Number(vitals.bmi) : null,
        notes: vitals.notes || null,
      }
    : null;

  const normalizedMedications = (medications || []).map((m) => ({
    id: m.id,
    medicalRecordId: m.medical_record_id,
    medicineName: m.medicine_name,
    dosage: m.dosage,
    frequency: m.frequency,
    duration: m.duration,
    instructions: m.instructions || '',
  }));

  const prescriptions = normalizedMedications.map(
    (m) =>
      `${m.medicineName} (${m.dosage}) — ${m.frequency}, ${m.duration}${
        m.instructions ? ` • ${m.instructions}` : ''
      }`
  );

  return {
    id: record.id,
    patientId: record.patient_id,
    doctorId: record.doctor_id,
    doctorName: record.doctor_name,
    doctor: record.doctor_name,
    specialty: record.doctor_specialty,
    department: record.doctor_department || record.doctor_specialty,
    appointmentId: record.appointment_id,
    appointmentType: record.appointment_type || null,
    appointmentStatus: record.appointment_status || null,
    reasonForVisit: record.reason_for_visit || null,
    visitDate: record.visit_date,
    date: record.visit_date,
    diagnosis: record.diagnosis,
    treatmentPlan: record.treatment_plan || null,
    treatment: record.treatment_plan || null,
    doctorNotes: record.doctor_notes || null,
    notes: record.doctor_notes || null,
    vitals: normalizedVitals,
    medications: normalizedMedications,
    prescriptions,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

/**
 * Retrieves all medical records for the authenticated patient, ordered newest first.
 * @param {number|string} userId
 * @returns {Promise<Array<object>>}
 */
export async function getMedicalRecordsByUserId(userId) {
  const [patients] = await pool.query(
    'SELECT id FROM patients WHERE user_id = ? LIMIT 1;',
    [userId]
  );

  if (patients.length === 0) {
    return [];
  }

  const patientId = patients[0].id;

  const [records] = await pool.query(
    `SELECT 
       mr.id,
       mr.patient_id,
       mr.doctor_id,
       mr.appointment_id,
       mr.diagnosis,
       mr.treatment_plan,
       mr.doctor_notes,
       DATE_FORMAT(mr.visit_date, '%Y-%m-%d') AS visit_date,
       mr.created_at,
       mr.updated_at,
       u.full_name AS doctor_name,
       d.specialization AS doctor_specialty,
       d.department AS doctor_department,
       a.type AS appointment_type,
       a.status AS appointment_status,
       a.reason_for_visit
     FROM medical_records mr
     JOIN doctors d ON d.id = mr.doctor_id
     JOIN users u ON u.id = d.user_id
     LEFT JOIN appointments a ON a.id = mr.appointment_id
     WHERE mr.patient_id = ?
     ORDER BY mr.visit_date DESC, mr.id DESC;`,
    [patientId]
  );

  if (records.length === 0) {
    return [];
  }

  const [vitalsRows] = await pool.query(
    `SELECT 
       id,
       patient_id,
       appointment_id,
       recorded_at,
       blood_pressure_systolic,
       blood_pressure_diastolic,
       heart_rate_bpm,
       respiratory_rate_bpm,
       temperature_celsius,
       spo2_percentage,
       weight_kg,
       height_cm,
       bmi,
       notes
     FROM vitals
     WHERE patient_id = ?;`,
    [patientId]
  );

  const [medicationsRows] = await pool.query(
    `SELECT 
       m.id,
       m.medical_record_id,
       m.medicine_name,
       m.dosage,
       m.frequency,
       m.duration,
       m.instructions
     FROM medications m
     JOIN medical_records mr ON mr.id = m.medical_record_id
     WHERE mr.patient_id = ?;`,
    [patientId]
  );

  return records.map((record) => {
    let matchedVitals = null;
    if (record.appointment_id) {
      matchedVitals = vitalsRows.find((v) => v.appointment_id === record.appointment_id) || null;
    }
    if (!matchedVitals) {
      matchedVitals = vitalsRows.find((v) => {
        if (!v.recorded_at) return false;
        const recordedDate = v.recorded_at instanceof Date
          ? v.recorded_at.toISOString().split('T')[0]
          : String(v.recorded_at).split(' ')[0];
        return recordedDate === record.visit_date;
      }) || null;
    }

    const matchedMeds = medicationsRows.filter(
      (m) => m.medical_record_id === record.id
    );

    return normalizeMedicalRecord(record, matchedVitals, matchedMeds);
  });
}

/**
 * Retrieves a single medical record by ID for the authenticated patient.
 * Returns null if not found or if the record belongs to another patient.
 * @param {number|string} userId
 * @param {number|string} recordId
 * @returns {Promise<object|null>}
 */
export async function getMedicalRecordById(userId, recordId) {
  const [patients] = await pool.query(
    'SELECT id FROM patients WHERE user_id = ? LIMIT 1;',
    [userId]
  );

  if (patients.length === 0) {
    return null;
  }

  const patientId = patients[0].id;

  const [records] = await pool.query(
    `SELECT 
       mr.id,
       mr.patient_id,
       mr.doctor_id,
       mr.appointment_id,
       mr.diagnosis,
       mr.treatment_plan,
       mr.doctor_notes,
       DATE_FORMAT(mr.visit_date, '%Y-%m-%d') AS visit_date,
       mr.created_at,
       mr.updated_at,
       u.full_name AS doctor_name,
       d.specialization AS doctor_specialty,
       d.department AS doctor_department,
       a.type AS appointment_type,
       a.status AS appointment_status,
       a.reason_for_visit
     FROM medical_records mr
     JOIN doctors d ON d.id = mr.doctor_id
     JOIN users u ON u.id = d.user_id
     LEFT JOIN appointments a ON a.id = mr.appointment_id
     WHERE mr.id = ? AND mr.patient_id = ?
     LIMIT 1;`,
    [recordId, patientId]
  );

  if (records.length === 0) {
    return null;
  }

  const record = records[0];

  let matchedVitals = null;
  if (record.appointment_id) {
    const [vitals] = await pool.query(
      `SELECT 
         id,
         patient_id,
         appointment_id,
         recorded_at,
         blood_pressure_systolic,
         blood_pressure_diastolic,
         heart_rate_bpm,
         respiratory_rate_bpm,
         temperature_celsius,
         spo2_percentage,
         weight_kg,
         height_cm,
         bmi,
         notes
       FROM vitals
       WHERE appointment_id = ? AND patient_id = ?
       LIMIT 1;`,
      [record.appointment_id, patientId]
    );
    if (vitals.length > 0) {
      matchedVitals = vitals[0];
    }
  }

  if (!matchedVitals) {
    const [vitals] = await pool.query(
      `SELECT 
         id,
         patient_id,
         appointment_id,
         recorded_at,
         blood_pressure_systolic,
         blood_pressure_diastolic,
         heart_rate_bpm,
         respiratory_rate_bpm,
         temperature_celsius,
         spo2_percentage,
         weight_kg,
         height_cm,
         bmi,
         notes
       FROM vitals
       WHERE patient_id = ? AND DATE(recorded_at) = ?
       LIMIT 1;`,
      [patientId, record.visit_date]
    );
    if (vitals.length > 0) {
      matchedVitals = vitals[0];
    }
  }

  const [medications] = await pool.query(
    `SELECT 
       id,
       medical_record_id,
       medicine_name,
       dosage,
       frequency,
       duration,
       instructions
     FROM medications
     WHERE medical_record_id = ?;`,
    [record.id]
  );

  return normalizeMedicalRecord(record, matchedVitals, medications);
}

