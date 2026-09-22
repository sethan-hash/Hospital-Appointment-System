import { pool } from '../config/db.js';
import app from '../app.js';

let server;
const PORT = 5081;
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
      console.log(`[Admin User Management Test Server] Running on port ${PORT}`);
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
  console.log('MedLink Care: Phase 7B Admin User Management Test Suite');
  console.log('============================================================\n');

  await startTestServer();

  // Track any users we deactivate during tests so we can restore them
  const toRestore = [];

  try {
    // -------------------------------------------------------------------------
    // Obtain tokens
    // -------------------------------------------------------------------------
    const [adminToken, docToken, patToken] = await Promise.all([
      fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin.manoj@apollohospitals.com', password: 'Password123!' }),
      }).then((r) => r.json()).then((d) => d.data?.token),

      fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'priya.sharma@apollohospitals.com', password: 'Password123!' }),
      }).then((r) => r.json()).then((d) => d.data?.token),

      fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'rahul.verma@example.in', password: 'Password123!' }),
      }).then((r) => r.json()).then((d) => d.data?.token),
    ]);

    // =========================================================================
    // 1. RBAC — GET /api/admin/users
    // =========================================================================
    console.log('\n--- 1. RBAC — GET /api/admin/users ---');

    const unauthRes = await fetch(`${BASE_URL}/admin/users`);
    logTest('RBAC', 'Unauthenticated request → 401', unauthRes.status === 401, `Status: ${unauthRes.status}`);

    const docRes = await fetch(`${BASE_URL}/admin/users`, {
      headers: { Authorization: `Bearer ${docToken}` },
    });
    logTest('RBAC', 'DOCTOR role → 403', docRes.status === 403, `Status: ${docRes.status}`);

    const patRes = await fetch(`${BASE_URL}/admin/users`, {
      headers: { Authorization: `Bearer ${patToken}` },
    });
    logTest('RBAC', 'PATIENT role → 403', patRes.status === 403, `Status: ${patRes.status}`);

    const adminRes = await fetch(`${BASE_URL}/admin/users`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const adminJson = await adminRes.json();
    logTest('RBAC', 'ADMIN → 200 with user list', adminRes.status === 200 && adminJson.success === true, `Status: ${adminRes.status}`);

    // =========================================================================
    // 2. Data — all users returned
    // =========================================================================
    console.log('\n--- 2. Data Integrity ---');

    const users = adminJson.data?.users || [];
    const [[{ dbCount }]] = await pool.query('SELECT COUNT(*) AS dbCount FROM users;');

    logTest('Integrity', 'users array present in payload', Array.isArray(users));
    logTest(
      'Integrity',
      'total field matches users.length',
      adminJson.data?.total === users.length,
      `total: ${adminJson.data?.total}, users.length: ${users.length}`
    );
    logTest(
      'Integrity',
      'user count matches DB count',
      users.length === Number(dbCount),
      `API: ${users.length}, DB: ${dbCount}`
    );

    // =========================================================================
    // 3. Sensitive field exclusion
    // =========================================================================
    console.log('\n--- 3. Sensitive Field Exclusion ---');

    const stringified = JSON.stringify(adminJson).toLowerCase();
    logTest('Security', 'password_hash not in response', !stringified.includes('password_hash'));
    logTest('Security', '"password" field not in response', !stringified.includes('"password":'));
    logTest('Security', 'bcrypt signatures not in response', !stringified.includes('$2a$') && !stringified.includes('$2b$'));

    // =========================================================================
    // 4. Search filter
    // =========================================================================
    console.log('\n--- 4. Search Filter ---');

    const searchRes = await fetch(`${BASE_URL}/admin/users?search=Priya`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const searchJson = await searchRes.json();
    const searchUsers = searchJson.data?.users || [];

    logTest(
      'Filter',
      'search=Priya returns only matching users',
      searchRes.status === 200 && searchUsers.every((u) => u.fullName.toLowerCase().includes('priya') || u.email.toLowerCase().includes('priya')),
      `Returned: ${searchUsers.length}`
    );

    const emailSearchRes = await fetch(`${BASE_URL}/admin/users?search=apollohospitals`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const emailSearchJson = await emailSearchRes.json();
    const emailUsers = emailSearchJson.data?.users || [];

    logTest(
      'Filter',
      'search=apollohospitals returns staff email matches',
      emailSearchRes.status === 200 && emailUsers.length > 0 &&
        emailUsers.every((u) => u.email.includes('apollohospitals')),
      `Matched: ${emailUsers.length}`
    );

    const noMatchRes = await fetch(`${BASE_URL}/admin/users?search=zzz_no_match_xyz`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const noMatchJson = await noMatchRes.json();
    logTest(
      'Filter',
      'search with no match returns empty array',
      noMatchRes.status === 200 && (noMatchJson.data?.users || []).length === 0
    );

    // =========================================================================
    // 5. Role filter
    // =========================================================================
    console.log('\n--- 5. Role Filter ---');

    const [[{ dbDoctors }]] = await pool.query("SELECT COUNT(*) AS dbDoctors FROM users WHERE role = 'DOCTOR';");
    const roleRes = await fetch(`${BASE_URL}/admin/users?role=DOCTOR`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const roleJson = await roleRes.json();
    const roleUsers = roleJson.data?.users || [];

    logTest(
      'Filter',
      'role=DOCTOR returns only doctors',
      roleRes.status === 200 && roleUsers.every((u) => u.role === 'DOCTOR'),
      `Returned: ${roleUsers.length}`
    );
    logTest(
      'Filter',
      'role=DOCTOR count matches DB',
      roleUsers.length === Number(dbDoctors),
      `API: ${roleUsers.length}, DB: ${dbDoctors}`
    );

    // =========================================================================
    // 6. Status filter
    // =========================================================================
    console.log('\n--- 6. Status Filter ---');

    const [[{ dbActive }]] = await pool.query("SELECT COUNT(*) AS dbActive FROM users WHERE status = 'ACTIVE';");
    const statusRes = await fetch(`${BASE_URL}/admin/users?status=ACTIVE`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const statusJson = await statusRes.json();
    const statusUsers = statusJson.data?.users || [];

    logTest(
      'Filter',
      'status=ACTIVE returns only active users',
      statusRes.status === 200 && statusUsers.every((u) => u.status === 'ACTIVE'),
      `Returned: ${statusUsers.length}`
    );
    logTest(
      'Filter',
      'status=ACTIVE count matches DB',
      statusUsers.length === Number(dbActive),
      `API: ${statusUsers.length}, DB: ${dbActive}`
    );

    // =========================================================================
    // 7. RBAC — PATCH /api/admin/users/:id/status
    // =========================================================================
    console.log('\n--- 7. RBAC — PATCH /api/admin/users/:id/status ---');

    const unauthPatchRes = await fetch(`${BASE_URL}/admin/users/5/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'INACTIVE' }),
    });
    logTest('RBAC', 'Unauthenticated PATCH → 401', unauthPatchRes.status === 401, `Status: ${unauthPatchRes.status}`);

    const patPatchRes = await fetch(`${BASE_URL}/admin/users/5/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${patToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'INACTIVE' }),
    });
    logTest('RBAC', 'PATIENT PATCH → 403', patPatchRes.status === 403, `Status: ${patPatchRes.status}`);

    // =========================================================================
    // 8. Status update — success + DB persistence
    // =========================================================================
    console.log('\n--- 8. Status Update & DB Persistence ---');

    // Deactivate patient user 5 (rahul.verma)
    const deactivateRes = await fetch(`${BASE_URL}/admin/users/5/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'INACTIVE' }),
    });
    const deactivateJson = await deactivateRes.json();
    toRestore.push({ id: 5, status: 'ACTIVE' });

    logTest(
      'StatusUpdate',
      'Deactivate user 5 (ACTIVE → INACTIVE) returns 200',
      deactivateRes.status === 200 && deactivateJson.success,
      `Status: ${deactivateRes.status}`
    );
    logTest(
      'StatusUpdate',
      'Response contains previousStatus=ACTIVE and newStatus=INACTIVE',
      deactivateJson.data?.previousStatus === 'ACTIVE' && deactivateJson.data?.newStatus === 'INACTIVE'
    );

    // Verify DB persistence
    const [[dbRow]] = await pool.query('SELECT status FROM users WHERE id = 5;');
    logTest(
      'StatusUpdate',
      'DB confirms status is now INACTIVE',
      dbRow?.status === 'INACTIVE',
      `DB status: ${dbRow?.status}`
    );

    // =========================================================================
    // 9. Inactive user loses API access
    // =========================================================================
    console.log('\n--- 9. Inactive User Access Rejection ---');

    // Rahul's existing token should now be rejected because his account is INACTIVE
    const inactiveRes = await fetch(`${BASE_URL}/patients/profile`, {
      headers: { Authorization: `Bearer ${patToken}` },
    });
    logTest(
      'Security',
      'Inactive user token rejected by authenticate middleware → 403',
      inactiveRes.status === 403,
      `Status: ${inactiveRes.status}`
    );

    // =========================================================================
    // 10. Re-activate + verify access restored
    // =========================================================================
    console.log('\n--- 10. Re-activate User ---');

    const reactivateRes = await fetch(`${BASE_URL}/admin/users/5/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'ACTIVE' }),
    });
    const reactivateJson = await reactivateRes.json();
    toRestore.shift(); // cleared

    logTest(
      'StatusUpdate',
      'Re-activate user 5 (INACTIVE → ACTIVE) returns 200',
      reactivateRes.status === 200 && reactivateJson.data?.newStatus === 'ACTIVE',
      `Status: ${reactivateRes.status}`
    );

    const [[dbRowAfter]] = await pool.query('SELECT status FROM users WHERE id = 5;');
    logTest(
      'StatusUpdate',
      'DB confirms status restored to ACTIVE',
      dbRowAfter?.status === 'ACTIVE',
      `DB status: ${dbRowAfter?.status}`
    );

    // =========================================================================
    // 11. Last-active admin lockout protection
    // =========================================================================
    console.log('\n--- 11. Admin Lockout Protection ---');

    // Count active admins; seed has exactly 1 (Manoj Kumar, id=11)
    const lockoutRes = await fetch(`${BASE_URL}/admin/users/11/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'INACTIVE' }),
    });
    const lockoutJson = await lockoutRes.json();

    logTest(
      'Security',
      'Deactivating last active admin returns 409 Conflict',
      lockoutRes.status === 409,
      `Status: ${lockoutRes.status}`
    );
    logTest(
      'Security',
      'Lockout error message is informative',
      typeof lockoutJson.message === 'string' && lockoutJson.message.toLowerCase().includes('last active'),
      `Message: ${lockoutJson.message}`
    );

    // Confirm DB unchanged
    const [[adminDbRow]] = await pool.query('SELECT status FROM users WHERE id = 11;');
    logTest(
      'Security',
      'Admin DB status unchanged after blocked lockout attempt',
      adminDbRow?.status === 'ACTIVE',
      `DB status: ${adminDbRow?.status}`
    );

    // =========================================================================
    // 12. Validation — bad status value
    // =========================================================================
    console.log('\n--- 12. Input Validation ---');

    const badStatusRes = await fetch(`${BASE_URL}/admin/users/5/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'BANANA' }),
    });
    logTest('Validation', 'Invalid status value → 400', badStatusRes.status === 400, `Status: ${badStatusRes.status}`);

    const missingStatusRes = await fetch(`${BASE_URL}/admin/users/5/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    logTest('Validation', 'Missing status body → 400', missingStatusRes.status === 400, `Status: ${missingStatusRes.status}`);

    const notFoundRes = await fetch(`${BASE_URL}/admin/users/999999/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'INACTIVE' }),
    });
    logTest('Validation', 'Non-existent user → 404', notFoundRes.status === 404, `Status: ${notFoundRes.status}`);

    // =========================================================================
    // 13. Combined search + role filter
    // =========================================================================
    console.log('\n--- 13. Combined Filter Correctness ---');

    const combinedRes = await fetch(`${BASE_URL}/admin/users?role=DOCTOR&status=ACTIVE`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const combinedJson = await combinedRes.json();
    const combinedUsers = combinedJson.data?.users || [];

    logTest(
      'Filter',
      'role=DOCTOR&status=ACTIVE returns only active doctors',
      combinedRes.status === 200 &&
        combinedUsers.every((u) => u.role === 'DOCTOR' && u.status === 'ACTIVE'),
      `Count: ${combinedUsers.length}`
    );

    // =========================================================================
    // 14. Doctor profile data included
    // =========================================================================
    console.log('\n--- 14. Linked Profile Data ---');

    const doctorUsers = users.filter((u) => u.role === 'DOCTOR');
    logTest(
      'Integrity',
      'DOCTOR users include specialization + department in profile',
      doctorUsers.length > 0 &&
        doctorUsers.every((u) => u.profile?.specialization && u.profile?.department),
      `Doctors with profile: ${doctorUsers.filter((u) => u.profile?.specialization).length}/${doctorUsers.length}`
    );

    const patientUsers = users.filter((u) => u.role === 'PATIENT');
    logTest(
      'Integrity',
      'PATIENT users include gender + city in profile',
      patientUsers.length > 0 &&
        patientUsers.every((u) => u.profile?.gender && u.profile?.city),
      `Patients with profile: ${patientUsers.filter((u) => u.profile?.gender).length}/${patientUsers.length}`
    );

  } catch (err) {
    console.error('\n[UNEXPECTED ERROR]:', err);
  } finally {
    // Restore any users deactivated during tests
    for (const { id, status } of toRestore) {
      await pool.query('UPDATE users SET status = ? WHERE id = ?;', [status, id]).catch(() => {});
    }

    await stopTestServer();
  }

  // =========================================================================
  // Summary
  // =========================================================================
  console.log('\n============================================================');
  console.log('Test Summary: Phase 7B Admin User Management');
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
    console.log('\nAll Admin User Management checks PASSED successfully.\n');
    process.exit(0);
  }
}

runTests();
