/**
 * Mock Patient Profile Data
 * Contains demo user details, vitals, and health record summary.
 */

export const MOCK_PATIENT = {
  id: 'pat-1001',
  name: 'John Doe',
  email: 'patient@example.com',
  phone: '(555) 000-0000',
  dob: '1988-04-14',
  gender: 'male',
  bloodType: 'O+',
  allergies: 'Penicillin',
  chronicConditions: 'Mild Hypertension',
  avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBwv7YvACnpxvfONcpHV6SwsdxDqAGb3L18VU93o1FllMvHljBvvDVh23T8_jnk4a02dQcZ15lpPvp8smnPFR3I-KXwsl3MVhhwCSeQutdoiKVg0UXDMh8oTAJTIVYU4vC9HfmJg7EEOo0eH7toaARnWiywQx0LV9GFmBvdGDXDaD_P_h7_LqumXJQyxugqXA6pu7WaN7Xe2LtIpHGrE3Pbm-CKLt63RjxivCu8DWKlPgTAsKklqGbE',
  emergencyContact: {
    name: 'Jane Doe',
    relationship: 'spouse',
    phone: '(555) 019-2834',
  },
  vitals: {
    weight: '165 lbs',
    bloodPressure: '120/80',
    pendingLabResultsCount: 2,
    heartRate: '72 bpm',
  },
};
