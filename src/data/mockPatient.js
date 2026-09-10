/**
 * Mock Patient Profile Data
 * Contains demo user details, vitals, and health record summary.
 */

import patientAvatar from '../assets/avatars/patient_arjun_sharma.jpg';

export const MOCK_PATIENT = {
  id: 'pat-1001',
  name: 'Arjun Sharma',
  email: 'arjun.sharma@example.in',
  phone: '+91 98765 43210',
  dob: '1988-04-14',
  gender: 'male',
  bloodType: 'O+',
  allergies: 'Penicillin',
  chronicConditions: 'Mild Hypertension',
  avatar: patientAvatar,
  emergencyContact: {
    name: 'Meera Sharma',
    relationship: 'spouse',
    phone: '+91 98765 00001',
  },
  vitals: {
    weight: '72 kg',
    bloodPressure: '120/80',
    pendingLabResultsCount: 2,
    heartRate: '72 bpm',
  },
};

