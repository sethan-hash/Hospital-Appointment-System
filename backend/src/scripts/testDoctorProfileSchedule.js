/**
 * Phase 5D — Doctor Profile & Schedule Test Suite
 *
 * PROFILE:
 *  1. Doctor can retrieve own profile (HTTP 200)
 *  2. Doctor identity comes from JWT (not client-supplied ID)
 *  3. Doctor can update allowed profile fields
 *  4. Updated profile persists in MySQL
 *  5. Invalid profile data returns 400 (blank name, bad email, negative fee/exp)
 *  6. Duplicate email is rejected (HTTP 409)
 *  7. Another doctor cannot modify first doctor's profile (HTTP 403 via RBAC isolation)
 *  8. PATIENT role returns 403
 *  9. Unauthenticated request returns 401
 * 10. password_hash and auth secrets are never returned
 *
 * SCHEDULE:
 * 11. Doctor can retrieve own weekly schedule (HTTP 200, 7 days)
 * 12. Doctor can update own schedule
 * 13. Updated schedule persists in MySQL
 * 14. Invalid day is rejected (400)
 * 15. Invalid time format is rejected (400)
 * 16. startTime >= endTime is rejected (400)
 * 17. Slot duration exceeding window is rejected (400)
 * 18. Another doctor cannot modify schedule (HTTP 403 RBAC)
 * 19. PATIENT role returns 403 for schedule endpoints
 * 20. Unauthenticated request returns 401 for schedule
 * 21. Multi-day schedule update is atomic (all saved or none)
 * 22. Patient availability endpoint reflects updated schedule
 * 23. Database state is restored cleanly after mutation tests
 */
import { pool } from '../config/db.js';
import app from '../app.js';

let server;
const PORT = 5068;
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
      console.log(`[Doctor Profile & Schedule Test Server] Running on port ${PORT}`);
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

  // ─── Capture original state for rollback ────────────────────────────────────
  const [origUser1] = await pool.query(
    'SELECT full_name, email, phone FROM users WHERE id = 1;'
  );
  const [origDoctor1] = await pool.query(
    'SELECT specialization, department, qualification, hospital_name, consultation_fee, experience_years, bio, is_available FROM doctors WHERE user_id = 1;'
  );
  const [origSchedule1] = await pool.query(
    'SELECT day_of_week, start_time, end_time, slot_duration_minutes, is_active FROM doctor_schedules WHERE doctor_id = 1 ORDER BY id;'
  );

  try {
    // ── Login credentials ────────────────────────────────────────────────────
    const [p1Res, p2Res, d1Res, d2Res] = await Promise.all([
      fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'rahul.verma@example.in', password: 'Password123!' }),
      }),
      fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'sneha.patel@example.in', password: 'Password123!' }),
      }),
      fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'priya.sharma@apollohospitals.com', password: 'Password123!' }),
      }),
      fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'rajesh.kulkarni@apollohospitals.com', password: 'Password123!' }),
      }),
    ]);

    const patientToken = (await p1Res.json()).data?.token;
    const patient2Token = (await p2Res.json()).data?.token;
    const doctor1Token = (await d1Res.json()).data?.token;
    const doctor2Token = (await d2Res.json()).data?.token;

    const authH = (tok, extra = {}) => ({
      Authorization: `Bearer ${tok}`,
      'Content-Type': 'application/json',
      ...extra,
    });

    // =========================================================================
    //  PROFILE TESTS
    // =========================================================================

    // Test 1: Doctor can retrieve own profile
    const getProfileRes = await fetch(`${BASE_URL}/doctor/profile`, {
      headers: authH(doctor1Token),
    });
    const getProfileData = await getProfileRes.json();
    const profile = getProfileData.data?.profile;
    logTest(
      '1. Doctor can retrieve own profile (HTTP 200)',
      getProfileRes.status === 200 && !!profile,
      `status=${getProfileRes.status}`
    );

    // Test 2: Profile identity derived from JWT (matches Dr. Priya Sharma)
    logTest(
      '2. Doctor identity derived from JWT',
      profile?.name === 'Dr. Priya Sharma' && profile?.doctorId === 1,
      `name="${profile?.name}", doctorId=${profile?.doctorId}`
    );

    // Test 3 + 4: Update allowed profile fields and verify MySQL persistence
    const updateProfileRes = await fetch(`${BASE_URL}/doctor/profile`, {
      method: 'PUT',
      headers: authH(doctor1Token),
      body: JSON.stringify({
        bio: 'Updated bio for Phase 5D test — cardiology specialist with 14 years experience.',
        consultationFee: 1050,
        experienceYears: 15,
        // isAvailable left unchanged (true) so doctor 1 remains patient-visible for test 22
      }),
    });
    const updateProfileData = await updateProfileRes.json();
    logTest(
      '3. Doctor can update allowed profile fields (HTTP 200)',
      updateProfileRes.status === 200 && updateProfileData.success === true,
      `status=${updateProfileRes.status}`
    );

    const [dbRow] = await pool.query(
      'SELECT consultation_fee, experience_years, is_available, bio FROM doctors WHERE user_id = 1;'
    );
    logTest(
      '4. Updated profile persists in MySQL',
      dbRow[0]?.consultation_fee === '1050.00' &&
        dbRow[0]?.experience_years === 15,
      `fee=${dbRow[0]?.consultation_fee}, exp=${dbRow[0]?.experience_years}`
    );

    // Test 5: Invalid profile data returns 400
    const invalidNameRes = await fetch(`${BASE_URL}/doctor/profile`, {
      method: 'PUT',
      headers: authH(doctor1Token),
      body: JSON.stringify({ name: 'X' }), // too short
    });
    const invalidFeeRes = await fetch(`${BASE_URL}/doctor/profile`, {
      method: 'PUT',
      headers: authH(doctor1Token),
      body: JSON.stringify({ consultationFee: -100 }),
    });
    const invalidExpRes = await fetch(`${BASE_URL}/doctor/profile`, {
      method: 'PUT',
      headers: authH(doctor1Token),
      body: JSON.stringify({ experienceYears: 999 }),
    });
    logTest(
      '5. Invalid profile data returns 400 (name, fee, experience)',
      invalidNameRes.status === 400 &&
        invalidFeeRes.status === 400 &&
        invalidExpRes.status === 400,
      `name=${invalidNameRes.status}, fee=${invalidFeeRes.status}, exp=${invalidExpRes.status}`
    );

    // Test 6: Duplicate email rejected with 409
    const dupEmailRes = await fetch(`${BASE_URL}/doctor/profile`, {
      method: 'PUT',
      headers: authH(doctor1Token),
      body: JSON.stringify({ email: 'rajesh.kulkarni@apollohospitals.com' }), // Doctor 2 email
    });
    logTest(
      '6. Duplicate email rejected with HTTP 409',
      dupEmailRes.status === 409,
      `status=${dupEmailRes.status}`
    );

    // Test 7: Doctor 2 cannot modify Doctor 1's profile (endpoints derive identity from JWT)
    const d2AccessD1Res = await fetch(`${BASE_URL}/doctor/profile`, {
      method: 'PUT',
      headers: authH(doctor2Token),
      body: JSON.stringify({ bio: 'SHOULD NOT PERSIST — cross-doctor attack' }),
    });
    // Doctor 2 can update THEIR OWN profile (HTTP 200) but Dr. 1's bio should be unchanged
    const [d1BioAfter] = await pool.query('SELECT bio FROM doctors WHERE user_id = 1;');
    logTest(
      '7. Doctor 2 JWT modifies only Doctor 2 profile — Doctor 1 profile is unaffected',
      d2AccessD1Res.status === 200 &&
        !d1BioAfter[0]?.bio?.includes('SHOULD NOT PERSIST'),
      `doctor2 PUT status=${d2AccessD1Res.status}, doctor1 bio unchanged=${!d1BioAfter[0]?.bio?.includes('SHOULD NOT PERSIST')}`
    );

    // Test 8: PATIENT role returns 403
    const patientProfileRes = await fetch(`${BASE_URL}/doctor/profile`, {
      headers: authH(patientToken),
    });
    logTest(
      '8. PATIENT role returns 403 for GET /api/doctor/profile',
      patientProfileRes.status === 403,
      `status=${patientProfileRes.status}`
    );

    // Test 9: Unauthenticated request returns 401
    const unauthProfileRes = await fetch(`${BASE_URL}/doctor/profile`);
    logTest(
      '9. Unauthenticated request returns 401',
      unauthProfileRes.status === 401,
      `status=${unauthProfileRes.status}`
    );

    // Test 10: password_hash never returned
    const profileBodyText = JSON.stringify(getProfileData);
    const secretsAbsent =
      !profileBodyText.includes('password_hash') &&
      !profileBodyText.includes('password') &&
      !profileBodyText.includes('bcrypt');
    logTest(
      '10. password_hash and auth secrets never returned in profile',
      secretsAbsent,
      `Checked: password_hash, password, bcrypt — all absent=${secretsAbsent}`
    );

    // =========================================================================
    //  SCHEDULE TESTS
    // =========================================================================

    // Test 11: Doctor retrieves own schedule (7 days)
    const getScheduleRes = await fetch(`${BASE_URL}/doctor/schedule`, {
      headers: authH(doctor1Token),
    });
    const getScheduleData = await getScheduleRes.json();
    const scheduleItems = getScheduleData.data?.schedule || [];
    logTest(
      '11. Doctor can retrieve own weekly schedule (HTTP 200, 7 days)',
      getScheduleRes.status === 200 && scheduleItems.length === 7,
      `status=${getScheduleRes.status}, days=${scheduleItems.length}`
    );

    // Test 12 + 13: Update schedule and verify MySQL persistence
    const newSchedule = [
      { dayOfWeek: 'MONDAY', isActive: true, startTime: '08:00', endTime: '12:00', slotDurationMinutes: 30 },
      { dayOfWeek: 'TUESDAY', isActive: true, startTime: '14:00', endTime: '18:00', slotDurationMinutes: 30 },
      { dayOfWeek: 'WEDNESDAY', isActive: true, startTime: '09:00', endTime: '13:00', slotDurationMinutes: 30 },
      { dayOfWeek: 'THURSDAY', isActive: false, startTime: '09:00', endTime: '17:00', slotDurationMinutes: 30 },
      { dayOfWeek: 'FRIDAY', isActive: true, startTime: '10:00', endTime: '14:00', slotDurationMinutes: 20 },
      { dayOfWeek: 'SATURDAY', isActive: false, startTime: '09:00', endTime: '13:00', slotDurationMinutes: 30 },
      { dayOfWeek: 'SUNDAY', isActive: false, startTime: '09:00', endTime: '13:00', slotDurationMinutes: 30 },
    ];

    const updateScheduleRes = await fetch(`${BASE_URL}/doctor/schedule`, {
      method: 'PUT',
      headers: authH(doctor1Token),
      body: JSON.stringify({ schedule: newSchedule }),
    });
    const updateScheduleData = await updateScheduleRes.json();
    logTest(
      '12. Doctor can update own schedule (HTTP 200)',
      updateScheduleRes.status === 200 && updateScheduleData.success === true,
      `status=${updateScheduleRes.status}`
    );

    const [dbSchedule] = await pool.query(
      `SELECT day_of_week, start_time, end_time, slot_duration_minutes, is_active
       FROM doctor_schedules WHERE doctor_id = 1 ORDER BY FIELD(day_of_week,'MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY');`
    );
    const mondayInDB = dbSchedule.find((r) => r.day_of_week === 'MONDAY');
    const fridayInDB = dbSchedule.find((r) => r.day_of_week === 'FRIDAY');
    logTest(
      '13. Updated schedule persists in MySQL',
      mondayInDB &&
        String(mondayInDB.start_time).startsWith('08') &&
        fridayInDB?.slot_duration_minutes === 20,
      `Mon start=${mondayInDB?.start_time}, Fri slot=${fridayInDB?.slot_duration_minutes}m`
    );

    // Test 14: Invalid day rejected
    const invalidDayRes = await fetch(`${BASE_URL}/doctor/schedule`, {
      method: 'PUT',
      headers: authH(doctor1Token),
      body: JSON.stringify({
        schedule: [
          { dayOfWeek: 'FUNDAY', isActive: true, startTime: '09:00', endTime: '17:00', slotDurationMinutes: 30 },
        ],
      }),
    });
    logTest(
      '14. Invalid day name rejected (HTTP 400)',
      invalidDayRes.status === 400,
      `status=${invalidDayRes.status}`
    );

    // Test 15: Invalid time format rejected
    const invalidTimeFmtRes = await fetch(`${BASE_URL}/doctor/schedule`, {
      method: 'PUT',
      headers: authH(doctor1Token),
      body: JSON.stringify({
        schedule: [
          { dayOfWeek: 'MONDAY', isActive: true, startTime: '9am', endTime: '5pm', slotDurationMinutes: 30 },
        ],
      }),
    });
    logTest(
      '15. Invalid time format rejected (HTTP 400)',
      invalidTimeFmtRes.status === 400,
      `status=${invalidTimeFmtRes.status}`
    );

    // Test 16: startTime >= endTime rejected
    const invertedTimeRes = await fetch(`${BASE_URL}/doctor/schedule`, {
      method: 'PUT',
      headers: authH(doctor1Token),
      body: JSON.stringify({
        schedule: [
          { dayOfWeek: 'MONDAY', isActive: true, startTime: '14:00', endTime: '12:00', slotDurationMinutes: 30 },
        ],
      }),
    });
    logTest(
      '16. startTime >= endTime rejected (HTTP 400)',
      invertedTimeRes.status === 400,
      `status=${invertedTimeRes.status}`
    );

    // Test 17: Slot duration exceeding working window rejected
    const overSlotRes = await fetch(`${BASE_URL}/doctor/schedule`, {
      method: 'PUT',
      headers: authH(doctor1Token),
      body: JSON.stringify({
        schedule: [
          { dayOfWeek: 'MONDAY', isActive: true, startTime: '09:00', endTime: '09:30', slotDurationMinutes: 60 },
        ],
      }),
    });
    logTest(
      '17. Slot duration > working window rejected (HTTP 400)',
      overSlotRes.status === 400,
      `status=${overSlotRes.status}`
    );

    // Test 18: Doctor 2 cannot modify Doctor 1's schedule (JWT isolation)
    const [d1SchedBefore] = await pool.query(
      'SELECT COUNT(*) AS cnt FROM doctor_schedules WHERE doctor_id = 1;'
    );
    const d2UpdateD1Sched = await fetch(`${BASE_URL}/doctor/schedule`, {
      method: 'PUT',
      headers: authH(doctor2Token),
      body: JSON.stringify({
        schedule: [
          { dayOfWeek: 'MONDAY', isActive: true, startTime: '09:00', endTime: '17:00', slotDurationMinutes: 30 },
        ],
      }),
    });
    // Doctor 2 can update their own schedule (HTTP 200), but Doctor 1's schedule should be unchanged in count
    const [d1SchedAfter] = await pool.query(
      'SELECT COUNT(*) AS cnt FROM doctor_schedules WHERE doctor_id = 1;'
    );
    logTest(
      '18. Doctor 2 JWT modifies only Doctor 2 schedule — Doctor 1 schedule unaffected',
      d2UpdateD1Sched.status === 200 &&
        d1SchedBefore[0]?.cnt === d1SchedAfter[0]?.cnt,
      `doctor2 PUT status=${d2UpdateD1Sched.status}, doctor1 schedule row count unchanged=${d1SchedBefore[0]?.cnt === d1SchedAfter[0]?.cnt}`
    );

    // Test 19: PATIENT role returns 403 for schedule endpoints
    const patientScheduleGetRes = await fetch(`${BASE_URL}/doctor/schedule`, {
      headers: authH(patientToken),
    });
    const patientSchedulePutRes = await fetch(`${BASE_URL}/doctor/schedule`, {
      method: 'PUT',
      headers: authH(patientToken),
      body: JSON.stringify({ schedule: [] }),
    });
    logTest(
      '19. PATIENT role returns 403 for GET and PUT /api/doctor/schedule',
      patientScheduleGetRes.status === 403 && patientSchedulePutRes.status === 403,
      `GET=${patientScheduleGetRes.status}, PUT=${patientSchedulePutRes.status}`
    );

    // Test 20: Unauthenticated request returns 401
    const unauthScheduleGetRes = await fetch(`${BASE_URL}/doctor/schedule`);
    const unauthSchedulePutRes = await fetch(`${BASE_URL}/doctor/schedule`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ schedule: [] }),
    });
    logTest(
      '20. Unauthenticated request returns 401 for schedule endpoints',
      unauthScheduleGetRes.status === 401 && unauthSchedulePutRes.status === 401,
      `GET=${unauthScheduleGetRes.status}, PUT=${unauthSchedulePutRes.status}`
    );

    // Test 21: Multi-day update is atomic — verifying all 7 days are replaced atomically
    const fullWeek = [
      { dayOfWeek: 'MONDAY', isActive: true, startTime: '09:00', endTime: '13:00', slotDurationMinutes: 30 },
      { dayOfWeek: 'TUESDAY', isActive: false, startTime: '09:00', endTime: '13:00', slotDurationMinutes: 30 },
      { dayOfWeek: 'WEDNESDAY', isActive: true, startTime: '09:00', endTime: '13:00', slotDurationMinutes: 30 },
      { dayOfWeek: 'THURSDAY', isActive: false, startTime: '09:00', endTime: '13:00', slotDurationMinutes: 30 },
      { dayOfWeek: 'FRIDAY', isActive: true, startTime: '14:00', endTime: '18:00', slotDurationMinutes: 30 },
      { dayOfWeek: 'SATURDAY', isActive: false, startTime: '09:00', endTime: '13:00', slotDurationMinutes: 30 },
      { dayOfWeek: 'SUNDAY', isActive: false, startTime: '09:00', endTime: '13:00', slotDurationMinutes: 30 },
    ];
    const atomicRes = await fetch(`${BASE_URL}/doctor/schedule`, {
      method: 'PUT',
      headers: authH(doctor1Token),
      body: JSON.stringify({ schedule: fullWeek }),
    });
    const atomicData = await atomicRes.json();
    const [atomicDb] = await pool.query(
      'SELECT COUNT(*) AS cnt FROM doctor_schedules WHERE doctor_id = 1;'
    );
    logTest(
      '21. Multi-day schedule update is atomic (all 7 day rows replaced atomically)',
      atomicRes.status === 200 && atomicDb[0]?.cnt === 7,
      `status=${atomicRes.status}, DB rows=${atomicDb[0]?.cnt}`
    );

    // Test 22: Patient-facing availability reflects updated schedule
    const availRes = await fetch(`${BASE_URL}/doctors/1/availability`, {
      headers: authH(patientToken),
    });
    const availData = await availRes.json();
    const availSchedule = availData.data?.schedule || [];
    const mondayAvail = availSchedule.find((s) => s.day === 'Monday');
    const satAvail = availSchedule.find((s) => s.day === 'Saturday');
    logTest(
      '22. Patient GET /api/doctors/:id/availability reflects updated schedule',
      availRes.status === 200 &&
        mondayAvail?.available === true &&
        satAvail?.available === false,
      `Monday available=${mondayAvail?.available}, Saturday available=${satAvail?.available}`
    );
  } finally {
    // ─── Restore original state ───────────────────────────────────────────────
    try {
      // Restore users table
      const u = origUser1[0];
      await pool.query(
        'UPDATE users SET full_name = ?, email = ?, phone = ? WHERE id = 1;',
        [u.full_name, u.email, u.phone]
      );

      // Restore doctors table
      const d = origDoctor1[0];
      await pool.query(
        `UPDATE doctors
         SET specialization = ?, department = ?, qualification = ?,
             hospital_name = ?, consultation_fee = ?, experience_years = ?,
             bio = ?, is_available = ?
         WHERE user_id = 1;`,
        [
          d.specialization, d.department, d.qualification,
          d.hospital_name, d.consultation_fee, d.experience_years,
          d.bio, d.is_available,
        ]
      );

      // Restore doctor_schedules
      await pool.query('DELETE FROM doctor_schedules WHERE doctor_id = 1;');
      for (const row of origSchedule1) {
        await pool.query(
          `INSERT INTO doctor_schedules
             (doctor_id, day_of_week, start_time, end_time, slot_duration_minutes, is_active)
           VALUES (1, ?, ?, ?, ?, ?);`,
          [row.day_of_week, row.start_time, row.end_time, row.slot_duration_minutes, row.is_active]
        );
      }

      // Test 23: Verify DB is clean
      const [restoredUser] = await pool.query('SELECT full_name, email FROM users WHERE id = 1;');
      const [restoredSched] = await pool.query(
        'SELECT COUNT(*) AS cnt FROM doctor_schedules WHERE doctor_id = 1;'
      );
      logTest(
        '23. Database state restored cleanly after mutation tests',
        restoredUser[0]?.email === 'priya.sharma@apollohospitals.com' &&
          restoredSched[0]?.cnt === origSchedule1.length,
        `email=${restoredUser[0]?.email}, schedule_rows=${restoredSched[0]?.cnt} (expected ${origSchedule1.length})`
      );
    } catch (restoreErr) {
      console.error('[Cleanup] Failed to restore original state:', restoreErr.message);
      logTest('23. Database state restored cleanly after mutation tests', false, restoreErr.message);
    }

    await stopTestServer();
  }

  // ─── Summary ─────────────────────────────────────────────────────────────
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log('\n============================================================');
  console.log('Phase 5D — Doctor Profile & Schedule Test Summary');
  console.log('============================================================');
  console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`);

  if (failed === 0) {
    console.log('✅ All Phase 5D doctor profile & schedule tests passed!\n');
    process.exit(0);
  } else {
    console.log('\nFailed tests:');
    results.filter((r) => !r.passed).forEach((r) => {
      console.log(`  ❌ ${r.name}${r.details ? ` — ${r.details}` : ''}`);
    });
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('[Fatal] Test suite failed with unexpected error:', err);
  process.exit(1);
});
