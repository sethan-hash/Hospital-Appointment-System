import { pool } from '../config/db.js';
import app from '../app.js';
import { hashPassword, verifyPassword } from '../services/auth.service.js';

let server;
const PORT = 5085;
const BASE_URL = `http://localhost:${PORT}/api`;

const results = [];

function logTest(category, name, passed, details = '') {
  results.push({ category, name, passed, details });
  const mark = passed ? '✓ PASS' : '✗ FAIL';
  console.log(`[${mark}] [${category}] ${name}${details ? ` — ${details}` : ''}`);
}

async function startServer() {
  return new Promise((resolve) => {
    server = app.listen(PORT, () => {
      console.log(`[Admin Administrator & Restore Test Server] Running on port ${PORT}`);
      resolve();
    });
  });
}

async function stopServer() {
  return new Promise((resolve) => {
    server.close(async () => {
      await pool.end();
      resolve();
    });
  });
}

async function runTests() {
  console.log('\n============================================================');
  console.log('MedLink Care: Add Administrator & Restore Doctor Test Suite');
  console.log('============================================================\n');

  await startServer();

  // Track created resources for cleanup
  const cleanupUserIds = [];
  const cleanupDoctorIds = [];
  const cleanupAppointmentIds = [];
  const cleanupRecordIds = [];

  try {
    // -------------------------------------------------------------------------
    // 0. Obtain tokens for ADMIN, DOCTOR, PATIENT, RECEPTIONIST
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
    // TASK 1: ADD ADMINISTRATOR
    // =========================================================================
    console.log('\n--- 1. RBAC — POST /api/admin/administrators ---');

    const uniqueSuffix = Date.now();
    const testAdminEmail = `test.admin.${uniqueSuffix}@example.com`;
    const testAdminPhone = `7${String(uniqueSuffix).slice(-9)}`;

    // 1a. Unauthenticated → 401
    const unauthAdminRes = await fetch(`${BASE_URL}/admin/administrators`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName: 'Test Admin', email: testAdminEmail, phone: testAdminPhone, password: 'Pass1234', confirmPassword: 'Pass1234' }),
    });
    logTest('RBAC', 'Unauthenticated request → 401', unauthAdminRes.status === 401, `Status: ${unauthAdminRes.status}`);

    // 1b. DOCTOR role → 403
    const docAdminRes = await fetch(`${BASE_URL}/admin/administrators`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${docToken}` },
      body: JSON.stringify({ fullName: 'Test Admin', email: testAdminEmail, phone: testAdminPhone, password: 'Pass1234', confirmPassword: 'Pass1234' }),
    });
    logTest('RBAC', 'DOCTOR role → 403', docAdminRes.status === 403, `Status: ${docAdminRes.status}`);

    // 1c. PATIENT role → 403
    const patAdminRes = await fetch(`${BASE_URL}/admin/administrators`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${patToken}` },
      body: JSON.stringify({ fullName: 'Test Admin', email: testAdminEmail, phone: testAdminPhone, password: 'Pass1234', confirmPassword: 'Pass1234' }),
    });
    logTest('RBAC', 'PATIENT role → 403', patAdminRes.status === 403, `Status: ${patAdminRes.status}`);

    // 1d. RECEPTIONIST role → 403
    const recepAdminRes = await fetch(`${BASE_URL}/admin/administrators`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${recepToken}` },
      body: JSON.stringify({ fullName: 'Test Admin', email: testAdminEmail, phone: testAdminPhone, password: 'Pass1234', confirmPassword: 'Pass1234' }),
    });
    logTest('RBAC', 'RECEPTIONIST role → 403', recepAdminRes.status === 403, `Status: ${recepAdminRes.status}`);

    console.log('\n--- 2. Validation — POST /api/admin/administrators ---');

    // Missing fullName
    const missingNameRes = await fetch(`${BASE_URL}/admin/administrators`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ email: testAdminEmail, phone: testAdminPhone, password: 'Pass1234', confirmPassword: 'Pass1234' }),
    });
    logTest('Validation', 'Missing fullName → 400', missingNameRes.status === 400, `Status: ${missingNameRes.status}`);

    // Invalid email
    const invalidEmailRes = await fetch(`${BASE_URL}/admin/administrators`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ fullName: 'Test Admin', email: 'notanemail', phone: testAdminPhone, password: 'Pass1234', confirmPassword: 'Pass1234' }),
    });
    logTest('Validation', 'Invalid email → 400', invalidEmailRes.status === 400, `Status: ${invalidEmailRes.status}`);

    // Invalid phone (not 10-digit Indian mobile)
    const invalidPhoneRes = await fetch(`${BASE_URL}/admin/administrators`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ fullName: 'Test Admin', email: testAdminEmail, phone: '12345', password: 'Pass1234', confirmPassword: 'Pass1234' }),
    });
    logTest('Validation', 'Invalid phone (not 10-digit Indian) → 400', invalidPhoneRes.status === 400, `Status: ${invalidPhoneRes.status}`);

    // Phone starting with 0 (invalid Indian mobile)
    const zeroPhoneRes = await fetch(`${BASE_URL}/admin/administrators`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ fullName: 'Test Admin', email: testAdminEmail, phone: '0123456789', password: 'Pass1234', confirmPassword: 'Pass1234' }),
    });
    logTest('Validation', 'Phone starting with 0 → 400', zeroPhoneRes.status === 400, `Status: ${zeroPhoneRes.status}`);

    // Mismatched passwords
    const mismatchRes = await fetch(`${BASE_URL}/admin/administrators`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ fullName: 'Test Admin', email: testAdminEmail, phone: testAdminPhone, password: 'Pass1234', confirmPassword: 'Different999' }),
    });
    logTest('Validation', 'Mismatched passwords → 400', mismatchRes.status === 400, `Status: ${mismatchRes.status}`);

    // Short password
    const shortPassRes = await fetch(`${BASE_URL}/admin/administrators`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ fullName: 'Test Admin', email: testAdminEmail, phone: testAdminPhone, password: 'abc', confirmPassword: 'abc' }),
    });
    logTest('Validation', 'Short password (<6 chars) → 400', shortPassRes.status === 400, `Status: ${shortPassRes.status}`);

    console.log('\n--- 3. Admin can create administrator ---');

    const createAdminRes = await fetch(`${BASE_URL}/admin/administrators`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        fullName: 'Test New Administrator',
        email: testAdminEmail,
        phone: testAdminPhone,
        password: 'SecureAdmin@123',
        confirmPassword: 'SecureAdmin@123',
      }),
    });
    const createAdminJson = await createAdminRes.json();
    logTest('CreateAdmin', 'Admin can create administrator → 201', createAdminRes.status === 201, `Status: ${createAdminRes.status}`);

    const newAdmin = createAdminJson.data?.user;
    if (newAdmin?.id) {
      cleanupUserIds.push(newAdmin.id);
    }

    logTest('CreateAdmin', 'Response contains user object', !!newAdmin);
    logTest('CreateAdmin', 'New administrator has role ADMIN', newAdmin?.role === 'ADMIN', `Role: ${newAdmin?.role}`);
    logTest('CreateAdmin', 'New administrator has status ACTIVE', newAdmin?.status === 'ACTIVE', `Status: ${newAdmin?.status}`);

    // Verify in DB
    if (newAdmin?.id) {
      const [dbRows] = await pool.query(
        'SELECT id, role, status, password_hash FROM users WHERE id = ?;',
        [newAdmin.id]
      );
      const dbUser = dbRows[0];
      logTest('CreateAdmin', 'New administrator exists in DB', dbRows.length === 1);
      logTest('CreateAdmin', 'DB role is ADMIN', dbUser?.role === 'ADMIN', `DB role: ${dbUser?.role}`);
      logTest('CreateAdmin', 'DB status is ACTIVE', dbUser?.status === 'ACTIVE', `DB status: ${dbUser?.status}`);

      // Verify password stored as bcrypt hash
      const isHashValid = dbUser?.password_hash && await verifyPassword('SecureAdmin@123', dbUser.password_hash);
      logTest('CreateAdmin', 'Password is stored as bcrypt hash', !!isHashValid);
      logTest('CreateAdmin', 'password_hash starts with bcrypt prefix', dbUser?.password_hash?.startsWith('$2'));

      // Verify no patient profile
      const [patRows] = await pool.query('SELECT id FROM patients WHERE user_id = ?;', [newAdmin.id]);
      logTest('CreateAdmin', 'No patient profile created', patRows.length === 0);

      // Verify no doctor profile
      const [docRows] = await pool.query('SELECT id FROM doctors WHERE user_id = ?;', [newAdmin.id]);
      logTest('CreateAdmin', 'No doctor profile created', docRows.length === 0);
    }

    // Verify password_hash never returned
    const serialized = JSON.stringify(createAdminJson);
    logTest('Security', 'password_hash not in response', !serialized.includes('password_hash'));
    logTest('Security', 'bcrypt signature not in response', !serialized.includes('$2b$') && !serialized.includes('$2a$'));

    console.log('\n--- 4. Duplicate email/phone rejection ---');

    // Duplicate email
    const dupEmailRes = await fetch(`${BASE_URL}/admin/administrators`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        fullName: 'Another Admin',
        email: testAdminEmail, // same email
        phone: `8${String(uniqueSuffix + 1).slice(-9)}`,
        password: 'SecureAdmin@123',
        confirmPassword: 'SecureAdmin@123',
      }),
    });
    logTest('Duplicate', 'Duplicate email → 409', dupEmailRes.status === 409, `Status: ${dupEmailRes.status}`);

    // Duplicate phone
    const dupPhoneRes = await fetch(`${BASE_URL}/admin/administrators`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        fullName: 'Another Admin',
        email: `another.${uniqueSuffix}@example.com`,
        phone: testAdminPhone, // same phone
        password: 'SecureAdmin@123',
        confirmPassword: 'SecureAdmin@123',
      }),
    });
    logTest('Duplicate', 'Duplicate phone → 409', dupPhoneRes.status === 409, `Status: ${dupPhoneRes.status}`);

    // =========================================================================
    // TASK 2: RESTORE DOCTOR
    // =========================================================================
    console.log('\n--- 5. RBAC — PATCH /api/admin/doctors/:id/restore ---');

    // Create a doctor to use for restore testing
    const passHash = await hashPassword('Password123!');
    const restoreDocEmail = `test.restore.doc.${uniqueSuffix}@apollohospitals.com`;
    const restoreDocPhone = `9${String(uniqueSuffix).slice(-9)}`;

    const [uRestoreResult] = await pool.query(
      `INSERT INTO users (role, full_name, email, phone, password_hash, status)
       VALUES ('DOCTOR', 'Dr. Restore Test', ?, ?, ?, 'INACTIVE');`,
      [restoreDocEmail, restoreDocPhone, passHash]
    );
    const restoreDocUserId = uRestoreResult.insertId;
    cleanupUserIds.push(restoreDocUserId);

    const [dRestoreResult] = await pool.query(
      `INSERT INTO doctors (user_id, specialization, qualification, department, hospital_name, consultation_fee, experience_years, is_available)
       VALUES (?, 'Cardiology', 'MBBS, MD', 'Cardiology', 'Apollo Hospitals Bengaluru', 900.00, 8, FALSE);`,
      [restoreDocUserId]
    );
    const restoreDocId = dRestoreResult.insertId;
    cleanupDoctorIds.push(restoreDocId);

    // Add 3 schedules (inactive)
    await pool.query(
      `INSERT INTO doctor_schedules (doctor_id, day_of_week, start_time, end_time, slot_duration_minutes, is_active) VALUES
       (?, 'MONDAY', '09:00:00', '17:00:00', 30, FALSE),
       (?, 'WEDNESDAY', '09:00:00', '17:00:00', 30, FALSE),
       (?, 'FRIDAY', '09:00:00', '17:00:00', 30, FALSE);`,
      [restoreDocId, restoreDocId, restoreDocId]
    );

    // RBAC: unauthenticated
    const unauthRestoreRes = await fetch(`${BASE_URL}/admin/doctors/${restoreDocUserId}/restore`, {
      method: 'PATCH',
    });
    logTest('RBAC', 'Unauthenticated restore → 401', unauthRestoreRes.status === 401, `Status: ${unauthRestoreRes.status}`);

    // RBAC: DOCTOR → 403
    const docRestoreRes = await fetch(`${BASE_URL}/admin/doctors/${restoreDocUserId}/restore`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${docToken}` },
    });
    logTest('RBAC', 'DOCTOR role restore → 403', docRestoreRes.status === 403, `Status: ${docRestoreRes.status}`);

    // RBAC: PATIENT → 403
    const patRestoreRes = await fetch(`${BASE_URL}/admin/doctors/${restoreDocUserId}/restore`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${patToken}` },
    });
    logTest('RBAC', 'PATIENT role restore → 403', patRestoreRes.status === 403, `Status: ${patRestoreRes.status}`);

    // Invalid ID → 400
    const invalidRestoreRes = await fetch(`${BASE_URL}/admin/doctors/0/restore`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    logTest('Validation', 'Invalid doctor ID (0) restore → 400', invalidRestoreRes.status === 400, `Status: ${invalidRestoreRes.status}`);

    // Unknown doctor → 404
    const unknownRestoreRes = await fetch(`${BASE_URL}/admin/doctors/999999/restore`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    logTest('Validation', 'Unknown doctor ID restore → 404', unknownRestoreRes.status === 404, `Status: ${unknownRestoreRes.status}`);

    console.log('\n--- 6. Admin can restore inactive doctor ---');

    // Verify initial DB state is INACTIVE
    const [preRestoreUser] = await pool.query('SELECT status FROM users WHERE id = ?;', [restoreDocUserId]);
    logTest('RestoreDoctor', 'Doctor is INACTIVE before restore', preRestoreUser[0]?.status === 'INACTIVE', `Pre-status: ${preRestoreUser[0]?.status}`);

    const [preRestoreDoc] = await pool.query('SELECT is_available FROM doctors WHERE id = ?;', [restoreDocId]);
    logTest('RestoreDoctor', 'Doctor is_available=FALSE before restore', !preRestoreDoc[0]?.is_available);


    // Perform restore
    const restoreRes = await fetch(`${BASE_URL}/admin/doctors/${restoreDocUserId}/restore`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const restoreJson = await restoreRes.json();

    logTest('RestoreDoctor', 'Admin can restore inactive doctor → 200', restoreRes.status === 200, `Status: ${restoreRes.status}`);
    logTest('RestoreDoctor', 'Response action is RESTORED', restoreJson.data?.action === 'RESTORED', `Action: ${restoreJson.data?.action}`);
    logTest('RestoreDoctor', 'Response doctorId present', !!restoreJson.data?.doctorId);

    // DB verification
    const [postRestoreUser] = await pool.query('SELECT status FROM users WHERE id = ?;', [restoreDocUserId]);
    logTest('RestoreDoctor', 'users.status is now ACTIVE', postRestoreUser[0]?.status === 'ACTIVE', `DB status: ${postRestoreUser[0]?.status}`);

    const [postRestoreDoc] = await pool.query('SELECT is_available FROM doctors WHERE id = ?;', [restoreDocId]);
    logTest('RestoreDoctor', 'doctors.is_available is now TRUE', Boolean(postRestoreDoc[0]?.is_available) === true);

    const [postRestoreScheds] = await pool.query('SELECT is_active FROM doctor_schedules WHERE doctor_id = ?;', [restoreDocId]);
    const allSchedulesActive = postRestoreScheds.every((s) => Boolean(s.is_active) === true);
    logTest('RestoreDoctor', 'All existing schedules are now is_active=TRUE', allSchedulesActive, `Schedules count: ${postRestoreScheds.length}`);

    // No duplicate schedules
    const [schedCount] = await pool.query('SELECT COUNT(*) AS cnt FROM doctor_schedules WHERE doctor_id = ?;', [restoreDocId]);
    logTest('RestoreDoctor', 'No duplicate schedules created (still 3)', Number(schedCount[0]?.cnt) === 3, `Count: ${schedCount[0]?.cnt}`);

    console.log('\n--- 7. Restoring already-active doctor is safe no-op ---');

    const alreadyActiveRes = await fetch(`${BASE_URL}/admin/doctors/${restoreDocUserId}/restore`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const alreadyActiveJson = await alreadyActiveRes.json();
    logTest('RestoreDoctor', 'Restoring already-active doctor → 200 (safe no-op)', alreadyActiveRes.status === 200, `Status: ${alreadyActiveRes.status}`);
    logTest('RestoreDoctor', 'Response action is ALREADY_ACTIVE', alreadyActiveJson.data?.action === 'ALREADY_ACTIVE', `Action: ${alreadyActiveJson.data?.action}`);

    // DB still correct after no-op
    const [noopScheduleCount] = await pool.query('SELECT COUNT(*) AS cnt FROM doctor_schedules WHERE doctor_id = ?;', [restoreDocId]);
    logTest('RestoreDoctor', 'No duplicate schedules after no-op', Number(noopScheduleCount[0]?.cnt) === 3, `Count: ${noopScheduleCount[0]?.cnt}`);

    // =========================================================================
    // TASK 2: HISTORICAL DATA PRESERVATION — restore does not alter history
    // =========================================================================
    console.log('\n--- 8. Historical data preservation after restore ---');

    // Create doctor with history to test no history alteration
    const histRestoreEmail = `test.hist.restore.${uniqueSuffix}@apollohospitals.com`;
    const histRestorePhone = `8${String(uniqueSuffix + 99).slice(-9)}`;

    const [uHistResult] = await pool.query(
      `INSERT INTO users (role, full_name, email, phone, password_hash, status)
       VALUES ('DOCTOR', 'Dr. Historical Restore Test', ?, ?, ?, 'INACTIVE');`,
      [histRestoreEmail, histRestorePhone, passHash]
    );
    const histRestoreUserId = uHistResult.insertId;
    cleanupUserIds.push(histRestoreUserId);

    const [dHistResult] = await pool.query(
      `INSERT INTO doctors (user_id, specialization, qualification, department, hospital_name, consultation_fee, experience_years, is_available)
       VALUES (?, 'Neurology', 'MBBS, DM', 'Neuroscience', 'Apollo Hospitals Bengaluru', 1500.00, 12, FALSE);`,
      [histRestoreUserId]
    );
    const histRestoreDocId = dHistResult.insertId;
    cleanupDoctorIds.push(histRestoreDocId);

    // Add past completed appointment
    const [aptResult] = await pool.query(
      `INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_time, status, type, reason_for_visit)
       VALUES (1, ?, CURDATE() - INTERVAL 10 DAY, '10:00:00', 'COMPLETED', 'IN_PERSON', 'Past consultation');`,
      [histRestoreDocId]
    );
    const histAptId = aptResult.insertId;
    cleanupAppointmentIds.push(histAptId);

    // Add medical record
    const [recResult] = await pool.query(
      `INSERT INTO medical_records (patient_id, doctor_id, appointment_id, diagnosis, treatment_plan, doctor_notes, visit_date)
       VALUES (1, ?, ?, 'Migraine', 'Medication prescribed', 'Follow up in 2 weeks', CURDATE() - INTERVAL 10 DAY);`,
      [histRestoreDocId, histAptId]
    );
    cleanupRecordIds.push(recResult.insertId);

    // Restore the doctor with history
    const histRestoreRes = await fetch(`${BASE_URL}/admin/doctors/${histRestoreUserId}/restore`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    logTest('Preservation', 'Doctor with history can be restored → 200', histRestoreRes.status === 200, `Status: ${histRestoreRes.status}`);

    // Past appointment should still be COMPLETED
    const [checkApt] = await pool.query('SELECT status FROM appointments WHERE id = ?;', [histAptId]);
    logTest('Preservation', 'Past appointment still COMPLETED (not altered)', checkApt[0]?.status === 'COMPLETED', `Status: ${checkApt[0]?.status}`);

    // Medical record still exists
    const [checkRec] = await pool.query('SELECT id FROM medical_records WHERE id = ?;', [cleanupRecordIds[cleanupRecordIds.length - 1]]);
    logTest('Preservation', 'Medical record preserved intact', checkRec.length === 1);

    // =========================================================================
    // TASK 3: REGRESSION — Existing Remove Doctor workflow still works
    // =========================================================================
    console.log('\n--- 9. Regression: Existing Remove Doctor workflow ---');

    // Create zero-history doctor for hard delete
    const removeDocEmail = `test.remove.reg.${uniqueSuffix}@apollohospitals.com`;
    const removeDocPhone = `6${String(uniqueSuffix + 55).slice(-9)}`;

    const [uRemResult] = await pool.query(
      `INSERT INTO users (role, full_name, email, phone, password_hash, status)
       VALUES ('DOCTOR', 'Dr. Remove Regression Test', ?, ?, ?, 'ACTIVE');`,
      [removeDocEmail, removeDocPhone, passHash]
    );
    const removeDocUserId = uRemResult.insertId;
    cleanupUserIds.push(removeDocUserId);

    const [dRemResult] = await pool.query(
      `INSERT INTO doctors (user_id, specialization, qualification, department, hospital_name, consultation_fee, experience_years, is_available)
       VALUES (?, 'Dermatology', 'MBBS, MD', 'Dermatology', 'Apollo Hospitals Bengaluru', 700.00, 4, TRUE);`,
      [removeDocUserId]
    );
    const removeDocId = dRemResult.insertId;
    cleanupDoctorIds.push(removeDocId);

    const removeRes = await fetch(`${BASE_URL}/admin/doctors/${removeDocUserId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const removeJson = await removeRes.json();
    logTest('Regression', 'Existing Remove Doctor still returns 200', removeRes.status === 200, `Status: ${removeRes.status}`);
    logTest('Regression', 'Zero-history doctor hard deleted', removeJson.data?.action === 'HARD_DELETE');

    const [removedUserRows] = await pool.query('SELECT id FROM users WHERE id = ?;', [removeDocUserId]);
    logTest('Regression', 'Hard deleted doctor not in DB', removedUserRows.length === 0);

    // =========================================================================
    // TASK 3: REGRESSION — Existing admin listing still works
    // =========================================================================
    console.log('\n--- 10. Regression: Admin listing continues to work ---');

    const listAdminsRes = await fetch(`${BASE_URL}/admin/users?role=ADMIN`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const listAdminsJson = await listAdminsRes.json();
    logTest('Regression', 'Admin listing GET /api/admin/users?role=ADMIN → 200', listAdminsRes.status === 200, `Status: ${listAdminsRes.status}`);
    logTest('Regression', 'Admin listing contains users array', Array.isArray(listAdminsJson.data?.users));
    logTest('Regression', 'Admin listing has no password_hash', !JSON.stringify(listAdminsJson).includes('password_hash'));

    // =========================================================================
    // TASK 3: REGRESSION — Patient management still works
    // =========================================================================
    console.log('\n--- 11. Regression: Patient management continues to work ---');

    const listPatientsRes = await fetch(`${BASE_URL}/admin/users?role=PATIENT`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const listPatientsJson = await listPatientsRes.json();
    logTest('Regression', 'Patient listing GET /api/admin/users?role=PATIENT → 200', listPatientsRes.status === 200, `Status: ${listPatientsRes.status}`);
    logTest('Regression', 'Patient listing contains users array', Array.isArray(listPatientsJson.data?.users));
    logTest('Regression', 'Patient listing has no password_hash', !JSON.stringify(listPatientsJson).includes('password_hash'));

    // =========================================================================
    // TASK 3: REGRESSION — Receptionist management still works
    // =========================================================================
    console.log('\n--- 12. Regression: Receptionist management continues to work ---');

    const listRecepRes = await fetch(`${BASE_URL}/admin/users?role=RECEPTIONIST`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const listRecepJson = await listRecepRes.json();
    logTest('Regression', 'Receptionist listing GET /api/admin/users?role=RECEPTIONIST → 200', listRecepRes.status === 200, `Status: ${listRecepRes.status}`);
    logTest('Regression', 'Receptionist listing contains users array', Array.isArray(listRecepJson.data?.users));
    logTest('Regression', 'Receptionist listing has no password_hash', !JSON.stringify(listRecepJson).includes('password_hash'));

  } catch (err) {
    console.error('Test execution error:', err);
    logTest('Execution', 'Test completed without uncaught exceptions', false, err.message);
  } finally {
    // Cleanup
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

    await stopServer();
  }

  // Summary
  console.log('\n============================================================');
  console.log('Test Summary: Add Administrator & Restore Doctor');
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
