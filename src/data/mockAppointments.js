/**
 * Mock Appointments Data
 * Doctor images import the same local assets used in mockDoctors
 * to ensure a single source of truth per person.
 */

import drPriyaNair from '../assets/avatars/dr_priya_nair.jpg';
import drRohanMehta from '../assets/avatars/dr_rohan_mehta.jpg';

export const MOCK_APPOINTMENTS = [
  {
    id: 'apt-001',
    doctorId: 'doc-1',
    doctorName: 'Dr. Priya Nair',
    doctorTitle: 'Senior Cardiologist',
    department: 'Cardiology Dept.',
    doctorImage: drPriyaNair,
    date: '2026-10-24',
    time: '10:30 AM',
    status: 'Confirmed',
    location: 'Apollo Heart Institute, Apollo Hospitals, Bengaluru – Room 304',
    reason: 'Routine Cardiac Follow-up & ECG',
  },
  {
    id: 'apt-002',
    doctorId: 'doc-2',
    doctorName: 'Dr. Rohan Mehta',
    doctorTitle: 'Paediatric Specialist',
    department: 'Paediatrics Dept.',
    doctorImage: drRohanMehta,
    date: '2026-11-05',
    time: '02:00 PM',
    status: 'Pending',
    location: 'Apollo Children\'s Wing, Apollo Hospitals, Bengaluru – Room 102',
    reason: 'Annual Health Check',
  },
];

