import { pool } from '../config/db.js';
import app from '../app.js';

let server;
const PORT = 5082;
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
      console.log(`[Admin Billing & Resources Test Server] Running on port ${PORT}`);
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
  console.log('MedLink Care: Phase 7C Admin Billing, Insurance & Resources');
  console.log('============================================================\n');

  await startTestServer();

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

    console.log('\n--- 1. RBAC Tests ---');
    // Invoices listing RBAC
    const unauthInv = await fetch(`${BASE_URL}/admin/invoices`);
    logTest('RBAC', 'Unauthenticated invoices listing → 401', unauthInv.status === 401, `Status: ${unauthInv.status}`);

    const docInv = await fetch(`${BASE_URL}/admin/invoices`, {
      headers: { Authorization: `Bearer ${docToken}` },
    });
    logTest('RBAC', 'Doctor invoices listing → 403', docInv.status === 403, `Status: ${docInv.status}`);

    const patInv = await fetch(`${BASE_URL}/admin/invoices`, {
      headers: { Authorization: `Bearer ${patToken}` },
    });
    logTest('RBAC', 'Patient invoices listing → 403', patInv.status === 403, `Status: ${patInv.status}`);

    const adminInv = await fetch(`${BASE_URL}/admin/invoices`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    logTest('RBAC', 'Admin invoices listing → 200', adminInv.status === 200, `Status: ${adminInv.status}`);

    // Resources listing RBAC
    const unauthRes = await fetch(`${BASE_URL}/admin/resources`);
    logTest('RBAC', 'Unauthenticated resources listing → 401', unauthRes.status === 401, `Status: ${unauthRes.status}`);

    const docRes = await fetch(`${BASE_URL}/admin/resources`, {
      headers: { Authorization: `Bearer ${docToken}` },
    });
    logTest('RBAC', 'Doctor resources listing → 403', docRes.status === 403, `Status: ${docRes.status}`);

    const patRes = await fetch(`${BASE_URL}/admin/resources`, {
      headers: { Authorization: `Bearer ${patToken}` },
    });
    logTest('RBAC', 'Patient resources listing → 403', patRes.status === 403, `Status: ${patRes.status}`);

    const adminRes = await fetch(`${BASE_URL}/admin/resources`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    logTest('RBAC', 'Admin resources listing → 200', adminRes.status === 200, `Status: ${adminRes.status}`);

    // Status update RBAC
    const unauthPatch = await fetch(`${BASE_URL}/admin/invoices/1/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentStatus: 'PAID' }),
    });
    logTest('RBAC', 'Unauthenticated invoice status update → 401', unauthPatch.status === 401, `Status: ${unauthPatch.status}`);

    const docPatch = await fetch(`${BASE_URL}/admin/invoices/1/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${docToken}` },
      body: JSON.stringify({ paymentStatus: 'PAID' }),
    });
    logTest('RBAC', 'Doctor invoice status update → 403', docPatch.status === 403, `Status: ${docPatch.status}`);

    const patResourcePatch = await fetch(`${BASE_URL}/admin/resources/1/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${patToken}` },
      body: JSON.stringify({ status: 'AVAILABLE' }),
    });
    logTest('RBAC', 'Patient resource status update → 403', patResourcePatch.status === 403, `Status: ${patResourcePatch.status}`);

    console.log('\n--- 2. Invoice Listing & Filters ---');
    const invData = await adminInv.json();
    const invoices = invData.data?.invoices || [];
    const summary = invData.data?.summary;

    const [[dbInvCount]] = await pool.query('SELECT COUNT(*) AS c FROM invoices;');
    logTest('Invoices', 'Invoices list returned with summary', Array.isArray(invoices) && summary !== undefined);
    logTest('Invoices', 'Invoice count matches database', invoices.length === Number(dbInvCount.c), `Count: ${invoices.length}`);

    // Patient & Appointment metadata
    const sampleInv = invoices.find((i) => i.appointmentId !== null) || invoices[0];
    const hasPatientMeta = Boolean(sampleInv?.patient?.fullName && sampleInv?.patient?.email);
    logTest('Invoices', 'Includes patient metadata (fullName, email)', hasPatientMeta);

    const hasAppointmentMeta = Boolean(sampleInv?.appointment?.doctorName && sampleInv?.appointment?.department);
    logTest('Invoices', 'Includes appointment metadata (doctorName, department)', hasAppointmentMeta);

    // Search filter
    const searchRes = await fetch(`${BASE_URL}/admin/invoices?search=INV-2026-00101`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    }).then((r) => r.json());
    logTest(
      'Invoices',
      'Search by invoice_number returns exact match',
      searchRes.data?.invoices?.length === 1 && searchRes.data?.invoices[0]?.invoiceNumber === 'INV-2026-00101',
      `Found: ${searchRes.data?.invoices?.length}`
    );

    // Status filter
    const paidRes = await fetch(`${BASE_URL}/admin/invoices?status=PAID`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    }).then((r) => r.json());
    const [[dbPaidCount]] = await pool.query('SELECT COUNT(*) AS c FROM invoices WHERE payment_status = "PAID";');
    logTest(
      'Invoices',
      'Filter by status=PAID matches database',
      paidRes.data?.invoices?.length === Number(dbPaidCount.c) &&
        paidRes.data?.invoices?.every((i) => i.paymentStatus === 'PAID'),
      `API: ${paidRes.data?.invoices?.length}, DB: ${dbPaidCount.c}`
    );

    // Single invoice details
    const singleInvRes = await fetch(`${BASE_URL}/admin/invoices/1`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    }).then((r) => r.json());
    logTest(
      'Invoices',
      'GET /api/admin/invoices/:id returns single invoice details',
      singleInvRes.status === 200 || singleInvRes.success === true,
      `Invoice: ${singleInvRes.data?.invoice?.invoiceNumber}`
    );

    console.log('\n--- 3. Insurance Functionality & Persistence ---');
    // Fetch initial DB state of invoice 4
    const [[initialInv4]] = await pool.query('SELECT * FROM invoices WHERE id = 4;');

    // Update invoice 4: mark as PAID via INSURANCE
    const patchInvRes = await fetch(`${BASE_URL}/admin/invoices/4/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ paymentStatus: 'PAID', paymentMethod: 'INSURANCE' }),
    });
    const patchInvData = await patchInvRes.json();
    logTest(
      'Insurance',
      'Update invoice status to PAID with paymentMethod=INSURANCE returns 200',
      patchInvRes.status === 200,
      `Status: ${patchInvRes.status}`
    );
    logTest(
      'Insurance',
      'Response confirms paymentStatus=PAID and paymentMethod=INSURANCE',
      patchInvData.data?.invoice?.paymentStatus === 'PAID' &&
        patchInvData.data?.invoice?.paymentMethod === 'INSURANCE' &&
        patchInvData.data?.invoice?.paidAt !== null
    );

    // Verify directly in MySQL
    const [[dbInv4After]] = await pool.query('SELECT * FROM invoices WHERE id = 4;');
    logTest(
      'Insurance',
      'MySQL confirms payment_status=PAID and payment_method=INSURANCE',
      dbInv4After.payment_status === 'PAID' &&
        dbInv4After.payment_method === 'INSURANCE' &&
        dbInv4After.paid_at !== null
    );

    // Filter by paymentMethod=INSURANCE
    const insFilterRes = await fetch(`${BASE_URL}/admin/invoices?paymentMethod=INSURANCE`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    }).then((r) => r.json());
    logTest(
      'Insurance',
      'Filter by paymentMethod=INSURANCE returns insurance invoices',
      insFilterRes.data?.invoices?.length >= 1 &&
        insFilterRes.data?.invoices?.some((i) => i.id === 4 && i.paymentMethod === 'INSURANCE')
    );

    // Summary includes insurance count and revenue
    logTest(
      'Insurance',
      'Summary reflects insurance metrics',
      typeof insFilterRes.data?.summary?.insuranceCount === 'number' &&
        insFilterRes.data?.summary?.insuranceCount >= 1
    );

    // Restore invoice 4 to initial state
    await fetch(`${BASE_URL}/admin/invoices/4/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        paymentStatus: initialInv4.payment_status,
        paymentMethod: initialInv4.payment_method,
      }),
    });
    const [[dbInv4Restored]] = await pool.query('SELECT * FROM invoices WHERE id = 4;');
    logTest(
      'Invoices',
      'Invoice 4 restored to original status in MySQL',
      dbInv4Restored.payment_status === initialInv4.payment_status &&
        dbInv4Restored.paid_at === null
    );

    console.log('\n--- 4. Resource Listing & Filters ---');
    const resData = await adminRes.json();
    const resources = resData.data?.resources || [];
    const resSummary = resData.data?.summary;

    const [[dbResCount]] = await pool.query('SELECT COUNT(*) AS c FROM resources;');
    logTest('Resources', 'Resources list returned with summary', Array.isArray(resources) && resSummary !== undefined);
    logTest('Resources', 'Resource count matches database', resources.length === Number(dbResCount.c), `Count: ${resources.length}`);

    // Filter by resource type
    const icuRes = await fetch(`${BASE_URL}/admin/resources?type=ICU_BED`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    }).then((r) => r.json());
    const [[dbIcuCount]] = await pool.query('SELECT COUNT(*) AS c FROM resources WHERE resource_type = "ICU_BED";');
    logTest(
      'Resources',
      'Filter by type=ICU_BED matches database count',
      icuRes.data?.resources?.length === Number(dbIcuCount.c),
      `API: ${icuRes.data?.resources?.length}, DB: ${dbIcuCount.c}`
    );

    // Filter by resource status
    const availRes = await fetch(`${BASE_URL}/admin/resources?status=AVAILABLE`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    }).then((r) => r.json());
    const [[dbAvailCount]] = await pool.query('SELECT COUNT(*) AS c FROM resources WHERE status = "AVAILABLE";');
    logTest(
      'Resources',
      'Filter by status=AVAILABLE matches database count',
      availRes.data?.resources?.length === Number(dbAvailCount.c),
      `API: ${availRes.data?.resources?.length}, DB: ${dbAvailCount.c}`
    );

    console.log('\n--- 5. Resource Status Update, State Transition & Persistence ---');
    // Fetch initial state of resource 2 (AP-BLR-ICU-02, initially AVAILABLE)
    const [[initialRes2]] = await pool.query('SELECT * FROM resources WHERE id = 2;');

    // Transition 1: Allocate patient to resource (AVAILABLE -> OCCUPIED)
    const patchResOccupied = await fetch(`${BASE_URL}/admin/resources/2/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ status: 'OCCUPIED', allocatedPatientId: 1 }),
    });
    const patchResOccData = await patchResOccupied.json();
    logTest(
      'Resources',
      'Transition AVAILABLE → OCCUPIED with allocatedPatientId=1 returns 200',
      patchResOccupied.status === 200
    );
    logTest(
      'Resources',
      'Response includes allocated patient metadata',
      patchResOccData.data?.resource?.status === 'OCCUPIED' &&
        patchResOccData.data?.resource?.allocatedPatient?.fullName !== undefined
    );

    // Verify in DB
    const [[dbRes2Occupied]] = await pool.query('SELECT * FROM resources WHERE id = 2;');
    logTest(
      'Resources',
      'MySQL confirms resource 2 status=OCCUPIED and allocated_patient_id=1',
      dbRes2Occupied.status === 'OCCUPIED' && Number(dbRes2Occupied.allocated_patient_id) === 1
    );

    // Transition 2: Discharge / Release (OCCUPIED -> AVAILABLE)
    // Business rule / state integrity: setting to AVAILABLE must clear allocated_patient_id to NULL
    const patchResAvail = await fetch(`${BASE_URL}/admin/resources/2/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ status: 'AVAILABLE' }),
    });
    const patchResAvailData = await patchResAvail.json();
    logTest(
      'Resources',
      'Transition OCCUPIED → AVAILABLE returns 200',
      patchResAvail.status === 200
    );
    logTest(
      'Resources',
      'allocatedPatient automatically cleared when status is AVAILABLE',
      patchResAvailData.data?.resource?.status === 'AVAILABLE' &&
        patchResAvailData.data?.resource?.allocatedPatientId === null
    );

    // Verify in DB
    const [[dbRes2Avail]] = await pool.query('SELECT * FROM resources WHERE id = 2;');
    logTest(
      'Resources',
      'MySQL confirms resource 2 status=AVAILABLE and allocated_patient_id IS NULL',
      dbRes2Avail.status === 'AVAILABLE' && dbRes2Avail.allocated_patient_id === null
    );

    // Restore resource 2 if needed
    if (initialRes2.status !== 'AVAILABLE' || initialRes2.allocated_patient_id !== null) {
      await pool.query('UPDATE resources SET status = ?, allocated_patient_id = ? WHERE id = 2;', [
        initialRes2.status,
        initialRes2.allocated_patient_id,
      ]);
    }

    console.log('\n--- 6. Invalid Input Validation ---');
    // Invalid invoice ID
    const badInvId = await fetch(`${BASE_URL}/admin/invoices/999999/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ paymentStatus: 'PAID' }),
    });
    logTest('Validation', 'Non-existent invoice ID → 404', badInvId.status === 404, `Status: ${badInvId.status}`);

    const malformedInvId = await fetch(`${BASE_URL}/admin/invoices/abc/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ paymentStatus: 'PAID' }),
    });
    logTest('Validation', 'Malformed invoice ID parameter → 400', malformedInvId.status === 400, `Status: ${malformedInvId.status}`);

    // Invalid invoice status value
    const badInvStatus = await fetch(`${BASE_URL}/admin/invoices/1/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ paymentStatus: 'INVALID_STATUS_XYZ' }),
    });
    logTest('Validation', 'Invalid invoice paymentStatus value → 400', badInvStatus.status === 400, `Status: ${badInvStatus.status}`);

    // Invalid payment method value
    const badInvMethod = await fetch(`${BASE_URL}/admin/invoices/1/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ paymentStatus: 'PAID', paymentMethod: 'CRYPTO_COIN' }),
    });
    logTest('Validation', 'Invalid paymentMethod value → 400', badInvMethod.status === 400, `Status: ${badInvMethod.status}`);

    // Invalid resource ID
    const badResId = await fetch(`${BASE_URL}/admin/resources/999999/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ status: 'AVAILABLE' }),
    });
    logTest('Validation', 'Non-existent resource ID → 404', badResId.status === 404, `Status: ${badResId.status}`);

    // Invalid resource status value
    const badResStatus = await fetch(`${BASE_URL}/admin/resources/1/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ status: 'BROKEN_BEYOND_REPAIR' }),
    });
    logTest('Validation', 'Invalid resource status value → 400', badResStatus.status === 400, `Status: ${badResStatus.status}`);

    // Allocating non-existent patient to resource
    const badResPatient = await fetch(`${BASE_URL}/admin/resources/1/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ status: 'OCCUPIED', allocatedPatientId: 999999 }),
    });
    logTest(
      'Validation',
      'Allocating non-existent patient ID to resource → 400',
      badResPatient.status === 400,
      `Status: ${badResPatient.status}`
    );

    console.log('\n--- 7. Sensitive Field Exclusion ---');
    const invJsonStr = JSON.stringify(invData);
    const hasPasswordHashInv = invJsonStr.includes('password_hash') || invJsonStr.includes('passwordHash');
    const hasBcryptInv = /\$2[aby]\$\d+\$/.test(invJsonStr);
    logTest('Security', 'Invoices API excludes password_hash', !hasPasswordHashInv);
    logTest('Security', 'Invoices API excludes bcrypt hashes', !hasBcryptInv);

    const resJsonStr = JSON.stringify(resData);
    const hasPasswordHashRes = resJsonStr.includes('password_hash') || resJsonStr.includes('passwordHash');
    logTest('Security', 'Resources API excludes password_hash', !hasPasswordHashRes);

    console.log('\n--- 8. DB Consistency Invariants ---');
    const [[finalInvCount]] = await pool.query('SELECT COUNT(*) AS c FROM invoices;');
    const [[finalResCount]] = await pool.query('SELECT COUNT(*) AS c FROM resources;');
    logTest(
      'Consistency',
      'Total invoice count preserved after test execution',
      Number(finalInvCount.c) === Number(dbInvCount.c),
      `Initial: ${dbInvCount.c}, Final: ${finalInvCount.c}`
    );
    logTest(
      'Consistency',
      'Total resource count preserved after test execution',
      Number(finalResCount.c) === Number(dbResCount.c),
      `Initial: ${dbResCount.c}, Final: ${finalResCount.c}`
    );

  } finally {
    await stopTestServer();
  }

  // Summary
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log('\n============================================================');
  console.log('Test Summary: Phase 7C Admin Billing, Insurance & Resources');
  console.log('============================================================');
  console.log(`Total Checks : ${results.length}`);
  console.log(`Passed       : ${passed}`);
  console.log(`Failed       : ${failed}\n`);

  if (failed > 0) {
    console.error(`FAILED: ${failed} test(s) failed.`);
    process.exit(1);
  } else {
    console.log('All Admin Billing, Insurance & Resources checks PASSED successfully.\n');
  }
}

runTests().catch((err) => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});
