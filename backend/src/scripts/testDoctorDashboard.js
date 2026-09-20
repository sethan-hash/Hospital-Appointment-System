/**
 * Phase 5A — Doctor Dashboard Test Suite
 *
 * Tests:
 *  1.  Authenticated doctor retrieves their own dashboard (HTTP 200)
 *  2.  Dashboard resolves doctor identity from JWT (not URL)
 *  3.  doctor object returned contains expected fields (no password_hash)
 *  4.  statistics object has required keys and numeric values
 *  5.  todayAppointments is an array
 *  6.  todayAppointments are ordered by appointmentTime ASC
 *  7.  Unauthenticated request returns 401
 *  8.  PATIENT role returns 403
 *  9.  No password_hash or auth secrets in response body
 * 10.  Another doctor cannot access first doctor's data (isolation — endpoint derives from JWT)
 * 11.  Statistics match database-derived values
 * 12.  Existing patient functionality regression check (GET /api/patients/profile)
 */
import { pool } from '../config/db.js';
import app from '../app.js';

let server;
const PORT = 5062;
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
      console.log(`[Doctor Dashboard Test Server] Running on port ${PORT}`);
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
    // ── Auth tokens ──────────────────────────────────────────────────────────

    // Doctor 1: Dr. Priya Sharma (user_id=1, doctors.id=1)
    const doctor1Login = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'priya.sharma@apollohospitals.com', password: 'Password123!' }),
    });
    const doctor1Token = (await doctor1Login.json()).data?.token;

    // Doctor 2: Dr. Rajesh Kulkarni (user_id=2, doctors.id=2)
    const doctor2Login = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'rajesh.kulkarni@apollohospitals.com', password: 'Password123!' }),
    });
    const doctor2Token = (await doctor2Login.json()).data?.token;

    // Patient: Rahul Verma
    const patientLogin = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'rahul.verma@example.in', password: 'Password123!' }),
    });
    const patientToken = (await patientLogin.json()).data?.token;

    const h = (tok) => ({ Authorization: `Bearer ${tok}` });

    // ── Test 1: Authenticated doctor retrieves dashboard (HTTP 200) ──────────
    const dashRes = await fetch(`${BASE_URL}/doctor/dashboard`, { headers: h(doctor1Token) });
    const dashJson = await dashRes.json();
    const dashData = dashJson.data;
    logTest(
      'Authenticated doctor retrieves dashboard (HTTP 200)',
      dashRes.status === 200 && dashJson.success === true && !!dashData,
      `status=${dashRes.status}`
    );

    // ── Test 2: Dashboard resolves doctor identity from JWT ──────────────────
    // Dr. Priya Sharma's JWT → should return her data, not another doctor's
    const isCorrectDoctor =
      dashData?.doctor?.name === 'Dr. Priya Sharma' &&
      dashData?.doctor?.specialization === 'Cardiology';
    logTest(
      'Dashboard resolves doctor identity from JWT (Dr. Priya Sharma)',
      isCorrectDoctor,
      `name=${dashData?.doctor?.name}, spec=${dashData?.doctor?.specialization}`
    );

    // ── Test 3: Doctor object has expected fields ────────────────────────────
    const doc = dashData?.doctor || {};
    const requiredDoctorFields = ['id', 'name', 'email', 'specialization', 'department', 'hospitalName', 'qualification', 'experienceYears'];
    const hasAllFields = requiredDoctorFields.every((f) => doc[f] !== undefined);
    logTest(
      'Doctor object has all required fields',
      hasAllFields,
      `fields=${requiredDoctorFields.filter((f) => doc[f] === undefined).join(',') || 'none missing'}`
    );

    // ── Test 4: Statistics has required keys with numeric values ────────────
    const stats = dashData?.statistics || {};
    const statKeys = ['todayCount', 'completedToday', 'upcomingTotal', 'totalPatients'];
    const statsOk = statKeys.every((k) => typeof stats[k] === 'number');
    logTest(
      'Statistics object has all required numeric keys',
      statsOk,
      `keys=${JSON.stringify(stats)}`
    );

    // ── Test 5: todayAppointments is an array ────────────────────────────────
    const todayAppts = dashData?.todayAppointments;
    logTest(
      'todayAppointments is an array',
      Array.isArray(todayAppts),
      `type=${typeof todayAppts}, length=${Array.isArray(todayAppts) ? todayAppts.length : 'N/A'}`
    );

    // ── Test 6: todayAppointments are sorted by time ASC ────────────────────
    let timesOrdered = true;
    if (Array.isArray(todayAppts) && todayAppts.length > 1) {
      for (let i = 1; i < todayAppts.length; i++) {
        if (todayAppts[i].appointmentTime < todayAppts[i - 1].appointmentTime) {
          timesOrdered = false;
          break;
        }
      }
    }
    logTest(
      'todayAppointments are ordered chronologically (ASC)',
      timesOrdered,
      `count=${Array.isArray(todayAppts) ? todayAppts.length : 0}`
    );

    // ── Test 7: Unauthenticated request returns 401 ──────────────────────────
    const unauthRes = await fetch(`${BASE_URL}/doctor/dashboard`);
    logTest('Unauthenticated request returns HTTP 401', unauthRes.status === 401);

    // ── Test 8: PATIENT role returns 403 ────────────────────────────────────
    const patientRes = await fetch(`${BASE_URL}/doctor/dashboard`, { headers: h(patientToken) });
    logTest('PATIENT role returns HTTP 403', patientRes.status === 403);

    // ── Test 9: No password_hash or auth secrets in response ────────────────
    const bodyStr = JSON.stringify(dashJson);
    const hasSecret =
      bodyStr.includes('password_hash') ||
      bodyStr.includes('password') ||
      bodyStr.includes('secret');
    logTest('No password_hash or auth secrets in response', !hasSecret);

    // ── Test 10: Another doctor's JWT returns THEIR OWN data (isolation) ────
    // Doctor 2's dashboard should show Rajesh Kulkarni, not Priya Sharma
    const dash2Res = await fetch(`${BASE_URL}/doctor/dashboard`, { headers: h(doctor2Token) });
    const dash2Json = await dash2Res.json();
    const isDoctor2 = dash2Json.data?.doctor?.name === 'Dr. Rajesh Kulkarni';
    logTest(
      'Doctor 2 JWT returns Doctor 2 data (resource isolation)',
      dash2Res.status === 200 && isDoctor2,
      `name=${dash2Json.data?.doctor?.name}`
    );

    // ── Test 11: Statistics match database-derived values ───────────────────
    // Independently compute todayCount for doctor 1 from DB
    const today = new Date();
    const todayStr = [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, '0'),
      String(today.getDate()).padStart(2, '0'),
    ].join('-');

    const [[dbStats]] = await pool.query(
      `SELECT
         COUNT(CASE WHEN a.appointment_date = ? THEN 1 END)                             AS todayCount,
         COUNT(CASE WHEN a.appointment_date = ? AND a.status = 'COMPLETED' THEN 1 END)  AS completedToday,
         COUNT(CASE WHEN a.appointment_date >= ? AND a.status = 'SCHEDULED' THEN 1 END) AS upcomingTotal,
         COUNT(DISTINCT a.patient_id)                                                    AS totalPatients
       FROM appointments a
       INNER JOIN doctors d ON d.id = a.doctor_id
       INNER JOIN users u   ON u.id = d.user_id
       WHERE u.email = ?;`,
      [todayStr, todayStr, todayStr, 'priya.sharma@apollohospitals.com']
    );

    const statsMatch =
      Number(stats.todayCount) === Number(dbStats.todayCount) &&
      Number(stats.completedToday) === Number(dbStats.completedToday) &&
      Number(stats.upcomingTotal) === Number(dbStats.upcomingTotal) &&
      Number(stats.totalPatients) === Number(dbStats.totalPatients);

    logTest(
      'Statistics match database-derived values',
      statsMatch,
      `API: ${JSON.stringify(stats)} | DB: today=${dbStats.todayCount}, completed=${dbStats.completedToday}, upcoming=${dbStats.upcomingTotal}, patients=${dbStats.totalPatients}`
    );

    // ── Test 12: Regression — patient profile endpoint still works ───────────
    const profileRes = await fetch(`${BASE_URL}/patients/profile`, { headers: h(patientToken) });
    const profileJson = await profileRes.json();
    logTest(
      'Regression: GET /api/patients/profile still returns HTTP 200 for PATIENT',
      profileRes.status === 200 && profileJson.success === true
    );

  } catch (err) {
    console.error('[Test Suite Error]', err);
  } finally {
    await stopTestServer();
  }

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log('\n============================================================');
  console.log('Phase 5A — Doctor Dashboard Test Summary');
  console.log('============================================================');
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = total - passed;
  console.log(`Total: ${total} | Passed: ${passed} | Failed: ${failed}`);

  if (failed > 0) {
    console.error('❌ Some tests failed.');
    process.exit(1);
  } else {
    console.log('✅ All Phase 5A doctor dashboard tests passed!\n');
    process.exit(0);
  }
}

runTests();
