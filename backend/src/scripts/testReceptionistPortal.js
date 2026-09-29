import { pool } from '../config/db.js';
import app from '../app.js';

let server;
const PORT = 5085;
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
      console.log(`[Receptionist Portal Test Server] Running on port ${PORT}`);
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
  console.log('MedLink Care: Phase 7D-1 Receptionist Backend Test Suite');
  console.log('============================================================\n');

  await startTestServer();

  const createdUserIds = [];
  const createdAppointmentIds = [];

  try {
    // -------------------------------------------------------------------------
    // 1. Obtain tokens for different roles
    // -------------------------------------------------------------------------
    const [receptionistToken, patientToken, doctorToken] = await Promise.all([
      fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'sunita.rao@apollohospitals.com', password: 'Password123!' }),
      }).then((r) => r.json()).then((d) => d.data?.token),

      fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'rahul.verma@example.in', password: 'Password123!' }),
      }).then((r) => r.json()).then((d) => d.data?.token),

      fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'priya.sharma@apollohospitals.com', password: 'Password123!' }),
      }).then((r) => r.json()).then((d) => d.data?.token),
    ]);

    logTest('Auth Setup', 'Receptionist token obtained', Boolean(receptionistToken));
    logTest('Auth Setup', 'Patient token obtained', Boolean(patientToken));
    logTest('Auth Setup', 'Doctor token obtained', Boolean(doctorToken));

    // -------------------------------------------------------------------------
    // 2. RBAC Enforcement (401 / 403 / 200)
    // -------------------------------------------------------------------------
    const unauthRes = await fetch(`${BASE_URL}/receptionist/appointments`);
    logTest(
      'RBAC',
      'Unauthenticated request returns 401',
      unauthRes.status === 401,
      `HTTP ${unauthRes.status}`
    );

    const patientForbiddenRes = await fetch(`${BASE_URL}/receptionist/appointments`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    logTest(
      'RBAC',
      'PATIENT role returns 403 Forbidden on receptionist routes',
      patientForbiddenRes.status === 403,
      `HTTP ${patientForbiddenRes.status}`
    );

    const doctorForbiddenRes = await fetch(`${BASE_URL}/receptionist/appointments`, {
      headers: { Authorization: `Bearer ${doctorToken}` },
    });
    logTest(
      'RBAC',
      'DOCTOR role returns 403 Forbidden on receptionist routes',
      doctorForbiddenRes.status === 403,
      `HTTP ${doctorForbiddenRes.status}`
    );

    const recepAuthRes = await fetch(`${BASE_URL}/receptionist/appointments`, {
      headers: { Authorization: `Bearer ${receptionistToken}` },
    });
    logTest(
      'RBAC',
      'RECEPTIONIST role access granted (HTTP 200)',
      recepAuthRes.status === 200,
      `HTTP ${recepAuthRes.status}`
    );

    // Receptionist access to doctor browsing
    const docBrowseRes = await fetch(`${BASE_URL}/doctors`, {
      headers: { Authorization: `Bearer ${receptionistToken}` },
    });
    logTest(
      'RBAC',
      'RECEPTIONIST can access GET /api/doctors (HTTP 200)',
      docBrowseRes.status === 200,
      `HTTP ${docBrowseRes.status}`
    );

    const docAvailRes = await fetch(`${BASE_URL}/doctors/1/availability`, {
      headers: { Authorization: `Bearer ${receptionistToken}` },
    });
    logTest(
      'RBAC',
      'RECEPTIONIST can access GET /api/doctors/:id/availability (HTTP 200)',
      docAvailRes.status === 200,
      `HTTP ${docAvailRes.status}`
    );

    // -------------------------------------------------------------------------
    // 3. Patient Search
    // -------------------------------------------------------------------------
    const searchByNameRes = await fetch(`${BASE_URL}/receptionist/patients?search=Rahul`, {
      headers: { Authorization: `Bearer ${receptionistToken}` },
    });
    const searchByNameData = await searchByNameRes.json();
    const foundRahul = searchByNameData.data?.patients?.some((p) =>
      p.fullName.toLowerCase().includes('rahul')
    );
    logTest(
      'Patient Search',
      'Search patients by name',
      searchByNameRes.status === 200 && foundRahul,
      `Found ${searchByNameData.data?.patients?.length} match(es)`
    );

    const searchByPhoneRes = await fetch(`${BASE_URL}/receptionist/patients?search=99001`, {
      headers: { Authorization: `Bearer ${receptionistToken}` },
    });
    const searchByPhoneData = await searchByPhoneRes.json();
    logTest(
      'Patient Search',
      'Search patients by phone number',
      searchByPhoneRes.status === 200 && (searchByPhoneData.data?.patients?.length || 0) > 0,
      `Found ${searchByPhoneData.data?.patients?.length} match(es)`
    );

    const searchEmptyRes = await fetch(`${BASE_URL}/receptionist/patients?search=nonexistent_xyz_999`, {
      headers: { Authorization: `Bearer ${receptionistToken}` },
    });
    const searchEmptyData = await searchEmptyRes.json();
    logTest(
      'Patient Search',
      'Non-matching search returns empty list (HTTP 200)',
      searchEmptyRes.status === 200 && searchEmptyData.data?.patients?.length === 0
    );

    // -------------------------------------------------------------------------
    // 4. Patient Registration & DB Persistence
    // -------------------------------------------------------------------------
    const testStamp = Date.now();
    const uniqueEmail = `walkin.patient.${testStamp}@example.com`;
    const uniquePhone = `+91 9999${String(testStamp).slice(-6)}`;

    const registerPatientRes = await fetch(`${BASE_URL}/receptionist/patients`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${receptionistToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fullName: 'Kavita Walkin',
        email: uniqueEmail,
        phone: uniquePhone,
        gender: 'FEMALE',
        dateOfBirth: '1992-05-14',
        bloodGroup: 'B+',
        city: 'Bengaluru',
        address: '123 Indiranagar 100ft Rd',
      }),
    });
    const registerPatientData = await registerPatientRes.json();
    const newPatient = registerPatientData.data?.patient;

    if (newPatient?.userId) createdUserIds.push(newPatient.userId);

    logTest(
      'Patient Registration',
      'Register walk-in patient (HTTP 201)',
      registerPatientRes.status === 201 && Boolean(newPatient?.id),
      `Created patientId: ${newPatient?.id}, userId: ${newPatient?.userId}`
    );

    // Verify no JWT was returned
    const noJwtReturned = !registerPatientData.token && !registerPatientData.data?.token;
    logTest(
      'Patient Registration',
      'No JWT session token returned for patient registration',
      noJwtReturned
    );

    // Verify DB persistence directly
    const [dbUserRows] = await pool.query(
      'SELECT id, role, full_name, email, phone, status, password_hash FROM users WHERE id = ?;',
      [newPatient?.userId || 0]
    );
    const [dbPatientRows] = await pool.query(
      'SELECT id, user_id, gender, blood_group, city FROM patients WHERE id = ?;',
      [newPatient?.id || 0]
    );
    logTest(
      'Patient Registration',
      'Atomic persistence verified in users & patients tables',
      dbUserRows.length === 1 &&
        dbPatientRows.length === 1 &&
        dbUserRows[0].role === 'PATIENT' &&
        dbPatientRows[0].gender === 'FEMALE'
    );

    // -------------------------------------------------------------------------
    // 5. Duplicate Email and Phone
    // -------------------------------------------------------------------------
    const dupEmailRes = await fetch(`${BASE_URL}/receptionist/patients`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${receptionistToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fullName: 'Duplicate Email Person',
        email: uniqueEmail,
        phone: `+91 8888${String(testStamp).slice(-6)}`,
        gender: 'MALE',
      }),
    });
    logTest(
      'Validation',
      'Duplicate email rejected with HTTP 409 Conflict',
      dupEmailRes.status === 409,
      `HTTP ${dupEmailRes.status}`
    );

    const dupPhoneRes = await fetch(`${BASE_URL}/receptionist/patients`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${receptionistToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fullName: 'Duplicate Phone Person',
        email: `another.${testStamp}@example.com`,
        phone: uniquePhone,
        gender: 'MALE',
      }),
    });
    logTest(
      'Validation',
      'Duplicate phone rejected with HTTP 409 Conflict',
      dupPhoneRes.status === 409,
      `HTTP ${dupPhoneRes.status}`
    );

    // -------------------------------------------------------------------------
    // 6. Receptionist Appointment Booking
    // -------------------------------------------------------------------------
    // Compute next Wednesday for Doctor 1 (Priya Sharma works Mon-Fri 09:00-17:00, 30m slots)
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + ((3 - targetDate.getDay() + 7) % 7 || 7));
    const aptDateStr = targetDate.toISOString().split('T')[0];

    const bookRes = await fetch(`${BASE_URL}/receptionist/appointments`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${receptionistToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        patientId: newPatient.id,
        doctorId: 1,
        appointmentDate: aptDateStr,
        startTime: '10:00',
        reason: 'General cardiology routine checkup',
        type: 'IN_PERSON',
      }),
    });
    const bookData = await bookRes.json();
    const createdApt = bookData.data?.appointment;
    if (createdApt?.id) createdAppointmentIds.push(createdApt.id);

    logTest(
      'Appointment Booking',
      'Book appointment for patientId with slot locking (HTTP 201)',
      bookRes.status === 201 && createdApt?.patientId === newPatient.id && createdApt?.doctorId === 1,
      `Appointment ID: ${createdApt?.id}`
    );

    // Invalid patientId
    const invalidPatientRes = await fetch(`${BASE_URL}/receptionist/appointments`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${receptionistToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        patientId: 999999,
        doctorId: 1,
        appointmentDate: aptDateStr,
        startTime: '10:30',
      }),
    });
    logTest(
      'Appointment Booking',
      'Non-existent patientId returns HTTP 404',
      invalidPatientRes.status === 404,
      `HTTP ${invalidPatientRes.status}`
    );

    // Past date rejection
    const pastDateRes = await fetch(`${BASE_URL}/receptionist/appointments`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${receptionistToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        patientId: newPatient.id,
        doctorId: 1,
        appointmentDate: '2020-01-01',
        startTime: '10:00',
      }),
    });
    logTest(
      'Appointment Booking',
      'Past appointment date rejected with HTTP 400',
      pastDateRes.status === 400,
      `HTTP ${pastDateRes.status}`
    );

    // -------------------------------------------------------------------------
    // 7. Slot Conflict / Concurrency Check
    // -------------------------------------------------------------------------
    const conflictRes = await fetch(`${BASE_URL}/receptionist/appointments`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${receptionistToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        patientId: newPatient.id,
        doctorId: 1,
        appointmentDate: aptDateStr,
        startTime: '10:00', // same slot
        reason: 'Duplicate slot test',
      }),
    });
    logTest(
      'Slot Concurrency',
      'Already booked slot rejected with HTTP 409 Conflict',
      conflictRes.status === 409,
      `HTTP ${conflictRes.status}`
    );

    // -------------------------------------------------------------------------
    // 8. Reschedule & Cancel
    // -------------------------------------------------------------------------
    const rescheduleRes = await fetch(
      `${BASE_URL}/receptionist/appointments/${createdApt.id}/reschedule`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${receptionistToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          appointmentDate: aptDateStr,
          startTime: '11:00',
        }),
      }
    );
    const rescheduleData = await rescheduleRes.json();
    logTest(
      'Reschedule',
      'Reschedule appointment to new valid slot (HTTP 200)',
      rescheduleRes.status === 200 &&
        rescheduleData.data?.appointment?.startTimeRaw === '11:00:00',
      `New time: ${rescheduleData.data?.appointment?.time}`
    );

    const cancelRes = await fetch(
      `${BASE_URL}/receptionist/appointments/${createdApt.id}/cancel`,
      {
        method: 'PUT',
        headers: { Authorization: `Bearer ${receptionistToken}` },
      }
    );
    const cancelData = await cancelRes.json();
    logTest(
      'Cancel',
      'Cancel scheduled appointment (HTTP 200)',
      cancelRes.status === 200 && cancelData.data?.appointment?.status === 'CANCELLED',
      `Status: ${cancelData.data?.appointment?.status}`
    );

    // Attempting to cancel already cancelled appointment
    const doubleCancelRes = await fetch(
      `${BASE_URL}/receptionist/appointments/${createdApt.id}/cancel`,
      {
        method: 'PUT',
        headers: { Authorization: `Bearer ${receptionistToken}` },
      }
    );
    logTest(
      'Cancel',
      'Cancelling an already cancelled appointment returns HTTP 409',
      doubleCancelRes.status === 409,
      `HTTP ${doubleCancelRes.status}`
    );

    // Attempting to reschedule cancelled appointment
    const reschedCancelledRes = await fetch(
      `${BASE_URL}/receptionist/appointments/${createdApt.id}/reschedule`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${receptionistToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          appointmentDate: aptDateStr,
          startTime: '14:00',
        }),
      }
    );
    logTest(
      'Reschedule',
      'Rescheduling a cancelled appointment returns HTTP 409',
      reschedCancelledRes.status === 409,
      `HTTP ${reschedCancelledRes.status}`
    );

    // -------------------------------------------------------------------------
    // 9. Valid & Invalid Status Updates
    // -------------------------------------------------------------------------
    // Book a second appointment to test status updates
    const apt2Res = await fetch(`${BASE_URL}/receptionist/appointments`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${receptionistToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        patientId: newPatient.id,
        doctorId: 1,
        appointmentDate: aptDateStr,
        startTime: '11:30',
        reason: 'Status test appointment',
      }),
    });
    const apt2Data = await apt2Res.json();
    const apt2 = apt2Data.data?.appointment;
    if (apt2?.id) createdAppointmentIds.push(apt2.id);

    // Invalid status string
    const invalidStatusRes = await fetch(
      `${BASE_URL}/receptionist/appointments/${apt2.id}/status`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${receptionistToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'NOT_A_REAL_STATUS' }),
      }
    );
    logTest(
      'Status Update',
      'Invalid status rejected with HTTP 400',
      invalidStatusRes.status === 400,
      `HTTP ${invalidStatusRes.status}`
    );

    // Check-in / mark COMPLETED
    const completeStatusRes = await fetch(
      `${BASE_URL}/receptionist/appointments/${apt2.id}/status`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${receptionistToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'COMPLETED' }),
      }
    );
    const completeStatusData = await completeStatusRes.json();
    logTest(
      'Status Update',
      'Mark appointment COMPLETED (HTTP 200)',
      completeStatusRes.status === 200 &&
        completeStatusData.data?.appointment?.status === 'COMPLETED',
      `Status: ${completeStatusData.data?.appointment?.status}`
    );

    // Cannot cancel a COMPLETED appointment
    const cancelCompletedRes = await fetch(
      `${BASE_URL}/receptionist/appointments/${apt2.id}/status`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${receptionistToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'CANCELLED' }),
      }
    );
    logTest(
      'Status Update',
      'Completed appointment cannot transition to CANCELLED (HTTP 409)',
      cancelCompletedRes.status === 409,
      `HTTP ${cancelCompletedRes.status}`
    );

    // -------------------------------------------------------------------------
    // 10. Sensitive-Field Exclusion
    // -------------------------------------------------------------------------
    const apptListRes = await fetch(
      `${BASE_URL}/receptionist/appointments?date=${aptDateStr}`,
      { headers: { Authorization: `Bearer ${receptionistToken}` } }
    );
    const apptListData = await apptListRes.json();
    const appts = apptListData.data?.appointments || [];

    const hasAnyPasswordHash =
      JSON.stringify(searchByNameData).includes('password_hash') ||
      JSON.stringify(registerPatientData).includes('password_hash') ||
      JSON.stringify(bookData).includes('password_hash') ||
      JSON.stringify(apptListData).includes('password_hash');

    logTest(
      'Security',
      'password_hash excluded from all receptionist payloads',
      !hasAnyPasswordHash && appts.length > 0
    );

    // -------------------------------------------------------------------------
    // 11. Appointment Queue Retrieval
    // -------------------------------------------------------------------------
    const filterByDocRes = await fetch(
      `${BASE_URL}/receptionist/appointments?date=${aptDateStr}&doctorId=1`,
      { headers: { Authorization: `Bearer ${receptionistToken}` } }
    );
    const filterByDocData = await filterByDocRes.json();
    logTest(
      'Appointments List',
      'Filter appointments by date and doctorId',
      filterByDocRes.status === 200 && (filterByDocData.data?.appointments?.length || 0) >= 1
    );

  } catch (err) {
    console.error('[Test Execution Error]:', err);
    logTest('Test Execution', 'Test suite execution error', false, err.message);
  } finally {
    // Cleanup created test records
    console.log('\n[Cleanup] Cleaning up test records...');
    try {
      if (createdAppointmentIds.length > 0) {
        await pool.query(
          `DELETE FROM appointments WHERE id IN (${createdAppointmentIds.map(() => '?').join(',')});`,
          createdAppointmentIds
        );
      }
      if (createdUserIds.length > 0) {
        await pool.query(
          `DELETE FROM users WHERE id IN (${createdUserIds.map(() => '?').join(',')});`,
          createdUserIds
        );
      }
      console.log('[Cleanup] ✓ Test records cleaned up.');
    } catch (cleanupErr) {
      console.error('[Cleanup Error]:', cleanupErr);
    }

    await stopTestServer();

    // Summary
    const totalTests = results.length;
    const passedTests = results.filter((r) => r.passed).length;
    const failedTests = totalTests - passedTests;

    console.log('\n============================================================');
    console.log(`Phase 7D-1 Receptionist Backend Results: ${passedTests}/${totalTests} Passed (${failedTests} Failed)`);
    console.log('============================================================\n');

    if (failedTests > 0) {
      process.exitCode = 1;
    }
  }
}

runTests();
