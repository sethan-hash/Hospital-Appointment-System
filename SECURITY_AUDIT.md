# MedLink Care — Security Audit Report

**Date:** 2026-09-22  
**Scope:** Read-only static analysis of backend (`backend/src/`) and frontend (`src/`) source code.  
**Auditor:** Antigravity AI  

---

## Executive Summary

MedLink Care demonstrates solid foundational security practices: all SQL queries use parameterized placeholders, RBAC is applied consistently via middleware, and ownership checks are enforced in every service function by deriving identity from the JWT rather than from client-supplied parameters.

Seven findings are documented below — one **Critical**, two **High**, three **Medium**, and one **Low**.

---

## Findings

---

### F-01 — Weak, Hard-coded JWT Secret with In-Code Fallback

| | |
|---|---|
| **Severity** | 🔴 Critical |
| **File** | [`backend/src/config/env.js:27`](file:///c:/Users/Chethan%20Gurunathan/.gemini/antigravity-ide/scratch/medlink-care/backend/src/config/env.js#L27) |

**Issue**  
`env.js` contains a hard-coded fallback value for `JWT_SECRET`:
```js
secret: process.env.JWT_SECRET || 'medlink-care-jwt-secret-key-local-dev-2026',
```
If the environment variable is missing or mis-spelled in production, Node.js silently falls back to the in-source default. The matching `.env` value uses the same short, guessable string. An attacker who learns this string can forge arbitrary JWTs for any user or role with no server interaction.

**Recommended Fix**
1. Remove the fallback entirely — throw a startup error if `JWT_SECRET` is absent:
   ```js
   if (!process.env.JWT_SECRET) {
     throw new Error('FATAL: JWT_SECRET environment variable is not set.');
   }
   secret: process.env.JWT_SECRET,
   ```
2. In production, set `JWT_SECRET` to a cryptographically random string of ≥ 256 bits (e.g., `openssl rand -base64 48`).
3. Rotate the secret immediately; all existing tokens signed with the current value must be treated as compromised.

---

### F-02 — JWT Stored in `localStorage` (XSS-Accessible)

| | |
|---|---|
| **Severity** | 🔴 High |
| **File** | [`src/services/authService.js:33`](file:///c:/Users/Chethan%20Gurunathan/.gemini/antigravity-ide/scratch/medlink-care/src/services/authService.js#L33) |

**Issue**  
Both the JWT token and the full user object are persisted in `localStorage`:
```js
const TOKEN_STORAGE_KEY = 'medlink_auth_token';
const USER_STORAGE_KEY  = 'medlink_auth_user';
// ...
localStorage.setItem(TOKEN_STORAGE_KEY, token);
localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
```
Any Cross-Site Scripting (XSS) payload — including a malicious third-party dependency — can read `localStorage` without restriction and silently exfiltrate the live token, taking over the session.

**Recommended Fix**
- Store the JWT in an **`HttpOnly`, `Secure`, `SameSite=Strict` cookie** set by the server at login. The browser will attach it automatically; JavaScript cannot read it.
- The backend's CORS configuration already sets `credentials: true`, so cookie-based auth is feasible without major changes.
- If `localStorage` is retained, implement a Content-Security-Policy header (see F-04) and use a short expiry combined with silent refresh.

---

### F-03 — No Rate Limiting on Authentication Endpoints

| | |
|---|---|
| **Severity** | 🔴 High |
| **File** | [`backend/src/routes/auth.routes.js`](file:///c:/Users/Chethan%20Gurunathan/.gemini/antigravity-ide/scratch/medlink-care/backend/src/routes/auth.routes.js), [`backend/src/app.js`](file:///c:/Users/Chethan%20Gurunathan/.gemini/antigravity-ide/scratch/medlink-care/backend/src/app.js) |

**Issue**  
There is no rate limiting anywhere in the application. The `POST /api/auth/login` and `POST /api/auth/register` endpoints can be called an unlimited number of times per second from a single IP. This enables:
- **Credential stuffing / brute-force** attacks against the login endpoint (bcrypt adds cost per attempt, but thousands of parallel attempts are still feasible).
- **Enumeration** of valid email addresses via the registration flow (409 Conflict vs. 201 Created).
- **Denial-of-service** by flooding the MySQL connection pool.

**Recommended Fix**
```bash
npm install express-rate-limit
```
```js
// backend/src/app.js
import rateLimit from 'express-rate-limit';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 20,                    // 20 attempts per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please try again later.' },
});

app.use('/api/auth/login',    authLimiter);
app.use('/api/auth/register', authLimiter);
```
Apply a more permissive global limiter to remaining endpoints as a secondary defence.

---

### F-04 — Missing Security Headers (No `helmet`)

| | |
|---|---|
| **Severity** | 🟡 Medium |
| **File** | [`backend/src/app.js`](file:///c:/Users/Chethan%20Gurunathan/.gemini/antigravity-ide/scratch/medlink-care/backend/src/app.js) |

**Issue**  
The Express application does not use `helmet` or set any HTTP security headers manually. Absent headers include:
- `X-Content-Type-Options: nosniff` — enables MIME-sniffing attacks
- `X-Frame-Options: DENY` — enables clickjacking
- `Content-Security-Policy` — enables XSS via inline scripts or injected content
- `Strict-Transport-Security` — so HTTP is not forced to HTTPS
- `X-XSS-Protection` — legacy but still useful for older browsers

**Recommended Fix**
```bash
npm install helmet
```
```js
// backend/src/app.js — add before cors()
import helmet from 'helmet';
app.use(helmet());
```
Customize `helmet.contentSecurityPolicy()` to match your specific assets and API origin.

---

### F-05 — Stack Traces Exposed in Development Error Responses

| | |
|---|---|
| **Severity** | 🟡 Medium |
| **File** | [`backend/src/middleware/errorHandler.js:14`](file:///c:/Users/Chethan%20Gurunathan/.gemini/antigravity-ide/scratch/medlink-care/backend/src/middleware/errorHandler.js#L14) |

**Issue**  
The centralized error handler conditionally appends the full stack trace to the JSON response:
```js
...(env.isDevelopment && { stack: err.stack }),
```
The guard depends on `NODE_ENV === 'development'`. If `NODE_ENV` is not explicitly set in a staging or production deployment, `env.isDevelopment` resolves to `true` (see `env.js:15`), and stack traces are sent to all clients. Stack traces reveal internal file paths, library versions, and logic flow — information valuable for targeted exploitation.

**Recommended Fix**
- Change the default so that `isDevelopment` is `false` unless `NODE_ENV` is explicitly `'development'`:
  ```js
  isDevelopment: process.env.NODE_ENV === 'development',
  ```
- Add a startup check that rejects an unset `NODE_ENV` in production environments.
- Log the full error (including stack) server-side regardless; never send it to the client in non-development modes.

---

### F-06 — `SELECT *` Used in Appointment Ownership Queries

| | |
|---|---|
| **Severity** | 🟡 Medium |
| **File** | [`backend/src/services/appointment.service.js:352`](file:///c:/Users/Chethan%20Gurunathan/.gemini/antigravity-ide/scratch/medlink-care/backend/src/services/appointment.service.js#L352), [line 474](file:///c:/Users/Chethan%20Gurunathan/.gemini/antigravity-ide/scratch/medlink-care/backend/src/services/appointment.service.js#L474) |

**Issue**  
Two ownership verification queries fetch the entire appointments row:
```js
'SELECT * FROM appointments WHERE id = ? LIMIT 1;'
```
The full row is then stored in `existingApt`. If the `appointments` table schema is extended with sensitive columns in the future (e.g., internal billing notes, audit flags), those values will silently flow into memory and may eventually be serialized into API responses by accident. Additionally, `SELECT *` prevents the database engine from using covering indexes efficiently.

**Recommended Fix**
Enumerate only the columns required by the ownership check and downstream logic:
```js
'SELECT id, patient_id, doctor_id, status, appointment_date, appointment_time FROM appointments WHERE id = ? LIMIT 1;'
```

---

### F-07 — `.env` Contains Real Credentials and Root `.gitignore` Has Incomplete Coverage

| | |
|---|---|
| **Severity** | 🟠 Low (local dev only — would be Critical if committed to a shared repository) |
| **File** | [`backend/.env`](file:///c:/Users/Chethan%20Gurunathan/.gemini/antigravity-ide/scratch/medlink-care/backend/.env), [root `.gitignore`](file:///c:/Users/Chethan%20Gurunathan/.gemini/antigravity-ide/scratch/medlink-care/.gitignore) |

**Issue**  
The `backend/.env` file contains real `DB_PASSWORD` and `JWT_SECRET` values. The backend's own `backend/.gitignore` correctly excludes `.env`, but the **root-level `.gitignore`** does not explicitly list `backend/.env`. If a developer runs `git add .` from the project root, the file could be staged and accidentally committed.

**Recommended Fix**
- Add `backend/.env` explicitly to the root `.gitignore`:
  ```
  # Secrets
  backend/.env
  ```
- Verify with `git log --all --full-history -- backend/.env` that the file has never been committed.
- Rotate the `DB_PASSWORD` and `JWT_SECRET` values if there is any possibility they have been exposed in git history.
- For staging/production, consider a secrets manager (AWS Secrets Manager, HashiCorp Vault) rather than `.env` files.

---

## Positive Findings (Controls Working Correctly)

The following areas were inspected and found to be implemented correctly:

| Area | Status | Notes |
|---|---|---|
| **SQL parameterization** | ✅ Correct | Every `pool.query()` call uses `?` placeholders; no string concatenation in SQL found across all service files. |
| **RBAC middleware** | ✅ Correct | `authenticate` + `requireRole()` applied to every protected route; role checked against server-side JWT claim, not client payload. |
| **Ownership enforcement** | ✅ Correct | All doctor and patient service functions resolve identity from `req.user.id` (JWT); no client-supplied owner IDs are trusted. Appointment IDs, medical record IDs, medication IDs, and vitals are all scoped to the authenticated user. |
| **Password hashing** | ✅ Correct | `bcryptjs` with `SALT_ROUNDS = 10`; plaintext password is never stored, returned, or logged. |
| **JWT expiry** | ✅ Acceptable | 24 h expiry; token is additionally re-validated against the live user record on every authenticated request (status check in `authenticate`). |
| **CORS origin** | ✅ Correct | Origin is set to a single `FRONTEND_URL` variable; wildcard `*` is not used; `credentials: true` is set. |
| **DB connection credentials** | ✅ No hardcodes | `db.js` reads all credentials exclusively from `env.js`; no credentials embedded in source code. |
| **Login error ambiguity** | ✅ Correct | Login failure returns identical message for unknown email and wrong password, preventing user enumeration. |
| **Token revocation on every request** | ✅ Correct | `authenticate` middleware re-fetches user from DB on every request and checks `status === 'ACTIVE'`, providing effective soft-revocation. |

---

## Summary Table

| ID | Severity | Area | File |
|---|---|---|---|
| F-01 | 🔴 Critical | JWT Secret fallback | `backend/src/config/env.js` |
| F-02 | 🔴 High | Token stored in localStorage | `src/services/authService.js` |
| F-03 | 🔴 High | No rate limiting | `backend/src/app.js`, `auth.routes.js` |
| F-04 | 🟡 Medium | No security headers (helmet) | `backend/src/app.js` |
| F-05 | 🟡 Medium | Stack traces in error responses | `backend/src/middleware/errorHandler.js` |
| F-06 | 🟡 Medium | `SELECT *` in ownership queries | `backend/src/services/appointment.service.js` |
| F-07 | 🟠 Low | `.env` / root gitignore gap | `backend/.env`, root `.gitignore` |
