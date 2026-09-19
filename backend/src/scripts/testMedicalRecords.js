import { pool } from '../config/db.js';
import app from '../app.js';

let server;
const PORT = 5067;
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
      console.log(`[Medical Records Test Server] Running on port ${PORT}`);
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
    // ── Pre-test database snapshot for read-only integrity verification ──
    const [initialRecords] = await pool.query('SELECT * FROM medical_records ORDER BY id ASC;');
    const [initialVitals] = await pool.query('SELECT * FROM vitals ORDER BY id ASC;');
    const [initialMeds] = await pool.query('SELECT * FROM medications ORDER BY id ASC;');

    // ── Authenticate test users ─────────────────────────────────────────────
    // Patient 1: Rahul Verma (user_id = 5, patient_id = 1)
    const patient1Login = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'rahul.verma@example.in', password: 'Password123!' }),
    });
    const patient1Token = (await patient1Login.json()).data?.token;

    // Patient 2: Sneha Patel (user_id = 6, patient_id = 2)
    const patient2Login = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'sneha.patel@example.in', password: 'Password123!' }),
    });
    const patient2Token = (await patient2Login.json()).data?.token;

    // Patient 4: Deepa Nair (user_id = 8, patient_id = 4) - has 0 medical records
    const patient4Login = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'deepa.nair@example.in', password: 'Password123!' }),
    });
    const patient4Token = (await patient4Login.json()).data?.token;

    // Doctor: Dr. Priya Sharma (user_id = 1, doctor_id = 1)
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

    console.log('\n==================================================');
    console.log('PHASE 4F — MEDICAL RECORDS & PAST VISITS TEST SUITE');
    console.log('==================================================\n');

    // ── Test 1: Authenticated patient can retrieve their own medical records ──
    const res1 = await fetch(`${BASE_URL}/patients/medical-records`, {
      headers: authHeader(patient1Token),
    });
    const data1 = await res1.json();
    const passed1 =
      res1.status === 200 &&
      data1.success === true &&
      Array.isArray(data1.data?.records) &&
      data1.data.records.length > 0;
    logTest(
      '1. Authenticated patient can retrieve their own medical records',
      passed1,
      `Status ${res1.status}, found ${data1.data?.records?.length || 0} records`
    );

    // ── Test 2: Only records belonging to that patient are returned ──
    const records1 = data1.data?.records || [];
    const allBelongToPatient1 =
      records1.length > 0 && records1.every((r) => r.patientId === 1);
    logTest(
      '2. Only records belonging to that patient are returned',
      allBelongToPatient1,
      `All ${records1.length} records have patientId === 1`
    );

    // ── Test 3: Results are correctly ordered (newest visit first) ──
    let correctlyOrdered = true;
    for (let i = 0; i < records1.length - 1; i++) {
      const dateA = new Date(records1[i].visitDate).getTime();
      const dateB = new Date(records1[i + 1].visitDate).getTime();
      if (dateA < dateB) {
        correctlyOrdered = false;
        break;
      }
    }
    logTest(
      '3. Results are correctly ordered (newest visit first)',
      correctlyOrdered,
      `Verified chronological descending order across ${records1.length} records`
    );

    // ── Test 4: Unauthenticated request returns 401 ──
    const res4 = await fetch(`${BASE_URL}/patients/medical-records`);
    const passed4 = res4.status === 401;
    logTest(
      '4. Unauthenticated request returns 401',
      passed4,
      `Status: ${res4.status}`
    );

    // ── Test 5: DOCTOR role returns 403 ──
    const res5 = await fetch(`${BASE_URL}/patients/medical-records`, {
      headers: authHeader(doctorToken),
    });
    const passed5 = res5.status === 403;
    logTest(
      '5. DOCTOR role returns 403 Forbidden',
      passed5,
      `Status: ${res5.status}`
    );

    // ── Test 6: Another patient\'s medical records are not accessible ──
    const res6 = await fetch(`${BASE_URL}/patients/medical-records`, {
      headers: authHeader(patient2Token),
    });
    const data6 = await res6.json();
    const records2 = data6.data?.records || [];
    const patient2OwnsAll =
      records2.length > 0 &&
      records2.every((r) => r.patientId === 2) &&
      !records2.some((r) => r.id === 1);
    logTest(
      '6. Another patient medical records are not accessible',
      patient2OwnsAll,
      `Patient 2 only received patientId=2 records; Patient 1 record 1 absent`
    );

    // ── Test 7: A valid medical-record detail request works ──
    const res7 = await fetch(`${BASE_URL}/patients/medical-records/1`, {
      headers: authHeader(patient1Token),
    });
    const data7 = await res7.json();
    const rec7 = data7.data?.record;
    const passed7 =
      res7.status === 200 &&
      data7.success === true &&
      rec7 &&
      rec7.id === 1 &&
      rec7.doctorName === 'Dr. Priya Sharma' &&
      rec7.diagnosis.includes('Hypertension');
    logTest(
      '7. Valid medical-record detail request works',
      passed7,
      `Record 1 retrieved with doctor '${rec7?.doctorName}' and diagnosis '${rec7?.diagnosis}'`
    );

    // ── Test 8: Another patient\'s medical-record detail returns 404 ──
    // Patient 1 (Rahul) attempts to fetch Record 2 (belongs to Sneha Patel)
    const res8 = await fetch(`${BASE_URL}/patients/medical-records/2`, {
      headers: authHeader(patient1Token),
    });
    const passed8 = res8.status === 404;
    logTest(
      '8. Another patient medical-record detail returns 404 (resource isolation)',
      passed8,
      `Cross-patient detail request returned HTTP ${res8.status}`
    );

    // ── Test 9: Vitals returned match the database ──
    const [dbVitals] = await pool.query(
      'SELECT * FROM vitals WHERE patient_id = 1 AND appointment_id = 1 LIMIT 1;'
    );
    const dbVital = dbVitals[0];
    const apiVitals = rec7?.vitals;
    const vitalsMatch =
      Boolean(apiVitals) &&
      apiVitals.bloodPressureSystolic === dbVital.blood_pressure_systolic &&
      apiVitals.bloodPressureDiastolic === dbVital.blood_pressure_diastolic &&
      apiVitals.heartRateBpm === dbVital.heart_rate_bpm &&
      apiVitals.respiratoryRateBpm === dbVital.respiratory_rate_bpm &&
      Number(apiVitals.temperatureCelsius) === Number(dbVital.temperature_celsius) &&
      Number(apiVitals.spo2Percentage) === Number(dbVital.spo2_percentage) &&
      Number(apiVitals.weightKg) === Number(dbVital.weight_kg) &&
      Number(apiVitals.heightCm) === Number(dbVital.height_cm) &&
      Number(apiVitals.bmi) === Number(dbVital.bmi);
    logTest(
      '9. Vitals returned match the database',
      vitalsMatch,
      `BP: ${apiVitals?.bloodPressureSystolic}/${apiVitals?.bloodPressureDiastolic}, HR: ${apiVitals?.heartRateBpm}, SpO2: ${apiVitals?.spo2Percentage}%, Temp: ${apiVitals?.temperatureCelsius}°C, Weight: ${apiVitals?.weightKg}kg`
    );

    // ── Test 10: Medications returned match the database ──
    const [dbMeds] = await pool.query(
      'SELECT * FROM medications WHERE medical_record_id = 1 ORDER BY id ASC;'
    );
    const apiMeds = rec7?.medications || [];
    const medsMatch =
      apiMeds.length === dbMeds.length &&
      apiMeds.every((med, idx) => {
        const dbM = dbMeds[idx];
        return (
          med.id === dbM.id &&
          med.medicineName === dbM.medicine_name &&
          med.dosage === dbM.dosage &&
          med.frequency === dbM.frequency &&
          med.duration === dbM.duration
        );
      });
    logTest(
      '10. Medications returned match the database',
      medsMatch,
      `Matched ${apiMeds.length} prescriptions: ${apiMeds.map((m) => m.medicineName).join(', ')}`
    );

    // ── Test 11: password_hash and sensitive authentication fields are never returned ──
    const stringifiedPayload = JSON.stringify(data1) + JSON.stringify(data7);
    const sensitiveExposed =
      stringifiedPayload.includes('password_hash') ||
      stringifiedPayload.includes('Password123!') ||
      stringifiedPayload.includes('jwt_secret') ||
      stringifiedPayload.includes('$2b$10$');
    logTest(
      '11. password_hash and sensitive authentication fields are never returned',
      !sensitiveExposed,
      'Verified complete absence of password_hash, passwords, and password salts'
    );

    // ── Test 12: Empty medical-record result is handled correctly ──
    const res12 = await fetch(`${BASE_URL}/patients/medical-records`, {
      headers: authHeader(patient4Token),
    });
    const data12 = await res12.json();
    const passed12 =
      res12.status === 200 &&
      data12.success === true &&
      Array.isArray(data12.data?.records) &&
      data12.data.records.length === 0;
    logTest(
      '12. Empty medical-record result handled correctly',
      passed12,
      `Patient 4 returned HTTP 200 with records: [] (length 0)`
    );

    // ── Test 13: Existing records are not modified by read operations ──
    const [finalRecords] = await pool.query('SELECT * FROM medical_records ORDER BY id ASC;');
    const [finalVitals] = await pool.query('SELECT * FROM vitals ORDER BY id ASC;');
    const [finalMeds] = await pool.query('SELECT * FROM medications ORDER BY id ASC;');

    const recordsUnmodified =
      JSON.stringify(initialRecords) === JSON.stringify(finalRecords) &&
      JSON.stringify(initialVitals) === JSON.stringify(finalVitals) &&
      JSON.stringify(initialMeds) === JSON.stringify(finalMeds);
    logTest(
      '13. Existing records are not modified by read operations',
      recordsUnmodified,
      `Exact database checksum match across ${finalRecords.length} records, ${finalVitals.length} vitals, and ${finalMeds.length} medications`
    );

    // ── Summary ──
    console.log('\n==================================================');
    const passedCount = results.filter((r) => r.passed).length;
    console.log(`RESULTS: ${passedCount} / ${results.length} PASSED`);
    console.log('==================================================\n');

    if (passedCount !== results.length) {
      process.exitCode = 1;
    }
  } catch (err) {
    console.error('Fatal error during medical records tests:', err);
    process.exitCode = 1;
  } finally {
    await stopTestServer();
  }
}

runTests();
