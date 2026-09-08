/**
 * Mock Past Visits & Medical Records Data
 * Directly matching Stitch screens.
 */

export const MOCK_VISITS = [
  {
    id: 'vis-1',
    title: 'General Checkup',
    date: 'Sep 12, 2023',
    doctor: 'Dr. Robert Chen',
    type: 'checkup',
    icon: 'medical_services',
    diagnosis: 'Healthy vitals, blood pressure well controlled.',
    notes: 'Patient advised to maintain regular low-sodium diet and daily exercise.',
    prescriptions: ['Multivitamin 1x daily'],
  },
  {
    id: 'vis-2',
    title: 'Flu Vaccination',
    date: 'Oct 05, 2022',
    doctor: 'Nurse Emily Davis',
    type: 'vaccine',
    icon: 'vaccines',
    diagnosis: 'Annual influenza vaccine administered without adverse reaction.',
    notes: 'No immediate sensitivity observed during 15m post-shot observation.',
    prescriptions: [],
  },
  {
    id: 'vis-3',
    title: 'X-Ray (Left Arm)',
    date: 'Jun 18, 2022',
    doctor: 'Dr. Alan Turing',
    type: 'radiology',
    icon: 'radiology',
    diagnosis: 'No bone fractures or dislocations detected.',
    notes: 'Minor soft tissue contusion. Rest and cold pack application recommended.',
    prescriptions: ['Ibuprofen 400mg as needed'],
  },
];
