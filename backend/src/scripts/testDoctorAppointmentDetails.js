/**
 * Phase 5B — Doctor Appointment & Patient Details Test Suite
 *
 * Tests:
 *  1. Authenticated doctor retrieves their own appointment (HTTP 200)
 *  2. Appointment contains correct appointment details (id, date, time, status, type, reason, location)
 *  3. Appointment contains correct patient details (id, name, email, phone, dateOfBirth, gender, bloodGroup, etc.)
 *  4. Doctor identity is derived from JWT (no doctorId passed)
 *  5. Another doctor's appointment cannot be accessed (HTTP 404 resource isolation)
 *  6. Unauthenticated request returns 401
 *  7. PATIENT role returns 403 Forbidden
 *  8. Invalid appointment ID returns 400 (abc, -1, 0)
 *  9. Unknown appointment returns 404
 * 10. No password_hash in response body
 * 11. No authentication secrets/tokens in response body
 * 12. Patient data is limited to intended fields
 * 13. Existing doctor dashboard still works (HTTP 200)
 * 14. Existing patient profile functionality remains intact (regression)
 */
import { pool } from '../config/db.js';
import app from '../app.js';

let server;
const PORT = 5063;
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
      console.log(`[Doctor Appointment Details Test Server] Running on port ${PORT}`);
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
    // ── Auth Tokens ──────────────────────────────────────────────────────────

    // Doctor 1: Dr. Priya Sharma (doctors.id = 1, users.id = 1)
    const doctor1Login = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'priya.sharma@apollohospitals.com', password: 'Password123!' }),
    });
    const doctor1Token = (await doctor1Login.json()).data?.token;

    // Doctor 2: Dr. Rajesh Kulkarni (doctors.id = 2, users.id = 2)
    const doctor2Login = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'rajesh.kulkarni@apollohospitals.com', password: 'Password123!' }),
    });
    const doctor2Token = (await doctor2Login.json()).data?.token;

    // Patient: Rahul Verma (patients.id = 1, users.id = 5)
    const patientLogin = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'rahul.verma@example.in', password: 'Password123!' }),
    });
    const patientToken = (await patientLogin.json()).data?.token;

    const h = (tok) => ({ Authorization: `Bearer ${tok}` });

    // In seed data:
    // Appointment 1 belongs to doctor_id = 1 (Dr. Priya Sharma), patient_id = 1 (Rahul Verma)
    // Appointment 3 belongs to doctor_id = 2 (Dr. Rajesh Kulkarni), patient_id = 3 (Amit Sundaram)

    // ── Test 1: Authenticated doctor retrieves their own appointment ─────────
    const apptRes = await fetch(`${BASE_URL}/doctor/appointments/1`, { headers: h(doctor1Token) });
    const apptJson = await apptRes.json();
    const apptData = apptJson.data;
    logTest(
      'Authenticated doctor retrieves their own appointment (HTTP 200)',
      apptRes.status === 200 && apptJson.success === true && !!apptData,
      `status=${apptRes.status}`
    );

    // ── Test 2: Appointment contains correct appointment details ─────────────
    const appt = apptData?.appointment || {};
    const requiredApptKeys = ['id', 'date', 'time', 'status', 'type', 'reason', 'location'];
    const hasApptKeys = requiredApptKeys.every((k) => appt[k] !== undefined);
    const isApptValuesValid =
      appt.id === 1 &&
      appt.status === 'COMPLETED' &&
      appt.type === 'IN_PERSON' &&
      typeof appt.date === 'string' &&
      typeof appt.time === 'string' &&
      appt.location.includes('Apollo');
    logTest(
      'Appointment contains correct appointment details',
      hasApptKeys && isApptValuesValid,
      `id=${appt.id}, status=${appt.status}, type=${appt.type}, time=${appt.time}, location=${appt.location}`
    );

    // ── Test 3: Appointment contains correct patient details ─────────────────
    const patient = apptData?.patient || {};
    const requiredPatientKeys = [
      'id', 'name', 'email', 'phone', 'dateOfBirth', 'gender',
      'bloodGroup', 'address', 'city', 'state', 'pincode',
      'emergencyContactName', 'emergencyContactPhone', 'allergies', 'chronicConditions'
    ];
    const hasPatientKeys = requiredPatientKeys.every((k) => k in patient);
    const isPatientValuesValid =
      patient.id === 1 &&
      patient.name === 'Rahul Verma' &&
      patient.email === 'rahul.verma@example.in' &&
      patient.gender === 'MALE' &&
      patient.bloodGroup === 'O+';
    logTest(
      'Appointment contains correct patient details',
      hasPatientKeys && isPatientValuesValid,
      `id=${patient.id}, name=${patient.name}, email=${patient.email}, bloodGroup=${patient.bloodGroup}`
    );

    // ── Test 4: Doctor identity is derived from JWT (no doctorId in query/body)
    logTest(
      'Doctor identity derived strictly from JWT',
      !apptJson.data?.doctorId && apptData?.appointment?.id === 1,
      'URL format was /api/doctor/appointments/1 without client doctorId param'
    );

    // ── Test 5: Another doctor cannot access first doctor\'s appointment ─────
    // Doctor 1 (Priya Sharma) attempts to fetch Appointment 3 (Rajesh Kulkarni\'s appointment)
    const crossRes = await fetch(`${BASE_URL}/doctor/appointments/3`, { headers: h(doctor1Token) });
    const crossJson = await crossRes.json();
    logTest(
      "Another doctor's appointment cannot be accessed (HTTP 404 resource isolation)",
      crossRes.status === 404 && crossJson.success === false,
      `status=${crossRes.status}, message="${crossJson.message}"`
    );

    // Verify Doctor 2 CAN fetch Appointment 3
    const doc2ApptRes = await fetch(`${BASE_URL}/doctor/appointments/3`, { headers: h(doctor2Token) });
    const doc2ApptJson = await doc2ApptRes.json();
    logTest(
      'Doctor 2 successfully retrieves their own appointment 3',
      doc2ApptRes.status === 200 && doc2ApptJson.data?.patient?.name === 'Amit Sundaram',
      `status=${doc2ApptRes.status}, patient="${doc2ApptJson.data?.patient?.name}"`
    );

    // ── Test 6: Unauthenticated request returns 401 ──────────────────────────
    const unauthRes = await fetch(`${BASE_URL}/doctor/appointments/1`);
    logTest('Unauthenticated request returns HTTP 401', unauthRes.status === 401);

    // ── Test 7: PATIENT role returns 403 ─────────────────────────────────────
    const patientRes = await fetch(`${BASE_URL}/doctor/appointments/1`, { headers: h(patientToken) });
    logTest('PATIENT role returns HTTP 403', patientRes.status === 403);

    // ── Test 8: Invalid appointment ID returns 400 ───────────────────────────
    const invalidIdRes1 = await fetch(`${BASE_URL}/doctor/appointments/abc`, { headers: h(doctor1Token) });
    const invalidIdRes2 = await fetch(`${BASE_URL}/doctor/appointments/-1`, { headers: h(doctor1Token) });
    const invalidIdRes3 = await fetch(`${BASE_URL}/doctor/appointments/0`, { headers: h(doctor1Token) });
    const all400 = invalidIdRes1.status === 400 && invalidIdRes2.status === 400 && invalidIdRes3.status === 400;
    logTest(
      'Invalid appointment ID returns HTTP 400 (abc, -1, 0)',
      all400,
      `statuses=[${invalidIdRes1.status}, ${invalidIdRes2.status}, ${invalidIdRes3.status}]`
    );

    // ── Test 9: Unknown appointment returns 404 ──────────────────────────────
    const unknownRes = await fetch(`${BASE_URL}/doctor/appointments/999999`, { headers: h(doctor1Token) });
    logTest('Unknown appointment returns HTTP 404', unknownRes.status === 404);

    // ── Test 10: No password_hash in response ────────────────────────────────
    const rawBody = JSON.stringify(apptJson);
    const hasPasswordHash = rawBody.includes('password_hash') || rawBody.includes('$2a$') || rawBody.includes('$2b$');
    logTest('No password_hash or bcrypt hashes in response body', !hasPasswordHash);

    // ── Test 11: No authentication secrets or tokens in response ─────────────
    const hasSecrets = rawBody.includes('jwt') || rawBody.includes('token') || rawBody.includes('secret');
    logTest('No authentication secrets or tokens in response body', !hasSecrets);

    // ── Test 12: Patient data is limited to intended fields ──────────────────
    const patientKeys = Object.keys(patient);
    const forbiddenKeys = ['password', 'password_hash', 'status', 'role', 'token', 'refreshToken'];
    const hasForbidden = forbiddenKeys.some((k) => patientKeys.includes(k));
    logTest('Patient data is strictly limited to intended fields', !hasForbidden);

    // ── Test 13: Existing doctor dashboard still works ───────────────────────
    const dashRes = await fetch(`${BASE_URL}/doctor/dashboard`, { headers: h(doctor1Token) });
    logTest('Existing doctor dashboard still works (HTTP 200)', dashRes.status === 200);

    // ── Test 14: Existing patient profile functionality remains intact ────────
    const profileRes = await fetch(`${BASE_URL}/patients/profile`, { headers: h(patientToken) });
    logTest('Regression: GET /api/patients/profile still returns HTTP 200 for PATIENT', profileRes.status === 200);

  } catch (err) {
    console.error('Test Suite Error:', err);
  } finally {
    await stopTestServer();
  }

  console.log('\n============================================================');
  console.log('Phase 5B — Doctor Appointment Details Test Summary');
  console.log('============================================================');
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = total - passed;
  console.log(`Total: ${total} | Passed: ${passed} | Failed: ${failed}`);

  if (failed > 0) {
    console.error('❌ Some tests failed.');
    process.exit(1);
  } else {
    console.log('✅ All Phase 5B doctor appointment details tests passed!\n');
    process.exit(0);
  }
}

runTests();
