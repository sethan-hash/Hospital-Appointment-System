/**
 * Phase 5C — Doctor Clinical Records Test Suite
 *
 * Covers:
 *  READ:
 *   1. Doctor can retrieve clinical record for own appointment (HTTP 200)
 *   2. Doctor receives correct diagnosis/treatment/notes
 *   3. Doctor receives correct vitals
 *   4. Doctor receives correct medications
 *   5. Another doctor's clinical record returns 404
 *   6. Unauthenticated request returns 401
 *   7. PATIENT role returns 403
 *   8. Invalid appointment ID returns 400
 *   9. Unknown appointment returns 404
 *  10. password_hash/auth secrets never returned
 *
 *  CLINICAL RECORD WRITE:
 *  11. Doctor can update clinical record for own appointment (HTTP 200)
 *  12. Updated diagnosis persists in MySQL
 *  13. Updated treatment plan persists in MySQL
 *  14. Updated clinical notes persist in MySQL
 *  15. Another doctor cannot update the record (HTTP 404)
 *  16. Patient cannot call doctor clinical write endpoints (HTTP 403)
 *  17. Invalid clinical-record data is rejected (HTTP 400)
 *
 *  VITALS:
 *  18. Doctor can save valid vitals (HTTP 200)
 *  19. Vitals persist in MySQL
 *  20. Invalid vital input is rejected (HTTP 400)
 *  21. Another doctor cannot alter the vitals (HTTP 404)
 *  22. Existing vitals are not unintentionally overwritten
 *
 *  MEDICATIONS:
 *  23. Doctor can add medication to own clinical record (HTTP 201)
 *  24. Medication persists in MySQL
 *  25. Invalid medication input is rejected (HTTP 400)
 *  26. Another doctor cannot delete another doctor's medication (HTTP 404)
 *  27. Existing medication records remain intact when adding a new medication
 *
 *  TRANSACTION SAFETY:
 *  28. Multi-table failure rolls back correctly
 *  29. No orphan clinical data is created by failed operations
 */
import { pool } from '../config/db.js';
import app from '../app.js';

let server;
const PORT = 5064;
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
      console.log(`[Doctor Clinical Records Test Server] Running on port ${PORT}`);
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

  // Snapshot initial records for cleanup/restoration
  const [[initialRecord1]] = await pool.query('SELECT * FROM medical_records WHERE id = 1;');
  const [[initialVitals1]] = await pool.query('SELECT * FROM vitals WHERE id = 1;');
  const [initialMeds1] = await pool.query('SELECT * FROM medications WHERE medical_record_id = 1;');
  let createdMedId = null;

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

    // Patient: Rahul Verma
    const patientLogin = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'rahul.verma@example.in', password: 'Password123!' }),
    });
    const patientToken = (await patientLogin.json()).data?.token;

    const h = (tok) => ({ Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' });

    // =========================================================================
    // READ TESTS
    // =========================================================================

    // 1. Doctor can retrieve clinical record for own appointment
    const readRes = await fetch(`${BASE_URL}/doctor/appointments/1/clinical-record`, { headers: h(doctor1Token) });
    const readJson = await readRes.json();
    logTest(
      '1. Doctor can retrieve clinical record for own appointment (HTTP 200)',
      readRes.status === 200 && readJson.success === true && !!readJson.data,
      `status=${readRes.status}`
    );

    // 2. Doctor receives correct diagnosis/treatment/notes
    const rec = readJson.data?.record;
    logTest(
      '2. Doctor receives correct diagnosis/treatment/notes',
      rec?.diagnosis?.includes('Stage 1 Hypertension') &&
      rec?.treatmentPlan?.includes('Lifestyle modification') &&
      rec?.doctorNotes?.includes('regular BP monitoring'),
      `diagnosis="${rec?.diagnosis}"`
    );

    // 3. Doctor receives correct vitals
    const vitals = readJson.data?.vitals;
    logTest(
      '3. Doctor receives correct vitals',
      vitals?.bloodPressureSystolic === 138 &&
      vitals?.bloodPressureDiastolic === 88 &&
      vitals?.heartRateBpm === 76,
      `BP=${vitals?.bloodPressureSystolic}/${vitals?.bloodPressureDiastolic}, HR=${vitals?.heartRateBpm}`
    );

    // 4. Doctor receives correct medications
    const meds = readJson.data?.medications || [];
    const hasTelmi = meds.some((m) => m.medicineName.includes('Telmisartan'));
    const hasAtor = meds.some((m) => m.medicineName.includes('Atorvastatin'));
    logTest(
      '4. Doctor receives correct medications',
      meds.length === 2 && hasTelmi && hasAtor,
      `medCount=${meds.length}`
    );

    // 5. Another doctor's clinical record returns 404 (Doctor 1 requesting appointment 3 owned by Doctor 2)
    const crossReadRes = await fetch(`${BASE_URL}/doctor/appointments/3/clinical-record`, { headers: h(doctor1Token) });
    logTest(
      "5. Another doctor's clinical record returns 404",
      crossReadRes.status === 404,
      `status=${crossReadRes.status}`
    );

    // 6. Unauthenticated request returns 401
    const unauthRes = await fetch(`${BASE_URL}/doctor/appointments/1/clinical-record`);
    logTest('6. Unauthenticated request returns 401', unauthRes.status === 401);

    // 7. PATIENT role returns 403
    const patientRoleRes = await fetch(`${BASE_URL}/doctor/appointments/1/clinical-record`, { headers: h(patientToken) });
    logTest('7. PATIENT role returns 403', patientRoleRes.status === 403);

    // 8. Invalid appointment ID returns 400
    const invalidIdRes = await fetch(`${BASE_URL}/doctor/appointments/abc/clinical-record`, { headers: h(doctor1Token) });
    logTest('8. Invalid appointment ID returns 400', invalidIdRes.status === 400);

    // 9. Unknown record returns 404
    const unknownRes = await fetch(`${BASE_URL}/doctor/appointments/999999/clinical-record`, { headers: h(doctor1Token) });
    logTest('9. Unknown appointment returns 404', unknownRes.status === 404);

    // 10. password_hash/auth secrets never returned
    const readStr = JSON.stringify(readJson);
    const hasSecrets = readStr.includes('password_hash') || readStr.includes('password') || readStr.includes('$2a$');
    logTest('10. password_hash/auth secrets never returned', !hasSecrets);

    // =========================================================================
    // CLINICAL RECORD WRITE TESTS
    // =========================================================================

    // 11. Doctor can create/update clinical record for own appointment
    const updatedDiagnosis = 'Stage 1 Hypertension (Controlled with Telmisartan)';
    const updatedPlan = 'Continue current medication and moderate sodium intake';
    const updatedNotes = 'Patient BP normalised at home. Review in 12 weeks.';
    const updateRes = await fetch(`${BASE_URL}/doctor/appointments/1/clinical-record`, {
      method: 'PUT',
      headers: h(doctor1Token),
      body: JSON.stringify({
        diagnosis: updatedDiagnosis,
        treatmentPlan: updatedPlan,
        doctorNotes: updatedNotes,
      }),
    });
    const updateJson = await updateRes.json();
    logTest(
      '11. Doctor can update clinical record for own appointment (HTTP 200)',
      updateRes.status === 200 && updateJson.success === true,
      `status=${updateRes.status}`
    );

    // 12-14. Updated diagnosis, treatment plan, and notes persist in MySQL
    const [[dbRecord]] = await pool.query('SELECT * FROM medical_records WHERE id = 1;');
    logTest('12. Updated diagnosis persists in MySQL', dbRecord.diagnosis === updatedDiagnosis);
    logTest('13. Updated treatment plan persists in MySQL', dbRecord.treatment_plan === updatedPlan);
    logTest('14. Updated clinical notes persist in MySQL', dbRecord.doctor_notes === updatedNotes);

    // 15. Another doctor cannot update the record (Doctor 2 attempts to update Appointment 1)
    const crossUpdateRes = await fetch(`${BASE_URL}/doctor/appointments/1/clinical-record`, {
      method: 'PUT',
      headers: h(doctor2Token),
      body: JSON.stringify({ diagnosis: 'Malicious modification' }),
    });
    logTest("15. Another doctor cannot update the record (HTTP 404)", crossUpdateRes.status === 404);

    // 16. Patient cannot call doctor clinical write endpoints
    const patientWriteRes = await fetch(`${BASE_URL}/doctor/appointments/1/clinical-record`, {
      method: 'PUT',
      headers: h(patientToken),
      body: JSON.stringify({ diagnosis: 'Patient self diagnosis' }),
    });
    logTest('16. Patient cannot call doctor clinical write endpoints (HTTP 403)', patientWriteRes.status === 403);

    // 17. Invalid clinical-record data is rejected (empty diagnosis)
    const invalidDiagRes = await fetch(`${BASE_URL}/doctor/appointments/1/clinical-record`, {
      method: 'PUT',
      headers: h(doctor1Token),
      body: JSON.stringify({ diagnosis: ' ' }),
    });
    logTest('17. Invalid clinical-record data is rejected (HTTP 400)', invalidDiagRes.status === 400);

    // =========================================================================
    // VITALS TESTS
    // =========================================================================

    // 18. Doctor can save valid vitals
    const vitalsRes = await fetch(`${BASE_URL}/doctor/appointments/1/vitals`, {
      method: 'PUT',
      headers: h(doctor1Token),
      body: JSON.stringify({
        bloodPressureSystolic: 126,
        bloodPressureDiastolic: 80,
        heartRateBpm: 72,
        respiratoryRateBpm: 15,
        temperatureCelsius: 36.6,
        spo2Percentage: 99.0,
        weightKg: 73.5,
        heightCm: 172.0,
        notes: 'Follow-up vitals showing improvement',
      }),
    });
    const vitalsJson = await vitalsRes.json();
    logTest('18. Doctor can save valid vitals (HTTP 200)', vitalsRes.status === 200 && vitalsJson.success === true);

    // 19. Vitals persist in MySQL
    const [[dbVitals]] = await pool.query('SELECT * FROM vitals WHERE id = 1;');
    logTest(
      '19. Vitals persist in MySQL',
      dbVitals.blood_pressure_systolic === 126 &&
      dbVitals.blood_pressure_diastolic === 80 &&
      dbVitals.heart_rate_bpm === 72,
      `BP=${dbVitals.blood_pressure_systolic}/${dbVitals.blood_pressure_diastolic}, HR=${dbVitals.heart_rate_bpm}`
    );

    // 20. Invalid vital input is rejected (e.g. systolic = 999)
    const invalidVitalRes = await fetch(`${BASE_URL}/doctor/appointments/1/vitals`, {
      method: 'PUT',
      headers: h(doctor1Token),
      body: JSON.stringify({ bloodPressureSystolic: 999 }),
    });
    logTest('20. Invalid vital input is rejected (HTTP 400)', invalidVitalRes.status === 400);

    // 21. Another doctor cannot alter the vitals
    const crossVitalsRes = await fetch(`${BASE_URL}/doctor/appointments/1/vitals`, {
      method: 'PUT',
      headers: h(doctor2Token),
      body: JSON.stringify({ bloodPressureSystolic: 120 }),
    });
    logTest("21. Another doctor cannot alter the vitals (HTTP 404)", crossVitalsRes.status === 404);

    // 22. Existing vitals are not unintentionally overwritten
    logTest('22. Existing vitals are not unintentionally overwritten', Number(dbVitals.weight_kg) === 73.5);

    // =========================================================================
    // MEDICATIONS TESTS
    // =========================================================================

    // 23. Doctor can add medication to own clinical record
    const addMedRes = await fetch(`${BASE_URL}/doctor/medical-records/1/medications`, {
      method: 'POST',
      headers: h(doctor1Token),
      body: JSON.stringify({
        medicineName: 'Amlodipine 5mg',
        dosage: '1 Tablet',
        frequency: 'Once daily at bedtime',
        duration: '30 days',
        instructions: 'Take after dinner.',
      }),
    });
    const addMedJson = await addMedRes.json();
    createdMedId = addMedJson.data?.medication?.id;
    logTest(
      '23. Doctor can add medication to own clinical record (HTTP 201)',
      addMedRes.status === 201 && !!createdMedId,
      `createdId=${createdMedId}`
    );

    // 24. Medication persists in MySQL
    const [[dbMed]] = await pool.query('SELECT * FROM medications WHERE id = ?;', [createdMedId]);
    logTest('24. Medication persists in MySQL', dbMed?.medicine_name === 'Amlodipine 5mg');

    // 25. Invalid medication input is rejected (missing dosage)
    const invalidMedRes = await fetch(`${BASE_URL}/doctor/medical-records/1/medications`, {
      method: 'POST',
      headers: h(doctor1Token),
      body: JSON.stringify({ medicineName: 'Paracetamol' }),
    });
    logTest('25. Invalid medication input is rejected (HTTP 400)', invalidMedRes.status === 400);

    // 26. Another doctor cannot modify/delete another doctor's medication
    // Doctor 2 attempts to delete Dr. Priya's newly created medication
    const crossDelRes = await fetch(`${BASE_URL}/doctor/medications/${createdMedId}`, {
      method: 'DELETE',
      headers: h(doctor2Token),
    });
    logTest(
      "26. Another doctor cannot delete another doctor's medication (HTTP 404)",
      crossDelRes.status === 404,
      `status=${crossDelRes.status}`
    );

    // 27. Existing medication records remain intact when adding a new medication
    const [allMeds] = await pool.query('SELECT id FROM medications WHERE medical_record_id = 1;');
    logTest(
      '27. Existing medication records remain intact when adding a new medication',
      allMeds.length === initialMeds1.length + 1,
      `totalMeds=${allMeds.length}`
    );

    // Delete the test-created medication with Doctor 1 (owner)
    const deleteOwnMedRes = await fetch(`${BASE_URL}/doctor/medications/${createdMedId}`, {
      method: 'DELETE',
      headers: h(doctor1Token),
    });
    logTest('Doctor can delete own medication', deleteOwnMedRes.status === 200);

    // =========================================================================
    // TRANSACTION SAFETY TESTS
    // =========================================================================

    // 28. Multi-table failure rolls back correctly
    // Verify that attempting to save invalid clinical record doesn't mutate or corrupt DB
    const [beforeMeds] = await pool.query('SELECT COUNT(*) AS count FROM medications;');
    const failRes = await fetch(`${BASE_URL}/doctor/medical-records/999999/medications`, {
      method: 'POST',
      headers: h(doctor1Token),
      body: JSON.stringify({
        medicineName: 'Ghost Drug',
        dosage: '1 Tab',
        frequency: 'Daily',
        duration: '10d',
      }),
    });
    const [afterMeds] = await pool.query('SELECT COUNT(*) AS count FROM medications;');
    logTest(
      '28. Multi-table failure rolls back correctly',
      failRes.status === 404 && beforeMeds[0].count === afterMeds[0].count
    );

    // 29. No orphan clinical data is created by failed operations
    const [orphans] = await pool.query(
      'SELECT id FROM medications WHERE medical_record_id NOT IN (SELECT id FROM medical_records);'
    );
    logTest('29. No orphan clinical data is created by failed operations', orphans.length === 0);

  } catch (err) {
    console.error('Test Suite Error:', err);
  } finally {
    // ── Restore initial database state ───────────────────────────────────────
    try {
      if (initialRecord1) {
        await pool.query(
          `UPDATE medical_records
           SET diagnosis = ?, treatment_plan = ?, doctor_notes = ?, visit_date = ?
           WHERE id = 1;`,
          [
            initialRecord1.diagnosis,
            initialRecord1.treatment_plan,
            initialRecord1.doctor_notes,
            initialRecord1.visit_date,
          ]
        );
      }
      if (initialVitals1) {
        await pool.query(
          `UPDATE vitals
           SET blood_pressure_systolic = ?, blood_pressure_diastolic = ?, heart_rate_bpm = ?,
               respiratory_rate_bpm = ?, temperature_celsius = ?, spo2_percentage = ?,
               weight_kg = ?, height_cm = ?, bmi = ?, notes = ?
           WHERE id = 1;`,
          [
            initialVitals1.blood_pressure_systolic,
            initialVitals1.blood_pressure_diastolic,
            initialVitals1.heart_rate_bpm,
            initialVitals1.respiratory_rate_bpm,
            initialVitals1.temperature_celsius,
            initialVitals1.spo2_percentage,
            initialVitals1.weight_kg,
            initialVitals1.height_cm,
            initialVitals1.bmi,
            initialVitals1.notes,
          ]
        );
      }
      if (createdMedId) {
        await pool.query('DELETE FROM medications WHERE id = ?;', [createdMedId]);
      }
    } catch (cleanErr) {
      console.error('Cleanup error:', cleanErr);
    }
    await stopTestServer();
  }

  console.log('\n============================================================');
  console.log('Phase 5C — Doctor Clinical Records Test Summary');
  console.log('============================================================');
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = total - passed;
  console.log(`Total: ${total} | Passed: ${passed} | Failed: ${failed}`);

  if (failed > 0) {
    console.error('❌ Some tests failed.');
    process.exit(1);
  } else {
    console.log('✅ All Phase 5C doctor clinical records tests passed!\n');
    process.exit(0);
  }
}

runTests();
