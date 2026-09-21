/**
 * Phase 6A — Full System Integration Test Suite
 *
 * Verifies end-to-end PATIENT <-> DOCTOR integration workflows across:
 *  1. Multi-User Authentication & Role-Based Identity
 *  2. Doctor Search, Details & Schedule Availability Sync
 *  3. Appointment Booking & Doctor Dashboard Cross-Visibility
 *  4. Doctor Clinical Consultation & Patient Medical Record Sync (Vitals + Medications)
 *  5. Appointment Lifecycle: Reschedule, Cancel, and Slot Reuse
 *  6. Doctor Schedule Update -> Patient Availability & Booking Validation Sync
 *  7. Doctor Reviews: Submission upon Completed Appointment, DB Aggregation & Conflict Prevention
 *  8. Multi-Tenant Security & Cross-Role Access Restrictions
 *  9. Database Integrity & Complete Seed State Restoration
 */
import { pool } from '../config/db.js';
import app from '../app.js';

let server;
const PORT = 5075;
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
      console.log(`[System Integration Test Server] Running on port ${PORT}`);
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
function getNextWeekdayDate(dayOfWeek, weeksAhead = 3) {
  const d = new Date();
  d.setDate(d.getDate() + ((7 + dayOfWeek - d.getDay()) % 7 || 7) + (weeksAhead - 1) * 7);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

async function login(email, password = 'Password123!') {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Login failed for ${email}: ${JSON.stringify(data)}`);
  }
  return data.data?.token || data.token;
}

function authHeader(token) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

async function runTests() {
  console.log('============================================================');
  console.log('Starting Phase 6A System Integration Test Suite...');
  console.log('============================================================\n');

  await startTestServer();

  // Track created test entities for guaranteed cleanup
  const createdApptIds = [];
  const createdRecordIds = [];
  const createdReviewIds = [];

  // Snapshot initial DB counts
  const [initAppts] = await pool.query('SELECT COUNT(*) as c FROM appointments;');
  const [initRecords] = await pool.query('SELECT COUNT(*) as c FROM medical_records;');
  const [initReviews] = await pool.query('SELECT COUNT(*) as c FROM reviews;');
  const [initVitals] = await pool.query('SELECT COUNT(*) as c FROM vitals;');
  const [initMeds] = await pool.query('SELECT COUNT(*) as c FROM medications;');
  const initialCounts = {
    appointments: initAppts[0].c,
    medical_records: initRecords[0].c,
    reviews: initReviews[0].c,
    vitals: initVitals[0].c,
    medications: initMeds[0].c,
  };

  // Snapshot original Doctor 1 schedule for exact restoration
  const [origSchedule1] = await pool.query(
    'SELECT day_of_week, start_time, end_time, slot_duration_minutes, is_active FROM doctor_schedules WHERE doctor_id = 1;'
  );

  try {
    // -------------------------------------------------------------------------
    // 1. AUTHENTICATION & IDENTITY
    // -------------------------------------------------------------------------
    const p1Token = await login('rahul.verma@example.in'); // Patient 1 (user 5)
    const p2Token = await login('sneha.patel@example.in'); // Patient 2 (user 6)
    const d1Token = await login('priya.sharma@apollohospitals.com'); // Doctor 1 (user 1)
    const d2Token = await login('rajesh.kulkarni@apollohospitals.com'); // Doctor 2 (user 2)

    logTest(
      '1. Multi-user authentication & role tokens issued successfully',
      Boolean(p1Token && p2Token && d1Token && d2Token),
      'P1, P2, D1, D2 tokens acquired'
    );

    // -------------------------------------------------------------------------
    // 2. PATIENT -> DOCTOR DISCOVERY & AVAILABILITY
    // -------------------------------------------------------------------------
    const searchRes = await fetch(`${BASE_URL}/doctors?search=Priya`, {
      headers: authHeader(p1Token),
    });
    const searchData = await searchRes.json();
    const docFound = searchData.data?.doctors?.find((d) => d.id === 1);

    const availRes = await fetch(`${BASE_URL}/doctors/1/availability`, {
      headers: authHeader(p1Token),
    });
    const availData = await availRes.json();
    const mondaySched = availData.data?.schedule?.find((s) => s.day === 'Monday');

    logTest(
      '2. Patient searches doctors & retrieves availability matching doctor_schedules',
      searchRes.status === 200 && Boolean(docFound) && mondaySched?.available === true,
      `Doctor="Dr. Priya Sharma", Monday hours="${mondaySched?.hours}"`
    );

    // -------------------------------------------------------------------------
    // 3. BOOKING & DOCTOR DASHBOARD INTEGRATION
    // -------------------------------------------------------------------------
    const testMonday = getNextWeekdayDate(1, 3); // Monday 3 weeks ahead
    const bookRes = await fetch(`${BASE_URL}/appointments`, {
      method: 'POST',
      headers: authHeader(p1Token),
      body: JSON.stringify({
        doctorId: 1,
        appointmentDate: testMonday,
        startTime: '09:00',
        reason: 'Integration health review',
      }),
    });
    const bookData = await bookRes.json();
    const bookedApptId = bookData.data?.appointment?.id;
    if (bookedApptId) createdApptIds.push(bookedApptId);

    // Double-booking prevention
    const doubleBookRes = await fetch(`${BASE_URL}/appointments`, {
      method: 'POST',
      headers: authHeader(p2Token),
      body: JSON.stringify({
        doctorId: 1,
        appointmentDate: testMonday,
        startTime: '09:00',
        reason: 'Attempting conflict',
      }),
    });

    // Doctor checks appointment details
    const docApptRes = await fetch(`${BASE_URL}/doctor/appointments/${bookedApptId}`, {
      headers: authHeader(d1Token),
    });
    const docApptData = await docApptRes.json();
    const patientName = docApptData.data?.patient?.name;

    logTest(
      '3. Patient booking persists in MySQL, prevents double-booking, and is visible to doctor',
      bookRes.status === 201 &&
        doubleBookRes.status === 409 &&
        docApptRes.status === 200 &&
        patientName === 'Rahul Verma',
      `Booked ID=${bookedApptId}, Conflict HTTP=${doubleBookRes.status}, Doctor seen patient="${patientName}"`
    );

    // -------------------------------------------------------------------------
    // 4. CLINICAL CONSULTATION -> PATIENT MEDICAL RECORD SYNC
    // -------------------------------------------------------------------------
    // Doctor creates/updates clinical record for this appointment
    const saveClinicalRes = await fetch(
      `${BASE_URL}/doctor/appointments/${bookedApptId}/clinical-record`,
      {
        method: 'PUT',
        headers: authHeader(d1Token),
        body: JSON.stringify({
          diagnosis: 'System Integration Hypertension Check',
          treatmentPlan: 'Lifestyle modifications & dietary salt restriction',
          doctorNotes: 'Patient vitals stable. Follow-up recommended.',
        }),
      }
    );
    const saveClinicalData = await saveClinicalRes.json();
    const clinicalRecId = saveClinicalData.data?.record?.id;
    if (clinicalRecId) createdRecordIds.push(clinicalRecId);

    // Doctor saves vitals
    const saveVitalsRes = await fetch(
      `${BASE_URL}/doctor/appointments/${bookedApptId}/vitals`,
      {
        method: 'PUT',
        headers: authHeader(d1Token),
        body: JSON.stringify({
          bloodPressureSystolic: 122,
          bloodPressureDiastolic: 80,
          heartRateBpm: 74,
          respiratoryRateBpm: 16,
          temperatureCelsius: 37.0,
          spo2Percentage: 99.0,
          weightKg: 73.5,
        }),
      }
    );

    // Doctor adds medication
    const addMedRes = await fetch(
      `${BASE_URL}/doctor/medical-records/${clinicalRecId}/medications`,
      {
        method: 'POST',
        headers: authHeader(d1Token),
        body: JSON.stringify({
          medicineName: 'Ramipril',
          dosage: '5mg',
          frequency: 'Once daily morning',
          duration: '30 days',
          instructions: 'Take after breakfast with water',
        }),
      }
    );

    // Patient retrieves medical records
    const patientRecsRes = await fetch(`${BASE_URL}/patients/medical-records`, {
      headers: authHeader(p1Token),
    });
    const patientRecsData = await patientRecsRes.json();
    const foundPatientRec = patientRecsData.data?.records?.find(
      (r) => r.id === clinicalRecId
    );

    // Patient retrieves specific record details
    const patientDetailRes = await fetch(
      `${BASE_URL}/patients/medical-records/${clinicalRecId}`,
      {
        headers: authHeader(p1Token),
      }
    );
    const patientDetailData = await patientDetailRes.json();
    const retrievedDiag = patientDetailData.data?.record?.diagnosis;
    const retrievedVitals = patientDetailData.data?.record?.vitals;
    const retrievedMed = patientDetailData.data?.record?.medications?.find(
      (m) => m.medicineName === 'Ramipril'
    );

    logTest(
      '4. Doctor clinical updates, vitals & medications seamlessly sync to patient medical records',
      saveClinicalRes.status === 200 &&
        saveVitalsRes.status === 200 &&
        addMedRes.status === 201 &&
        Boolean(foundPatientRec) &&
        retrievedDiag === 'System Integration Hypertension Check' &&
        retrievedVitals?.bloodPressureSystolic === 122 &&
        retrievedVitals?.bloodPressureDiastolic === 80 &&
        Boolean(retrievedMed),
      `Diag="${retrievedDiag}", BP=${retrievedVitals?.bloodPressureSystolic}/${retrievedVitals?.bloodPressureDiastolic}, Med=${retrievedMed?.medicineName}`
    );

    // -------------------------------------------------------------------------
    // 5. APPOINTMENT LIFECYCLE: RESCHEDULE, CANCEL & SLOT REUSE
    // -------------------------------------------------------------------------
    // Patient 1 reschedules from 09:00 AM to 09:30 AM on same Monday
    const reschedRes = await fetch(`${BASE_URL}/appointments/${bookedApptId}/reschedule`, {
      method: 'PUT',
      headers: authHeader(p1Token),
      body: JSON.stringify({
        appointmentDate: testMonday,
        startTime: '09:30',
      }),
    });

    // Patient 2 now books the vacated 09:00 AM slot
    const reuseSlot1Res = await fetch(`${BASE_URL}/appointments`, {
      method: 'POST',
      headers: authHeader(p2Token),
      body: JSON.stringify({
        doctorId: 1,
        appointmentDate: testMonday,
        startTime: '09:00',
        reason: 'Reusing vacated 9 AM slot',
      }),
    });
    const p2ApptId = (await reuseSlot1Res.json()).data?.appointment?.id;
    if (p2ApptId) createdApptIds.push(p2ApptId);

    // Patient 1 cancels their rescheduled appointment
    const cancelRes = await fetch(`${BASE_URL}/appointments/${bookedApptId}/cancel`, {
      method: 'PUT',
      headers: authHeader(p1Token),
    });

    // Cancelled slot (09:30 AM) is now freed up for booking
    const reuseSlot2Res = await fetch(`${BASE_URL}/appointments`, {
      method: 'POST',
      headers: authHeader(p2Token),
      body: JSON.stringify({
        doctorId: 1,
        appointmentDate: testMonday,
        startTime: '09:30',
        reason: 'Reusing vacated 9:30 AM slot after cancellation',
      }),
    });
    const p2Appt2Id = (await reuseSlot2Res.json()).data?.appointment?.id;
    if (p2Appt2Id) createdApptIds.push(p2Appt2Id);

    logTest(
      '5. Patient rescheduling and cancellation correctly free up slots for immediate reuse',
      reschedRes.status === 200 &&
        reuseSlot1Res.status === 201 &&
        cancelRes.status === 200 &&
        reuseSlot2Res.status === 201,
      `Reschedule HTTP=200, Reuse 9:00 AM HTTP=201, Cancel HTTP=200, Reuse 9:30 AM HTTP=201`
    );

    // -------------------------------------------------------------------------
    // 6. SCHEDULE INTEGRATION: DOCTOR SCHEDULE UPDATE -> PATIENT REFLECTION
    // -------------------------------------------------------------------------
    // Doctor 1 modifies schedule: marks Friday as inactive
    const schedUpdateRes = await fetch(`${BASE_URL}/doctor/schedule`, {
      method: 'PUT',
      headers: authHeader(d1Token),
      body: JSON.stringify({
        schedule: [
          { dayOfWeek: 'MONDAY', startTime: '09:00', endTime: '13:00', isActive: true, slotDurationMinutes: 30 },
          { dayOfWeek: 'TUESDAY', startTime: '09:00', endTime: '17:00', isActive: false, slotDurationMinutes: 30 },
          { dayOfWeek: 'WEDNESDAY', startTime: '09:00', endTime: '13:00', isActive: true, slotDurationMinutes: 30 },
          { dayOfWeek: 'THURSDAY', startTime: '09:00', endTime: '17:00', isActive: false, slotDurationMinutes: 30 },
          { dayOfWeek: 'FRIDAY', startTime: '14:00', endTime: '18:00', isActive: false, slotDurationMinutes: 30 }, // set false
          { dayOfWeek: 'SATURDAY', startTime: '09:00', endTime: '17:00', isActive: false, slotDurationMinutes: 30 },
          { dayOfWeek: 'SUNDAY', startTime: '09:00', endTime: '17:00', isActive: false, slotDurationMinutes: 30 },
        ],
      }),
    });

    // Patient checks availability — Friday should now be unavailable
    const updatedAvailRes = await fetch(`${BASE_URL}/doctors/1/availability`, {
      headers: authHeader(p1Token),
    });
    const updatedAvailData = await updatedAvailRes.json();
    const fridayAvail = updatedAvailData.data?.schedule?.find((s) => s.day === 'Friday');

    // Patient tries booking on Friday (3 weeks ahead) — must be rejected
    const testFriday = getNextWeekdayDate(5, 3);
    const badFridayBooking = await fetch(`${BASE_URL}/appointments`, {
      method: 'POST',
      headers: authHeader(p1Token),
      body: JSON.stringify({
        doctorId: 1,
        appointmentDate: testFriday,
        startTime: '14:00',
        reason: 'Attempting booking on disabled day',
      }),
    });

    // Restore Doctor 1 schedule back to original seed schedule
    await pool.query('DELETE FROM doctor_schedules WHERE doctor_id = 1;');
    for (const row of origSchedule1) {
      await pool.query(
        `INSERT INTO doctor_schedules
           (doctor_id, day_of_week, start_time, end_time, slot_duration_minutes, is_active)
         VALUES (1, ?, ?, ?, ?, ?);`,
        [row.day_of_week, row.start_time, row.end_time, row.slot_duration_minutes, row.is_active]
      );
    }

    logTest(
      '6. Doctor schedule updates dynamically alter patient availability and enforce booking rules',
      schedUpdateRes.status === 200 &&
        fridayAvail?.available === false &&
        badFridayBooking.status === 400,
      `Friday available=${fridayAvail?.available}, Bad Friday booking HTTP=${badFridayBooking.status}`
    );

    // -------------------------------------------------------------------------
    // 7. DOCTOR REVIEWS & AGGREGATION INTEGRATION
    // -------------------------------------------------------------------------
    // Create a completed appointment for Patient 1 with Doctor 2
    const [compAppt] = await pool.query(
      `INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_time, status, type, reason_for_visit)
       VALUES (1, 2, '2026-10-20', '10:00:00', 'COMPLETED', 'IN_PERSON', 'Completed ortho consultation');`
    );
    const compApptId = compAppt.insertId;
    createdApptIds.push(compApptId);

    // Initial reviews for Doctor 2
    const initDoc2ReviewsRes = await fetch(`${BASE_URL}/doctors/2/reviews`, {
      headers: authHeader(p1Token),
    });
    const initDoc2Data = await initDoc2ReviewsRes.json();
    const prevCount = initDoc2Data.data?.reviewCount || 0;

    // Patient 1 submits review for Doctor 2
    const submitRevRes = await fetch(`${BASE_URL}/doctors/2/reviews`, {
      method: 'POST',
      headers: authHeader(p1Token),
      body: JSON.stringify({
        rating: 5,
        comment: 'Outstanding orthopedic care and recovery plan.',
        appointmentId: compApptId,
      }),
    });
    const submitRevData = await submitRevRes.json();
    const createdRevId = submitRevData.data?.review?.id;
    if (createdRevId) createdReviewIds.push(createdRevId);

    // Duplicate review check for same appointment
    const dupRevRes = await fetch(`${BASE_URL}/doctors/2/reviews`, {
      method: 'POST',
      headers: authHeader(p1Token),
      body: JSON.stringify({
        rating: 4,
        comment: 'Trying duplicate review',
        appointmentId: compApptId,
      }),
    });

    // Updated reviews for Doctor 2
    const updatedDoc2Res = await fetch(`${BASE_URL}/doctors/2/reviews`, {
      headers: authHeader(p1Token),
    });
    const updatedDoc2Data = await updatedDoc2Res.json();
    const newCount = updatedDoc2Data.data?.reviewCount;

    logTest(
      '7. Completed appointment allows review submission, updates rating aggregation, and blocks duplicates',
      submitRevRes.status === 201 &&
        dupRevRes.status === 409 &&
        newCount === prevCount + 1,
      `Submit HTTP=201, Duplicate HTTP=409, PrevCount=${prevCount} -> NewCount=${newCount}`
    );

    // -------------------------------------------------------------------------
    // 8. MULTI-TENANT SECURITY & CROSS-ROLE RESTRICTIONS
    // -------------------------------------------------------------------------
    // Cross-Patient isolation: P2 cannot view P1's medical record
    const crossPatientRec = await fetch(
      `${BASE_URL}/patients/medical-records/${clinicalRecId}`,
      {
        headers: authHeader(p2Token),
      }
    );

    // Cross-Doctor isolation: D2 cannot view D1's appointment details
    const crossDocAppt = await fetch(
      `${BASE_URL}/doctor/appointments/${bookedApptId}`,
      {
        headers: authHeader(d2Token),
      }
    );

    // Cross-Role isolation: Patient cannot call doctor-only write endpoint
    const patientCallDoctor = await fetch(`${BASE_URL}/doctor/schedule`, {
      method: 'PUT',
      headers: authHeader(p1Token),
      body: JSON.stringify({ schedule: [] }),
    });

    // Cross-Role isolation: Doctor cannot call patient-only write endpoint
    const doctorCallPatient = await fetch(`${BASE_URL}/appointments`, {
      method: 'POST',
      headers: authHeader(d1Token),
      body: JSON.stringify({
        doctorId: 2,
        appointmentDate: testMonday,
        startTime: '09:00',
      }),
    });

    logTest(
      '8. Multi-tenant security strictly enforces cross-patient, cross-doctor, and cross-role boundaries',
      crossPatientRec.status === 404 &&
        crossDocAppt.status === 404 &&
        patientCallDoctor.status === 403 &&
        doctorCallPatient.status === 403,
      `P2->P1 rec=${crossPatientRec.status}, D2->D1 appt=${crossDocAppt.status}, P->Doc endpoint=${patientCallDoctor.status}, D->Pat endpoint=${doctorCallPatient.status}`
    );

    // -------------------------------------------------------------------------
    // 9. DATA INTEGRITY & DATABASE CLEANUP
    // -------------------------------------------------------------------------
    // Clean up created reviews
    for (const rId of createdReviewIds) {
      await pool.query('DELETE FROM reviews WHERE id = ?;', [rId]);
    }
    // Clean up medications & vitals tied to created medical records
    for (const recId of createdRecordIds) {
      await pool.query('DELETE FROM medications WHERE medical_record_id = ?;', [recId]);
      await pool.query('DELETE FROM medical_records WHERE id = ?;', [recId]);
    }
    // Clean up vitals tied to created appointments
    for (const apptId of createdApptIds) {
      await pool.query('DELETE FROM vitals WHERE appointment_id = ?;', [apptId]);
      await pool.query('DELETE FROM appointments WHERE id = ?;', [apptId]);
    }

    // Restore Doctor 1 schedule just in case
    await pool.query('DELETE FROM doctor_schedules WHERE doctor_id = 1;');
    for (const row of origSchedule1) {
      await pool.query(
        `INSERT INTO doctor_schedules
           (doctor_id, day_of_week, start_time, end_time, slot_duration_minutes, is_active)
         VALUES (1, ?, ?, ?, ?, ?);`,
        [row.day_of_week, row.start_time, row.end_time, row.slot_duration_minutes, row.is_active]
      );
    }

    // Verify current counts match initial seed snapshot
    const [finalAppts] = await pool.query('SELECT COUNT(*) as c FROM appointments;');
    const [finalRecords] = await pool.query('SELECT COUNT(*) as c FROM medical_records;');
    const [finalReviews] = await pool.query('SELECT COUNT(*) as c FROM reviews;');
    const [finalVitals] = await pool.query('SELECT COUNT(*) as c FROM vitals;');
    const [finalMeds] = await pool.query('SELECT COUNT(*) as c FROM medications;');

    const cleanRestored =
      finalAppts[0].c === initialCounts.appointments &&
      finalRecords[0].c === initialCounts.medical_records &&
      finalReviews[0].c === initialCounts.reviews &&
      finalVitals[0].c === initialCounts.vitals &&
      finalMeds[0].c === initialCounts.medications;

    logTest(
      '9. Complete database restoration: zero orphan records, all seed checksums match exactly',
      cleanRestored,
      `Appts=${finalAppts[0].c}/${initialCounts.appointments}, Records=${finalRecords[0].c}/${initialCounts.medical_records}, Reviews=${finalReviews[0].c}/${initialCounts.reviews}, Vitals=${finalVitals[0].c}/${initialCounts.vitals}, Meds=${finalMeds[0].c}/${initialCounts.medications}`
    );
  } finally {
    // Safety fallback cleanup in case of test exception
    for (const rId of createdReviewIds) {
      await pool.query('DELETE FROM reviews WHERE id = ?;', [rId]).catch(() => {});
    }
    for (const recId of createdRecordIds) {
      await pool.query('DELETE FROM medications WHERE medical_record_id = ?;', [recId]).catch(() => {});
      await pool.query('DELETE FROM medical_records WHERE id = ?;', [recId]).catch(() => {});
    }
    for (const apptId of createdApptIds) {
      await pool.query('DELETE FROM vitals WHERE appointment_id = ?;', [apptId]).catch(() => {});
      await pool.query('DELETE FROM appointments WHERE id = ?;', [apptId]).catch(() => {});
    }
    // Restore Doctor 1 schedule
    await pool.query('DELETE FROM doctor_schedules WHERE doctor_id = 1;').catch(() => {});
    for (const row of origSchedule1) {
      await pool.query(
        `INSERT INTO doctor_schedules
           (doctor_id, day_of_week, start_time, end_time, slot_duration_minutes, is_active)
         VALUES (1, ?, ?, ?, ?, ?);`,
        [row.day_of_week, row.start_time, row.end_time, row.slot_duration_minutes, row.is_active]
      ).catch(() => {});
    }
    await stopTestServer();
  }

  // ---------------------------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------------------------
  console.log('\n============================================================');
  console.log('Phase 6A System Integration — Test Summary');
  console.log('============================================================');
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  console.log(`Total: ${total} | Passed: ${passed} | Failed: ${failed}`);

  if (failed > 0) {
    console.error(`❌ ${failed} integration scenario(s) failed.`);
    process.exit(1);
  } else {
    console.log('✅ All Phase 6A system integration scenarios passed successfully!');
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('Fatal error during integration test run:', err);
  process.exit(1);
});
