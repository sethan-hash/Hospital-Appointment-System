import { pool } from '../config/db.js';
import app from '../app.js';

let server;
const PORT = 5057;
const BASE_URL = `http://localhost:${PORT}/api`;

const results = [];

function logTest(name, passed, details = '') {
  results.push({ name, passed, details });
  const mark = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`[${mark}] ${name}${details ? ` — ${details}` : ''}`);
}

async function startTestServer() {
  return new Promise((resolve) => {
    server = app.listen(PORT, () => {
      console.log(`[Doctor Search Test Server] Running on port ${PORT}`);
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
  await startTestServer();

  try {
    // Authenticate a PATIENT (Rahul Verma)
    const patientLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'rahul.verma@example.in', password: 'Password123!' }),
    });
    const patientLoginJson = await patientLoginRes.json();
    const patientToken = patientLoginJson.data?.token;

    // Authenticate a DOCTOR (Dr. Priya Sharma)
    const doctorLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'priya.sharma@apollohospitals.com', password: 'Password123!' }),
    });
    const doctorLoginJson = await doctorLoginRes.json();
    const doctorToken = doctorLoginJson.data?.token;

    // ==========================================
    // Test 1: Authenticated patient can retrieve doctor list
    // ==========================================
    const listRes = await fetch(`${BASE_URL}/doctors`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    const listJson = await listRes.json();
    const doctors = listJson.data?.doctors || [];

    const isListSuccess =
      listRes.status === 200 &&
      listJson.success &&
      Array.isArray(doctors) &&
      doctors.length >= 4;

    logTest('Authenticated patient retrieves doctor list (HTTP 200, ≥4 doctors)', isListSuccess,
      `count=${doctors.length}`);

    // ==========================================
    // Test 2: Doctor list does not expose sensitive fields
    // ==========================================
    const hasSensitiveField =
      doctors.some((d) =>
        d.password_hash !== undefined ||
        d.password !== undefined
      ) ||
      JSON.stringify(listJson).includes('password_hash');

    logTest('Sensitive fields (password_hash) never returned in doctor list', !hasSensitiveField);

    // ==========================================
    // Test 3: Search by name returns matching doctor
    // ==========================================
    const nameSearchRes = await fetch(`${BASE_URL}/doctors?search=priya`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    const nameSearchJson = await nameSearchRes.json();
    const nameResults = nameSearchJson.data?.doctors || [];
    const nameMatch =
      nameSearchRes.status === 200 &&
      nameResults.length >= 1 &&
      nameResults.some((d) => d.name.toLowerCase().includes('priya'));

    logTest('Name search "priya" returns Dr. Priya Sharma', nameMatch,
      `count=${nameResults.length}`);

    // ==========================================
    // Test 4: Specialty filter returns matching doctors
    // ==========================================
    const specRes = await fetch(`${BASE_URL}/doctors?specialty=cardiology`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    const specJson = await specRes.json();
    const specResults = specJson.data?.doctors || [];
    const specMatch =
      specRes.status === 200 &&
      specResults.length >= 1 &&
      specResults.every((d) => d.title.toLowerCase() === 'cardiology');

    logTest('Specialty filter "cardiology" returns only cardiologists', specMatch,
      `count=${specResults.length}`);

    // ==========================================
    // Test 5: No-match search returns empty array (not 404)
    // ==========================================
    const noMatchRes = await fetch(`${BASE_URL}/doctors?search=zzznomatch`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    const noMatchJson = await noMatchRes.json();
    const isEmptyClean =
      noMatchRes.status === 200 &&
      noMatchJson.success &&
      Array.isArray(noMatchJson.data?.doctors) &&
      noMatchJson.data.doctors.length === 0;

    logTest('No-match search returns HTTP 200 with empty array (not 404)', isEmptyClean);

    // ==========================================
    // Test 6: Unauthenticated request is rejected
    // ==========================================
    const unauthRes = await fetch(`${BASE_URL}/doctors`);
    logTest('Unauthenticated doctor list request rejected (HTTP 401)', unauthRes.status === 401);

    // ==========================================
    // Test 7: DOCTOR role cannot access doctor list (RBAC — PATIENT only)
    // ==========================================
    const doctorAccessRes = await fetch(`${BASE_URL}/doctors`, {
      headers: { Authorization: `Bearer ${doctorToken}` },
    });
    logTest('DOCTOR role rejected from /api/doctors (HTTP 403)', doctorAccessRes.status === 403);

    // ==========================================
    // Test 8: All four seeded Indian doctors are present
    // ==========================================
    const expectedDoctors = [
      'Dr. Priya Sharma',
      'Dr. Rajesh Kulkarni',
      'Dr. Ananya Iyer',
      'Dr. Vikram Venkatesh',
    ];
    const doctorNames = doctors.map((d) => d.name);
    const allSeedDoctorsPresent = expectedDoctors.every((name) => doctorNames.includes(name));
    logTest('All four seeded Indian doctors returned', allSeedDoctorsPresent,
      `found=${doctorNames.join(', ')}`);

    // ==========================================
    // Test 9: Individual doctor GET by ID
    // ==========================================
    const firstDoctorId = doctors[0]?.id;
    const singleRes = await fetch(`${BASE_URL}/doctors/${firstDoctorId}`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    const singleJson = await singleRes.json();
    const singleDoc = singleJson.data?.doctor;
    const isSingleSuccess =
      singleRes.status === 200 &&
      singleDoc?.id === firstDoctorId;

    logTest(`GET /api/doctors/${firstDoctorId} returns single doctor`, isSingleSuccess,
      `name=${singleDoc?.name}`);

    // ==========================================
    // Test 10: Unknown doctor ID returns 404
    // ==========================================
    const notFoundRes = await fetch(`${BASE_URL}/doctors/999999`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    logTest('Unknown doctor ID returns HTTP 404', notFoundRes.status === 404);

  } catch (err) {
    console.error('Test Suite Error:', err);
  } finally {
    await stopTestServer();
  }

  console.log('\n============================================================');
  console.log('Phase 4B Doctor Search — Test Summary');
  console.log('============================================================');
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = total - passed;
  console.log(`Total: ${total} | Passed: ${passed} | Failed: ${failed}`);

  if (failed > 0) {
    console.error('❌ Some tests failed.');
    process.exit(1);
  } else {
    console.log('✅ All Phase 4B doctor search tests passed!\n');
    process.exit(0);
  }
}

runTests();
