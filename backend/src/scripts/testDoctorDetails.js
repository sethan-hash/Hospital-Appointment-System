import { pool } from '../config/db.js';
import app from '../app.js';

let server;
const PORT = 5058;
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
      console.log(`[Doctor Details & Availability Test Server] Running on port ${PORT}`);
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
    const patientToken = (await patientLoginRes.json()).data?.token;

    // Authenticate a DOCTOR (Dr. Priya Sharma)
    const doctorLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'priya.sharma@apollohospitals.com', password: 'Password123!' }),
    });
    const doctorToken = (await doctorLoginRes.json()).data?.token;

    const authHeader = (tok) => ({ Authorization: `Bearer ${tok}` });

    // ==========================================
    // Doctor Details Tests
    // ==========================================

    // Test 1: Authenticated patient retrieves known doctor (includes new fields)
    const detailRes = await fetch(`${BASE_URL}/doctors/1`, { headers: authHeader(patientToken) });
    const detailJson = await detailRes.json();
    const doc = detailJson.data?.doctor;

    const isDetailSuccess =
      detailRes.status === 200 &&
      detailJson.success &&
      doc?.name === 'Dr. Priya Sharma' &&
      doc?.education === 'MBBS, MD (Cardiology), DM' &&
      doc?.clinicName === 'Apollo Hospitals Bengaluru' &&
      doc?.bio?.length > 0 &&
      Array.isArray(doc?.reviews);

    logTest(
      'Authenticated patient retrieves doctor details with education & clinicName (HTTP 200)',
      isDetailSuccess,
      `name=${doc?.name} education=${doc?.education}`
    );

    // Test 2: password_hash never exposed in doctor details
    const noSensitive =
      doc?.password_hash === undefined &&
      doc?.password === undefined &&
      !JSON.stringify(detailJson).includes('password_hash');
    logTest('password_hash never returned in doctor details', noSensitive);

    // Test 3: Unknown doctor returns 404
    const notFoundRes = await fetch(`${BASE_URL}/doctors/999999`, { headers: authHeader(patientToken) });
    logTest('Unknown doctor ID returns HTTP 404', notFoundRes.status === 404);

    // Test 4: Unauthenticated doctor detail request returns 401
    const unauthRes = await fetch(`${BASE_URL}/doctors/1`);
    logTest('Unauthenticated doctor detail request rejected (HTTP 401)', unauthRes.status === 401);

    // Test 5: DOCTOR role cannot access details (RBAC)
    const doctorAccessRes = await fetch(`${BASE_URL}/doctors/1`, { headers: authHeader(doctorToken) });
    logTest('DOCTOR role rejected from doctor details (HTTP 403)', doctorAccessRes.status === 403);

    // ==========================================
    // Availability Tests
    // ==========================================

    // Test 6: Authenticated patient retrieves doctor availability
    const availRes = await fetch(`${BASE_URL}/doctors/1/availability`, { headers: authHeader(patientToken) });
    const availJson = await availRes.json();
    const schedule = availJson.data?.schedule;

    const isAvailSuccess =
      availRes.status === 200 &&
      availJson.success &&
      Array.isArray(schedule) &&
      schedule.length === 7;  // full 7-day display

    logTest('Authenticated patient retrieves doctor availability (HTTP 200, 7 days)', isAvailSuccess,
      `days=${schedule?.length}`);

    // Test 7: Schedule data matches doctor_schedules table
    // Doctor 1 has MONDAY, WEDNESDAY, FRIDAY active in DB
    const monday = schedule?.find((s) => s.day === 'Monday');
    const tuesday = schedule?.find((s) => s.day === 'Tuesday');
    const friday = schedule?.find((s) => s.day === 'Friday');

    const isDataCorrect =
      monday?.available === true &&
      monday?.hours.includes('AM') &&
      tuesday?.available === false &&
      tuesday?.hours === 'Unavailable' &&
      friday?.available === true;

    logTest('Availability data matches doctor_schedules (Mon=available, Tue=unavailable)', isDataCorrect,
      `Mon=${monday?.hours} Tue=${tuesday?.hours} Fri=${friday?.hours}`);

    // Test 8: Schedule shape has correct fields
    const firstActiveDay = schedule?.find((s) => s.available);
    const hasCorrectShape =
      firstActiveDay &&
      typeof firstActiveDay.day === 'string' &&
      typeof firstActiveDay.hours === 'string' &&
      typeof firstActiveDay.available === 'boolean';
    logTest('Availability schedule items have correct shape (day, hours, available)', hasCorrectShape);

    // Test 9: Availability for unknown doctor returns 404
    const availNotFoundRes = await fetch(`${BASE_URL}/doctors/999999/availability`, {
      headers: authHeader(patientToken),
    });
    logTest('Unknown doctor availability returns HTTP 404', availNotFoundRes.status === 404);

    // Test 10: Unauthenticated availability request returns 401
    const availUnauthRes = await fetch(`${BASE_URL}/doctors/1/availability`);
    logTest('Unauthenticated availability request rejected (HTTP 401)', availUnauthRes.status === 401);

    // Test 11: DOCTOR role cannot access availability (RBAC)
    const availDoctorRes = await fetch(`${BASE_URL}/doctors/1/availability`, {
      headers: authHeader(doctorToken),
    });
    logTest('DOCTOR role rejected from availability endpoint (HTTP 403)', availDoctorRes.status === 403);

    // Test 12: All 4 doctors' availability is fetchable
    const docIds = [1, 2, 3, 4];
    let allAvailOk = true;
    for (const did of docIds) {
      const r = await fetch(`${BASE_URL}/doctors/${did}/availability`, { headers: authHeader(patientToken) });
      if (r.status !== 200) { allAvailOk = false; break; }
      const j = await r.json();
      if (!Array.isArray(j.data?.schedule) || j.data.schedule.length !== 7) { allAvailOk = false; break; }
    }
    logTest('All 4 seeded doctors return a valid 7-day availability schedule', allAvailOk);

    // Test 13: Verify DB consistency — doctor 2 schedule
    const [dbRows] = await pool.query(
      'SELECT day_of_week, start_time, end_time FROM doctor_schedules WHERE doctor_id = 2 AND is_active = 1 ORDER BY FIELD(day_of_week,"MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY","SUNDAY");'
    );
    const avail2Res = await fetch(`${BASE_URL}/doctors/2/availability`, { headers: authHeader(patientToken) });
    const avail2Schedule = (await avail2Res.json()).data?.schedule || [];
    const activeApiDays = avail2Schedule.filter((s) => s.available).map((s) => s.day);
    const dbDays = dbRows.map((r) => r.day_of_week.charAt(0) + r.day_of_week.slice(1).toLowerCase());
    const dbMatchesApi = dbDays.every((d) => activeApiDays.includes(d)) && dbDays.length === activeApiDays.length;
    logTest('Doctor 2 availability matches doctor_schedules table exactly', dbMatchesApi,
      `DB days: ${dbDays.join(',')} | API active days: ${activeApiDays.join(',')}`);

  } catch (err) {
    console.error('Test Suite Error:', err);
  } finally {
    await stopTestServer();
  }

  console.log('\n============================================================');
  console.log('Phase 4C Doctor Details & Availability — Test Summary');
  console.log('============================================================');
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = total - passed;
  console.log(`Total: ${total} | Passed: ${passed} | Failed: ${failed}`);

  if (failed > 0) {
    console.error('❌ Some tests failed.');
    process.exit(1);
  } else {
    console.log('✅ All Phase 4C doctor details & availability tests passed!\n');
    process.exit(0);
  }
}

runTests();
