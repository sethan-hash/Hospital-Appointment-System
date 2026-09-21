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

/**
 * Retrieves the clinical record, vitals, and medications for an appointment belonging to the doctor.
 * Enforces doctor ownership: appointment must belong to the authenticated doctor.
 *
 * @param {number} userId - From req.user.id (JWT)
 * @param {number} appointmentId - Target appointment
 * @returns {Promise<object|null>}
 */
export async function getClinicalRecordByAppointmentId(userId, appointmentId) {
  const doctorId = await getDoctorIdByUserId(userId);
  if (!doctorId) {
    return { error: 'DOCTOR_NOT_FOUND' };
  }

  // 1. Verify doctor owns the appointment
  const [apptRows] = await pool.query(
    `SELECT id, patient_id, appointment_date
     FROM appointments
     WHERE id = ? AND doctor_id = ?
     LIMIT 1;`,
    [appointmentId, doctorId]
  );

  if (apptRows.length === 0) {
    return { error: 'APPOINTMENT_NOT_FOUND' };
  }

  const appt = apptRows[0];

  // 2. Fetch medical record for this appointment & doctor
  const [recordRows] = await pool.query(
    `SELECT
       id,
       patient_id,
       doctor_id,
       appointment_id,
       diagnosis,
       treatment_plan AS treatmentPlan,
       doctor_notes   AS doctorNotes,
       DATE_FORMAT(visit_date, '%Y-%m-%d') AS visitDate,
       created_at     AS createdAt,
       updated_at     AS updatedAt
     FROM medical_records
     WHERE appointment_id = ? AND doctor_id = ?
     LIMIT 1;`,
    [appointmentId, doctorId]
  );

  const record = recordRows.length > 0 ? recordRows[0] : null;

  // 3. Fetch vitals for this appointment
  const [vitalsRows] = await pool.query(
    `SELECT
       id,
       patient_id,
       appointment_id,
       recorded_at AS recordedAt,
       blood_pressure_systolic  AS bloodPressureSystolic,
       blood_pressure_diastolic AS bloodPressureDiastolic,
       heart_rate_bpm           AS heartRateBpm,
       respiratory_rate_bpm     AS respiratoryRateBpm,
       temperature_celsius      AS temperatureCelsius,
       spo2_percentage          AS spo2Percentage,
       weight_kg                AS weightKg,
       height_cm                AS heightCm,
       bmi,
       notes
     FROM vitals
     WHERE appointment_id = ?
     LIMIT 1;`,
    [appointmentId]
  );

  const vitalsRow = vitalsRows.length > 0 ? vitalsRows[0] : null;
  const vitals = vitalsRow
    ? {
        ...vitalsRow,
        bloodPressure:
          vitalsRow.bloodPressureSystolic && vitalsRow.bloodPressureDiastolic
            ? `${vitalsRow.bloodPressureSystolic}/${vitalsRow.bloodPressureDiastolic}`
            : null,
        temperatureCelsius: vitalsRow.temperatureCelsius != null ? Number(vitalsRow.temperatureCelsius) : null,
        spo2Percentage: vitalsRow.spo2Percentage != null ? Number(vitalsRow.spo2Percentage) : null,
        weightKg: vitalsRow.weightKg != null ? Number(vitalsRow.weightKg) : null,
        heightCm: vitalsRow.heightCm != null ? Number(vitalsRow.heightCm) : null,
        bmi: vitalsRow.bmi != null ? Number(vitalsRow.bmi) : null,
      }
    : null;

  // 4. Fetch medications if medical record exists
  let medications = [];
  if (record) {
    const [medRows] = await pool.query(
      `SELECT
         id,
         medical_record_id AS medicalRecordId,
         medicine_name     AS medicineName,
         dosage,
         frequency,
         duration,
         instructions,
         created_at        AS createdAt
       FROM medications
       WHERE medical_record_id = ?
       ORDER BY id ASC;`,
      [record.id]
    );
    medications = medRows;
  }

  return {
    appointmentId: appt.id,
    patientId: appt.patient_id,
    record,
    vitals,
    medications,
  };
}

/**
 * Creates or updates the clinical consultation record (diagnosis, treatment plan, doctor notes)
 * for a specific appointment belonging to the authenticated doctor.
 * Uses a MySQL transaction.
 *
 * @param {number} userId - From req.user.id (JWT)
 * @param {number} appointmentId - Target appointment
 * @param {object} clinicalData - { diagnosis, treatmentPlan, doctorNotes }
 * @returns {Promise<object>}
 */
export async function saveClinicalRecord(userId, appointmentId, clinicalData) {
  const doctorId = await getDoctorIdByUserId(userId);
  if (!doctorId) {
    return { error: 'DOCTOR_NOT_FOUND' };
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Verify doctor owns the appointment
    const [apptRows] = await connection.query(
      `SELECT id, patient_id, appointment_date
       FROM appointments
       WHERE id = ? AND doctor_id = ?
       LIMIT 1;`,
      [appointmentId, doctorId]
    );

    if (apptRows.length === 0) {
      await connection.rollback();
      return { error: 'APPOINTMENT_NOT_FOUND' };
    }

    const appt = apptRows[0];
    const { diagnosis, treatmentPlan = null, doctorNotes = null } = clinicalData;

    // 2. Check if a medical record already exists for this appointment
    const [existingRecord] = await connection.query(
      `SELECT id FROM medical_records
       WHERE appointment_id = ? AND doctor_id = ?
       LIMIT 1;`,
      [appointmentId, doctorId]
    );

    let recordId;
    if (existingRecord.length > 0) {
      recordId = existingRecord[0].id;
      await connection.query(
        `UPDATE medical_records
         SET diagnosis = ?,
             treatment_plan = ?,
             doctor_notes = ?,
             updated_at = NOW()
         WHERE id = ? AND doctor_id = ?;`,
        [diagnosis, treatmentPlan, doctorNotes, recordId, doctorId]
      );
    } else {
      const [insertResult] = await connection.query(
        `INSERT INTO medical_records
           (patient_id, doctor_id, appointment_id, diagnosis, treatment_plan, doctor_notes, visit_date, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW());`,
        [appt.patient_id, doctorId, appt.id, diagnosis, treatmentPlan, doctorNotes, appt.appointment_date]
      );
      recordId = insertResult.insertId;
    }

    // 3. Fetch the updated/created record
    const [savedRows] = await connection.query(
      `SELECT
         id,
         patient_id,
         doctor_id,
         appointment_id,
         diagnosis,
         treatment_plan AS treatmentPlan,
         doctor_notes   AS doctorNotes,
         DATE_FORMAT(visit_date, '%Y-%m-%d') AS visitDate,
         created_at     AS createdAt,
         updated_at     AS updatedAt
       FROM medical_records
       WHERE id = ?;`,
      [recordId]
    );

    await connection.commit();
    return { record: savedRows[0] };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Creates or updates vitals for an appointment belonging to the authenticated doctor.
 * Uses a MySQL transaction.
 *
 * @param {number} userId - From req.user.id (JWT)
 * @param {number} appointmentId - Target appointment
 * @param {object} vitalsData - Physiological measurements
 * @returns {Promise<object>}
 */
export async function saveVitals(userId, appointmentId, vitalsData) {
  const doctorId = await getDoctorIdByUserId(userId);
  if (!doctorId) {
    return { error: 'DOCTOR_NOT_FOUND' };
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Verify doctor owns the appointment
    const [apptRows] = await connection.query(
      `SELECT id, patient_id
       FROM appointments
       WHERE id = ? AND doctor_id = ?
       LIMIT 1;`,
      [appointmentId, doctorId]
    );

    if (apptRows.length === 0) {
      await connection.rollback();
      return { error: 'APPOINTMENT_NOT_FOUND' };
    }

    const patientId = apptRows[0].patient_id;

    // Calculate BMI if weight and height are provided but BMI is not
    let calculatedBmi = vitalsData.bmi != null ? vitalsData.bmi : null;
    if (
      calculatedBmi == null &&
      vitalsData.weightKg != null &&
      vitalsData.heightCm != null &&
      Number(vitalsData.heightCm) > 0
    ) {
      const hMeters = Number(vitalsData.heightCm) / 100;
      calculatedBmi = parseFloat((Number(vitalsData.weightKg) / (hMeters * hMeters)).toFixed(1));
    }

    // 2. Check if vitals record already exists for this appointment
    const [existingVitals] = await connection.query(
      `SELECT id FROM vitals WHERE appointment_id = ? LIMIT 1;`,
      [appointmentId]
    );

    let vitalsId;
    if (existingVitals.length > 0) {
      vitalsId = existingVitals[0].id;
      await connection.query(
        `UPDATE vitals
         SET blood_pressure_systolic  = ?,
             blood_pressure_diastolic = ?,
             heart_rate_bpm           = ?,
             respiratory_rate_bpm     = ?,
             temperature_celsius      = ?,
             spo2_percentage          = ?,
             weight_kg                = ?,
             height_cm                = ?,
             bmi                      = ?,
             notes                    = ?,
             recorded_at              = NOW()
         WHERE id = ?;`,
        [
          vitalsData.bloodPressureSystolic ?? null,
          vitalsData.bloodPressureDiastolic ?? null,
          vitalsData.heartRateBpm ?? null,
          vitalsData.respiratoryRateBpm ?? null,
          vitalsData.temperatureCelsius ?? null,
          vitalsData.spo2Percentage ?? null,
          vitalsData.weightKg ?? null,
          vitalsData.heightCm ?? null,
          calculatedBmi,
          vitalsData.notes ?? null,
          vitalsId,
        ]
      );
    } else {
      const [insertResult] = await connection.query(
        `INSERT INTO vitals
           (patient_id, appointment_id, recorded_at,
            blood_pressure_systolic, blood_pressure_diastolic,
            heart_rate_bpm, respiratory_rate_bpm,
            temperature_celsius, spo2_percentage,
            weight_kg, height_cm, bmi, notes)
         VALUES (?, ?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          patientId,
          appointmentId,
          vitalsData.bloodPressureSystolic ?? null,
          vitalsData.bloodPressureDiastolic ?? null,
          vitalsData.heartRateBpm ?? null,
          vitalsData.respiratoryRateBpm ?? null,
          vitalsData.temperatureCelsius ?? null,
          vitalsData.spo2Percentage ?? null,
          vitalsData.weightKg ?? null,
          vitalsData.heightCm ?? null,
          calculatedBmi,
          vitalsData.notes ?? null,
        ]
      );
      vitalsId = insertResult.insertId;
    }

    // 3. Fetch updated vitals
    const [savedRows] = await connection.query(
      `SELECT
         id,
         patient_id,
         appointment_id,
         recorded_at AS recordedAt,
         blood_pressure_systolic  AS bloodPressureSystolic,
         blood_pressure_diastolic AS bloodPressureDiastolic,
         heart_rate_bpm           AS heartRateBpm,
         respiratory_rate_bpm     AS respiratoryRateBpm,
         temperature_celsius      AS temperatureCelsius,
         spo2_percentage          AS spo2Percentage,
         weight_kg                AS weightKg,
         height_cm                AS heightCm,
         bmi,
         notes
       FROM vitals
       WHERE id = ?;`,
      [vitalsId]
    );

    await connection.commit();

    const v = savedRows[0];
    return {
      vitals: {
        ...v,
        bloodPressure:
          v.bloodPressureSystolic && v.bloodPressureDiastolic
            ? `${v.bloodPressureSystolic}/${v.bloodPressureDiastolic}`
            : null,
        temperatureCelsius: v.temperatureCelsius != null ? Number(v.temperatureCelsius) : null,
        spo2Percentage: v.spo2Percentage != null ? Number(v.spo2Percentage) : null,
        weightKg: v.weightKg != null ? Number(v.weightKg) : null,
        heightCm: v.heightCm != null ? Number(v.heightCm) : null,
        bmi: v.bmi != null ? Number(v.bmi) : null,
      },
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Adds a prescribed medication to a medical record belonging to the authenticated doctor.
 * Ownership: medical_records.doctor_id must match authenticated doctor.
 * Uses a MySQL transaction.
 *
 * @param {number} userId - From req.user.id (JWT)
 * @param {number} recordId - Target medical_records.id
 * @param {object} medData - { medicineName, dosage, frequency, duration, instructions }
 * @returns {Promise<object>}
 */
export async function addMedication(userId, recordId, medData) {
  const doctorId = await getDoctorIdByUserId(userId);
  if (!doctorId) {
    return { error: 'DOCTOR_NOT_FOUND' };
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Verify doctor owns the medical record
    const [recRows] = await connection.query(
      `SELECT id FROM medical_records WHERE id = ? AND doctor_id = ? LIMIT 1;`,
      [recordId, doctorId]
    );

    if (recRows.length === 0) {
      await connection.rollback();
      return { error: 'RECORD_NOT_FOUND' };
    }

    const { medicineName, dosage, frequency, duration, instructions = null } = medData;

    // 2. Insert medication
    const [insertResult] = await connection.query(
      `INSERT INTO medications (medical_record_id, medicine_name, dosage, frequency, duration, instructions, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW());`,
      [recordId, medicineName, dosage, frequency, duration, instructions]
    );

    const [savedRows] = await connection.query(
      `SELECT
         id,
         medical_record_id AS medicalRecordId,
         medicine_name     AS medicineName,
         dosage,
         frequency,
         duration,
         instructions,
         created_at        AS createdAt
       FROM medications
       WHERE id = ?;`,
      [insertResult.insertId]
    );

    await connection.commit();
    return { medication: savedRows[0] };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Updates an existing medication record belonging to the authenticated doctor.
 *
 * @param {number} userId - From req.user.id (JWT)
 * @param {number} medicationId - Target medications.id
 * @param {object} medData - Updates
 * @returns {Promise<object>}
 */
export async function updateMedication(userId, medicationId, medData) {
  const doctorId = await getDoctorIdByUserId(userId);
  if (!doctorId) {
    return { error: 'DOCTOR_NOT_FOUND' };
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Verify medication belongs to a record owned by the authenticated doctor
    const [medRows] = await connection.query(
      `SELECT m.id, m.medical_record_id
       FROM medications m
       INNER JOIN medical_records mr ON mr.id = m.medical_record_id
       WHERE m.id = ? AND mr.doctor_id = ?
       LIMIT 1;`,
      [medicationId, doctorId]
    );

    if (medRows.length === 0) {
      await connection.rollback();
      return { error: 'MEDICATION_NOT_FOUND' };
    }

    const { medicineName, dosage, frequency, duration, instructions = null } = medData;

    await connection.query(
      `UPDATE medications
       SET medicine_name = ?, dosage = ?, frequency = ?, duration = ?, instructions = ?
       WHERE id = ?;`,
      [medicineName, dosage, frequency, duration, instructions, medicationId]
    );

    const [savedRows] = await connection.query(
      `SELECT
         id,
         medical_record_id AS medicalRecordId,
         medicine_name     AS medicineName,
         dosage,
         frequency,
         duration,
         instructions,
         created_at        AS createdAt
       FROM medications
       WHERE id = ?;`,
      [medicationId]
    );

    await connection.commit();
    return { medication: savedRows[0] };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Deletes a prescribed medication belonging to the authenticated doctor.
 * Ownership: medication -> medical_record -> doctor.
 *
 * @param {number} userId - From req.user.id (JWT)
 * @param {number} medicationId - Target medications.id
 * @returns {Promise<object>}
 */
export async function deleteMedication(userId, medicationId) {
  const doctorId = await getDoctorIdByUserId(userId);
  if (!doctorId) {
    return { error: 'DOCTOR_NOT_FOUND' };
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Verify medication belongs to a record owned by this doctor
    const [medRows] = await connection.query(
      `SELECT m.id
       FROM medications m
       INNER JOIN medical_records mr ON mr.id = m.medical_record_id
       WHERE m.id = ? AND mr.doctor_id = ?
       LIMIT 1;`,
      [medicationId, doctorId]
    );

    if (medRows.length === 0) {
      await connection.rollback();
      return { error: 'MEDICATION_NOT_FOUND' };
    }

    await connection.query(`DELETE FROM medications WHERE id = ?;`, [medicationId]);

    await connection.commit();
    return { success: true };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Retrieves the full profile of the authenticated doctor.
 * Combines users (name, email, phone, status) and doctors metadata.
 * Excludes password_hash and sensitive authentication fields.
 *
 * @param {number} userId - From req.user.id (JWT)
 * @returns {Promise<object|null>}
 */
export async function getDoctorProfile(userId) {
  const [rows] = await pool.query(
    `SELECT
       u.id               AS userId,
       u.full_name        AS fullName,
       u.full_name        AS name,
       u.email,
       u.phone,
       u.status,
       d.id               AS doctorId,
       d.specialization,
       d.department,
       d.qualification,
       d.qualification    AS education,
       d.hospital_name    AS hospitalName,
       d.hospital_name    AS clinicName,
       d.consultation_fee AS consultationFee,
       d.experience_years AS experienceYears,
       d.bio,
       d.is_available     AS isAvailable
     FROM users u
     INNER JOIN doctors d ON d.user_id = u.id
     WHERE u.id = ?
     LIMIT 1;`,
    [userId]
  );

  if (rows.length === 0) {
    return null;
  }

  const r = rows[0];
  return {
    userId: r.userId,
    doctorId: r.doctorId,
    name: r.name,
    fullName: r.fullName,
    email: r.email,
    phone: r.phone,
    status: r.status,
    specialization: r.specialization,
    department: r.department,
    qualification: r.qualification,
    education: r.education,
    hospitalName: r.hospitalName,
    clinicName: r.clinicName,
    consultationFee: parseFloat(r.consultationFee),
    experienceYears: r.experienceYears,
    bio: r.bio || '',
    isAvailable: Boolean(r.isAvailable),
  };
}

/**
 * Updates editable fields on the authenticated doctor's profile and user record.
 * Executes atomically across users and doctors tables within a transaction.
 *
 * @param {number} userId - From req.user.id (JWT)
 * @param {object} data
 * @returns {Promise<object>} Updated profile or error object
 */
export async function updateDoctorProfile(userId, data = {}) {
  const existing = await getDoctorProfile(userId);
  if (!existing) {
    return { error: 'DOCTOR_NOT_FOUND' };
  }

  // Check email uniqueness if email is changing
  if (data.email && data.email.trim().toLowerCase() !== existing.email.toLowerCase()) {
    const newEmail = data.email.trim().toLowerCase();
    const [dup] = await pool.query(
      'SELECT id FROM users WHERE LOWER(email) = ? AND id != ? LIMIT 1;',
      [newEmail, userId]
    );
    if (dup.length > 0) {
      return { error: 'DUPLICATE_EMAIL', message: 'An account with this email address already exists.' };
    }
  }

  // Check phone uniqueness if phone is changing
  if (data.phone && data.phone.trim() !== existing.phone) {
    const newPhone = data.phone.trim();
    const [dup] = await pool.query(
      'SELECT id FROM users WHERE phone = ? AND id != ? LIMIT 1;',
      [newPhone, userId]
    );
    if (dup.length > 0) {
      return { error: 'DUPLICATE_PHONE', message: 'An account with this phone number already exists.' };
    }
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Update users table if user fields provided
    const userUpdates = [];
    const userValues = [];

    if (data.name !== undefined || data.fullName !== undefined) {
      const nameVal = (data.name || data.fullName).trim();
      userUpdates.push('full_name = ?');
      userValues.push(nameVal);
    }
    if (data.email !== undefined) {
      userUpdates.push('email = ?');
      userValues.push(data.email.trim().toLowerCase());
    }
    if (data.phone !== undefined) {
      userUpdates.push('phone = ?');
      userValues.push(data.phone.trim());
    }

    if (userUpdates.length > 0) {
      userValues.push(userId);
      await connection.query(
        `UPDATE users SET ${userUpdates.join(', ')} WHERE id = ?;`,
        userValues
      );
    }

    // 2. Update doctors table if doctor fields provided
    const doctorUpdates = [];
    const doctorValues = [];

    if (data.specialization !== undefined) {
      doctorUpdates.push('specialization = ?');
      doctorValues.push(data.specialization.trim());
    }
    if (data.department !== undefined) {
      doctorUpdates.push('department = ?');
      doctorValues.push(data.department.trim());
    }
    if (data.qualification !== undefined || data.education !== undefined) {
      doctorUpdates.push('qualification = ?');
      doctorValues.push((data.qualification || data.education).trim());
    }
    if (data.hospitalName !== undefined || data.clinicName !== undefined) {
      doctorUpdates.push('hospital_name = ?');
      doctorValues.push((data.hospitalName || data.clinicName).trim());
    }
    if (data.consultationFee !== undefined) {
      doctorUpdates.push('consultation_fee = ?');
      doctorValues.push(parseFloat(data.consultationFee));
    }
    if (data.experienceYears !== undefined) {
      doctorUpdates.push('experience_years = ?');
      doctorValues.push(parseInt(data.experienceYears, 10));
    }
    if (data.bio !== undefined) {
      doctorUpdates.push('bio = ?');
      doctorValues.push(data.bio ? data.bio.trim() : null);
    }
    if (data.isAvailable !== undefined) {
      doctorUpdates.push('is_available = ?');
      doctorValues.push(data.isAvailable ? 1 : 0);
    }

    if (doctorUpdates.length > 0) {
      doctorValues.push(userId);
      await connection.query(
        `UPDATE doctors SET ${doctorUpdates.join(', ')} WHERE user_id = ?;`,
        doctorValues
      );
    }

    await connection.commit();

    // Fetch and return the updated profile
    const updated = await getDoctorProfile(userId);
    return { profile: updated };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Retrieves the full 7-day recurring schedule for the authenticated doctor.
 * Returns rows in standard Monday-first order.
 *
 * @param {number} userId - From req.user.id (JWT)
 * @returns {Promise<{ doctorId: number, schedule: object[] }|null>}
 */
export async function getDoctorSchedule(userId) {
  const doctorId = await getDoctorIdByUserId(userId);
  if (!doctorId) {
    return null;
  }

  const [rows] = await pool.query(
    `SELECT
       id,
       day_of_week,
       start_time,
       end_time,
       slot_duration_minutes,
       is_active
     FROM doctor_schedules
     WHERE doctor_id = ?
     ORDER BY FIELD(day_of_week,
       'MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY'
     );`,
    [doctorId]
  );

  const rowMap = new Map(rows.map((r) => [r.day_of_week, r]));

  const schedule = DAY_ORDER.map((dayKey) => {
    const row = rowMap.get(dayKey);
    if (row) {
      const startStr = String(row.start_time).slice(0, 5);
      const endStr = String(row.end_time).slice(0, 5);
      return {
        id: row.id,
        dayOfWeek: row.day_of_week,
        day: formatDay(row.day_of_week),
        startTime: startStr,
        endTime: endStr,
        slotDurationMinutes: row.slot_duration_minutes,
        isActive: Boolean(row.is_active),
        hours: row.is_active ? `${formatTime(row.start_time)} - ${formatTime(row.end_time)}` : 'Unavailable',
      };
    }
    return {
      id: null,
      dayOfWeek: dayKey,
      day: formatDay(dayKey),
      startTime: '09:00',
      endTime: '17:00',
      slotDurationMinutes: 30,
      isActive: false,
      hours: 'Unavailable',
    };
  });

  return { doctorId, schedule };
}

/**
 * Atomically replaces or updates the authenticated doctor's weekly schedule.
 * Entire multi-row update executes within a single MySQL transaction with rollback on error.
 *
 * @param {number} userId - From req.user.id (JWT)
 * @param {Array<object>} scheduleList - List of schedule entries
 * @returns {Promise<object>}
 */
export async function updateDoctorSchedule(userId, scheduleList) {
  const doctorId = await getDoctorIdByUserId(userId);
  if (!doctorId) {
    return { error: 'DOCTOR_NOT_FOUND' };
  }

  if (!Array.isArray(scheduleList) || scheduleList.length === 0) {
    return { error: 'INVALID_SCHEDULE', message: 'Schedule must be a non-empty array of day configurations.' };
  }

  // Set of seen days to prevent duplicates
  const seenDays = new Set();
  const normalizedRows = [];

  for (const item of scheduleList) {
    if (!item || typeof item !== 'object') {
      return { error: 'INVALID_SCHEDULE_ROW', message: 'Invalid schedule entry format.' };
    }

    const dayUpper = String(item.dayOfWeek || item.day || '').trim().toUpperCase();
    if (!DAY_ORDER.includes(dayUpper)) {
      return { error: 'INVALID_DAY', message: `Invalid day of week: ${item.dayOfWeek || item.day}` };
    }

    if (seenDays.has(dayUpper)) {
      return { error: 'DUPLICATE_DAY', message: `Duplicate schedule entry for day: ${dayUpper}` };
    }
    seenDays.add(dayUpper);

    const isActive = Boolean(item.isActive !== undefined ? item.isActive : item.active);

    // Default times if inactive, else validate strictly
    let startTime = item.startTime ? String(item.startTime).trim() : '09:00';
    let endTime = item.endTime ? String(item.endTime).trim() : '17:00';
    let slotDuration = item.slotDurationMinutes ? parseInt(item.slotDurationMinutes, 10) : 30;

    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/;

    if (isActive) {
      if (!timeRegex.test(startTime)) {
        return { error: 'INVALID_TIME_FORMAT', message: `Invalid start time format for ${dayUpper}: ${startTime}` };
      }
      if (!timeRegex.test(endTime)) {
        return { error: 'INVALID_TIME_FORMAT', message: `Invalid end time format for ${dayUpper}: ${endTime}` };
      }

      const [sh, sm] = startTime.split(':').map((n) => parseInt(n, 10));
      const [eh, em] = endTime.split(':').map((n) => parseInt(n, 10));
      const startMins = sh * 60 + sm;
      const endMins = eh * 60 + em;

      if (startMins >= endMins) {
        return {
          error: 'INVALID_TIME_RANGE',
          message: `Start time (${startTime}) must be strictly before end time (${endTime}) on ${dayUpper}.`,
        };
      }

      if (!slotDuration || slotDuration <= 0 || isNaN(slotDuration)) {
        return {
          error: 'INVALID_SLOT_DURATION',
          message: `Slot duration must be a positive integer on ${dayUpper}.`,
        };
      }

      const windowMins = endMins - startMins;
      if (slotDuration > windowMins) {
        return {
          error: 'SLOT_EXCEEDS_WINDOW',
          message: `Slot duration (${slotDuration}m) cannot exceed working window (${windowMins}m) on ${dayUpper}.`,
        };
      }
    } else {
      // For inactive days, ensure valid time strings or fall back to standard defaults
      if (!timeRegex.test(startTime)) startTime = '09:00';
      if (!timeRegex.test(endTime)) endTime = '17:00';
      if (!slotDuration || slotDuration <= 0 || isNaN(slotDuration)) slotDuration = 30;
    }

    // Format as HH:mm:00 for MySQL TIME
    const formattedStart = startTime.length === 5 ? `${startTime}:00` : startTime;
    const formattedEnd = endTime.length === 5 ? `${endTime}:00` : endTime;

    normalizedRows.push({
      doctorId,
      dayOfWeek: dayUpper,
      startTime: formattedStart,
      endTime: formattedEnd,
      slotDurationMinutes: slotDuration,
      isActive: isActive ? 1 : 0,
    });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Remove existing schedules for the doctor
    await connection.query('DELETE FROM doctor_schedules WHERE doctor_id = ?;', [doctorId]);

    // Insert updated schedules
    for (const r of normalizedRows) {
      await connection.query(
        `INSERT INTO doctor_schedules
           (doctor_id, day_of_week, start_time, end_time, slot_duration_minutes, is_active)
         VALUES (?, ?, ?, ?, ?, ?);`,
        [r.doctorId, r.dayOfWeek, r.startTime, r.endTime, r.slotDurationMinutes, r.isActive]
      );
    }

    await connection.commit();

    const refreshed = await getDoctorSchedule(userId);
    return { success: true, schedule: refreshed?.schedule || [] };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}



