import { pool } from '../config/db.js';
import app from '../app.js';

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
      console.log(`[Admin Create Doctor Test Server] Running on port ${PORT}`);
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
  console.log('MedLink Care: Admin Create Doctor Test Suite');
  console.log('============================================================\n');

  await startTestServer();

  const createdUserIds = [];

  try {
    // -------------------------------------------------------------------------
    // 1. Obtain tokens (Admin, Doctor, Patient)
    // -------------------------------------------------------------------------
    const [adminToken, docToken, patToken] = await Promise.all([
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
    ]);

    const testDoctorData = {
      fullName: 'Dr. Siddharth Verma',
      email: 'siddharth.verma.test@apollohospitals.com',
      phone: '+91 98450 99112',
      password: 'DoctorPass123!',
      specialization: 'Neurology',
      department: 'Neurology',
      qualification: 'MBBS, MD, DM (Neurology)',
      experienceYears: 11,
      consultationFee: 1100,
      hospitalName: 'Apollo Hospitals Bengaluru',
      bio: 'Senior consultant specializing in stroke management and neuromuscular disorders.',
      isAvailable: true,
      createDefaultSchedule: true,
    };

    // =========================================================================
    // 2. Authentication & Authorization: unauthenticated 401
    // =========================================================================
    console.log('\n--- 1. Unauthenticated Request (401) ---');
    const unauthRes = await fetch(`${BASE_URL}/admin/doctors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testDoctorData),
    });
    logTest('Auth', 'Unauthenticated request → 401', unauthRes.status === 401, `Status: ${unauthRes.status}`);

    // =========================================================================
    // 3. Authorization: non-admin 403 (Doctor & Patient)
    // =========================================================================
    console.log('\n--- 2. Non-Admin Request (403) ---');
    const docRes = await fetch(`${BASE_URL}/admin/doctors`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${docToken}`,
      },
      body: JSON.stringify(testDoctorData),
    });
    logTest('RBAC', 'Doctor role forbidden → 403', docRes.status === 403, `Status: ${docRes.status}`);

    const patRes = await fetch(`${BASE_URL}/admin/doctors`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${patToken}`,
      },
      body: JSON.stringify(testDoctorData),
    });
    logTest('RBAC', 'Patient role forbidden → 403', patRes.status === 403, `Status: ${patRes.status}`);

    // =========================================================================
    // 4. Invalid Input Validation (400)
    // =========================================================================
    console.log('\n--- 3. Invalid Input Validation (400) ---');
    const invalidInputs = [
      { data: { ...testDoctorData, fullName: 'A' }, label: 'Full name too short' },
      { data: { ...testDoctorData, email: 'not-an-email' }, label: 'Invalid email syntax' },
      { data: { ...testDoctorData, phone: '12' }, label: 'Phone too short' },
      { data: { ...testDoctorData, specialization: '' }, label: 'Missing specialization' },
      { data: { ...testDoctorData, qualification: '' }, label: 'Missing qualification' },
      { data: { ...testDoctorData, experienceYears: -5 }, label: 'Negative experience' },
      { data: { ...testDoctorData, consultationFee: -100 }, label: 'Negative consultation fee' },
      { data: { ...testDoctorData, password: '123' }, label: 'Password less than 6 chars' },
    ];

    for (const { data, label } of invalidInputs) {
      const res = await fetch(`${BASE_URL}/admin/doctors`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      logTest(
        'Validation',
        `Reject invalid input: ${label} → 400`,
        res.status === 400 && json.success === false && Array.isArray(json.errors),
        `Status: ${res.status}`
      );
    }

    // =========================================================================
    // 5. Admin Success: Create Doctor (201)
    // =========================================================================
    console.log('\n--- 4. Admin Success: Create Doctor (201) ---');
    const createRes = await fetch(`${BASE_URL}/admin/doctors`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify(testDoctorData),
    });
    const createJson = await createRes.json();

    logTest(
      'Creation',
      'Admin creates doctor → 201 Created',
      createRes.status === 201 && createJson.success === true,
      `Status: ${createRes.status}`
    );

    const createdUserId = createJson.data?.user?.id;
    const createdDoctorId = createJson.data?.doctor?.id;
    if (createdUserId) createdUserIds.push(createdUserId);

    logTest('Creation', 'Created user has role DOCTOR', createJson.data?.user?.role === 'DOCTOR');
    logTest('Creation', 'Created user has status ACTIVE', createJson.data?.user?.status === 'ACTIVE');
    logTest('Creation', 'Created doctor record linked to user', createJson.data?.doctor?.userId === createdUserId);

    // =========================================================================
    // 6. Sensitive Field Exclusion
    // =========================================================================
    console.log('\n--- 5. Sensitive Field Exclusion ---');
    const stringified = JSON.stringify(createJson).toLowerCase();
    logTest('Security', 'password_hash excluded from response', !stringified.includes('password_hash'));
    logTest('Security', 'bcrypt hash signatures ($2a$, $2b$) excluded', !stringified.includes('$2a$') && !stringified.includes('$2b$'));

    // =========================================================================
    // 7. Duplicate Email (409)
    // =========================================================================
    console.log('\n--- 6. Duplicate Email Conflict (409) ---');
    const dupRes = await fetch(`${BASE_URL}/admin/doctors`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        ...testDoctorData,
        phone: '+91 98450 88223', // different phone, same email
      }),
    });
    const dupJson = await dupRes.json();
    logTest(
      'Conflict',
      'Duplicate email rejected → 409 Conflict',
      dupRes.status === 409 && dupJson.success === false,
      `Status: ${dupRes.status}, message: ${dupJson.message}`
    );

    // =========================================================================
    // 8. Database Persistence Verification
    // =========================================================================
    console.log('\n--- 7. Database Persistence ---');
    const [userRows] = await pool.query(
      'SELECT id, role, full_name, email, phone, status, password_hash FROM users WHERE id = ?;',
      [createdUserId]
    );
    const [doctorRows] = await pool.query(
      'SELECT id, user_id, specialization, qualification, department, consultation_fee, experience_years FROM doctors WHERE user_id = ?;',
      [createdUserId]
    );
    const [scheduleRows] = await pool.query(
      'SELECT id, day_of_week FROM doctor_schedules WHERE doctor_id = ?;',
      [createdDoctorId]
    );

    logTest('Persistence', 'User record persisted in DB', userRows.length === 1 && userRows[0].role === 'DOCTOR');
    logTest('Persistence', 'Doctor record persisted in DB', doctorRows.length === 1 && doctorRows[0].specialization === 'Neurology');
    logTest('Persistence', 'User password_hash is valid bcrypt in DB', userRows[0]?.password_hash?.startsWith('$2'));
    logTest('Persistence', 'Default weekly availability schedules created', scheduleRows.length === 5, `Schedules count: ${scheduleRows.length}`);

    // =========================================================================
    // 9. Created Doctor Can Log In
    // =========================================================================
    console.log('\n--- 8. Created Doctor Login ---');
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testDoctorData.email,
        password: testDoctorData.password,
      }),
    });
    const loginJson = await loginRes.json();

    logTest(
      'Auth',
      'Created doctor logs in successfully → 200',
      loginRes.status === 200 && Boolean(loginJson.data?.token),
      `Token returned: ${Boolean(loginJson.data?.token)}`
    );
    logTest('Auth', 'Login JWT has DOCTOR role', loginJson.data?.user?.role === 'DOCTOR');

    // =========================================================================
    // 10. Auto-generated Password Flow
    // =========================================================================
    console.log('\n--- 9. Auto-generated Password Doctor ---');
    const autoDocData = {
      fullName: 'Dr. Meera Nambiar',
      email: 'meera.nambiar.test@apollohospitals.com',
      phone: '+91 98450 77334',
      specialization: 'Paediatrics',
      department: 'Paediatrics',
      qualification: 'MBBS, DCH, DNB',
      experienceYears: 7,
      consultationFee: 750,
      hospitalName: 'Apollo Hospitals Bengaluru',
    };

    const autoRes = await fetch(`${BASE_URL}/admin/doctors`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify(autoDocData),
    });
    const autoJson = await autoRes.json();
    const autoUserId = autoJson.data?.user?.id;
    if (autoUserId) createdUserIds.push(autoUserId);

    logTest(
      'Creation',
      'Doctor created with auto-generated temporary password',
      autoRes.status === 201 && typeof autoJson.data?.temporaryPassword === 'string' && autoJson.data.temporaryPassword.length >= 8,
      `Generated temp password present: ${Boolean(autoJson.data?.temporaryPassword)}`
    );

    // Verify auto-generated password doctor can log in
    const autoLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: autoDocData.email,
        password: autoJson.data.temporaryPassword,
      }),
    });
    const autoLoginJson = await autoLoginRes.json();
    logTest(
      'Auth',
      'Auto-password doctor logs in with temporary password',
      autoLoginRes.status === 200 && Boolean(autoLoginJson.data?.token)
    );

  } catch (err) {
    console.error('\n[UNEXPECTED ERROR]:', err);
  } finally {
    // Clean up created test users (cascades to doctors and doctor_schedules)
    for (const uid of createdUserIds) {
      await pool.query('DELETE FROM users WHERE id = ?;', [uid]).catch(() => {});
    }

    await stopTestServer();
  }

  // =========================================================================
  // Summary
  // =========================================================================
  console.log('\n============================================================');
  console.log('Test Summary: Admin Create Doctor');
  console.log('============================================================');

  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = total - passed;

  console.log(`Total Checks : ${total}`);
  console.log(`Passed       : ${passed}`);
  console.log(`Failed       : ${failed}`);

  if (failed > 0) {
    console.log('\nFailed Tests:');
    results
      .filter((r) => !r.passed)
      .forEach((r) => console.log(` - [${r.category}] ${r.name} (${r.details})`));
    process.exit(1);
  } else {
    console.log('\nAll Admin Create Doctor checks PASSED successfully.\n');
    process.exit(0);
  }
}

runTests();
