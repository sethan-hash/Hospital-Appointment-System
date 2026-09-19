import { pool } from '../config/db.js';
import app from '../app.js';

let server;
const PORT = 5056;
const BASE_URL = `http://localhost:${PORT}/api`;

const results = [];

function logTest(name, passed, details = '') {
  results.push({ name, passed, details });
  const statusMark = passed ? '✓ PASS' : '✗ FAIL';
  console.log(`[${statusMark}] ${name}${details ? ` - ${details}` : ''}`);
}

async function startTestServer() {
  return new Promise((resolve) => {
    server = app.listen(PORT, () => {
      console.log(`[Patient Profile Test Server] Running on port ${PORT}`);
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
  console.log('MedLink Care: Phase 4A Patient Profile Test Suite');
  console.log('============================================================\n');

  await startTestServer();

  try {
    // 1. Authenticate seed patient (Rahul Verma - user_id: 5, patient_id: 1)
    const patientLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'rahul.verma@example.in', password: 'Password123!' }),
    });
    const patientLoginJson = await patientLoginRes.json();
    const patientToken = patientLoginJson.data?.token;

    // Authenticate a second seed patient (Sneha Patel - user_id: 6, patient_id: 2)
    const patient2LoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'sneha.patel@example.in', password: 'Password123!' }),
    });
    const patient2LoginJson = await patient2LoginRes.json();
    const patient2Token = patient2LoginJson.data?.token;

    // Authenticate a seed doctor (Dr. Priya Sharma - user_id: 1)
    const doctorLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'priya.sharma@apollohospitals.com', password: 'Password123!' }),
    });
    const doctorLoginJson = await doctorLoginRes.json();
    const doctorToken = doctorLoginJson.data?.token;

    // ==========================================
    // Test 1: Authenticated patient fetches own profile
    // ==========================================
    const getProfileRes = await fetch(`${BASE_URL}/patients/profile`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    const getProfileJson = await getProfileRes.json();
    const profile = getProfileJson.data?.profile;

    const isGetProfileSuccess =
      getProfileRes.status === 200 &&
      getProfileJson.success &&
      profile?.email === 'rahul.verma@example.in' &&
      profile?.userId === 5 &&
      profile?.id === 1;

    logTest('Authenticated patient can fetch their own profile (HTTP 200)', isGetProfileSuccess);

    // ==========================================
    // Test 2: Unauthenticated request is rejected
    // ==========================================
    const unauthRes = await fetch(`${BASE_URL}/patients/profile`);
    logTest('Unauthenticated request is rejected (HTTP 401)', unauthRes.status === 401);

    // ==========================================
    // Test 3: Non-patient role (Doctor) is rejected
    // ==========================================
    const doctorAccessRes = await fetch(`${BASE_URL}/patients/profile`, {
      headers: { Authorization: `Bearer ${doctorToken}` },
    });
    logTest('Doctor access to patient profile rejected (HTTP 403)', doctorAccessRes.status === 403);

    // ==========================================
    // Test 4: Patient isolation / Cannot access another patient profile
    // ==========================================
    // Profile must be bound to JWT identity, never spoofable
    const getProfile2Res = await fetch(`${BASE_URL}/patients/profile`, {
      headers: { Authorization: `Bearer ${patient2Token}` },
    });
    const profile2 = (await getProfile2Res.json()).data?.profile;
    const isIsolated = profile2?.email === 'sneha.patel@example.in' && profile2?.userId === 6;
    logTest('Patient 2 receives their own profile strictly bound to JWT', isIsolated);

    // ==========================================
    // Test 5: Sensitive fields (password_hash) never exposed
    // ==========================================
    const hasSensitiveFields =
      profile?.password_hash !== undefined ||
      profile?.password !== undefined ||
      JSON.stringify(getProfileJson).includes('password_hash');
    logTest('Sensitive fields (password_hash) are never returned', !hasSensitiveFields);

    // ==========================================
    // Test 6: Authenticated patient updates profile
    // ==========================================
    const updatedName = 'Rahul K. Verma';
    const updatedPhone = '+91 99001 99999';
    const updatedAllergies = 'Peanuts, Dust';
    const updatedConditions = 'Mild Hypertension (Managed)';
    const updatedEcName = 'Pooja R. Verma';

    const updateRes = await fetch(`${BASE_URL}/patients/profile`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${patientToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: updatedName,
        phone: updatedPhone,
        bloodType: 'O+',
        allergies: updatedAllergies,
        chronicConditions: updatedConditions,
        emergencyContactName: updatedEcName,
        emergencyContactPhone: '+91 99001 99881',
      }),
    });
    const updateJson = await updateRes.json();
    const updatedProfile = updateJson.data?.profile;

    const isUpdateSuccess =
      updateRes.status === 200 &&
      updateJson.success &&
      updatedProfile?.name === updatedName &&
      updatedProfile?.phone === updatedPhone &&
      updatedProfile?.allergies === updatedAllergies &&
      updatedProfile?.chronicConditions === updatedConditions;

    logTest('Authenticated patient can update allowed profile fields (HTTP 200)', isUpdateSuccess);

    // ==========================================
    // Test 7: Verify database records directly in MySQL
    // ==========================================
    const [dbUserRows] = await pool.query('SELECT full_name, phone FROM users WHERE id = 5;');
    const [dbPatientRows] = await pool.query('SELECT allergies, chronic_conditions FROM patients WHERE user_id = 5;');

    const isDbVerified =
      dbUserRows[0]?.full_name === updatedName &&
      dbUserRows[0]?.phone === updatedPhone &&
      dbPatientRows[0]?.allergies === updatedAllergies &&
      dbPatientRows[0]?.chronic_conditions === updatedConditions;

    logTest('Database verification: records updated in MySQL tables', isDbVerified);

    // ==========================================
    // Test 8: Duplicate email / phone rejection
    // ==========================================
    // Attempting to update patient 1's email to patient 2's email ('sneha.patel@example.in')
    const dupRes = await fetch(`${BASE_URL}/patients/profile`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${patientToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: 'sneha.patel@example.in' }),
    });
    logTest('Duplicate email on profile update rejected (HTTP 409)', dupRes.status === 409);

    // ==========================================
    // Test 9: Invalid profile data rejected
    // ==========================================
    const invalidEmailRes = await fetch(`${BASE_URL}/patients/profile`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${patientToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: 'not-valid-email' }),
    });
    logTest('Invalid email rejected (HTTP 400)', invalidEmailRes.status === 400);

    const invalidBloodRes = await fetch(`${BASE_URL}/patients/profile`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${patientToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ bloodType: 'X_UNKNOWN' }),
    });
    logTest('Invalid blood type rejected (HTTP 400)', invalidBloodRes.status === 400);

    // ==========================================
    // Revert seed patient back to clean state
    // ==========================================
    await fetch(`${BASE_URL}/patients/profile`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${patientToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Rahul Verma',
        phone: '+91 99001 11223',
        bloodType: 'O+',
        allergies: 'None',
        chronicConditions: 'None',
        emergencyContactName: 'Pooja Verma',
        emergencyContactPhone: '+91 99001 99881',
      }),
    });

  } catch (err) {
    console.error('Test Suite Error:', err);
  } finally {
    await stopTestServer();
  }

  console.log('\n============================================================');
  console.log('Test Summary');
  console.log('============================================================');
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = total - passed;
  console.log(`Total: ${total} | Passed: ${passed} | Failed: ${failed}`);

  if (failed > 0) {
    console.error('❌ Some tests failed.');
    process.exit(1);
  } else {
    console.log('★ All Phase 4A patient profile tests passed successfully!\n');
    process.exit(0);
  }
}

runTests();
