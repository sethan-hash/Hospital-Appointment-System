/**
 * Application Constants
 * Defines role keys, appointment statuses, blood types, and navigation routes.
 */

export const USER_ROLES = {
  PATIENT: 'PATIENT',
  DOCTOR: 'DOCTOR',
  RECEPTIONIST: 'RECEPTIONIST',
  ADMIN: 'ADMIN',
};

export const APPOINTMENT_STATUS = {
  CONFIRMED: 'Confirmed',
  PENDING: 'Pending',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  IN_PROGRESS: 'In Progress',
};

export const BLOOD_TYPES = [
  { value: 'A+', label: 'A+' },
  { value: 'A-', label: 'A-' },
  { value: 'B+', label: 'B+' },
  { value: 'B-', label: 'B-' },
  { value: 'AB+', label: 'AB+' },
  { value: 'AB-', label: 'AB-' },
  { value: 'O+', label: 'O+' },
  { value: 'O-', label: 'O-' },
  { value: 'unknown', label: "I don't know" },
];

export const GENDERS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];

export const EMERGENCY_RELATIONSHIPS = [
  { value: 'spouse', label: 'Spouse' },
  { value: 'parent', label: 'Parent' },
  { value: 'sibling', label: 'Sibling' },
  { value: 'child', label: 'Child' },
  { value: 'friend', label: 'Friend' },
];

export const PATIENT_NAV_ITEMS = [
  {
    id: 'home',
    label: 'Home',
    icon: 'home',
    path: '/patient/dashboard',
  },
  {
    id: 'search',
    label: 'Search',
    icon: 'search',
    path: '/patient/doctors',
  },
  {
    id: 'records',
    label: 'Records',
    icon: 'description',
    path: '/patient/visits',
  },
  {
    id: 'profile',
    label: 'Profile',
    icon: 'person',
    path: '/patient/profile',
  },
];
