import { pool } from '../config/db.js';
import app from '../app.js';
import { hashPassword } from '../services/auth.service.js';

let server;
const PORT = 5082;
const BASE_URL = `http://localhost:${PORT}/api`;

const results = [];

function logTest(category, name, passed, details = '') {
  results.push({ category, name, passed, details });
  const statusMark = passed ? '✓ PASS' : '✗ FAIL';
  console.log(`[${statusMark}] [${category}] ${name}${details ? ` — ${details}` : ''}`);
}

async function startTestServer() {
  return new Promise((resolve) => {
    server = app.listen(PORT, () => {
      console.log(`[Admin Remove Doctor Test Server] Running on port ${PORT}`);
      resolve();
    });
  });
}

async function stopTestServer() {
  return new Promise((resolve) => {
    server.close(async () => {
      await pool.end();
      resolve();
    });
  });
}

async function runTests() {
  console.log('\n============================================================');
  console.log('MedLink Care: Admin Doctor Removal & Role Actions Test Suite');
  console.log('============================================================\n');

  await startTestServer();

  // Track created artifacts for robust cleanup
  const cleanupUserIds = [];
  const cleanupDoctorIds = [];
  const cleanupAppointmentIds = [];
  const cleanupRecordIds = [];

  try {
    // -------------------------------------------------------------------------
    // 1. Obtain tokens for ADMIN, DOCTOR, PATIENT, RECEPTIONIST
    // -------------------------------------------------------------------------
    const [adminToken, docToken, patToken, recepToken] = await Promise.all([
      fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin.manoj@apollohospitals.com', password: 'Password123!' }),
      }).then((r) => r.json()).then((d) => d.data?.token),

      fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'priya.sharma@apollohospitals.com', password: 'Password123!' }),
      }).then((r) => r.json()).then((d) => d.data?.token),

      fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'rahul.verma@example.in', password: 'Password123!' }),
      }).then((r) => r.json()).then((d) => d.data?.token),

      fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'sunita.rao@apollohospitals.com', password: 'Password123!' }),
      }).then((r) => r.json()).then((d) => d.data?.token),
    ]);

    // =========================================================================
    // 1. RBAC Tests: 401, 403, and ADMIN success
    // =========================================================================
    console.log('\n--- 1. RBAC — DELETE /api/admin/doctors/:id ---');

    const unauthRes = await fetch(`${BASE_URL}/admin/doctors/999999`, {
      method: 'DELETE',
    });
    logTest('RBAC', 'Unauthenticated request → 401', unauthRes.status === 401, `Status: ${unauthRes.status}`);

    const docRes = await fetch(`${BASE_URL}/admin/doctors/999999`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${docToken}` },
    });
    logTest('RBAC', 'DOCTOR role → 403', docRes.status === 403, `Status: ${docRes.status}`);

    const patRes = await fetch(`${BASE_URL}/admin/doctors/999999`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${patToken}` },
    });
    logTest('RBAC', 'PATIENT role → 403', patRes.status === 403, `Status: ${patRes.status}`);

    const recepRes = await fetch(`${BASE_URL}/admin/doctors/999999`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${recepToken}` },
    });
    logTest('RBAC', 'RECEPTIONIST role → 403', recepRes.status === 403, `Status: ${recepRes.status}`);

    // =========================================================================
    // 2. Validation & Unknown Doctor & Self / Admin Protection
    // =========================================================================
    console.log('\n--- 2. Validation, Unknown Doctor & Admin Protection ---');

    // Invalid ID param (negative / invalid)
    const invalidIdRes = await fetch(`${BASE_URL}/admin/doctors/0`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    logTest('Validation', 'Invalid doctor ID (0) → 400', invalidIdRes.status === 400, `Status: ${invalidIdRes.status}`);

    // Unknown doctor
    const unknownRes = await fetch(`${BASE_URL}/admin/doctors/999999`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    logTest('Validation', 'Unknown doctor ID (999999) → 404', unknownRes.status === 404, `Status: ${unknownRes.status}`);

    // Attempting to delete a PATIENT user ID
    const targetPatientId = 5; // Rahul Verma
    const patDeleteRes = await fetch(`${BASE_URL}/admin/doctors/${targetPatientId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    logTest('Validation', 'Attempting to remove PATIENT via doctor endpoint → 404', patDeleteRes.status === 404, `Status: ${patDeleteRes.status}`);

    // Self-protection: Admin Manoj (user id 11)
    const selfDeleteRes = await fetch(`${BASE_URL}/admin/doctors/11`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const selfDeleteJson = await selfDeleteRes.json();
    logTest(
      'Security',
      'Self-protection: Logged-in admin cannot remove themselves → 403',
      selfDeleteRes.status === 403,
      `Status: ${selfDeleteRes.status}, Message: ${selfDeleteJson.message}`
    );

    // =========================================================================
    // 3. Dual-Path: Zero-History Hard Delete
    // =========================================================================
    console.log('\n--- 3. Zero-History Hard Delete ---');

    // Create a new doctor with zero appointments and zero records
    const testDocEmail = `test.zero.history.${Date.now()}@apollohospitals.com`;
    const testDocPhone = `+91 91111 ${Math.floor(10000 + Math.random() * 90000)}`;
    const passHash = await hashPassword('Password123!');

    const [uResult] = await pool.query(
      `INSERT INTO users (role, full_name, email, phone, password_hash, status)
       VALUES ('DOCTOR', 'Dr. Test Zero History', ?, ?, ?, 'ACTIVE');`,
      [testDocEmail, testDocPhone, passHash]
    );
    const zeroDocUserId = uResult.insertId;
    cleanupUserIds.push(zeroDocUserId);

    const [dResult] = await pool.query(
      `INSERT INTO doctors (user_id, specialization, qualification, department, hospital_name, consultation_fee, experience_years, is_available)
       VALUES (?, 'General Medicine', 'MBBS', 'Internal Medicine', 'Apollo Hospitals Bengaluru', 500.00, 3, TRUE);`,
      [zeroDocUserId]
    );
    const zeroDocId = dResult.insertId;
    cleanupDoctorIds.push(zeroDocId);

    // Add a schedule
    await pool.query(
      `INSERT INTO doctor_schedules (doctor_id, day_of_week, start_time, end_time, slot_duration_minutes, is_active)
       VALUES (?, 'MONDAY', '09:00:00', '13:00:00', 30, TRUE);`,
      [zeroDocId]
    );

    // Execute DELETE via API using zeroDocUserId
    const hardDeleteRes = await fetch(`${BASE_URL}/admin/doctors/${zeroDocUserId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const hardDeleteJson = await hardDeleteRes.json();

    logTest('HardDelete', 'Zero-history doctor deletion returns 200', hardDeleteRes.status === 200, `Status: ${hardDeleteRes.status}`);
    logTest('HardDelete', 'Response action is HARD_DELETE', hardDeleteJson.data?.action === 'HARD_DELETE');

    // Check DB rows are completely removed
    const [checkUserRows] = await pool.query('SELECT id FROM users WHERE id = ?;', [zeroDocUserId]);
    const [checkDocRows] = await pool.query('SELECT id FROM doctors WHERE id = ?;', [zeroDocId]);
    const [checkSchedRows] = await pool.query('SELECT id FROM doctor_schedules WHERE doctor_id = ?;', [zeroDocId]);

    logTest('HardDelete', 'User record permanently deleted from DB', checkUserRows.length === 0);
    logTest('HardDelete', 'Doctor profile permanently deleted from DB', checkDocRows.length === 0);
    logTest('HardDelete', 'Doctor schedule permanently deleted from DB', checkSchedRows.length === 0);

    // =========================================================================
    // 4. Dual-Path: History-Based Archive & Future Appointment Cancellation
    // =========================================================================
    console.log('\n--- 4. History-Based Archive & Appointment Handling ---');

    // Create a doctor who HAS past completed appointment & medical record AND future scheduled appointment
    const histDocEmail = `test.hist.doc.${Date.now()}@apollohospitals.com`;
    const histDocPhone = `+91 92222 ${Math.floor(10000 + Math.random() * 90000)}`;

    const [uHistResult] = await pool.query(
      `INSERT INTO users (role, full_name, email, phone, password_hash, status)
       VALUES ('DOCTOR', 'Dr. Historical Archive Test', ?, ?, ?, 'ACTIVE');`,
      [histDocEmail, histDocPhone, passHash]
    );
    const histDocUserId = uHistResult.insertId;
    cleanupUserIds.push(histDocUserId);

    const [dHistResult] = await pool.query(
      `INSERT INTO doctors (user_id, specialization, qualification, department, hospital_name, consultation_fee, experience_years, is_available)
       VALUES (?, 'Neurology', 'MBBS, MD', 'Neuroscience', 'Apollo Hospitals Bengaluru', 1200.00, 10, TRUE);`,
      [histDocUserId]
    );
    const histDocId = dHistResult.insertId;
    cleanupDoctorIds.push(histDocId);

    // Schedule
    await pool.query(
      `INSERT INTO doctor_schedules (doctor_id, day_of_week, start_time, end_time, slot_duration_minutes, is_active)
       VALUES (?, 'TUESDAY', '10:00:00', '16:00:00', 30, TRUE);`,
      [histDocId]
    );

    // 1 Past completed appointment
    const [aptPastResult] = await pool.query(
      `INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_time, status, type, reason_for_visit)
       VALUES (1, ?, CURDATE() - INTERVAL 5 DAY, '10:00:00', 'COMPLETED', 'IN_PERSON', 'Past consultation checkup');`,
      [histDocId]
    );
    const pastAptId = aptPastResult.insertId;
    cleanupAppointmentIds.push(pastAptId);

    // 1 Past medical record
    const [recResult] = await pool.query(
      `INSERT INTO medical_records (patient_id, doctor_id, appointment_id, diagnosis, treatment_plan, doctor_notes, visit_date)
       VALUES (1, ?, ?, 'Tension headache', 'Rest and hydration', 'Exam normal', CURDATE() - INTERVAL 5 DAY);`,
      [histDocId, pastAptId]
    );
    const pastRecId = recResult.insertId;
    cleanupRecordIds.push(pastRecId);

    // 1 Future scheduled appointment (should be auto-cancelled)
    const [aptFutureResult] = await pool.query(
      `INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_time, status, type, reason_for_visit)
       VALUES (1, ?, CURDATE() + INTERVAL 2 DAY, '11:00:00', 'SCHEDULED', 'IN_PERSON', 'Upcoming follow-up visit');`,
      [histDocId]
    );
    const futureAptId = aptFutureResult.insertId;
    cleanupAppointmentIds.push(futureAptId);

    // Call DELETE /api/admin/doctors/:id on historical doctor
    const archiveRes = await fetch(`${BASE_URL}/admin/doctors/${histDocUserId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const archiveJson = await archiveRes.json();

    logTest('Archive', 'Historical doctor removal returns 200', archiveRes.status === 200, `Status: ${archiveRes.status}`);
    logTest('Archive', 'Response action is ARCHIVE', archiveJson.data?.action === 'ARCHIVE');
    logTest('Archive', 'cancelledFutureAppointments > 0', archiveJson.data?.cancelledFutureAppointments >= 1);

    // Verify database state:
    // 1. users.status is INACTIVE
    const [uCheckRows] = await pool.query('SELECT status FROM users WHERE id = ?;', [histDocUserId]);
    logTest('Archive', 'users.status is INACTIVE', uCheckRows[0]?.status === 'INACTIVE', `DB status: ${uCheckRows[0]?.status}`);

    // 2. doctors.is_available is FALSE
    const [dCheckRows] = await pool.query('SELECT is_available FROM doctors WHERE id = ?;', [histDocId]);
    logTest('Archive', 'doctors.is_available is FALSE', Boolean(dCheckRows[0]?.is_available) === false);

    // 3. doctor_schedules.is_active is FALSE
    const [sCheckRows] = await pool.query('SELECT is_active FROM doctor_schedules WHERE doctor_id = ?;', [histDocId]);
    logTest('Archive', 'doctor_schedules.is_active is FALSE', Boolean(sCheckRows[0]?.is_active) === false);

    // 4. Future appointment cancelled
    const [futureAptRows] = await pool.query('SELECT status FROM appointments WHERE id = ?;', [futureAptId]);
    logTest('Archive', 'Future appointment status updated to CANCELLED', futureAptRows[0]?.status === 'CANCELLED');

    // 5. Historical data preservation
    const [pastAptRows] = await pool.query('SELECT status FROM appointments WHERE id = ?;', [pastAptId]);
    logTest('Preservation', 'Past appointment still COMPLETED (preserved)', pastAptRows[0]?.status === 'COMPLETED');

    const [pastRecRows] = await pool.query('SELECT id FROM medical_records WHERE id = ?;', [pastRecId]);
    logTest('Preservation', 'Past medical record preserved intact', pastRecRows.length === 1);

    // =========================================================================
    // 5. Sensitive-Field Exclusion
    // =========================================================================
    console.log('\n--- 5. Sensitive-Field Exclusion ---');

    const serializedResponse = JSON.stringify(archiveJson);
    const hasPasswordHash = serializedResponse.includes('password_hash');
    const hasBcryptSig = serializedResponse.includes('$2b$10$');

    logTest('Security', 'password_hash not present in delete response', !hasPasswordHash);
    logTest('Security', 'bcrypt hash signatures not present in response', !hasBcryptSig);

  } catch (err) {
    console.error('Test execution error:', err);
    logTest('Execution', 'Test completed without uncaught exceptions', false, err.message);
  } finally {
    // -------------------------------------------------------------------------
    // Clean up created test records
    // -------------------------------------------------------------------------
    try {
      if (cleanupRecordIds.length > 0) {
        await pool.query(`DELETE FROM medical_records WHERE id IN (${cleanupRecordIds.join(',')});`);
      }
      if (cleanupAppointmentIds.length > 0) {
        await pool.query(`DELETE FROM appointments WHERE id IN (${cleanupAppointmentIds.join(',')});`);
      }
      if (cleanupDoctorIds.length > 0) {
        await pool.query(`DELETE FROM doctor_schedules WHERE doctor_id IN (${cleanupDoctorIds.join(',')});`);
        await pool.query(`DELETE FROM doctors WHERE id IN (${cleanupDoctorIds.join(',')});`);
      }
      if (cleanupUserIds.length > 0) {
        await pool.query(`DELETE FROM users WHERE id IN (${cleanupUserIds.join(',')});`);
      }
    } catch (cleanupErr) {
      console.warn('Cleanup warning:', cleanupErr.message);
    }

    await stopTestServer();
  }

  // Summary
  console.log('\n============================================================');
  console.log('Test Summary: Admin Doctor Removal & Role Actions');
  console.log('============================================================');
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = total - passed;
  console.log(`Total Checks : ${total}`);
  console.log(`Passed       : ${passed}`);
  console.log(`Failed       : ${failed}\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
