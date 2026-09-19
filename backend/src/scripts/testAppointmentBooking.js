import { pool } from '../config/db.js';
import app from '../app.js';

let server;
const PORT = 5059;
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
      console.log(`[Appointment Booking Test Server] Running on port ${PORT}`);
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

// Helper to get next date matching a target weekday (0=Sun, 1=Mon, ..., 6=Sat)
function getNextWeekdayDate(dayOfWeek, weeksAhead = 1) {
  const d = new Date();
  d.setDate(d.getDate() + ((7 + dayOfWeek - d.getDay()) % 7 || 7) + (weeksAhead - 1) * 7);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

async function runTests() {
  await startTestServer();

  // Track inserted appointment IDs for cleanup
  const createdAppointmentIds = [];

  try {
    // Record initial seed appointments to verify they remain intact
    const [initialAppointments] = await pool.query('SELECT id, status FROM appointments ORDER BY id ASC;');
    const initialIds = initialAppointments.map((a) => a.id);

    // ── Authenticate test users ─────────────────────────────────────────────
    // 1. PATIENT: Rahul Verma (user_id = 1, patient_id = 1)
    const patientLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'rahul.verma@example.in', password: 'Password123!' }),
    });
    const patientData = await patientLoginRes.json();
    const patientToken = patientData.data?.token;

    // 2. DOCTOR: Dr. Priya Sharma (user_id = 2, doctor_id = 1)
    const doctorLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'priya.sharma@apollohospitals.com', password: 'Password123!' }),
    });
    const doctorData = await doctorLoginRes.json();
    const doctorToken = doctorData.data?.token;

    const authHeader = (tok) => ({
      Authorization: `Bearer ${tok}`,
      'Content-Type': 'application/json',
    });

    // Dr. Priya Sharma (doctorId = 1) schedule:
    // MONDAY: 09:00 - 13:00 (30 min slots)
    // WEDNESDAY: 09:00 - 13:00 (30 min slots)
    // FRIDAY: 14:00 - 18:00 (30 min slots)
    // Use upcoming Monday for tests
    const testMonday = getNextWeekdayDate(1, 2); // Monday 2 weeks ahead to avoid any date clashes
    const testSunday = getNextWeekdayDate(0, 2); // Sunday (doctor is not available)

    console.log(`\nUsing Test Monday: ${testMonday}, Test Sunday: ${testSunday}\n`);

    // =========================================================================
    // Test 1: Authenticated patient can create a valid appointment
    // =========================================================================
    const bookRes1 = await fetch(`${BASE_URL}/appointments`, {
      method: 'POST',
      headers: authHeader(patientToken),
      body: JSON.stringify({
        doctorId: 1,
        appointmentDate: testMonday,
        startTime: '09:00',
        reason: 'Regular cardiology checkup',
      }),
    });
    const bookData1 = await bookRes1.json();
    const apt1 = bookData1.data?.appointment;
    if (apt1?.id) createdAppointmentIds.push(apt1.id);

    logTest(
      '1. Authenticated patient can create a valid appointment',
      bookRes1.status === 201 &&
        bookData1.success === true &&
        apt1?.doctorId === 1 &&
        apt1?.date === testMonday &&
        apt1?.status === 'SCHEDULED' &&
        apt1?.reason === 'Regular cardiology checkup',
      `HTTP ${bookRes1.status}, ID: ${apt1?.id}, Date: ${apt1?.date}, Time: ${apt1?.time}`
    );

    // =========================================================================
    // Test 2: Patient identity is derived from JWT, not request body
    // =========================================================================
    const bookRes2 = await fetch(`${BASE_URL}/appointments`, {
      method: 'POST',
      headers: authHeader(patientToken),
      body: JSON.stringify({
        doctorId: 1,
        patientId: 9999, // spoofed patientId
        appointmentDate: testMonday,
        startTime: '09:30',
        reason: 'Spoof attempt',
      }),
    });
    const bookData2 = await bookRes2.json();
    const apt2 = bookData2.data?.appointment;
    if (apt2?.id) createdAppointmentIds.push(apt2.id);

    // Fetch the actual patient_id stored in the database
    let storedPatientId = null;
    if (apt2?.id) {
      const [rows] = await pool.query('SELECT patient_id FROM appointments WHERE id = ?;', [apt2.id]);
      storedPatientId = rows[0]?.patient_id;
    }

    logTest(
      '2. Patient identity is derived from JWT, not request body',
      bookRes2.status === 201 && storedPatientId === 1,
      `Stored patient_id in DB: ${storedPatientId} (ignored spoofed 9999)`
    );

    // =========================================================================
    // Test 3: Unauthenticated request returns 401
    // =========================================================================
    const unauthRes = await fetch(`${BASE_URL}/appointments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        doctorId: 1,
        appointmentDate: testMonday,
        startTime: '10:00',
      }),
    });
    logTest(
      '3. Unauthenticated request returns 401',
      unauthRes.status === 401,
      `HTTP ${unauthRes.status}`
    );

    // =========================================================================
    // Test 4: DOCTOR role returns 403 Forbidden
    // =========================================================================
    const doctorBookRes = await fetch(`${BASE_URL}/appointments`, {
      method: 'POST',
      headers: authHeader(doctorToken),
      body: JSON.stringify({
        doctorId: 1,
        appointmentDate: testMonday,
        startTime: '10:00',
      }),
    });
    logTest(
      '4. DOCTOR role returns 403',
      doctorBookRes.status === 403,
      `HTTP ${doctorBookRes.status}`
    );

    // =========================================================================
    // Test 5: Unknown doctor returns 404
    // =========================================================================
    const unknownDocRes = await fetch(`${BASE_URL}/appointments`, {
      method: 'POST',
      headers: authHeader(patientToken),
      body: JSON.stringify({
        doctorId: 99999,
        appointmentDate: testMonday,
        startTime: '09:00',
      }),
    });
    logTest(
      '5. Unknown doctor returns 404',
      unknownDocRes.status === 404,
      `HTTP ${unknownDocRes.status}`
    );

    // =========================================================================
    // Test 6: Invalid date returns 400
    // =========================================================================
    const pastDateRes = await fetch(`${BASE_URL}/appointments`, {
      method: 'POST',
      headers: authHeader(patientToken),
      body: JSON.stringify({
        doctorId: 1,
        appointmentDate: '2020-01-01',
        startTime: '09:00',
      }),
    });
    const malformedDateRes = await fetch(`${BASE_URL}/appointments`, {
      method: 'POST',
      headers: authHeader(patientToken),
      body: JSON.stringify({
        doctorId: 1,
        appointmentDate: 'not-a-date',
        startTime: '09:00',
      }),
    });
    logTest(
      '6. Invalid date returns 400 (past date and malformed date)',
      pastDateRes.status === 400 && malformedDateRes.status === 400,
      `Past: ${pastDateRes.status}, Malformed: ${malformedDateRes.status}`
    );

    // =========================================================================
    // Test 7: Invalid time returns 400
    // =========================================================================
    const invalidTimeRes = await fetch(`${BASE_URL}/appointments`, {
      method: 'POST',
      headers: authHeader(patientToken),
      body: JSON.stringify({
        doctorId: 1,
        appointmentDate: testMonday,
        startTime: '25:99',
      }),
    });
    logTest(
      '7. Invalid time returns 400',
      invalidTimeRes.status === 400,
      `HTTP ${invalidTimeRes.status}`
    );

    // =========================================================================
    // Test 8: Time outside doctor's schedule returns 400
    // =========================================================================
    // 8a: Day when doctor does not work (Sunday)
    const outsideDayRes = await fetch(`${BASE_URL}/appointments`, {
      method: 'POST',
      headers: authHeader(patientToken),
      body: JSON.stringify({
        doctorId: 1,
        appointmentDate: testSunday,
        startTime: '10:00',
      }),
    });
    // 8b: Hour before schedule starts (08:00 AM on Monday, schedule is 09:00-13:00)
    const beforeHoursRes = await fetch(`${BASE_URL}/appointments`, {
      method: 'POST',
      headers: authHeader(patientToken),
      body: JSON.stringify({
        doctorId: 1,
        appointmentDate: testMonday,
        startTime: '08:00',
      }),
    });
    logTest(
      "8. Time outside doctor's schedule returns 400",
      outsideDayRes.status === 400 && beforeHoursRes.status === 400,
      `Non-working day: ${outsideDayRes.status}, Outside hours: ${beforeHoursRes.status}`
    );

    // =========================================================================
    // Test 9: Time not aligned with slot duration is rejected with 400
    // =========================================================================
    // Doctor 1 has 30-minute slot duration. 09:15 is misaligned.
    const misalignedRes = await fetch(`${BASE_URL}/appointments`, {
      method: 'POST',
      headers: authHeader(patientToken),
      body: JSON.stringify({
        doctorId: 1,
        appointmentDate: testMonday,
        startTime: '09:15',
      }),
    });
    logTest(
      '9. Time not aligned with slot duration is rejected with 400',
      misalignedRes.status === 400,
      `HTTP ${misalignedRes.status}`
    );

    // =========================================================================
    // Test 10: Already-booked slot returns 409 Conflict
    // =========================================================================
    // Slot 09:00 on testMonday was already booked in Test 1
    const conflictRes = await fetch(`${BASE_URL}/appointments`, {
      method: 'POST',
      headers: authHeader(patientToken),
      body: JSON.stringify({
        doctorId: 1,
        appointmentDate: testMonday,
        startTime: '09:00',
      }),
    });
    const conflictData = await conflictRes.json();
    logTest(
      '10. Already-booked slot returns 409',
      conflictRes.status === 409 && conflictData.success === false,
      `HTTP ${conflictRes.status}, Message: "${conflictData.message}"`
    );

    // =========================================================================
    // Test 11: Successful booking is persisted in MySQL
    // =========================================================================
    const [persistedRows] = await pool.query(
      `SELECT id, patient_id, doctor_id, DATE_FORMAT(appointment_date, '%Y-%m-%d') AS date,
              appointment_time, status, reason_for_visit
       FROM appointments WHERE id = ?;`,
      [apt1.id]
    );
    const persisted = persistedRows[0];
    logTest(
      '11. Successful booking is persisted in MySQL',
      Boolean(persisted) &&
        persisted.patient_id === 1 &&
        persisted.doctor_id === 1 &&
        persisted.date === testMonday &&
        persisted.appointment_time === '09:00:00' &&
        persisted.status === 'SCHEDULED',
      `ID ${persisted?.id} found in MySQL with status ${persisted?.status}`
    );

    // =========================================================================
    // Test 12: Sensitive fields are not returned
    // =========================================================================
    const hasSensitive =
      'password' in apt1 ||
      'password_hash' in apt1 ||
      'token' in apt1 ||
      'secret' in apt1;
    logTest(
      '12. Sensitive fields are not returned',
      !hasSensitive && typeof apt1.id === 'number',
      `Safe fields only: id, patientId, doctorId, doctorName, date, time, status, location`
    );

    // =========================================================================
    // Test 13: Concurrent/repeated booking of the same slot cannot create duplicate active appointments
    // =========================================================================
    // Launch 2 simultaneous booking requests for the exact same slot (10:00 on testMonday)
    const concurrentSlot = '10:00';
    const [reqA, reqB] = await Promise.all([
      fetch(`${BASE_URL}/appointments`, {
        method: 'POST',
        headers: authHeader(patientToken),
        body: JSON.stringify({
          doctorId: 1,
          appointmentDate: testMonday,
          startTime: concurrentSlot,
          reason: 'Concurrent request A',
        }),
      }),
      fetch(`${BASE_URL}/appointments`, {
        method: 'POST',
        headers: authHeader(patientToken),
        body: JSON.stringify({
          doctorId: 1,
          appointmentDate: testMonday,
          startTime: concurrentSlot,
          reason: 'Concurrent request B',
        }),
      }),
    ]);

    const resA = await reqA.json();
    const resB = await reqB.json();

    const statuses = [reqA.status, reqB.status].sort();
    const oneCreatedOneConflict = statuses[0] === 201 && statuses[1] === 409;

    if (resA.data?.appointment?.id) createdAppointmentIds.push(resA.data.appointment.id);
    if (resB.data?.appointment?.id) createdAppointmentIds.push(resB.data.appointment.id);

    // Verify in database: exactly ONE appointment exists for that slot
    const [dupCheckRows] = await pool.query(
      `SELECT COUNT(*) AS count FROM appointments
       WHERE doctor_id = 1 AND appointment_date = ? AND appointment_time = '10:00:00' AND status = 'SCHEDULED';`,
      [testMonday]
    );
    const scheduledCount = dupCheckRows[0].count;

    logTest(
      '13. Concurrent booking cannot create duplicate active appointments',
      oneCreatedOneConflict && scheduledCount === 1,
      `Statuses: [${statuses.join(', ')}], DB scheduled count: ${scheduledCount}`
    );

    // =========================================================================
    // Test 14: Existing appointments remain intact
    // =========================================================================
    const [currentSeedRows] = await pool.query(
      `SELECT id FROM appointments WHERE id IN (${initialIds.map(() => '?').join(',')});`,
      initialIds
    );
    logTest(
      '14. Existing appointments remain intact',
      currentSeedRows.length === initialIds.length,
      `${currentSeedRows.length}/${initialIds.length} initial appointments verified intact`
    );

  } finally {
    // ── Database Cleanup ─────────────────────────────────────────────────────
    // Clean up test appointments created during this run to keep seeded DB pristine
    if (createdAppointmentIds.length > 0) {
      await pool.query(
        `DELETE FROM appointments WHERE id IN (${createdAppointmentIds.map(() => '?').join(',')});`,
        createdAppointmentIds
      );
      console.log(`\n[Cleanup] Removed ${createdAppointmentIds.length} test appointment(s) from database.\n`);
    }

    await stopTestServer();
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n========================================');
  console.log('APPOINTMENT BOOKING TEST RESULTS');
  console.log('========================================');
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`);

  if (failed > 0) {
    console.error('\nSome tests failed!');
    process.exit(1);
  } else {
    console.log('\nAll Appointment Booking tests passed successfully!');
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('Test run failed with error:', err);
  process.exit(1);
});
