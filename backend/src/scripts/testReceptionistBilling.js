import { pool } from '../config/db.js';
import app from '../app.js';

let server;
const PORT = 5086;
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
      console.log(`[Billing Test Server] Running on port ${PORT}`);
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
  console.log('MedLink Care: Phase 7D-3 Receptionist Billing Test Suite');
  console.log('============================================================\n');

  await startTestServer();

  // Track created resources for cleanup
  const createdInvoiceIds = [];

  try {
    // -------------------------------------------------------------------------
    // 1. Obtain role tokens
    // -------------------------------------------------------------------------
    const [receptionistToken, patientToken, doctorToken, adminToken] = await Promise.all([
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

      fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin.manoj@apollohospitals.com', password: 'Password123!' }),
      }).then((r) => r.json()).then((d) => d.data?.token),
    ]);

    logTest('Auth Setup', 'Receptionist token obtained', Boolean(receptionistToken));
    logTest('Auth Setup', 'Patient token obtained', Boolean(patientToken));
    logTest('Auth Setup', 'Doctor token obtained', Boolean(doctorToken));
    logTest('Auth Setup', 'Admin token obtained', Boolean(adminToken));

    // -------------------------------------------------------------------------
    // 2. Invoice data in appointment listing
    // -------------------------------------------------------------------------
    const apptListRes = await fetch(`${BASE_URL}/receptionist/appointments`, {
      headers: { Authorization: `Bearer ${receptionistToken}` },
    });
    const apptListData = await apptListRes.json();
    const appointments = apptListData.data?.appointments || [];

    logTest(
      'Invoice in Appointments',
      'GET /receptionist/appointments returns 200',
      apptListRes.status === 200,
      `HTTP ${apptListRes.status}`
    );

    // Appointments list should have invoice field (null or object)
    const allHaveInvoiceField = appointments.every(
      (a) => 'invoice' in a
    );
    logTest(
      'Invoice in Appointments',
      'Every appointment object has an "invoice" field (null or object)',
      allHaveInvoiceField,
      `Appointments checked: ${appointments.length}`
    );

    // Find an appointment with a seeded invoice (appointment_id 1, 2, 3, 4 from seed)
    // Fetch with a broad date range to find seeded data
    const historicRes = await fetch(`${BASE_URL}/receptionist/appointments?date=2026-09-10`, {
      headers: { Authorization: `Bearer ${receptionistToken}` },
    });
    const historicData = await historicRes.json();
    const historicAppts = historicData.data?.appointments || [];

    const apptWithInvoice = historicAppts.find((a) => a.invoice !== null);

    logTest(
      'Invoice in Appointments',
      'Appointment with seeded invoice has invoice sub-object',
      Boolean(apptWithInvoice),
      `Seeded appointments on 2026-09-10: ${historicAppts.length}, with invoice: ${apptWithInvoice ? 1 : 0}`
    );

    if (apptWithInvoice) {
      const inv = apptWithInvoice.invoice;
      const hasRequiredFields =
        'id' in inv &&
        'invoiceNumber' in inv &&
        'totalAmount' in inv &&
        'paymentStatus' in inv &&
        'paymentMethod' in inv &&
        'issueDate' in inv &&
        'paidAt' in inv;

      logTest(
        'Invoice in Appointments',
        'Invoice sub-object has all required fields (id, invoiceNumber, totalAmount, paymentStatus, paymentMethod, issueDate, paidAt)',
        hasRequiredFields,
        `Invoice #${inv.invoiceNumber}, Status: ${inv.paymentStatus}, Amount: ${inv.totalAmount}`
      );

      // Ensure no admin financial summary leaked into appointment payload
      const rawStr = JSON.stringify(apptWithInvoice);
      const noRevenueLeak =
        !rawStr.includes('totalRevenue') &&
        !rawStr.includes('paidRevenue') &&
        !rawStr.includes('pendingRevenue') &&
        !rawStr.includes('insuranceRevenue') &&
        !rawStr.includes('summary');

      logTest(
        'Security',
        'No admin revenue summary fields leaked in appointment invoice payload',
        noRevenueLeak
      );
    }

    // Ensure no password_hash in payload
    const noPasswordHash = !JSON.stringify(apptListData).includes('password_hash');
    logTest('Security', 'password_hash excluded from appointment+invoice payload', noPasswordHash);

    // -------------------------------------------------------------------------
    // 3. RBAC for PATCH /receptionist/invoices/:id/payment
    // -------------------------------------------------------------------------

    // 3a. Unauthenticated → 401
    const unauthRes = await fetch(`${BASE_URL}/receptionist/invoices/4/payment`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentStatus: 'PAID', paymentMethod: 'CASH' }),
    });
    logTest(
      'RBAC',
      'Unauthenticated PATCH /receptionist/invoices/:id/payment → 401',
      unauthRes.status === 401,
      `HTTP ${unauthRes.status}`
    );

    // 3b. PATIENT token → 403
    const patientRes = await fetch(`${BASE_URL}/receptionist/invoices/4/payment`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${patientToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ paymentStatus: 'PAID', paymentMethod: 'CASH' }),
    });
    logTest(
      'RBAC',
      'PATIENT token → 403 Forbidden',
      patientRes.status === 403,
      `HTTP ${patientRes.status}`
    );

    // 3c. DOCTOR token → 403
    const doctorRes = await fetch(`${BASE_URL}/receptionist/invoices/4/payment`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${doctorToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ paymentStatus: 'PAID', paymentMethod: 'CASH' }),
    });
    logTest(
      'RBAC',
      'DOCTOR token → 403 Forbidden',
      doctorRes.status === 403,
      `HTTP ${doctorRes.status}`
    );

    // 3d. ADMIN token → 403 (admin must use /admin/invoices/:id/status, not receptionist route)
    const adminRes = await fetch(`${BASE_URL}/receptionist/invoices/4/payment`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ paymentStatus: 'PAID', paymentMethod: 'CASH' }),
    });
    logTest(
      'RBAC',
      'ADMIN token on receptionist route → 403 Forbidden',
      adminRes.status === 403,
      `HTTP ${adminRes.status}`
    );

    // -------------------------------------------------------------------------
    // 4. Seed a fresh PENDING invoice for manipulation tests
    // -------------------------------------------------------------------------
    // Find an appointment to attach invoice to
    const [[aptRow]] = await pool.query(
      'SELECT id, patient_id FROM appointments LIMIT 1;'
    );

    const testStamp = Date.now();
    const invNumber = `INV-TEST-${testStamp}`;

    const [insertResult] = await pool.query(
      `INSERT INTO invoices
         (invoice_number, patient_id, appointment_id, consultation_fee, total_amount, currency, payment_status, issue_date)
       VALUES (?, ?, ?, 500.00, 500.00, 'INR', 'PENDING', CURDATE());`,
      [invNumber, aptRow.patient_id, aptRow.id]
    );
    const testInvoiceId = insertResult.insertId;
    createdInvoiceIds.push(testInvoiceId);

    logTest(
      'Test Setup',
      'Test PENDING invoice seeded in DB',
      testInvoiceId > 0,
      `Invoice ID: ${testInvoiceId}, #${invNumber}`
    );

    // -------------------------------------------------------------------------
    // 5. RECEPTIONIST success — mark PAID with CASH
    // -------------------------------------------------------------------------
    const paidRes = await fetch(`${BASE_URL}/receptionist/invoices/${testInvoiceId}/payment`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${receptionistToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ paymentStatus: 'PAID', paymentMethod: 'CASH' }),
    });
    const paidData = await paidRes.json();

    logTest(
      'Payment Update',
      'RECEPTIONIST can mark invoice PAID with CASH (HTTP 200)',
      paidRes.status === 200 && paidData.data?.invoice?.paymentStatus === 'PAID',
      `Status: ${paidData.data?.invoice?.paymentStatus}, Method: ${paidData.data?.invoice?.paymentMethod}`
    );

    // Verify persistence in DB
    const [[dbRow]] = await pool.query(
      'SELECT payment_status, payment_method, paid_at FROM invoices WHERE id = ?;',
      [testInvoiceId]
    );
    logTest(
      'Payment Update',
      'Payment status persisted correctly in DB',
      dbRow.payment_status === 'PAID' && dbRow.payment_method === 'CASH' && dbRow.paid_at !== null,
      `DB status: ${dbRow.payment_status}, method: ${dbRow.payment_method}, paid_at: ${dbRow.paid_at ? 'set' : 'null'}`
    );

    // Verify paid_at is automatically set
    logTest(
      'Payment Update',
      'paid_at is automatically set when marking PAID',
      dbRow.paid_at !== null
    );

    // Ensure no admin revenue summary in response
    const paidStr = JSON.stringify(paidData);
    const noAdminLeak =
      !paidStr.includes('totalRevenue') &&
      !paidStr.includes('paidRevenue') &&
      !paidStr.includes('pendingRevenue') &&
      !paidStr.includes('insuranceRevenue') &&
      !paidStr.includes('summary') &&
      !paidStr.includes('consultationFee') &&
      !paidStr.includes('procedureFee') &&
      !paidStr.includes('medicineFee') &&
      !paidStr.includes('taxAmount');

    logTest(
      'Security',
      'Admin-only financial summary/detail fields NOT exposed in receptionist payment response',
      noAdminLeak
    );

    // -------------------------------------------------------------------------
    // 6. Reset to PENDING
    // -------------------------------------------------------------------------
    const pendingRes = await fetch(`${BASE_URL}/receptionist/invoices/${testInvoiceId}/payment`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${receptionistToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ paymentStatus: 'PENDING' }),
    });
    const pendingData = await pendingRes.json();

    logTest(
      'Payment Update',
      'RECEPTIONIST can reset invoice to PENDING (HTTP 200)',
      pendingRes.status === 200 && pendingData.data?.invoice?.paymentStatus === 'PENDING',
      `Status: ${pendingData.data?.invoice?.paymentStatus}`
    );

    const [[dbAfterReset]] = await pool.query(
      'SELECT payment_status, paid_at FROM invoices WHERE id = ?;',
      [testInvoiceId]
    );
    logTest(
      'Payment Update',
      'paid_at is cleared when resetting to PENDING',
      dbAfterReset.paid_at === null,
      `paid_at: ${dbAfterReset.paid_at}`
    );

    // -------------------------------------------------------------------------
    // 7. Invalid paymentStatus values — admin-only statuses blocked
    // -------------------------------------------------------------------------
    const adminStatuses = ['CANCELLED', 'REFUNDED', 'PARTIALLY_PAID'];
    for (const badStatus of adminStatuses) {
      const badRes = await fetch(`${BASE_URL}/receptionist/invoices/${testInvoiceId}/payment`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${receptionistToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ paymentStatus: badStatus }),
      });
      logTest(
        'Validation',
        `Admin-only status "${badStatus}" rejected with 400`,
        badRes.status === 400,
        `HTTP ${badRes.status}`
      );
    }

    // Completely invalid status
    const garbageStatusRes = await fetch(`${BASE_URL}/receptionist/invoices/${testInvoiceId}/payment`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${receptionistToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ paymentStatus: 'INVALID_STATUS' }),
    });
    logTest(
      'Validation',
      'Completely invalid paymentStatus rejected with 400',
      garbageStatusRes.status === 400,
      `HTTP ${garbageStatusRes.status}`
    );

    // Missing paymentStatus field
    const missingStatusRes = await fetch(`${BASE_URL}/receptionist/invoices/${testInvoiceId}/payment`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${receptionistToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ paymentMethod: 'CASH' }),
    });
    logTest(
      'Validation',
      'Missing paymentStatus field rejected with 400',
      missingStatusRes.status === 400,
      `HTTP ${missingStatusRes.status}`
    );

    // -------------------------------------------------------------------------
    // 8. Invalid paymentMethod
    // -------------------------------------------------------------------------
    const badMethodRes = await fetch(`${BASE_URL}/receptionist/invoices/${testInvoiceId}/payment`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${receptionistToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ paymentStatus: 'PAID', paymentMethod: 'BITCOIN' }),
    });
    logTest(
      'Validation',
      'Invalid paymentMethod "BITCOIN" rejected with 400',
      badMethodRes.status === 400,
      `HTTP ${badMethodRes.status}`
    );

    // -------------------------------------------------------------------------
    // 9. Non-existent invoice → 404
    // -------------------------------------------------------------------------
    const notFoundRes = await fetch(`${BASE_URL}/receptionist/invoices/999999/payment`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${receptionistToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ paymentStatus: 'PAID', paymentMethod: 'UPI' }),
    });
    logTest(
      'Validation',
      'Non-existent invoice ID returns 404',
      notFoundRes.status === 404,
      `HTTP ${notFoundRes.status}`
    );

    // -------------------------------------------------------------------------
    // 10. Invalid invoice ID param → 400
    // -------------------------------------------------------------------------
    const badIdRes = await fetch(`${BASE_URL}/receptionist/invoices/0/payment`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${receptionistToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ paymentStatus: 'PAID', paymentMethod: 'UPI' }),
    });
    logTest(
      'Validation',
      'Invoice ID 0 (invalid) returns 400',
      badIdRes.status === 400,
      `HTTP ${badIdRes.status}`
    );

    // -------------------------------------------------------------------------
    // 11. All valid payment methods accepted
    // -------------------------------------------------------------------------
    const validMethods = ['UPI', 'CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'NET_BANKING', 'INSURANCE'];
    let methodsAllPassed = true;
    for (const method of validMethods) {
      const methodRes = await fetch(`${BASE_URL}/receptionist/invoices/${testInvoiceId}/payment`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${receptionistToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ paymentStatus: 'PAID', paymentMethod: method }),
      });
      if (methodRes.status !== 200) {
        methodsAllPassed = false;
        logTest('Validation', `Payment method ${method} accepted`, false, `HTTP ${methodRes.status}`);
      }
    }
    logTest(
      'Validation',
      'All valid payment methods (UPI, CASH, CREDIT_CARD, DEBIT_CARD, NET_BANKING, INSURANCE) accepted',
      methodsAllPassed
    );

    // -------------------------------------------------------------------------
    // 12. Admin route still only accessible by ADMIN (regression check)
    // -------------------------------------------------------------------------
    const recepOnAdminRouteRes = await fetch(`${BASE_URL}/admin/invoices`, {
      headers: { Authorization: `Bearer ${receptionistToken}` },
    });
    logTest(
      'Regression',
      'RECEPTIONIST cannot access GET /admin/invoices → 403',
      recepOnAdminRouteRes.status === 403,
      `HTTP ${recepOnAdminRouteRes.status}`
    );

    const recepOnAdminPatchRes = await fetch(`${BASE_URL}/admin/invoices/1/status`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${receptionistToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ paymentStatus: 'REFUNDED' }),
    });
    logTest(
      'Regression',
      'RECEPTIONIST cannot access PATCH /admin/invoices/:id/status → 403',
      recepOnAdminPatchRes.status === 403,
      `HTTP ${recepOnAdminPatchRes.status}`
    );

    // Admin can still use its own billing route
    const adminOwnRouteRes = await fetch(`${BASE_URL}/admin/invoices`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    logTest(
      'Regression',
      'ADMIN can still access GET /admin/invoices → 200',
      adminOwnRouteRes.status === 200,
      `HTTP ${adminOwnRouteRes.status}`
    );

    // Admin response still includes financial summary (not leaked to receptionist)
    const adminInvoiceData = await adminOwnRouteRes.json();
    const adminHasSummary = adminInvoiceData.data?.summary?.totalRevenue !== undefined;
    logTest(
      'Regression',
      'Admin billing response still contains financial summary (totalRevenue etc.)',
      adminHasSummary,
      `totalRevenue: ${adminInvoiceData.data?.summary?.totalRevenue}`
    );

    // -------------------------------------------------------------------------
    // 13. Existing receptionist suite regression check — appointments/patients still work
    // -------------------------------------------------------------------------
    const regApptRes = await fetch(`${BASE_URL}/receptionist/appointments`, {
      headers: { Authorization: `Bearer ${receptionistToken}` },
    });
    logTest(
      'Regression',
      'GET /receptionist/appointments still works (HTTP 200)',
      regApptRes.status === 200,
      `HTTP ${regApptRes.status}`
    );

    const regPatientRes = await fetch(`${BASE_URL}/receptionist/patients?search=Rahul`, {
      headers: { Authorization: `Bearer ${receptionistToken}` },
    });
    logTest(
      'Regression',
      'GET /receptionist/patients still works (HTTP 200)',
      regPatientRes.status === 200,
      `HTTP ${regPatientRes.status}`
    );

  } catch (err) {
    console.error('[Test Execution Error]:', err);
    logTest('Test Execution', 'Test suite execution error', false, err.message);
  } finally {
    // Cleanup: delete any test invoices created
    console.log('\n[Cleanup] Cleaning up test invoices...');
    try {
      if (createdInvoiceIds.length > 0) {
        await pool.query(
          `DELETE FROM invoices WHERE id IN (${createdInvoiceIds.map(() => '?').join(',')});`,
          createdInvoiceIds
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
    console.log(`Phase 7D-3 Receptionist Billing Results: ${passedTests}/${totalTests} Passed (${failedTests} Failed)`);
    console.log('============================================================\n');

    if (failedTests > 0) {
      process.exitCode = 1;
    }
  }
}

runTests();
