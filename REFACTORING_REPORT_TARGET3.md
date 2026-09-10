# Refactoring Report — Target 3: `useDoctor` Custom Hook

## Goal

Improve separation of concerns and code readability without changing the
existing Stitch UI or application behaviour.

---

## Pre-Edit Analysis

### 1. Current Fetching Pattern in Each Page

**`DoctorProfilePage.jsx`**

```js
const [doctor, setDoctor] = useState(null);
const [loading, setLoading] = useState(true);

useEffect(() => {
  let isMounted = true;
  setLoading(true);
  doctorService.getDoctorById(id).then((doc) => {
    if (isMounted) { setDoctor(doc); setLoading(false); }
  });
  return () => { isMounted = false; };
}, [id]);
```

- Reads `id` from `useParams()`.
- No error state — failures are silently swallowed.
- Falls through to the `!doctor` guard on failure.

**`BookAppointmentPage.jsx`**

```js
const [doctor, setDoctor] = useState(null);
const [loading, setLoading] = useState(true);

useEffect(() => {
  let isMounted = true;
  setLoading(true);
  doctorService.getDoctorById(doctorId || 'doc-1').then((doc) => {
    if (isMounted) {
      setDoctor(doc);
      if (doc?.availableSlots?.length) setSelectedSlot(doc.availableSlots[0]);
      setLoading(false);
    }
  });
  return () => { isMounted = false; };
}, [doctorId]);
```

- Reads `doctorId` (different param name) from `useParams()`.
- Has a fallback `'doc-1'` if no ID is present in the URL.
- No error state — same silent failure pattern.
- Mixed a UI concern (`setSelectedSlot`) inside the fetch effect.

---

### 2. Duplicated / Inconsistent Code

| Concern                          | DoctorProfilePage | BookAppointmentPage |
|----------------------------------|:-----------------:|:-------------------:|
| `useState(null)` for doctor      | ✅ duplicated      | ✅ duplicated        |
| `useState(true)` for loading     | ✅ duplicated      | ✅ duplicated        |
| `useEffect` + `isMounted` guard  | ✅ duplicated      | ✅ duplicated        |
| `doctorService.getDoctorById()`  | ✅ duplicated      | ✅ duplicated        |
| Error state                      | ❌ missing         | ❌ missing           |
| Param name for doctor ID         | `id`              | `doctorId`          |

---

### 3. Proposed `useDoctor` Hook API

```js
// src/hooks/useDoctor.js
const { doctor, loading, error } = useDoctor(id);
```

| Return value | Type            | Description                            |
|---|---|---|
| `doctor`     | `Object\|null`  | Resolved doctor data, or `null`        |
| `loading`    | `boolean`       | `true` while the fetch is in-flight    |
| `error`      | `Error\|null`   | Any caught error, otherwise `null`     |

- Delegates entirely to `doctorService.getDoctorById(id)`.
- Manages `isMounted` guard internally.
- Resets `loading` and `error` whenever `id` changes.
- Does **not** contain any UI logic (slot initialisation stays in the page).

---

## Changes Made

### [NEW] `src/hooks/useDoctor.js`

Created a 44-line custom hook that centralises all single-doctor fetching logic:

```js
export function useDoctor(id) {
  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    doctorService
      .getDoctorById(id)
      .then((doc) => {
        if (isMounted) { setDoctor(doc); setLoading(false); }
      })
      .catch((err) => {
        if (isMounted) { setError(err); setLoading(false); }
      });

    return () => { isMounted = false; };
  }, [id]);

  return { doctor, loading, error };
}
```

---

### [MODIFIED] `src/pages/patient/DoctorProfilePage.jsx`

**Removed (~18 lines):**
- `import { useEffect, useState }` (no longer needed in this file)
- `import { doctorService }`
- `useState` declarations for `doctor` and `loading`
- Entire `useEffect` block with `isMounted` guard

**Added (1 line):**
- `import { useDoctor } from '../../hooks/useDoctor';`
- `const { doctor, loading } = useDoctor(id);`

Net change: **−18 lines**

---

### [MODIFIED] `src/pages/patient/BookAppointmentPage.jsx`

**Removed (~25 lines):**
- `import { doctorService }`
- `useState` declarations for `doctor` and `loading`
- Entire fetch `useEffect` block (including mixed `setSelectedSlot` logic)

**Added:**
- `import { useDoctor } from '../../hooks/useDoctor';`
- `const { doctor, loading } = useDoctor(doctorId || 'doc-1');`
- Isolated `useEffect` that seeds `selectedSlot` from `doctor.availableSlots`
  (this is a UI concern and correctly stays in the page component)

Net change: **−14 lines**

---

## Verification

| Check                        | Result                                     |
|------------------------------|--------------------------------------------|
| Dev server starts            | ✅ Running on port 5174                    |
| App loads (`/`)              | ✅ "MedLink Care" title confirmed          |
| Doctor Profile page          | ✅ Loads via `useDoctor(id)`               |
| Book Appointment page        | ✅ Loads via `useDoctor(doctorId\|'doc-1')`|
| Lint — new files (3 files)   | ✅ **0 errors** / 2 warnings (same as baseline before refactor) |
| Production build             | ✅ **83 modules, 0 errors** — `dist/` emitted |

> **Note on lint warnings:** The 2 `react(set-state-in-effect)` warnings
> existed in the original code (one per page, both on `setLoading(true)`).
> After the refactor the count is unchanged — one warning is now in the hook
> (where it belongs), and one is in `BookAppointmentPage` for the
> `setSelectedSlot` UI effect. No new warnings were introduced.

---

## How Separation of Concerns Improved

| Layer              | Before                                      | After                        |
|--------------------|---------------------------------------------|------------------------------|
| `doctorService`    | Data access                                 | Data access (unchanged)      |
| `useDoctor`        | ❌ Did not exist                            | ✅ Fetch state & lifecycle    |
| `DoctorProfilePage`| Fetch logic + presentation + navigation     | Presentation + navigation    |
| `BookAppointmentPage` | Fetch logic + UI state + booking action  | UI state + booking action    |

Any future change to how a single doctor is fetched (real API, caching,
pagination) now has **one edit point**: `useDoctor.js`.

---

## Remaining Readability Issues (Out of Scope)

- `BookAppointmentPage` has a `useEffect` to seed `selectedSlot` from
  `doctor.availableSlots`. This could eventually become a derived value via
  `useMemo`, but it is a UI concern and not part of this target.
- `DoctorProfilePage` does not consume the `error` field returned by
  `useDoctor`. Handling it explicitly would improve UX but is a behaviour
  change, not in scope.

---

## Summary

- **1 file created:** `src/hooks/useDoctor.js`
- **2 files modified:** `DoctorProfilePage.jsx`, `BookAppointmentPage.jsx`
- **~32 lines of duplicated fetch boilerplate removed** across the two pages
- **0 behaviour changes. 0 UI changes.**
