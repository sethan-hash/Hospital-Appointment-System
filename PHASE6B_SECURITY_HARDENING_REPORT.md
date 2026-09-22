# Phase 6B — Security Hardening Report

## Findings Fixed

- **F-01 (Critical — Hardcoded JWT Secret & In-Code Fallback)**:
  - Removed in-source fallback string `'medlink-care-jwt-secret-key-local-dev-2026'` in `backend/src/config/env.js`.
  - Added fail-fast assertion on process startup throwing `FATAL: JWT_SECRET environment variable is not set.` if `JWT_SECRET` is missing.
  - Runtime secret is sourced exclusively from environment variables.
  - Secret value is never logged or exposed in responses or console outputs.

- **F-03 (High — Missing Rate Limiting on Authentication Endpoints)**:
  - Integrated `express-rate-limit` middleware (`authRateLimiter`) in `backend/src/middleware/rateLimiter.js`.
  - Applied to `POST /api/auth/login` and `POST /api/auth/register` in `backend/src/routes/auth.routes.js`.
  - Set threshold of 50 attempts per 15-minute window per IP (configurable via `AUTH_RATE_LIMIT_MAX`), keeping limits reasonable for development/testing while blocking credential stuffing.
  - Returns Draft-6/Draft-7 `RateLimit-*` headers and HTTP 429 when exceeded.
  - Non-auth endpoints remain unthrottled.

- **F-04 (Medium — Missing Security Headers)**:
  - Integrated `helmet` middleware in `backend/src/app.js` with `crossOriginResourcePolicy: { policy: 'cross-origin' }`.
  - Secures HTTP responses with `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, and compatible CORP headers without breaking React frontend assets or API requests.

- **F-05 (Medium — Stack Trace Leakage in Error Responses)**:
  - Hardened `backend/src/config/env.js` so `nodeEnv` defaults to `'production'` and `isDevelopment` evaluates to `false` when `NODE_ENV` is unset or anything other than `'development'`.
  - Verified `backend/src/middleware/errorHandler.js` strictly omits `stack` in all non-development environments.

- **F-06 (Medium — Wildcard `SELECT *` in Appointment Ownership Checks)**:
  - Updated `rescheduleAppointment` in `backend/src/services/appointment.service.js` to select explicit columns (`id, patient_id, doctor_id, status`) instead of `SELECT *`.
  - Updated `cancelAppointment` in `backend/src/services/appointment.service.js` to select explicit columns (`id, patient_id, status`) instead of `SELECT *`.
  - Preserved existing ownership validation and appointment status workflow.

- **F-07 (Low — Secrets Git Exclusion & Repository History Protection)**:
  - Added explicit rules to the root `.gitignore`: `backend/.env`, `backend/.env.*`, `.env`, `.env.*`.
  - Verified with `git check-ignore backend/.env` that the file is actively ignored.
  - Verified with `git log --all --full-history -- "*.env"` that `backend/.env` has never been committed to git history.
  - No secret values or credentials printed.

---

## Files Changed

1. **`backend/src/config/env.js`**
   - Removed hardcoded JWT fallback string.
   - Added immediate fail-fast throw when `JWT_SECRET` is unset.
   - Set safe default `nodeEnv: process.env.NODE_ENV || 'production'`.
   - Set `isDevelopment: process.env.NODE_ENV === 'development'`.

2. **`backend/src/middleware/rateLimiter.js`** *(NEW)*
   - Implemented `authRateLimiter` using `express-rate-limit`.

3. **`backend/src/routes/auth.routes.js`**
   - Attached `authRateLimiter` to `/login` and `/register` routes.

4. **`backend/src/app.js`**
   - Mounted `helmet` with `crossOriginResourcePolicy: { policy: 'cross-origin' }`.

5. **`backend/src/services/appointment.service.js`**
   - Replaced `SELECT *` with explicit columns in `rescheduleAppointment` and `cancelAppointment`.

6. **`.gitignore`** (Root)
   - Added explicit entries for `backend/.env`, `backend/.env.*`, `.env`, and `.env.*`.

7. **`backend/package.json`** & **`package.json`**
   - Added `express-rate-limit` (^8.7.0) and `helmet` (^8.3.0) dependencies.
   - Added script targets: `"test:security"` and `"test:security-hardening"`.

8. **`backend/src/scripts/testSecurityHardening.js`** *(NEW)*
   - Automated test suite validating all 12 security test cases, plus F-06 and F-07 checks.

---

## Security Test Results

Command: `npm.cmd run test:security`

```
============================================================
MedLink Care: Phase 6B Security Hardening Verification Suite
============================================================

[Security Hardening Test Server] Running on port 5056

--- Test 1: Invalid JWT ---
[✓ PASS] [Test 1] [Auth] Tampered or invalid JWT signature rejected with HTTP 401 - Status: 401

--- Test 2: Expired JWT ---
[✓ PASS] [Test 2] [Auth] Expired JWT token rejected with HTTP 401 - Status: 401

--- Test 3: Wrong Role (RBAC) ---
[✓ PASS] [Test 3] [RBAC] Patient accessing doctor-only route rejected with HTTP 403 - Status: 403
[✓ PASS] [Test 3] [RBAC] Patient accessing doctor dashboard rejected with HTTP 403 - Status: 403
[✓ PASS] [Test 3] [RBAC] Doctor accessing admin-only route rejected with HTTP 403 - Status: 403

--- Test 4: Cross-Patient Access (IDOR Prevention) ---
[✓ PASS] [Test 4] [IDOR] Cross-patient appointment cancel blocked (HTTP 404) - Status: 404
[✓ PASS] [Test 4] [IDOR] Cross-patient appointment reschedule blocked (HTTP 404) - Status: 404
[✓ PASS] [Test 4] [IDOR] Patient medical records list is strictly scoped to authenticated patient - Status: 200, Record count: 1

--- Test 5: Cross-Doctor Access ---
[✓ PASS] [Test 5] [Access Control] Doctor 2 cannot access Doctor 1 appointment clinical record (HTTP 404) - Status: 404
[✓ PASS] [Test 5] [Access Control] Doctor 2 cannot modify vitals for Doctor 1 appointment (HTTP 404) - Status: 404

--- Test 6: Client ID Spoofing Protection ---
[✓ PASS] [Test 6] [Spoofing] Server ignored spoofed patientId/userId and bound appointment to authenticated patient - Stored patient_id: 1

--- Test 7: Malformed Input & Injection Resistance ---
[✓ PASS] [Test 7] [Input Validation] SQL injection string handled safely without DB crash or syntax error - Status: 400
[✓ PASS] [Test 7] [Input Validation] Malformed registration payload rejected with HTTP 400 validation error - Status: 400
[✓ PASS] [Test 7] [Input Validation] Malformed appointment booking parameters rejected cleanly with HTTP 400 - Status: 400

--- Test 8: Sensitive-Field Exposure Prevention ---
[✓ PASS] [Test 8] [Data Exposure] Auth login response does not expose password_hash or bcrypt hashes
[✓ PASS] [Test 8] [Data Exposure] Auth /me response does not expose password_hash or secret tokens
[✓ PASS] [Test 8] [Data Exposure] Doctor browse response does not expose password or sensitive user fields

--- Test 9: Production-Safe Error Response ---
[✓ PASS] [Test 9] [F-05] Non-development environment strictly sets isDevelopment to false
[✓ PASS] [Test 9] [F-05] Stack traces are strictly omitted in non-development mode

--- Test 10: Login/Register Rate Limiting ---
[✓ PASS] [Test 10] [F-03] RateLimit-* headers returned on auth endpoints - Limit: 50
[✓ PASS] [Test 10] [F-03] Auth rate limiter configured to sensible threshold (>= 10 and <= 100) - Configured max: 50
[✓ PASS] [Test 10] [F-03] Non-auth endpoints are not throttled by auth rate limiter

--- Test 11: Security Headers (Helmet) ---
[✓ PASS] [Test 11] [F-04] X-Content-Type-Options: nosniff header present
[✓ PASS] [Test 11] [F-04] X-Frame-Options: SAMEORIGIN header present
[✓ PASS] [Test 11] [F-04] Cross-Origin-Resource-Policy configured safely for React (cross-origin)

--- Test 12: Missing JWT_SECRET Startup Behavior ---
[✓ PASS] [Test 12] [F-01] Startup fails immediately with fatal error when JWT_SECRET is missing
[✓ PASS] [Test 12] [F-01] No fallback operator (||) used for JWT_SECRET in env.js

--- Findings Verification: F-06 & F-07 ---
[✓ PASS] [Test F-06] [F-06] appointment.service.js has no SELECT * in appointment ownership checks
[✓ PASS] [Test F-07] [F-07] backend/.env is actively ignored by git
[✓ PASS] [Test F-07] [F-07] backend/.env has never been committed to git history

============================================================
Test Summary: Phase 6B Security Hardening
============================================================
Total Checks : 30
Passed       : 30
Failed       : 0

All security hardening checks PASSED successfully.
```

---

## Regression Results

| Test Suite | Command | Tests Run | Passed | Failed | Status |
|---|---|---|---|---|---|
| Authentication & RBAC | `npm.cmd run test:auth` | 24 | 24 | 0 | ✅ PASS |
| Patient Profile | `npm.cmd run test:profile` | 10 | 10 | 0 | ✅ PASS |
| Doctor Search & Filter | `npm.cmd run test:doctors` | 10 | 10 | 0 | ✅ PASS |
| Doctor Details & Availability | `npm.cmd run test:details` | 13 | 13 | 0 | ✅ PASS |
| Appointment Booking | `npm.cmd run test:appointments` | 14 | 14 | 0 | ✅ PASS |
| Appointment Management | `npm.cmd run test:management` | 23 | 23 | 0 | ✅ PASS |
| Medical Records & Visits | `npm.cmd run test:records` | 13 | 13 | 0 | ✅ PASS |
| Doctor Dashboard | `npm.cmd run test:dashboard` | 12 | 12 | 0 | ✅ PASS |
| Doctor Appointment Details | `npm.cmd run test:doctor-appointment` | 15 | 15 | 0 | ✅ PASS |
| Doctor Clinical Records | `npm.cmd run test:clinical-records` | 30 | 30 | 0 | ✅ PASS |
| Doctor Profile & Schedule | `npm.cmd run test:doctor-profile-schedule` | 23 | 23 | 0 | ✅ PASS |
| Doctor Reviews & Ratings | `npm.cmd run test:doctor-reviews` | 15 | 15 | 0 | ✅ PASS |
| System Integration E2E | `npm.cmd run test:system-integration` | 9 | 9 | 0 | ✅ PASS |
| Security Hardening (12 tests) | `npm.cmd run test:security` | 30 | 30 | 0 | ✅ PASS |
| **TOTAL** | | **251** | **251** | **0** | **100% PASS** |

---

## Lint / Build

1. **`npx.cmd oxlint backend`**:
   - Analyzed 45 backend files across 104 rules.
   - Result: `Found 0 warnings and 0 errors.` (Exit code: 0)

2. **`npm.cmd run lint`**:
   - Analyzed 123 repository files across 104 rules.
   - Result: `Found 15 warnings and 0 errors.` (0 errors, 15 pre-existing non-blocking frontend React compiler/useEffect warnings). (Exit code: 0)

3. **`npm.cmd run build`**:
   - Client bundle compiled successfully via `vite build` in 16.04s.
   - Outputs:
     - `dist/index.html` (1.07 kB)
     - `dist/assets/patient_arjun_sharma-Dk1jSbWK.jpg` (589.54 kB)
     - `dist/assets/index-CdF7MBpF.css` (36.59 kB)
     - `dist/assets/index-BNeG3Z-p.js` (383.55 kB)
   - Result: Exit code 0.

---

## Accepted F-02 Limitation

- **Finding**: F-02 High — JWT stored in browser `localStorage`.
- **Accepted Architectural Limitation**: In this phase, authentication continues to store JWT in `localStorage` via `src/services/authService.js` and `src/context/AuthContext.jsx`. No migration to cookie-based authentication was performed in Phase 6B.
- **Accepted Risk**: Persistent tokens stored in `localStorage` are accessible to JavaScript and therefore exposed if an XSS vulnerability occurs within the client web application or imported client dependencies.
- **Future Hardening Roadmap**:
  - Migrate JWT transport to `HttpOnly`, `Secure`, `SameSite=Strict` cookies.
  - Implement CSRF token protection (double-submit cookie or Anti-CSRF token verification) for all state-changing endpoints.
  - Introduce short-lived access tokens (e.g. 15 minutes) paired with a database-backed refresh token rotation endpoint (`/api/auth/refresh`).

---

## Remaining Production Risks

1. **In-Memory Rate Limiter Store**:
   - `express-rate-limit` currently operates in Node.js process memory. In a distributed multi-instance deployment behind a load balancer, rate limits are not shared across nodes. Production deployments require a centralized Redis or Memcached store (e.g., `rate-limit-redis`).
2. **TLS / HTTPS Enforcement**:
   - HSTS and secure cookie policies require termination of TLS at the reverse proxy (e.g. Nginx, Cloudflare, AWS ALB) before public traffic reaches Node.js.
3. **Static Environment Secret Provisioning**:
   - In production environments, database passwords and `JWT_SECRET` should be injected directly via a secrets manager (AWS Secrets Manager, GCP Secret Manager, or HashiCorp Vault) rather than filesystem `.env` files.
4. **Lack of Account Recovery / MFA**:
   - Self-service password reset flows, email verification, and Multi-Factor Authentication (MFA) are not yet implemented. Compromised user passwords remain vulnerable to external credential stuffing if users reuse passwords across services.

---

## Final Verdict

Phase 6B Security Hardening is **COMPLETE** and verified:
- Findings F-01, F-03, F-04, F-05, F-06, and F-07 are fully resolved and verified.
- Finding F-02 is documented and accepted as an architectural limitation with a clear future remediation path.
- All 12 requested security test categories pass with 0 failures across 30 automated checks in `test:security`.
- All 14 regression suites pass with 100% success (251/251 tests passing).
- Backend and workspace lint checks complete with 0 errors.
- Production build completes cleanly.
- No secrets or credentials were exposed or committed.
