import { pool } from '../config/db.js';
import app from '../app.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

let server;
const PORT = 5055;
const BASE_URL = `http://localhost:${PORT}/api`;

const results = [];

function logTest(category, name, passed, details = '') {
  results.push({ category, name, passed, details });
  const statusMark = passed ? '✓ PASS' : '✗ FAIL';
  console.log(`[${statusMark}] [${category}] ${name}${details ? ` - ${details}` : ''}`);
}

async function startTestServer() {
  return new Promise((resolve) => {
    server = app.listen(PORT, () => {
      console.log(`[Test Server] Running on port ${PORT}`);
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
  console.log('MedLink Care: Phase 3 Authentication Test Suite');
  console.log('============================================================\n');

  await startTestServer();

  try {
    // 0. Health Check Test
    const healthRes = await fetch(`${BASE_URL}/health`);
    const healthJson = await healthRes.json();
    logTest('Health', 'GET /api/health is operational', healthRes.status === 200 && healthJson.status === 'ok');

    // ==========================================
    // A. Registration Tests
    // ==========================================
    const testPatientEmail = `test.patient.${Date.now()}@example.in`;
    const validRegistrationPayload = {
      fullName: 'Aarav Gupta',
      email: testPatientEmail,
      password: 'Password123!',
      phone: `+91 99${Math.floor(10000000 + Math.random() * 90000000)}`,
      dob: '1992-05-18',
      gender: 'MALE',
      bloodGroup: 'O+',
      allergies: 'Penicillin',
      chronicConditions: 'None',
      emergencyContact: {
        name: 'Sunita Gupta',
        relationship: 'Mother',
        phone: '+91 98888 12345',
      },
    };

    // A1. Valid registration
    const regRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validRegistrationPayload),
    });
    const regJson = await regRes.json();
    const isRegSuccess = regRes.status === 201 && regJson.success && regJson.data?.token;
    logTest('Registration', 'Register valid new patient (HTTP 201 + JWT)', isRegSuccess);

    const newPatientToken = regJson.data?.token;
    const newPatientUserId = regJson.data?.user?.id;

    // A2. Duplicate email registration
    const dupRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validRegistrationPayload),
    });
    const dupJson = await dupRes.json();
    logTest('Registration', 'Duplicate email rejected (HTTP 409)', dupRes.status === 409 && !dupJson.success);

    // A3. Invalid email format
    const invalidEmailRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...validRegistrationPayload, email: 'not-an-email' }),
    });
    logTest('Registration', 'Invalid email format rejected (HTTP 400)', invalidEmailRes.status === 400);

    // A4. Weak password (< 6 chars)
    const weakPassRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...validRegistrationPayload, email: 'weak@example.in', password: '123' }),
    });
    logTest('Registration', 'Weak password (< 6 chars) rejected (HTTP 400)', weakPassRes.status === 400);

    // A5. Missing required full name
    const missingNameRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...validRegistrationPayload, email: 'noname@example.in', fullName: '' }),
    });
    logTest('Registration', 'Missing required fullName rejected (HTTP 400)', missingNameRes.status === 400);

    // ==========================================
    // B. Database Verification Tests
    // ==========================================
    const [userRows] = await pool.query('SELECT * FROM users WHERE id = ?;', [newPatientUserId]);
    const createdUser = userRows[0];
    logTest('Database', 'User record created in users table', Boolean(createdUser && createdUser.role === 'PATIENT'));

    const [patientRows] = await pool.query('SELECT * FROM patients WHERE user_id = ?;', [newPatientUserId]);
    const createdPatient = patientRows[0];
    logTest('Database', 'Patient record created linked via user_id', Boolean(createdPatient && createdPatient.user_id === createdUser.id));

    const hasPasswordHash = Boolean(createdUser?.password_hash);
    const isBcrypt = Boolean(createdUser?.password_hash?.startsWith('$2'));
    logTest('Database', 'password_hash exists in users table', hasPasswordHash);
    logTest('Database', 'password_hash is valid bcrypt (not plaintext)', isBcrypt && bcrypt.compareSync('Password123!', createdUser.password_hash));

    // ==========================================
    // C. Login Tests
    // ==========================================
    // C1. Correct login (seed patient Rahul Verma)
    const loginOkRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'rahul.verma@example.in', password: 'Password123!' }),
    });
    const loginOkJson = await loginOkRes.json();
    logTest('Login', 'Correct credentials return HTTP 200 + JWT', loginOkRes.status === 200 && Boolean(loginOkJson.data?.token));

    // C2. Incorrect password
    const loginBadPassRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'rahul.verma@example.in', password: 'WrongPassword!' }),
    });
    logTest('Login', 'Incorrect password returns HTTP 401', loginBadPassRes.status === 401);

    // C3. Non-existent email
    const loginBadEmailRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nobody@nowhere.com', password: 'Password123!' }),
    });
    logTest('Login', 'Non-existent email returns HTTP 401', loginBadEmailRes.status === 401);

    // ==========================================
    // D. JWT & Middleware Tests
    // ==========================================
    // D1. Valid token accepted at /api/auth/me
    const meRes = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${newPatientToken}` },
    });
    const meJson = await meRes.json();
    logTest('JWT', 'Valid token accepted at GET /api/auth/me', meRes.status === 200 && meJson.data?.user?.email === testPatientEmail);
    logTest('JWT', 'password_hash is NOT returned in user payload', meJson.data?.user?.password_hash === undefined);

    // D2. Missing token rejected
    const noTokenRes = await fetch(`${BASE_URL}/auth/me`);
    logTest('JWT', 'Missing token rejected with HTTP 401', noTokenRes.status === 401);

    // D3. Invalid / tampered token rejected
    const badTokenRes = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Authorization: 'Bearer invalid.tampered.token' },
    });
    logTest('JWT', 'Invalid / tampered token rejected with HTTP 401', badTokenRes.status === 401);

    // D4. Expired token rejected
    const expiredToken = jwt.sign(
      { id: newPatientUserId, email: testPatientEmail, role: 'PATIENT' },
      env.jwt.secret,
      { expiresIn: '-1s' }
    );
    const expiredRes = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${expiredToken}` },
    });
    logTest('JWT', 'Expired token rejected with HTTP 401', expiredRes.status === 401);

    // ==========================================
    // E. Role-Based Authorization (RBAC) Tests
    // ==========================================
    // Get tokens for doctor and admin seed users
    const doctorLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'priya.sharma@apollohospitals.com', password: 'Password123!' }),
    });
    const doctorToken = (await doctorLoginRes.json()).data?.token;

    const receptionistLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'sunita.rao@apollohospitals.com', password: 'Password123!' }),
    });
    const receptionistToken = (await receptionistLoginRes.json()).data?.token;

    const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin.manoj@apollohospitals.com', password: 'Password123!' }),
    });
    const adminToken = (await adminLoginRes.json()).data?.token;

    // E1. Patient cannot access doctor-only route
    const patOnDocRes = await fetch(`${BASE_URL}/auth/test/doctor-only`, {
      headers: { Authorization: `Bearer ${newPatientToken}` },
    });
    logTest('Role Auth', 'PATIENT denied access to doctor-only route (HTTP 403)', patOnDocRes.status === 403);

    // E2. Patient cannot access admin-only route
    const patOnAdminRes = await fetch(`${BASE_URL}/auth/test/admin-only`, {
      headers: { Authorization: `Bearer ${newPatientToken}` },
    });
    logTest('Role Auth', 'PATIENT denied access to admin-only route (HTTP 403)', patOnAdminRes.status === 403);

    // E3. Doctor cannot access admin-only route
    const docOnAdminRes = await fetch(`${BASE_URL}/auth/test/admin-only`, {
      headers: { Authorization: `Bearer ${doctorToken}` },
    });
    logTest('Role Auth', 'DOCTOR denied access to admin-only route (HTTP 403)', docOnAdminRes.status === 403);

    // E4. Receptionist cannot access admin-only route
    const recepOnAdminRes = await fetch(`${BASE_URL}/auth/test/admin-only`, {
      headers: { Authorization: `Bearer ${receptionistToken}` },
    });
    logTest('Role Auth', 'RECEPTIONIST denied access to admin-only route (HTTP 403)', recepOnAdminRes.status === 403);

    // E5. Doctor granted access to doctor-only route
    const docOnDocRes = await fetch(`${BASE_URL}/auth/test/doctor-only`, {
      headers: { Authorization: `Bearer ${doctorToken}` },
    });
    logTest('Role Auth', 'DOCTOR granted access to doctor-only route (HTTP 200)', docOnDocRes.status === 200);

    // E6. Admin granted access to admin-only route
    const adminOnAdminRes = await fetch(`${BASE_URL}/auth/test/admin-only`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    logTest('Role Auth', 'ADMIN granted access to admin-only route (HTTP 200)', adminOnAdminRes.status === 200);

  } catch (err) {
    console.error('Test Suite Exception:', err);
  } finally {
    await stopTestServer();
  }

  // Summary report
  console.log('\n============================================================');
  console.log('Test Summary');
  console.log('============================================================');
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = total - passed;
  console.log(`Total: ${total} | Passed: ${passed} | Failed: ${failed}`);

  if (failed > 0) {
    console.error('❌ Some tests failed.');
    process.exit(1);
  } else {
    console.log('★ All authentication tests passed successfully!\n');
    process.exit(0);
  }
}

runTests();
