import { pool } from '../config/db.js';
import app from '../app.js';

let server;
const PORT = 5065;
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
      console.log(`[Appointment Management Test Server] Running on port ${PORT}`);
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

// Helper to calculate a future date on a specific weekday (0=Sun, 1=Mon, ..., 6=Sat) in the same target week
function getNextWeekdayDate(dayOfWeek, weeksAhead = 1) {
  const d = new Date();
  const currentDay = d.getDay();
  const daysUntilNextMonday = ((1 - currentDay + 7) % 7) || 7;
  const targetDate = new Date(d);
  targetDate.setDate(d.getDate() + daysUntilNextMonday + (weeksAhead - 1) * 7);
  const offsetFromMonday = (dayOfWeek - 1 + 7) % 7;
  targetDate.setDate(targetDate.getDate() + offsetFromMonday);
  const y = targetDate.getFullYear();
  const m = String(targetDate.getMonth() + 1).padStart(2, '0');
  const day = String(targetDate.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

async function runTests() {
  await startTestServer();

  // Track any newly inserted appointment IDs for cleanup
  const createdAppointmentIds = [];

  try {
    // Record initial seed appointments
    const [initialAppointments] = await pool.query(
      'SELECT id, patient_id, doctor_id, appointment_date, appointment_time, status FROM appointments ORDER BY id ASC;'
    );
    const initialIds = initialAppointments.map((a) => a.id);

    // ── Authenticate test users ─────────────────────────────────────────────
    // 1. PATIENT 1: Rahul Verma (user_id = 1, patient_id = 1)
    const patient1Login = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'rahul.verma@example.in', password: 'Password123!' }),
    });
    const patient1Token = (await patient1Login.json()).data?.token;

    // 2. PATIENT 2: Sneha Patel (user_id = 6, patient_id = 2)
    const patient2Login = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'sneha.patel@example.in', password: 'Password123!' }),
    });
    const patient2Token = (await patient2Login.json()).data?.token;

    // 3. DOCTOR: Dr. Priya Sharma (user_id = 2, doctor_id = 1)
    const doctorLogin = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'priya.sharma@apollohospitals.com', password: 'Password123!' }),
    });
    const doctorToken = (await doctorLogin.json()).data?.token;

    const authHeader = (tok) => ({
      Authorization: `Bearer ${tok}`,
      'Content-Type': 'application/json',
    });

    // Dates for testing with Dr. Priya Sharma (Doctor 1):
    // Schedule: Monday (09:00-13:00), Wednesday (09:00-13:00), Friday (14:00-18:00)
    const testMonday = getNextWeekdayDate(1, 3);    // Monday 3 weeks ahead
    const testWednesday = getNextWeekdayDate(3, 3); // Wednesday 3 weeks ahead
    const testFriday = getNextWeekdayDate(5, 3);    // Friday 3 weeks ahead
    const testSunday = getNextWeekdayDate(0, 3);    // Sunday (doctor unavailable)

    console.log(`Test Dates: Mon=${testMonday}, Wed=${testWednesday}, Fri=${testFriday}, Sun=${testSunday}\n`);

    // =========================================================================
    // UPCOMING APPOINTMENTS TESTS (1 - 6)
    // =========================================================================

    // Test 3: Empty result works correctly (initially Patient 1 has 0 scheduled upcoming appointments)
    const initUpcomingRes = await fetch(`${BASE_URL}/appointments/upcoming`, {
      headers: authHeader(patient1Token),
    });
    const initUpcomingData = await initUpcomingRes.json();
    logTest(
      '3. Empty result works correctly',
      initUpcomingRes.status === 200 &&
        initUpcomingData.success === true &&
        Array.isArray(initUpcomingData.data?.appointments) &&
        initUpcomingData.data.appointments.length === 0,
      `HTTP ${initUpcomingRes.status}, count = ${initUpcomingData.data?.appointments?.length}`
    );

    // Book 2 appointments for Patient 1 (one later, one earlier) to test ordering and isolation
    // Appointment A: Wednesday 3 weeks ahead at 10:00 AM
    const bookResA = await fetch(`${BASE_URL}/appointments`, {
      method: 'POST',
      headers: authHeader(patient1Token),
      body: JSON.stringify({
        doctorId: 1,
        appointmentDate: testWednesday,
        startTime: '10:00',
        reason: 'Wednesday Consultation',
      }),
    });
    const aptA = (await bookResA.json()).data?.appointment;
    if (aptA?.id) createdAppointmentIds.push(aptA.id);

    // Appointment B: Monday 3 weeks ahead at 09:00 AM (earlier than A)
    const bookResB = await fetch(`${BASE_URL}/appointments`, {
      method: 'POST',
      headers: authHeader(patient1Token),
      body: JSON.stringify({
        doctorId: 1,
        appointmentDate: testMonday,
        startTime: '09:00',
        reason: 'Monday Consultation',
      }),
    });
    const aptB = (await bookResB.json()).data?.appointment;
    if (aptB?.id) createdAppointmentIds.push(aptB.id);

    // Book 1 appointment for Patient 2 to test cross-patient isolation
    // Appointment C: Friday 3 weeks ahead at 14:00 (Doctor 1)
    const bookResC = await fetch(`${BASE_URL}/appointments`, {
      method: 'POST',
      headers: authHeader(patient2Token),
      body: JSON.stringify({
        doctorId: 1,
        appointmentDate: testFriday,
        startTime: '14:00',
        reason: 'Patient 2 Consultation',
      }),
    });
    const aptC = (await bookResC.json()).data?.appointment;
    if (aptC?.id) createdAppointmentIds.push(aptC.id);

    // Test 1: Authenticated patient retrieves only their own upcoming appointments
    const p1UpcomingRes = await fetch(`${BASE_URL}/appointments/upcoming`, {
      headers: authHeader(patient1Token),
    });
    const p1UpcomingData = await p1UpcomingRes.json();
    const p1Appointments = p1UpcomingData.data?.appointments || [];

    const p1OwnOnly = p1Appointments.every((apt) => apt.patientId === 1);
    logTest(
      '1. Authenticated patient retrieves only their own upcoming appointments',
      p1UpcomingRes.status === 200 && p1Appointments.length === 2 && p1OwnOnly,
      `Count: ${p1Appointments.length}, All patientId=1: ${p1OwnOnly}`
    );

    // Test 2: Appointment list is correctly ordered chronologically (earliest first)
    // aptB (Monday) must come before aptA (Wednesday)
    const isOrdered =
      p1Appointments.length >= 2 &&
      p1Appointments[0].id === aptB.id &&
      p1Appointments[1].id === aptA.id;
    logTest(
      '2. Appointment list is correctly ordered chronologically',
      isOrdered,
      `1st: ID ${p1Appointments[0]?.id} (${p1Appointments[0]?.date}), 2nd: ID ${p1Appointments[1]?.id} (${p1Appointments[1]?.date})`
    );

    // Test 4: Unauthenticated request returns 401
    const unauthUpcomingRes = await fetch(`${BASE_URL}/appointments/upcoming`);
    logTest(
      '4. Unauthenticated upcoming request returns 401',
      unauthUpcomingRes.status === 401,
      `HTTP ${unauthUpcomingRes.status}`
    );

    // Test 5: DOCTOR role returns 403
    const docUpcomingRes = await fetch(`${BASE_URL}/appointments/upcoming`, {
      headers: authHeader(doctorToken),
    });
    logTest(
      '5. DOCTOR role returns 403',
      docUpcomingRes.status === 403,
      `HTTP ${docUpcomingRes.status}`
    );

    // Test 6: Another patient's appointments are never returned
    const p2UpcomingRes = await fetch(`${BASE_URL}/appointments/upcoming`, {
      headers: authHeader(patient2Token),
    });
    const p2UpcomingData = await p2UpcomingRes.json();
    const p2Appointments = p2UpcomingData.data?.appointments || [];

    const p2ContainsP1 = p2Appointments.some((a) => a.id === aptA.id || a.id === aptB.id);
    const p1ContainsP2 = p1Appointments.some((a) => a.id === aptC.id);
    logTest(
      "6. Another patient's appointments are never returned",
      !p2ContainsP1 && !p1ContainsP2 && p2Appointments.length === 1 && p2Appointments[0].id === aptC.id,
      `Patient 2 sees ID ${p2Appointments[0]?.id} only, 0 leakage from Patient 1`
    );

    // =========================================================================
    // RESCHEDULE TESTS (7 - 16)
    // =========================================================================

    // Test 7: Patient can reschedule their own eligible appointment
    // Reschedule aptB from Monday 09:00 to Monday 09:30
    const rescheduleRes1 = await fetch(`${BASE_URL}/appointments/${aptB.id}/reschedule`, {
      method: 'PUT',
      headers: authHeader(patient1Token),
      body: JSON.stringify({
        appointmentDate: testMonday,
        startTime: '09:30',
      }),
    });
    const rescheduleData1 = await rescheduleRes1.json();
    const rescheduledApt = rescheduleData1.data?.appointment;

    logTest(
      '7. Patient can reschedule their own eligible appointment',
      rescheduleRes1.status === 200 &&
        rescheduleData1.success === true &&
        rescheduledApt?.date === testMonday &&
        rescheduledApt?.time === '9:30 AM',
      `HTTP ${rescheduleRes1.status}, New Date: ${rescheduledApt?.date}, New Time: ${rescheduledApt?.time}`
    );

    // Test 8: Rescheduled date/time is persisted in MySQL
    const [persistedReschedule] = await pool.query(
      `SELECT DATE_FORMAT(appointment_date, '%Y-%m-%d') as date, appointment_time
       FROM appointments WHERE id = ?;`,
      [aptB.id]
    );
    const persistedDate = persistedReschedule[0]?.date;
    const persistedTime = persistedReschedule[0]?.appointment_time;
    logTest(
      '8. Rescheduled date/time is persisted in MySQL',
      persistedDate === testMonday && persistedTime === '09:30:00',
      `MySQL values: Date=${persistedDate}, Time=${persistedTime}`
    );

    // Test 9: Appointment cannot be rescheduled to a past date
    const pastReschedule = await fetch(`${BASE_URL}/appointments/${aptB.id}/reschedule`, {
      method: 'PUT',
      headers: authHeader(patient1Token),
      body: JSON.stringify({
        appointmentDate: '2020-01-01',
        startTime: '09:30',
      }),
    });
    logTest(
      '9. Appointment cannot be rescheduled to a past date',
      pastReschedule.status === 400,
      `HTTP ${pastReschedule.status}`
    );

    // Test 10: Appointment cannot be rescheduled outside doctor schedule
    // Doctor 1 is not scheduled on Sundays
    const sundayReschedule = await fetch(`${BASE_URL}/appointments/${aptB.id}/reschedule`, {
      method: 'PUT',
      headers: authHeader(patient1Token),
      body: JSON.stringify({
        appointmentDate: testSunday,
        startTime: '10:00',
      }),
    });
    logTest(
      '10. Appointment cannot be rescheduled outside doctor schedule',
      sundayReschedule.status === 400,
      `HTTP ${sundayReschedule.status}`
    );

    // Test 11: Appointment cannot use unaligned slot
    // Doctor 1 slot duration is 30 mins (09:15 is unaligned)
    const unalignedReschedule = await fetch(`${BASE_URL}/appointments/${aptB.id}/reschedule`, {
      method: 'PUT',
      headers: authHeader(patient1Token),
      body: JSON.stringify({
        appointmentDate: testMonday,
        startTime: '09:15',
      }),
    });
    logTest(
      '11. Appointment cannot use unaligned slot',
      unalignedReschedule.status === 400,
      `HTTP ${unalignedReschedule.status}`
    );

    // Test 12: Appointment cannot move to an occupied slot
    // Slot testWednesday at 10:00 is occupied by aptA
    const occupiedReschedule = await fetch(`${BASE_URL}/appointments/${aptB.id}/reschedule`, {
      method: 'PUT',
      headers: authHeader(patient1Token),
      body: JSON.stringify({
        appointmentDate: testWednesday,
        startTime: '10:00',
      }),
    });
    const occupiedData = await occupiedReschedule.json();
    logTest(
      '12. Appointment cannot move to an occupied slot (HTTP 409)',
      occupiedReschedule.status === 409 && occupiedData.success === false,
      `HTTP ${occupiedReschedule.status}, Message: "${occupiedData.message}"`
    );

    // Test 13: Another patient's appointment cannot be rescheduled
    // Patient 1 attempts to reschedule Patient 2's appointment (aptC)
    const crossReschedule = await fetch(`${BASE_URL}/appointments/${aptC.id}/reschedule`, {
      method: 'PUT',
      headers: authHeader(patient1Token),
      body: JSON.stringify({
        appointmentDate: testFriday,
        startTime: '14:30',
      }),
    });
    logTest(
      "13. Another patient's appointment cannot be rescheduled (HTTP 404)",
      crossReschedule.status === 404,
      `HTTP ${crossReschedule.status} (Resource isolated)`
    );

    // Test 14: Unauthenticated reschedule returns 401
    const unauthReschedule = await fetch(`${BASE_URL}/appointments/${aptB.id}/reschedule`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        appointmentDate: testMonday,
        startTime: '11:00',
      }),
    });
    logTest(
      '14. Unauthenticated reschedule returns 401',
      unauthReschedule.status === 401,
      `HTTP ${unauthReschedule.status}`
    );

    // Test 15: Non-PATIENT reschedule returns 403
    const docReschedule = await fetch(`${BASE_URL}/appointments/${aptB.id}/reschedule`, {
      method: 'PUT',
      headers: authHeader(doctorToken),
      body: JSON.stringify({
        appointmentDate: testMonday,
        startTime: '11:00',
      }),
    });
    logTest(
      '15. Non-PATIENT reschedule returns 403',
      docReschedule.status === 403,
      `HTTP ${docReschedule.status}`
    );

    // Test 16: Concurrent destination-slot conflict is prevented
    // Create another appointment D for Patient 1 to test concurrent reschedule to the SAME target slot
    const bookResD = await fetch(`${BASE_URL}/appointments`, {
      method: 'POST',
      headers: authHeader(patient1Token),
      body: JSON.stringify({
        doctorId: 1,
        appointmentDate: testMonday,
        startTime: '11:00',
        reason: 'Patient 1 Second Apt',
      }),
    });
    const aptD = (await bookResD.json()).data?.appointment;
    if (aptD?.id) createdAppointmentIds.push(aptD.id);

    // Simultaneously reschedule aptB and aptD into the SAME destination slot (Monday 12:00)
    const targetSlot = '12:00';
    const [concurrentResA, concurrentResB] = await Promise.all([
      fetch(`${BASE_URL}/appointments/${aptB.id}/reschedule`, {
        method: 'PUT',
        headers: authHeader(patient1Token),
        body: JSON.stringify({ appointmentDate: testMonday, startTime: targetSlot }),
      }),
      fetch(`${BASE_URL}/appointments/${aptD.id}/reschedule`, {
        method: 'PUT',
        headers: authHeader(patient1Token),
        body: JSON.stringify({ appointmentDate: testMonday, startTime: targetSlot }),
      }),
    ]);

    const concStatuses = [concurrentResA.status, concurrentResB.status].sort();
    const oneOkOneConflict = concStatuses[0] === 200 && concStatuses[1] === 409;

    // Verify in database: exactly 1 appointment occupies Monday 12:00
    const [concDbCheck] = await pool.query(
      `SELECT COUNT(*) as count FROM appointments
       WHERE doctor_id = 1 AND appointment_date = ? AND appointment_time = '12:00:00' AND status = 'SCHEDULED';`,
      [testMonday]
    );

    logTest(
      '16. Concurrent destination-slot conflict is prevented',
      oneOkOneConflict && concDbCheck[0]?.count === 1,
      `Statuses: [${concStatuses.join(', ')}], DB scheduled count: ${concDbCheck[0]?.count}`
    );

    // =========================================================================
    // CANCEL TESTS (17 - 23)
    // =========================================================================

    // Test 17: Patient can cancel their own eligible appointment (cancelling aptA)
    const cancelRes = await fetch(`${BASE_URL}/appointments/${aptA.id}/cancel`, {
      method: 'PUT',
      headers: authHeader(patient1Token),
    });
    const cancelData = await cancelRes.json();
    logTest(
      '17. Patient can cancel their own eligible appointment',
      cancelRes.status === 200 &&
        cancelData.success === true &&
        cancelData.data?.appointment?.status === 'CANCELLED',
      `HTTP ${cancelRes.status}, Status: ${cancelData.data?.appointment?.status}`
    );

    // Test 18: Cancellation status is persisted correctly in MySQL
    const [cancelDbRow] = await pool.query('SELECT status FROM appointments WHERE id = ?;', [aptA.id]);
    logTest(
      '18. Cancellation status is persisted correctly in MySQL',
      cancelDbRow[0]?.status === 'CANCELLED',
      `DB status = ${cancelDbRow[0]?.status}`
    );

    // Test 19: Cancelled appointment no longer appears in upcoming list
    const p1UpcomingAfterCancel = await fetch(`${BASE_URL}/appointments/upcoming`, {
      headers: authHeader(patient1Token),
    });
    const p1AptsAfterCancel = (await p1UpcomingAfterCancel.json()).data?.appointments || [];
    const containsCancelled = p1AptsAfterCancel.some((a) => a.id === aptA.id);
    logTest(
      '19. Cancelled appointment no longer appears in upcoming list',
      !containsCancelled,
      `Upcoming count = ${p1AptsAfterCancel.length}, ID ${aptA.id} excluded: ${!containsCancelled}`
    );

    // Test 20: Another patient's appointment cannot be cancelled
    // Patient 1 attempts to cancel Patient 2's appointment (aptC)
    const crossCancel = await fetch(`${BASE_URL}/appointments/${aptC.id}/cancel`, {
      method: 'PUT',
      headers: authHeader(patient1Token),
    });
    logTest(
      "20. Another patient's appointment cannot be cancelled (HTTP 404)",
      crossCancel.status === 404,
      `HTTP ${crossCancel.status}`
    );

    // Test 21: Unauthenticated cancel returns 401
    const unauthCancel = await fetch(`${BASE_URL}/appointments/${aptC.id}/cancel`, {
      method: 'PUT',
    });
    logTest(
      '21. Unauthenticated cancel returns 401',
      unauthCancel.status === 401,
      `HTTP ${unauthCancel.status}`
    );

    // Test 22: Non-PATIENT cancel returns 403
    const docCancel = await fetch(`${BASE_URL}/appointments/${aptC.id}/cancel`, {
      method: 'PUT',
      headers: authHeader(doctorToken),
    });
    logTest(
      '22. Non-PATIENT cancel returns 403',
      docCancel.status === 403,
      `HTTP ${docCancel.status}`
    );

    // Test 23: Cancelled slot can be reused according to Phase 4D rules
    // Slot testWednesday at 10:00 (which belonged to aptA before cancellation) is now free.
    // Patient 2 should be able to book this previously cancelled slot.
    const reuseBookingRes = await fetch(`${BASE_URL}/appointments`, {
      method: 'POST',
      headers: authHeader(patient2Token),
      body: JSON.stringify({
        doctorId: 1,
        appointmentDate: testWednesday,
        startTime: '10:00',
        reason: 'Patient 2 booking previously cancelled slot',
      }),
    });
    const reuseBookingData = await reuseBookingRes.json();
    const reusedApt = reuseBookingData.data?.appointment;
    if (reusedApt?.id) createdAppointmentIds.push(reusedApt.id);

    logTest(
      '23. Cancelled slot can be reused according to Phase 4D rules',
      reuseBookingRes.status === 201 &&
        reuseBookingData.success === true &&
        reusedApt?.doctorId === 1 &&
        reusedApt?.date === testWednesday,
      `HTTP ${reuseBookingRes.status}, Newly booked ID: ${reusedApt?.id} on ${reusedApt?.date} ${reusedApt?.time}`
    );

    // Verify seed appointments remain intact
    const [currentSeedRows] = await pool.query(
      `SELECT id FROM appointments WHERE id IN (${initialIds.map(() => '?').join(',')});`,
      initialIds
    );
    console.log(`\nVerified ${currentSeedRows.length}/${initialIds.length} initial seed appointments remain intact.`);

  } finally {
    // ── Cleanup ─────────────────────────────────────────────────────────────
    // Delete all appointments created during this test run to restore pristine DB
    if (createdAppointmentIds.length > 0) {
      await pool.query(
        `DELETE FROM appointments WHERE id IN (${createdAppointmentIds.map(() => '?').join(',')});`,
        createdAppointmentIds
      );
      console.log(`[Cleanup] Removed ${createdAppointmentIds.length} test appointment(s) from database.\n`);
    }

    await stopTestServer();
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('========================================');
  console.log('APPOINTMENT MANAGEMENT TEST RESULTS');
  console.log('========================================');
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`);

  if (failed > 0) {
    console.error('\nSome tests failed!');
    process.exit(1);
  } else {
    console.log('\nAll Appointment Management tests passed successfully!');
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('Test run failed with error:', err);
  process.exit(1);
});
