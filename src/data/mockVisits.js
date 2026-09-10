/**
 * Mock Past Visits & Medical Records Data
 * Directly matching Stitch screens.
 */

export const MOCK_VISITS = [
  {
    id: 'vis-1',
    title: 'General Checkup',
    date: '12 Sep 2023',
    doctor: 'Dr. Vikram Menon',
    type: 'checkup',
    icon: 'medical_services',
    diagnosis: 'Healthy vitals, blood pressure well controlled.',
    notes: 'Patient advised to maintain a regular low-sodium diet and daily walking of 30 minutes.',
    prescriptions: ['Multivitamin tablet 1x daily', 'Ecosprin 75 mg once daily'],
  },
  {
    id: 'vis-2',
    title: 'Flu Vaccination',
    date: '05 Oct 2022',
    doctor: 'Nurse Kavitha Reddy',
    type: 'vaccine',
    icon: 'vaccines',
    diagnosis: 'Annual influenza vaccine administered without adverse reaction.',
    notes: 'No immediate sensitivity observed during 15-minute post-shot observation.',
    prescriptions: [],
  },
  {
    id: 'vis-3',
    title: 'X-Ray (Left Arm)',
    date: '18 Jun 2022',
    doctor: 'Dr. Suresh Babu',
    type: 'radiology',
    icon: 'radiology',
    diagnosis: 'No bone fractures or dislocations detected.',
    notes: 'Minor soft tissue contusion. Rest and cold pack application recommended.',
    prescriptions: ['Ibuprofen 400 mg as needed', 'Pan-D 1x daily for 5 days'],
  },
];

