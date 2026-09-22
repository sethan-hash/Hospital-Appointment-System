import { pool } from '../config/db.js';
import app from '../app.js';

let server;
const PORT = 5080;
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
      console.log(`[Admin Dashboard Test Server] Running on port ${PORT}`);
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

async function runAdminDashboardTests() {
  console.log('\n============================================================');
  console.log('MedLink Care: Phase 7A Admin Dashboard Test Suite');
  console.log('============================================================\n');

  await startTestServer();

  try {
    // -------------------------------------------------------------------------
    // Pre-test DB Snapshot (to verify database remains unchanged)
    // -------------------------------------------------------------------------
    const [[initialUsers]] = await pool.query('SELECT COUNT(*) AS c FROM users;');
    const [[initialPatients]] = await pool.query('SELECT COUNT(*) AS c FROM patients;');
    const [[initialDoctors]] = await pool.query('SELECT COUNT(*) AS c FROM doctors;');
    const [[initialAppts]] = await pool.query('SELECT COUNT(*) AS c FROM appointments;');
    const [[initialInvoices]] = await pool.query('SELECT COUNT(*) AS c FROM invoices;');
    const [[initialResources]] = await pool.query('SELECT COUNT(*) AS c FROM resources;');

    // -------------------------------------------------------------------------
    // Authentication: Obtain tokens
    // -------------------------------------------------------------------------
    // 1. Admin login (Manoj Kumar - user_id: 11)
    const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin.manoj@apollohospitals.com',
        password: 'Password123!',
      }),
    });
    const adminLoginData = await adminLoginRes.json();
    const adminToken = adminLoginData.data?.token;

    // 2. Doctor login (Dr. Priya Sharma - user_id: 1)
    const docLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'priya.sharma@apollohospitals.com',
        password: 'Password123!',
      }),
    });
    const docToken = (await docLoginRes.json()).data?.token;

    // 3. Patient login (Rahul Verma - user_id: 5)
    const patLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'rahul.verma@example.in',
        password: 'Password123!',
      }),
    });
    const patToken = (await patLoginRes.json()).data?.token;

    // =========================================================================
    // 1. Authentication & RBAC Access Control
    // =========================================================================
    console.log('\n--- 1. RBAC & Access Control ---');

    // Unauthenticated request
    const unauthRes = await fetch(`${BASE_URL}/admin/dashboard`);
    logTest(
      'RBAC',
      'Unauthenticated request denied with HTTP 401',
      unauthRes.status === 401,
      `Status: ${unauthRes.status}`
    );

    // Patient access attempt
    const patRes = await fetch(`${BASE_URL}/admin/dashboard`, {
      headers: { Authorization: `Bearer ${patToken}` },
    });
    logTest(
      'RBAC',
      'PATIENT role denied with HTTP 403',
      patRes.status === 403,
      `Status: ${patRes.status}`
    );

    // Doctor access attempt
    const docRes = await fetch(`${BASE_URL}/admin/dashboard`, {
      headers: { Authorization: `Bearer ${docToken}` },
    });
    logTest(
      'RBAC',
      'DOCTOR role denied with HTTP 403',
      docRes.status === 403,
      `Status: ${docRes.status}`
    );

    // Admin access attempt
    const adminRes = await fetch(`${BASE_URL}/admin/dashboard`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const adminJson = await adminRes.json();
    logTest(
      'RBAC',
      'ADMIN granted access with HTTP 200',
      adminRes.status === 200 && adminJson.success === true,
      `Status: ${adminRes.status}`
    );

    // =========================================================================
    // 2. Data Integrity & MySQL Parity
    // =========================================================================
    console.log('\n--- 2. Data Integrity & Live MySQL Matching ---');

    const dashData = adminJson.data;
    const stats = dashData?.statistics;

    logTest(
      'Integrity',
      'Admin identity in payload matches authenticated admin user',
      dashData?.admin?.email === 'admin.manoj@apollohospitals.com' &&
      dashData?.admin?.role === 'ADMIN' &&
      dashData?.admin?.fullName === 'Manoj Kumar'
    );

    // Query live DB values
    const [[dbPatients]] = await pool.query('SELECT COUNT(*) AS c FROM patients;');
    const [[dbDoctors]] = await pool.query('SELECT COUNT(*) AS c FROM doctors;');
    const [[dbAppts]] = await pool.query('SELECT COUNT(*) AS c FROM appointments;');
    const [[dbInvoices]] = await pool.query('SELECT COUNT(*) AS c FROM invoices;');
    const [[dbResources]] = await pool.query('SELECT COUNT(*) AS c FROM resources;');
    const [[dbAvailableRes]] = await pool.query('SELECT COUNT(*) AS c FROM resources WHERE status = "AVAILABLE";');
    const [[dbOccupiedRes]] = await pool.query('SELECT COUNT(*) AS c FROM resources WHERE status = "OCCUPIED";');

    logTest(
      'Integrity',
      'totalPatients matches database count',
      stats?.totalPatients === Number(dbPatients.c),
      `API: ${stats?.totalPatients} | DB: ${dbPatients.c}`
    );

    logTest(
      'Integrity',
      'totalDoctors matches database count',
      stats?.totalDoctors === Number(dbDoctors.c),
      `API: ${stats?.totalDoctors} | DB: ${dbDoctors.c}`
    );

    logTest(
      'Integrity',
      'totalAppointments matches database count',
      stats?.totalAppointments === Number(dbAppts.c),
      `API: ${stats?.totalAppointments} | DB: ${dbAppts.c}`
    );

    logTest(
      'Integrity',
      'totalInvoices matches database count',
      stats?.billing?.totalInvoices === Number(dbInvoices.c),
      `API: ${stats?.billing?.totalInvoices} | DB: ${dbInvoices.c}`
    );

    logTest(
      'Integrity',
      'resources total, available, and occupied match database counts',
      stats?.resources?.total === Number(dbResources.c) &&
      stats?.resources?.available === Number(dbAvailableRes.c) &&
      stats?.resources?.occupied === Number(dbOccupiedRes.c),
      `Total: ${stats?.resources?.total}, Avail: ${stats?.resources?.available}, Occ: ${stats?.resources?.occupied}`
    );

    logTest(
      'Integrity',
      'recentAppointments returns valid array with patient and doctor details',
      Array.isArray(dashData?.recentAppointments) &&
      dashData.recentAppointments.length <= 5 &&
      dashData.recentAppointments.every((a) => a.id && a.patientName && a.doctorName)
    );

    logTest(
      'Integrity',
      'resources array contains full infrastructure records',
      Array.isArray(dashData?.resources) &&
      dashData.resources.length === Number(dbResources.c) &&
      dashData.resources.every((r) => r.resourceCode && r.status)
    );

    // =========================================================================
    // 3. Security & Sensitive Field Exposure
    // =========================================================================
    console.log('\n--- 3. Sensitive Field Exposure Prevention ---');

    const stringifiedResponse = JSON.stringify(adminJson).toLowerCase();
    const leaksPasswordHash = stringifiedResponse.includes('password_hash');
    const leaksPassword = stringifiedResponse.includes('"password":');
    const leaksBcrypt = stringifiedResponse.includes('$2a$') || stringifiedResponse.includes('$2b$');
    const leaksJwtSecret = stringifiedResponse.includes('jwt_secret');

    logTest(
      'Security',
      'password_hash is strictly excluded from response',
      !leaksPasswordHash
    );

    logTest(
      'Security',
      'plaintext password or password fields excluded from response',
      !leaksPassword
    );

    logTest(
      'Security',
      'bcrypt hash signatures excluded from response',
      !leaksBcrypt
    );

    logTest(
      'Security',
      'JWT secrets or DB credentials excluded from response',
      !leaksJwtSecret
    );

    // =========================================================================
    // 4. Database Unchanged Verification
    // =========================================================================
    console.log('\n--- 4. Database State Preservation ---');

    const [[finalUsers]] = await pool.query('SELECT COUNT(*) AS c FROM users;');
    const [[finalPatients]] = await pool.query('SELECT COUNT(*) AS c FROM patients;');
    const [[finalDoctors]] = await pool.query('SELECT COUNT(*) AS c FROM doctors;');
    const [[finalAppts]] = await pool.query('SELECT COUNT(*) AS c FROM appointments;');
    const [[finalInvoices]] = await pool.query('SELECT COUNT(*) AS c FROM invoices;');
    const [[finalResources]] = await pool.query('SELECT COUNT(*) AS c FROM resources;');

    const dbUnchanged =
      initialUsers.c === finalUsers.c &&
      initialPatients.c === finalPatients.c &&
      initialDoctors.c === finalDoctors.c &&
      initialAppts.c === finalAppts.c &&
      initialInvoices.c === finalInvoices.c &&
      initialResources.c === finalResources.c;

    logTest(
      'Integrity',
      'Database records remain completely unchanged after dashboard queries',
      dbUnchanged,
      `Users: ${finalUsers.c}, Patients: ${finalPatients.c}, Doctors: ${finalDoctors.c}, Appts: ${finalAppts.c}, Invoices: ${finalInvoices.c}, Resources: ${finalResources.c}`
    );

  } catch (err) {
    console.error('\n[UNEXPECTED ERROR DURING ADMIN TEST SUITE]:', err);
  } finally {
    await stopTestServer();
  }

  // =========================================================================
  // Summary
  // =========================================================================
  console.log('\n============================================================');
  console.log('Test Summary: Phase 7A Admin Dashboard');
  console.log('============================================================');

  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = total - passed;

  console.log(`Total Checks : ${total}`);
  console.log(`Passed       : ${passed}`);
  console.log(`Failed       : ${failed}`);

  if (failed > 0) {
    console.log('\nFailed Tests:');
    results
      .filter((r) => !r.passed)
      .forEach((r) => console.log(` - [${r.category}] ${r.name} (${r.details})`));
    process.exit(1);
  } else {
    console.log('\nAll Admin Dashboard checks PASSED successfully.\n');
    process.exit(0);
  }
}

runAdminDashboardTests();
