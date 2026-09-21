/**
 * Phase 5E — Doctor Reviews Test Suite
 *
 * 1.  Unauthenticated request rejected (HTTP 401)
 * 2.  Unauthorized role rejected on POST /api/doctors/:id/reviews (DOCTOR returns HTTP 403)
 * 3.  Doctor reviews fetched with average rating and count (HTTP 200)
 * 4.  Reviewer display name included, no sensitive fields / auth secrets
 * 5.  Unknown doctor ID returns HTTP 404
 * 6.  Valid review creation by patient with eligible completed appointment (HTTP 201)
 * 7.  Patient identity taken from JWT, not client payload
 * 8.  Invalid rating rejected (HTTP 400)
 * 9.  Invalid review text rejected (HTTP 400, >1000 chars)
 * 10. Ineligible appointment rejected (HTTP 422 for non-completed or no appointments)
 * 11. Duplicate review prevented where applicable (HTTP 409)
 * 12. Cross-patient appointment review blocked (HTTP 404)
 * 13. Review persists in MySQL
 * 14. Rating/count aggregation matches DB
 * 15. Database restored cleanly after mutation tests
 */
import { pool } from '../config/db.js';
import app from '../app.js';

let server;
const PORT = 5070;
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
      console.log(`[Doctor Reviews Test Server] Running on port ${PORT}`);
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

async function runTests() {
  console.log('Starting Phase 5E Doctor Reviews Test Suite...\n');
  await startTestServer();

  let testAppointmentId = null;
  let testReviewId = null;

  try {
    // -------------------------------------------------------------------------
    // Setup tokens
    // -------------------------------------------------------------------------
    const patientToken = await login('rahul.verma@example.in'); // patient 1 (user 5)
    const patient4Token = await login('deepa.nair@example.in'); // patient 4 (user 8)
    const doctorToken = await login('priya.sharma@apollohospitals.com'); // doctor 1 (user 1)

    // -------------------------------------------------------------------------
    // 1. Unauthenticated request rejected (HTTP 401)
    // -------------------------------------------------------------------------
    const unauthGet = await fetch(`${BASE_URL}/doctors/1/reviews`);
    const unauthPost = await fetch(`${BASE_URL}/doctors/1/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating: 5 }),
    });
    logTest(
      'Unauthenticated review requests rejected (HTTP 401)',
      unauthGet.status === 401 && unauthPost.status === 401,
      `GET status=${unauthGet.status}, POST status=${unauthPost.status}`
    );

    // -------------------------------------------------------------------------
    // 2. Unauthorized role rejected on POST /api/doctors/:id/reviews
    // -------------------------------------------------------------------------
    const doctorPost = await fetch(`${BASE_URL}/doctors/1/reviews`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${doctorToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ rating: 5, comment: 'Trying to review as doctor' }),
    });
    logTest(
      'DOCTOR role rejected from submitting reviews (HTTP 403)',
      doctorPost.status === 403,
      `status=${doctorPost.status}`
    );

    // -------------------------------------------------------------------------
    // 3. Doctor reviews fetched with average rating and count (HTTP 200)
    // -------------------------------------------------------------------------
    const getReviewsRes = await fetch(`${BASE_URL}/doctors/1/reviews`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    const getReviewsData = await getReviewsRes.json();
    const hasData =
      getReviewsRes.status === 200 &&
      getReviewsData.success === true &&
      Array.isArray(getReviewsData.data?.reviews) &&
      getReviewsData.data?.reviews.length > 0 &&
      getReviewsData.data?.averageRating === 5 &&
      getReviewsData.data?.reviewCount === 1;
    logTest(
      'Doctor reviews fetched with average rating and count (HTTP 200)',
      hasData,
      `reviews=${getReviewsData.data?.reviews?.length}, avgRating=${getReviewsData.data?.averageRating}, count=${getReviewsData.data?.reviewCount}`
    );

    // -------------------------------------------------------------------------
    // 4. Reviewer display name included, no sensitive fields / auth secrets
    // -------------------------------------------------------------------------
    const firstReview = getReviewsData.data?.reviews?.[0] || {};
    const hasDisplayName = Boolean(firstReview.author) && Boolean(firstReview.initials);
    const jsonStr = JSON.stringify(getReviewsData);
    const noSensitive =
      !jsonStr.includes('password') &&
      !jsonStr.includes('password_hash') &&
      !jsonStr.includes('token');
    logTest(
      'Reviewer display name included, sensitive fields/secrets never exposed',
      hasDisplayName && noSensitive,
      `author="${firstReview.author}", initials="${firstReview.initials}", safe=${noSensitive}`
    );

    // -------------------------------------------------------------------------
    // 5. Unknown doctor ID returns HTTP 404
    // -------------------------------------------------------------------------
    const notFoundGet = await fetch(`${BASE_URL}/doctors/999999/reviews`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    const notFoundPost = await fetch(`${BASE_URL}/doctors/999999/reviews`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${patientToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ rating: 5 }),
    });
    logTest(
      'Unknown doctor ID returns HTTP 404 on GET and POST',
      notFoundGet.status === 404 && notFoundPost.status === 404,
      `GET status=${notFoundGet.status}, POST status=${notFoundPost.status}`
    );

    // -------------------------------------------------------------------------
    // Prepare for review creation tests:
    // Create a temporary COMPLETED appointment for patient 1 with doctor 4
    // (Doctor 4 currently has 0 reviews)
    // -------------------------------------------------------------------------
    const [apptInsert] = await pool.query(
      `INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_time, status, type, reason_for_visit)
       VALUES (1, 4, '2026-09-15', '10:00:00', 'COMPLETED', 'IN_PERSON', 'Follow-up consultation');`
    );
    testAppointmentId = apptInsert.insertId;

    // -------------------------------------------------------------------------
    // 6. Valid review creation by patient with eligible completed appointment (HTTP 201)
    // -------------------------------------------------------------------------
    const createRes = await fetch(`${BASE_URL}/doctors/4/reviews`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${patientToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        rating: 4,
        comment: 'Very thorough and knowledgeable neurologist. Highly recommend.',
        appointmentId: testAppointmentId,
      }),
    });
    const createData = await createRes.json();
    testReviewId = createData.data?.review?.id;
    const createOk =
      createRes.status === 201 &&
      createData.success === true &&
      createData.data?.review?.rating === 4 &&
      createData.data?.review?.author === 'Rahul Verma' &&
      createData.data?.review?.comment?.includes('Very thorough');
    logTest(
      'Valid review creation by patient with eligible completed appointment (HTTP 201)',
      createOk,
      `status=${createRes.status}, reviewId=${testReviewId}, author="${createData.data?.review?.author}"`
    );

    // -------------------------------------------------------------------------
    // 7. Patient identity taken from JWT, not client payload
    // -------------------------------------------------------------------------
    // Verify in DB that review was assigned to patient_id = 1 (derived from JWT),
    // even if client body were to attempt spoofing.
    const [dbReviewRows] = await pool.query(
      'SELECT patient_id, doctor_id, rating FROM reviews WHERE id = ?;',
      [testReviewId]
    );
    const jwtPatientMatch = dbReviewRows[0]?.patient_id === 1;
    logTest(
      'Patient identity taken from JWT (patient_id derived from token user_id)',
      jwtPatientMatch,
      `db patient_id=${dbReviewRows[0]?.patient_id}`
    );

    // -------------------------------------------------------------------------
    // 8. Invalid rating rejected (HTTP 400)
    // -------------------------------------------------------------------------
    const badRating0 = await fetch(`${BASE_URL}/doctors/4/reviews`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${patientToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ rating: 0, comment: 'Zero rating' }),
    });
    const badRating6 = await fetch(`${BASE_URL}/doctors/4/reviews`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${patientToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ rating: 6, comment: 'Six rating' }),
    });
    const badRatingStr = await fetch(`${BASE_URL}/doctors/4/reviews`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${patientToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ rating: 'invalid', comment: 'String rating' }),
    });
    logTest(
      'Invalid rating rejected with HTTP 400 (rating < 1, > 5, or NaN)',
      badRating0.status === 400 && badRating6.status === 400 && badRatingStr.status === 400,
      `0 status=${badRating0.status}, 6 status=${badRating6.status}, str status=${badRatingStr.status}`
    );

    // -------------------------------------------------------------------------
    // 9. Invalid review text rejected (HTTP 400, >1000 chars)
    // -------------------------------------------------------------------------
    const longComment = 'a'.repeat(1001);
    const longRes = await fetch(`${BASE_URL}/doctors/4/reviews`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${patientToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ rating: 5, comment: longComment }),
    });
    logTest(
      'Invalid review text (>1000 chars) rejected with HTTP 400',
      longRes.status === 400,
      `status=${longRes.status}`
    );

    // -------------------------------------------------------------------------
    // 10. Ineligible appointment rejected (HTTP 422)
    // -------------------------------------------------------------------------
    // Patient 4 has appointment 4 with doctor 1, but status is SCHEDULED
    const scheduledRes = await fetch(`${BASE_URL}/doctors/1/reviews`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${patient4Token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ rating: 5, appointmentId: 4 }),
    });
    // Patient 4 has no completed appointments with doctor 3
    const noApptRes = await fetch(`${BASE_URL}/doctors/3/reviews`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${patient4Token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ rating: 5 }),
    });
    logTest(
      'Ineligible appointment rejected (HTTP 422 for SCHEDULED status or no appointments)',
      scheduledRes.status === 422 && noApptRes.status === 422,
      `scheduled status=${scheduledRes.status}, noAppt status=${noApptRes.status}`
    );

    // -------------------------------------------------------------------------
    // 11. Duplicate review prevented where applicable (HTTP 409)
    // -------------------------------------------------------------------------
    // Patient 1 already reviewed doctor 4 for testAppointmentId
    const dupRes = await fetch(`${BASE_URL}/doctors/4/reviews`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${patientToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        rating: 5,
        comment: 'Attempting duplicate review',
        appointmentId: testAppointmentId,
      }),
    });
    // Patient 1 already has a review for seeded appointment 1 with doctor 1
    const dupSeeded = await fetch(`${BASE_URL}/doctors/1/reviews`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${patientToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        rating: 5,
        comment: 'Duplicate for appointment 1',
        appointmentId: 1,
      }),
    });
    logTest(
      'Duplicate review for same appointment prevented with HTTP 409',
      dupRes.status === 409 && dupSeeded.status === 409,
      `dup status=${dupRes.status}, seeded dup status=${dupSeeded.status}`
    );

    // -------------------------------------------------------------------------
    // 12. Cross-patient review access/update blocked (HTTP 404)
    // -------------------------------------------------------------------------
    // Patient 4 tries to review doctor 4 using Patient 1's testAppointmentId
    const crossPatientRes = await fetch(`${BASE_URL}/doctors/4/reviews`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${patient4Token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        rating: 5,
        appointmentId: testAppointmentId,
      }),
    });
    logTest(
      'Cross-patient appointment review blocked (HTTP 404 appointment mismatch)',
      crossPatientRes.status === 404,
      `status=${crossPatientRes.status}`
    );

    // -------------------------------------------------------------------------
    // 13. Review persists in MySQL
    // -------------------------------------------------------------------------
    const [persistedRows] = await pool.query(
      'SELECT id, patient_id, doctor_id, rating, comment FROM reviews WHERE id = ?;',
      [testReviewId]
    );
    const persists =
      persistedRows.length === 1 &&
      persistedRows[0].rating === 4 &&
      persistedRows[0].doctor_id === 4 &&
      persistedRows[0].patient_id === 1;
    logTest(
      'Review persists in MySQL database',
      persists,
      `found=${persistedRows.length}, rating=${persistedRows[0]?.rating}`
    );

    // -------------------------------------------------------------------------
    // 14. Rating/count aggregation matches DB
    // -------------------------------------------------------------------------
    const doc4ReviewsRes = await fetch(`${BASE_URL}/doctors/4/reviews`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    const doc4Data = await doc4ReviewsRes.json();
    const aggMatches =
      doc4Data.data?.averageRating === 4 &&
      doc4Data.data?.reviewCount === 1 &&
      doc4Data.data?.reviews?.length === 1;
    logTest(
      'Rating/count aggregation matches DB after new review',
      aggMatches,
      `averageRating=${doc4Data.data?.averageRating}, count=${doc4Data.data?.reviewCount}`
    );

    // -------------------------------------------------------------------------
    // 15. Database restored after mutation tests
    // -------------------------------------------------------------------------
    if (testReviewId) {
      await pool.query('DELETE FROM reviews WHERE id = ?;', [testReviewId]);
    }
    if (testAppointmentId) {
      await pool.query('DELETE FROM appointments WHERE id = ?;', [testAppointmentId]);
    }

    const [afterCleanupDoc4] = await pool.query(
      'SELECT COUNT(*) as cnt FROM reviews WHERE doctor_id = 4;'
    );
    const [afterCleanupAppt] = await pool.query(
      'SELECT COUNT(*) as cnt FROM appointments WHERE id = ?;',
      [testAppointmentId]
    );
    const restored =
      afterCleanupDoc4[0].cnt === 0 && afterCleanupAppt[0].cnt === 0;
    logTest(
      'Database restored after mutation tests (test review & appointment cleaned up)',
      restored,
      `doc4ReviewsCount=${afterCleanupDoc4[0].cnt}, testApptCount=${afterCleanupAppt[0].cnt}`
    );
  } finally {
    // Ensure cleanup even if test throws
    if (testReviewId) {
      await pool.query('DELETE FROM reviews WHERE id = ?;', [testReviewId]).catch(() => {});
    }
    if (testAppointmentId) {
      await pool.query('DELETE FROM appointments WHERE id = ?;', [testAppointmentId]).catch(() => {});
    }
    await stopTestServer();
  }

  // ---------------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------------
  console.log('\n============================================================');
  console.log('Phase 5E Doctor Reviews — Test Summary');
  console.log('============================================================');
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  console.log(`Total: ${total} | Passed: ${passed} | Failed: ${failed}`);

  if (failed > 0) {
    console.error(`❌ ${failed} test(s) failed.`);
    process.exit(1);
  } else {
    console.log('✅ All Phase 5E doctor reviews tests passed!');
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});
