# Phase 4E — Appointment Management Implementation & Verification Report

**Date:** 2026-09-19  
**Branch:** `master`  
**Application:** MedLink Care  
**Architecture:** Node.js / Express backend + React 19 / Vite frontend + MySQL Database  

---

## 1. Implementation Status

**Status: FULLY IMPLEMENTED & VERIFIED**

Phase 4E is complete. The Patient Appointment Management functionality is fully implemented and connected to real MySQL appointments data:
1. **View Upcoming Appointments:** Patients can view their scheduled appointments fetched from `GET /api/appointments/upcoming` sorted chronologically.
2. **Reschedule Appointment:** Patients can reschedule their eligible scheduled appointments via `PUT /api/appointments/:id/reschedule` with real doctor availability validation, slot alignment, and concurrency protection.
3. **Cancel Appointment:** Patients can cancel their eligible appointments via `PUT /api/appointments/:id/cancel` with interactive confirmation. Cancelled appointments immediately disappear from upcoming views and their slots become freed for new bookings.
4. **Ownership & Security:** Strict authorization derives patient identity from the authenticated JWT user ID (`req.user.id` -> `patients.id`). Cross-patient access or manipulation is rejected with HTTP 404 (resource isolation).
5. **Quality & Tests:** All 23 Phase 4E test cases pass, all 71 regression tests pass (94/94 total automated tests across the codebase), and both lint and production build pass with 0 errors.

---

## 2. Files Created

| File | Purpose |
|------|---------|
| [backend/src/scripts/testAppointmentManagement.js](file:///c:/Users/Chethan%20Gurunathan/.gemini/antigravity-ide/scratch/medlink-care/backend/src/scripts/testAppointmentManagement.js) | Comprehensive 23-point automated test suite for Phase 4E (upcoming, reschedule, cancel, concurrency, RBAC, ownership) |
| [src/components/patient/CancelAppointmentModal.jsx](file:///c:/Users/Chethan%20Gurunathan/.gemini/antigravity-ide/scratch/medlink-care/src/components/patient/CancelAppointmentModal.jsx) | Reusable confirmation modal for appointment cancellation with appointment summary, warning prompt, and loading/error states |

---

## 3. Files Modified

| File | Changes Made |
|------|--------------|
| [backend/src/routes/appointment.routes.js](file:///c:/Users/Chethan%20Gurunathan/.gemini/antigravity-ide/scratch/medlink-care/backend/src/routes/appointment.routes.js) | Added `GET /upcoming`, `PUT /:id/reschedule`, and `PUT /:id/cancel` routes with auth and RBAC middleware |
| [backend/src/controllers/appointment.controller.js](file:///c:/Users/Chethan%20Gurunathan/.gemini/antigravity-ide/scratch/medlink-care/backend/src/controllers/appointment.controller.js) | Added `getUpcomingAppointments`, `rescheduleAppointment`, and `cancelAppointment` controller methods |
| [backend/src/services/appointment.service.js](file:///c:/Users/Chethan%20Gurunathan/.gemini/antigravity-ide/scratch/medlink-care/backend/src/services/appointment.service.js) | Implemented `getUpcomingAppointments`, `rescheduleAppointment`, `cancelAppointment`, and extracted shared `validateSlotAgainstDoctorSchedule()` helper |
| [backend/src/validators/appointment.validator.js](file:///c:/Users/Chethan%20Gurunathan/.gemini/antigravity-ide/scratch/medlink-care/backend/src/validators/appointment.validator.js) | Added `validateReschedule` and `validateAppointmentId` middleware |
| [src/services/appointmentService.js](file:///c:/Users/Chethan%20Gurunathan/.gemini/antigravity-ide/scratch/medlink-care/src/services/appointmentService.js) | Implemented real HTTP calls for `getAppointments()`, `getUpcomingAppointment()`, `rescheduleAppointment()`, and `cancelAppointment()` |
| [src/context/PatientContext.jsx](file:///c:/Users/Chethan%20Gurunathan/.gemini/antigravity-ide/scratch/medlink-care/src/context/PatientContext.jsx) | Added `cancelAppointment()` to context and refreshed state automatically after reschedule/cancel |
| [src/hooks/useAppointments.js](file:///c:/Users/Chethan%20Gurunathan/.gemini/antigravity-ide/scratch/medlink-care/src/hooks/useAppointments.js) | Exposed `cancelAppointment` from `usePatient()` |
| [src/components/patient/AppointmentCard.jsx](file:///c:/Users/Chethan%20Gurunathan/.gemini/antigravity-ide/scratch/medlink-care/src/components/patient/AppointmentCard.jsx) | Added `onCancelClick` action button alongside Reschedule button and rendered doctor clinic location |
| [src/components/patient/RescheduleModal.jsx](file:///c:/Users/Chethan%20Gurunathan/.gemini/antigravity-ide/scratch/medlink-care/src/components/patient/RescheduleModal.jsx) | Connected to `useDoctorAvailability` to derive valid time slots dynamically based on doctor's schedule; added error/conflict display |
| [src/pages/patient/UpcomingAppointmentsPage.jsx](file:///c:/Users/Chethan%20Gurunathan/.gemini/antigravity-ide/scratch/medlink-care/src/pages/patient/UpcomingAppointmentsPage.jsx) | Integrated `CancelAppointmentModal`, dynamic feedback banner, loading, and empty states |
| [src/components/common/Badge.jsx](file:///c:/Users/Chethan%20Gurunathan/.gemini/antigravity-ide/scratch/medlink-care/src/components/common/Badge.jsx) | Added `scheduled` and `cancelled` status badge variant styles |
| [package.json](file:///c:/Users/Chethan%20Gurunathan/.gemini/antigravity-ide/scratch/medlink-care/package.json) | Added `"test:management"` script |
| [backend/package.json](file:///c:/Users/Chethan%20Gurunathan/.gemini/antigravity-ide/scratch/medlink-care/backend/package.json) | Added `"test:management"` script and updated `"test"` script |

---

## 4. Upcoming Appointments API

### `GET /api/appointments/upcoming`
- **Method:** `GET`
- **Authentication:** Bearer JWT required (`authenticate` middleware)
- **Role Authorization:** `requireRole('PATIENT')`
- **Query Criteria:**
  - `a.patient_id = <authenticated patient id>`
  - `a.status = 'SCHEDULED'`
  - `a.appointment_date >= <today in local date YYYY-MM-DD>`
  - `ORDER BY a.appointment_date ASC, a.appointment_time ASC`
- **Response Structure (HTTP 200):**
```json
{
  "success": true,
  "data": {
    "appointments": [
      {
        "id": 29,
        "patientId": 1,
        "doctorId": 1,
        "doctorName": "Dr. Priya Sharma",
        "doctorTitle": "Cardiology",
        "department": "Cardiology",
        "date": "2026-10-12",
        "time": "9:30 AM",
        "startTimeRaw": "09:30:00",
        "status": "SCHEDULED",
        "type": "IN_PERSON",
        "location": "Apollo Hospitals Bengaluru",
        "reason": "Cardiac routine follow-up",
        "createdAt": "2026-09-19T17:02:59.000Z",
        "updatedAt": "2026-09-19T17:02:59.000Z"
      }
    ]
  }
}
```

---

## 5. Reschedule API

### `PUT /api/appointments/:id/reschedule`
- **Method:** `PUT`
- **Authentication:** Bearer JWT required
- **Role Authorization:** `requireRole('PATIENT')`
- **Request Parameters:** `id` (appointment ID, positive integer)
- **Request Body:**
```json
{
  "appointmentDate": "2026-10-12",
  "startTime": "09:30"
}
```
- **Validation Rules:**
  1. Appointment exists and `appointment.patient_id === authenticatedPatientId` (returns 404 if not found or belongs to another patient).
  2. Appointment `status === 'SCHEDULED'` (returns 409 Conflict if COMPLETED or CANCELLED).
  3. New date is not in the past (returns 400).
  4. Doctor exists and is active.
  5. Requested day matches an active entry in `doctor_schedules` (returns 400 if doctor not scheduled on that weekday).
  6. Requested time falls within `[start_time, end_time]` of doctor schedule.
  7. Start time aligns with `slot_duration_minutes` boundaries.
  8. Concurrency lock acquired via `SELECT GET_LOCK('medlink_apt_<doc>_<date>_<time>', 10)`.
  9. Transaction check `SELECT id FROM appointments WHERE ... FOR UPDATE AND id != :id` ensures destination slot is free (returns 409 Conflict if slot is occupied).
- **Response Structure (HTTP 200):**
```json
{
  "success": true,
  "message": "Appointment rescheduled successfully.",
  "data": {
    "appointment": {
      "id": 29,
      "patientId": 1,
      "doctorId": 1,
      "doctorName": "Dr. Priya Sharma",
      "doctorTitle": "Cardiology",
      "department": "Cardiology",
      "date": "2026-10-12",
      "time": "9:30 AM",
      "startTimeRaw": "09:30:00",
      "status": "SCHEDULED",
      "type": "IN_PERSON",
      "location": "Apollo Hospitals Bengaluru",
      "reason": "Cardiac routine follow-up",
      "createdAt": "2026-09-19T17:02:59.000Z",
      "updatedAt": "2026-09-19T17:02:59.000Z"
    }
  }
}
```

---

## 6. Cancel API

### `PUT /api/appointments/:id/cancel`
- **Method:** `PUT`
- **Authentication:** Bearer JWT required
- **Role Authorization:** `requireRole('PATIENT')`
- **Request Parameters:** `id` (appointment ID, positive integer)
- **Validation Rules:**
  1. Appointment exists and belongs to authenticated patient (returns 404 if not found or belongs to another patient).
  2. Appointment `status === 'SCHEDULED'` (returns 409 Conflict if already cancelled or completed).
  3. Updates `status = 'CANCELLED'` and `updated_at = CURRENT_TIMESTAMP`.
- **Response Structure (HTTP 200):**
```json
{
  "success": true,
  "message": "Appointment cancelled successfully.",
  "data": {
    "appointment": {
      "id": 29,
      "status": "CANCELLED",
      "date": "2026-10-12",
      "time": "9:30 AM"
    }
  }
}
```

---

## 7. Appointment Ownership & Security

- **Strict Identity Derivation:** Neither patient ID nor user ID is accepted from the client request body or query parameters. The backend queries `patients WHERE user_id = req.user.id` to establish identity.
- **Resource Isolation:** When querying, rescheduling, or cancelling an appointment by ID, if the appointment belongs to another patient, the backend returns `404 Not Found`. This prevents cross-tenant enumeration attacks.
- **Sanitized Outputs:** No sensitive authentication fields (`password_hash`, auth tokens) are ever exposed.

---

## 8. Status Rules

| Status | Appears in Upcoming? | Eligible for Reschedule? | Eligible for Cancellation? | Blocks Slot Reuse? |
|--------|----------------------|--------------------------|---------------------------|-------------------|
| `SCHEDULED` | **Yes** (if date >= today) | **Yes** | **Yes** | **Yes** (blocks new bookings) |
| `COMPLETED` | No | No (returns 409 Conflict) | No (returns 409 Conflict) | No |
| `CANCELLED` | No | No (returns 409 Conflict) | No (returns 409 Conflict) | **No** (slot released for rebooking) |
| `NO_SHOW` | No | No (returns 409 Conflict) | No (returns 409 Conflict) | No |

---

## 9. Concurrency Protection

- **Named Locking (`GET_LOCK`):**
  When rescheduling, the backend requests an application-level named lock:
  ```sql
  SELECT GET_LOCK('medlink_apt_<doctorId>_<appointmentDate>_<startTimeStr>', 10) AS acquired;
  ```
  This serializes concurrent requests attempting to book or move into the destination slot across multiple processes and connections.
- **Row-Level Transaction Lock (`FOR UPDATE`):**
  Inside the transaction, a lock check query verifies whether another active appointment occupies that slot:
  ```sql
  SELECT id FROM appointments
  WHERE doctor_id = ?
    AND appointment_date = ?
    AND appointment_time = ?
    AND status IN ('SCHEDULED')
    AND id != ?
  LIMIT 1 FOR UPDATE;
  ```
- **Guaranteed Release:**
  `RELEASE_LOCK` is always executed in a `finally` block on the active connection.
- **Automated Verification:** Verified in Test 16: When two concurrent reschedule requests target the exact same slot, exactly one succeeds with HTTP 200 and the second receives HTTP 409 Conflict; MySQL records exactly 1 scheduled appointment for that slot.

---

## 10. Database Usage & Changes

- **Schema Modification:** **NONE.** No migrations or DDL schema alterations were made. Existing tables, columns, indexes, and ENUM values were reused without modification.
- **Table:** `appointments`
  - Reads: `patient_id`, `doctor_id`, `appointment_date`, `appointment_time`, `status`, `type`, `reason_for_visit`.
  - Updates:
    - Reschedule: `UPDATE appointments SET appointment_date = ?, appointment_time = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?;`
    - Cancel: `UPDATE appointments SET status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP WHERE id = ?;`

---

## 11. Frontend Changes

1. **[src/services/appointmentService.js](file:///c:/Users/Chethan%20Gurunathan/.gemini/antigravity-ide/scratch/medlink-care/src/services/appointmentService.js):**
   - Implemented real `getAppointments()` hitting `GET /api/appointments/upcoming`.
   - Implemented `getUpcomingAppointment()` returning the earliest upcoming appointment.
   - Implemented real `rescheduleAppointment()` hitting `PUT /api/appointments/:id/reschedule`.
   - Implemented real `cancelAppointment()` hitting `PUT /api/appointments/:id/cancel`.
2. **[src/context/PatientContext.jsx](file:///c:/Users/Chethan%20Gurunathan/.gemini/antigravity-ide/scratch/medlink-care/src/context/PatientContext.jsx) & [src/hooks/useAppointments.js](file:///c:/Users/Chethan%20Gurunathan/.gemini/antigravity-ide/scratch/medlink-care/src/hooks/useAppointments.js):**
   - Added `cancelAppointment()` to context and custom hook; automatically triggers `refreshData()` on reschedule or cancel.
3. **[src/components/patient/AppointmentCard.jsx](file:///c:/Users/Chethan%20Gurunathan/.gemini/antigravity-ide/scratch/medlink-care/src/components/patient/AppointmentCard.jsx):**
   - Added `onCancelClick` action button with distinct danger hover styling.
   - Displayed doctor location in appointment card details.
4. **[src/components/patient/RescheduleModal.jsx](file:///c:/Users/Chethan%20Gurunathan/.gemini/antigravity-ide/scratch/medlink-care/src/components/patient/RescheduleModal.jsx):**
   - Hooked to `useDoctorAvailability` to derive valid time slots dynamically based on the doctor's weekly schedule for the selected date.
   - Displays inline conflict/error messages on HTTP 409 or validation errors without using `window.alert()`.
5. **[src/components/patient/CancelAppointmentModal.jsx](file:///c:/Users/Chethan%20Gurunathan/.gemini/antigravity-ide/scratch/medlink-care/src/components/patient/CancelAppointmentModal.jsx):**
   - Created confirmation modal displaying appointment details, warning text, loading spinner, and error banner.
6. **[src/pages/patient/UpcomingAppointmentsPage.jsx](file:///c:/Users/Chethan%20Gurunathan/.gemini/antigravity-ide/scratch/medlink-care/src/pages/patient/UpcomingAppointmentsPage.jsx):**
   - Wired both reschedule and cancel modals; displays dynamic dismissible success banner.

---

## 12. Automated Test Results

### Phase 4E Appointment Management Test Suite
**Command:** `node backend/src/scripts/testAppointmentManagement.js`
```
[Appointment Management Test Server] Running on port 5065
POST /api/auth/login 200 119.955 ms - 801
POST /api/auth/login 200 110.182 ms - 803
POST /api/auth/login 200 116.858 ms - 853
Test Dates: Mon=2026-10-05, Wed=2026-10-07, Fri=2026-10-09, Sun=2026-10-04

GET /api/appointments/upcoming 200 7.740 ms - 43
[✅ PASS] 3. Empty result works correctly — HTTP 200, count = 0
POST /api/appointments 201 166.437 ms - 462
POST /api/appointments 201 72.334 ms - 458
POST /api/appointments 201 69.191 ms - 461
GET /api/appointments/upcoming 200 4.447 ms - 794
[✅ PASS] 1. Authenticated patient retrieves only their own upcoming appointments — Count: 2, All patientId=1: true
[✅ PASS] 2. Appointment list is correctly ordered chronologically — 1st: ID 25 (2026-10-05), 2nd: ID 24 (2026-10-07)
GET /api/appointments/upcoming 401 0.318 ms - 80
[✅ PASS] 4. Unauthenticated upcoming request returns 401 — HTTP 401
GET /api/appointments/upcoming 403 2.292 ms - 112
[✅ PASS] 5. DOCTOR role returns 403 — HTTP 403
GET /api/appointments/upcoming 200 4.133 ms - 419
[✅ PASS] 6. Another patient's appointments are never returned — Patient 2 sees ID 26 only, 0 leakage from Patient 1
PUT /api/appointments/25/reschedule 200 97.600 ms - 463
[✅ PASS] 7. Patient can reschedule their own eligible appointment — HTTP 200, New Date: 2026-10-05, New Time: 9:30 AM
[✅ PASS] 8. Rescheduled date/time is persisted in MySQL — MySQL values: Date=2026-10-05, Time=09:30:00
PUT /api/appointments/25/reschedule 400 3.022 ms - 160
[✅ PASS] 9. Appointment cannot be rescheduled to a past date — HTTP 400
PUT /api/appointments/25/reschedule 400 5.780 ms - 107
[✅ PASS] 10. Appointment cannot be rescheduled outside doctor schedule — HTTP 400
PUT /api/appointments/25/reschedule 400 5.363 ms - 102
[✅ PASS] 11. Appointment cannot use unaligned slot — HTTP 400
PUT /api/appointments/25/reschedule 409 12.110 ms - 95
[✅ PASS] 12. Appointment cannot move to an occupied slot (HTTP 409) — HTTP 409, Message: "This time slot is already booked. Please choose a different time."
PUT /api/appointments/26/reschedule 404 3.122 ms - 52
[✅ PASS] 13. Another patient's appointment cannot be rescheduled (HTTP 404) — HTTP 404 (Resource isolated)
PUT /api/appointments/25/reschedule 401 0.245 ms - 80
[✅ PASS] 14. Unauthenticated reschedule returns 401 — HTTP 401
PUT /api/appointments/25/reschedule 403 2.425 ms - 112
[✅ PASS] 15. Non-PATIENT reschedule returns 403 — HTTP 403
POST /api/appointments 201 152.081 ms - 460
PUT /api/appointments/25/reschedule 200 102.468 ms - 464
PUT /api/appointments/27/reschedule 409 95.211 ms - 95
[✅ PASS] 16. Concurrent destination-slot conflict is prevented — Statuses: [200, 409], DB scheduled count: 1
PUT /api/appointments/24/cancel 200 119.157 ms - 465
[✅ PASS] 17. Patient can cancel their own eligible appointment — HTTP 200, Status: CANCELLED
[✅ PASS] 18. Cancellation status is persisted correctly in MySQL — DB status = CANCELLED
GET /api/appointments/upcoming 200 3.033 ms - 793
[✅ PASS] 19. Cancelled appointment no longer appears in upcoming list — Upcoming count = 2, ID 24 excluded: true
PUT /api/appointments/26/cancel 404 3.524 ms - 52
[✅ PASS] 20. Another patient's appointment cannot be cancelled (HTTP 404) — HTTP 404
PUT /api/appointments/26/cancel 401 0.250 ms - 80
[✅ PASS] 21. Unauthenticated cancel returns 401 — HTTP 401
PUT /api/appointments/26/cancel 403 1.836 ms - 112
[✅ PASS] 22. Non-PATIENT cancel returns 403 — HTTP 403
POST /api/appointments 201 215.923 ms - 483
[✅ PASS] 23. Cancelled slot can be reused according to Phase 4D rules — HTTP 201, Newly booked ID: 28 on 2026-10-07 10:00 AM

Verified 5/5 initial seed appointments remain intact.
[Cleanup] Removed 5 test appointment(s) from database.

========================================
APPOINTMENT MANAGEMENT TEST RESULTS
========================================
Total: 23 | Passed: 23 | Failed: 0
All Appointment Management tests passed successfully!
```

---

## 13. Regression Test Results

| Test Suite | Command | Result |
|------------|---------|--------|
| Phase 3 Authentication | `npm.cmd run test:auth` | **24/24 Passed** |
| Phase 4A Patient Profile | `npm.cmd run test:profile` | **10/10 Passed** |
| Phase 4B Doctor Search | `npm.cmd run test:doctors` | **10/10 Passed** |
| Phase 4C Doctor Details & Availability | `npm.cmd run test:details` | **13/13 Passed** |
| Phase 4D Appointment Booking | `npm.cmd run test:appointments` | **14/14 Passed** |
| Phase 4E Appointment Management | `npm.cmd run test:management` | **23/23 Passed** |
| **All Test Suites Combined** | `npm.cmd run test` | **94/94 Passed** |

---

## 14. Lint Results

- **Backend Lint:**
  ```
  > npx.cmd oxlint backend
  Found 0 warnings and 0 errors.
  Finished in 24ms on 34 files with 104 rules using 4 threads.
  ```
- **Project-Wide Lint:**
  ```
  > npm.cmd run lint
  Found 9 warnings and 0 errors (0 errors).
  Finished in 70ms on 108 files with 104 rules using 4 threads.
  ```

---

## 15. Build Result

- **Frontend Production Build:**
  ```
  > npm.cmd run build
  vite v8.2.2 building client environment for production...
  ✓ 91 modules transformed.
  rendering chunks...
  computing gzip size...
  dist/index.html                                  1.07 kB │ gzip:  0.55 kB
  dist/assets/patient_arjun_sharma-Dk1jSbWK.jpg  589.54 kB
  dist/assets/index-DgWzbqZg.css                  33.20 kB │ gzip:  6.76 kB
  dist/assets/index-i9EfH6OS.js                  333.73 kB │ gzip: 95.99 kB
  ✓ built in 4.68s
  ```

---

## 16. Manual / End-to-End Verification

A dedicated end-to-end verification script was executed against the live development backend (`http://localhost:5000`) and frontend (`http://localhost:5173`):

1. **Login:** Logged in as `rahul.verma@example.in` (Rahul Verma, Patient ID 1).
2. **Upcoming List:** Queried `GET /api/appointments/upcoming`, verified empty list initially.
3. **Appointment Creation:** Booked appointment ID 29 on Monday `2026-10-12` at `09:00 AM`.
4. **Reschedule:** Rescheduled appointment 29 to Monday `2026-10-12` at `09:30 AM` via `PUT /api/appointments/29/reschedule`. Received HTTP 200 with new time.
5. **Persistence Verification:** Queried `GET /api/appointments/upcoming` and verified updated date `2026-10-12` and time `9:30 AM` with status `SCHEDULED`.
6. **Cancellation:** Cancelled appointment 29 via `PUT /api/appointments/29/cancel`. Received HTTP 200 with status `CANCELLED`.
7. **Upcoming Exclusion:** Queried `GET /api/appointments/upcoming` and confirmed appointment 29 is excluded.
8. **MySQL Inspection:** Queried MySQL directly; confirmed row 29 has `status = 'CANCELLED'`.
9. **Slot Reuse:** Rebooked the previously cancelled slot (`2026-10-12 09:30 AM`); verified new appointment ID 30 created successfully with HTTP 201.
10. **Cleanup:** Deleted test appointments 29 and 30, confirming initial seed records remain pristine.

---

## 17. Remaining Issues

None. All Phase 4E requirements are completely implemented and verified.

---

## 18. Final Verdict

**PHASE 4E IS COMPLETE AND VERIFIED.**  
Ready for review.
