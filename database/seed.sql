-- ============================================================================
-- MedLink Care - MySQL Development Seed Data
-- Phase 2: Indian Healthcare Demo Data (Apollo Hospitals Bengaluru)
-- ============================================================================

USE `medlink_care`;

-- Clear existing data safely (in reverse dependency order)
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE `medications`;
TRUNCATE TABLE `medical_records`;
TRUNCATE TABLE `vitals`;
TRUNCATE TABLE `reviews`;
TRUNCATE TABLE `invoices`;
TRUNCATE TABLE `resources`;
TRUNCATE TABLE `appointments`;
TRUNCATE TABLE `doctor_schedules`;
TRUNCATE TABLE `doctors`;
TRUNCATE TABLE `patients`;
TRUNCATE TABLE `users`;
SET FOREIGN_KEY_CHECKS = 1;

-- ----------------------------------------------------------------------------
-- 1. Seed: users
-- 4 Doctors, 5 Patients, 1 Receptionist, 1 Admin
-- Default password for all seed accounts: Password123!
-- ----------------------------------------------------------------------------
INSERT INTO `users` (`id`, `role`, `full_name`, `email`, `phone`, `password_hash`, `status`) VALUES
(1, 'DOCTOR', 'Dr. Priya Sharma', 'priya.sharma@apollohospitals.com', '+91 98450 12345', '$2b$10$Qg5dcBiYIBTgpcMkEAg6I.3QzbdZGJJTpL/4YSWzORuyVgr5bRqWi', 'ACTIVE'),
(2, 'DOCTOR', 'Dr. Rajesh Kulkarni', 'rajesh.kulkarni@apollohospitals.com', '+91 98450 23456', '$2b$10$Qg5dcBiYIBTgpcMkEAg6I.3QzbdZGJJTpL/4YSWzORuyVgr5bRqWi', 'ACTIVE'),
(3, 'DOCTOR', 'Dr. Ananya Iyer', 'ananya.iyer@apollohospitals.com', '+91 98450 34567', '$2b$10$Qg5dcBiYIBTgpcMkEAg6I.3QzbdZGJJTpL/4YSWzORuyVgr5bRqWi', 'ACTIVE'),
(4, 'DOCTOR', 'Dr. Vikram Venkatesh', 'vikram.venkatesh@apollohospitals.com', '+91 98450 45678', '$2b$10$Qg5dcBiYIBTgpcMkEAg6I.3QzbdZGJJTpL/4YSWzORuyVgr5bRqWi', 'ACTIVE'),
(5, 'PATIENT', 'Rahul Verma', 'rahul.verma@example.in', '+91 99001 11223', '$2b$10$Qg5dcBiYIBTgpcMkEAg6I.3QzbdZGJJTpL/4YSWzORuyVgr5bRqWi', 'ACTIVE'),
(6, 'PATIENT', 'Sneha Patel', 'sneha.patel@example.in', '+91 99002 22334', '$2b$10$Qg5dcBiYIBTgpcMkEAg6I.3QzbdZGJJTpL/4YSWzORuyVgr5bRqWi', 'ACTIVE'),
(7, 'PATIENT', 'Amit Sundaram', 'amit.sundaram@example.in', '+91 99003 33445', '$2b$10$Qg5dcBiYIBTgpcMkEAg6I.3QzbdZGJJTpL/4YSWzORuyVgr5bRqWi', 'ACTIVE'),
(8, 'PATIENT', 'Deepa Nair', 'deepa.nair@example.in', '+91 99004 44556', '$2b$10$Qg5dcBiYIBTgpcMkEAg6I.3QzbdZGJJTpL/4YSWzORuyVgr5bRqWi', 'ACTIVE'),
(9, 'PATIENT', 'Karthik Reddy', 'karthik.reddy@example.in', '+91 99005 55667', '$2b$10$Qg5dcBiYIBTgpcMkEAg6I.3QzbdZGJJTpL/4YSWzORuyVgr5bRqWi', 'ACTIVE'),
(10, 'RECEPTIONIST', 'Sunita Rao', 'sunita.rao@apollohospitals.com', '+91 98451 99887', '$2b$10$Qg5dcBiYIBTgpcMkEAg6I.3QzbdZGJJTpL/4YSWzORuyVgr5bRqWi', 'ACTIVE'),
(11, 'ADMIN', 'Manoj Kumar', 'admin.manoj@apollohospitals.com', '+91 98452 88776', '$2b$10$Qg5dcBiYIBTgpcMkEAg6I.3QzbdZGJJTpL/4YSWzORuyVgr5bRqWi', 'ACTIVE');

-- ----------------------------------------------------------------------------
-- 2. Seed: doctors
-- Profiles linked to users 1-4
-- ----------------------------------------------------------------------------
INSERT INTO `doctors` (`id`, `user_id`, `specialization`, `qualification`, `department`, `hospital_name`, `consultation_fee`, `experience_years`, `bio`, `is_available`) VALUES
(1, 1, 'Cardiology', 'MBBS, MD (Cardiology), DM', 'Cardiology', 'Apollo Hospitals Bengaluru', 1000.00, 14, 'Senior Interventional Cardiologist specializing in preventive cardiology and heart failure management.', TRUE),
(2, 2, 'Neurology', 'MBBS, MD, DM (Neurology)', 'Neurology', 'Apollo Hospitals Bengaluru', 1200.00, 16, 'Chief Neurologist with extensive expertise in stroke rehabilitation, migraine, and neurodegenerative disorders.', TRUE),
(3, 3, 'Pediatrics', 'MBBS, DCH, DNB (Pediatrics)', 'Pediatrics', 'Apollo Hospitals Bengaluru', 800.00, 9, 'Consultant Pediatrician dedicated to neonatal care, child immunization, and developmental health.', TRUE),
(4, 4, 'Orthopedics', 'MBBS, MS (Orthopedics), M.Ch', 'Orthopedics', 'Apollo Hospitals Bengaluru', 900.00, 12, 'Joint Replacement Specialist focusing on arthroscopy, knee/hip surgery, and sports injuries.', TRUE);

-- ----------------------------------------------------------------------------
-- 3. Seed: patients
-- Profiles linked to users 5-9
-- ----------------------------------------------------------------------------
INSERT INTO `patients` (`id`, `user_id`, `date_of_birth`, `gender`, `blood_group`, `address`, `city`, `state`, `pincode`, `emergency_contact_name`, `emergency_contact_phone`) VALUES
(1, 5, '1988-04-14', 'MALE', 'O+', '42, 4th Cross, Indiranagar', 'Bengaluru', 'Karnataka', '560038', 'Pooja Verma', '+91 99001 99881'),
(2, 6, '1995-09-22', 'FEMALE', 'B+', '108, Palm Meadows, Whitefield', 'Bengaluru', 'Karnataka', '560066', 'Nilesh Patel', '+91 99002 88772'),
(3, 7, '1972-11-03', 'MALE', 'A+', '17, 14th Main, HSR Layout Sector 4', 'Bengaluru', 'Karnataka', '560102', 'Latha Sundaram', '+91 99003 77663'),
(4, 8, '1991-01-30', 'FEMALE', 'AB+', '88, 5th Block, Koramangala', 'Bengaluru', 'Karnataka', '560095', 'Rohan Nair', '+91 99004 66554'),
(5, 9, '2001-07-19', 'MALE', 'B-', '56, 2nd Stage, JP Nagar', 'Bengaluru', 'Karnataka', '560078', 'Venkat Reddy', '+91 99005 55445');

-- ----------------------------------------------------------------------------
-- 4. Seed: doctor_schedules
-- Recurring weekly slots for Apollo Bengaluru OPD
-- ----------------------------------------------------------------------------
INSERT INTO `doctor_schedules` (`doctor_id`, `day_of_week`, `start_time`, `end_time`, `slot_duration_minutes`, `is_active`) VALUES
(1, 'MONDAY', '09:00:00', '13:00:00', 30, TRUE),
(1, 'WEDNESDAY', '09:00:00', '13:00:00', 30, TRUE),
(1, 'FRIDAY', '14:00:00', '18:00:00', 30, TRUE),
(2, 'TUESDAY', '10:00:00', '14:00:00', 30, TRUE),
(2, 'THURSDAY', '10:00:00', '14:00:00', 30, TRUE),
(2, 'SATURDAY', '09:00:00', '12:00:00', 30, TRUE),
(3, 'MONDAY', '10:00:00', '16:00:00', 20, TRUE),
(3, 'WEDNESDAY', '10:00:00', '16:00:00', 20, TRUE),
(3, 'FRIDAY', '10:00:00', '16:00:00', 20, TRUE),
(4, 'TUESDAY', '09:00:00', '13:00:00', 30, TRUE),
(4, 'THURSDAY', '14:00:00', '18:00:00', 30, TRUE),
(4, 'SATURDAY', '13:00:00', '17:00:00', 30, TRUE);

-- ----------------------------------------------------------------------------
-- 5. Seed: appointments
-- Booking records across patients and doctors
-- ----------------------------------------------------------------------------
INSERT INTO `appointments` (`id`, `patient_id`, `doctor_id`, `appointment_date`, `appointment_time`, `status`, `type`, `reason_for_visit`) VALUES
(1, 1, 1, '2026-09-10', '09:30:00', 'COMPLETED', 'IN_PERSON', 'Routine cardiac checkup and BP evaluation'),
(2, 2, 3, '2026-09-12', '10:20:00', 'COMPLETED', 'IN_PERSON', 'Pediatric seasonal allergy consultation'),
(3, 3, 2, '2026-09-14', '11:00:00', 'COMPLETED', 'IN_PERSON', 'Chronic tension headache and vertigo review'),
(4, 4, 1, '2026-09-18', '10:00:00', 'SCHEDULED', 'TELECONSULTATION', 'Follow-up on lipid profile and ECG review'),
(5, 5, 4, '2026-09-19', '14:30:00', 'SCHEDULED', 'IN_PERSON', 'Right knee sports injury evaluation');

-- ----------------------------------------------------------------------------
-- 6. Seed: medical_records
-- Consultations and diagnoses for completed visits
-- ----------------------------------------------------------------------------
INSERT INTO `medical_records` (`id`, `patient_id`, `doctor_id`, `appointment_id`, `diagnosis`, `treatment_plan`, `doctor_notes`, `visit_date`) VALUES
(1, 1, 1, 1, 'Stage 1 Hypertension; Mild dyslipidemia', 'Lifestyle modification, low sodium diet, daily 30 min brisk walk, and antihypertensive medication.', 'Patient advised regular BP monitoring. Scheduled repeat lipid test in 8 weeks.', '2026-09-10'),
(2, 2, 3, 2, 'Allergic Rhinitis with bronchial hyper-reactivity', 'Prescribed antihistamine and nasal spray. Avoid cold beverages and air pollutants.', 'Child is responding well to oral drops. Review after 10 days if symptoms persist.', '2026-09-12'),
(3, 3, 2, 3, 'Cervicogenic Headache with mild postural strain', 'Physical therapy for cervical spine, ergonomic desk setup, and mild analgesic course.', 'No focal neurological deficits detected. Recommended physical therapy sessions at Apollo Physiotherapy.', '2026-09-14');

-- ----------------------------------------------------------------------------
-- 7. Seed: vitals
-- Physiological measurements recorded during patient visits
-- ----------------------------------------------------------------------------
INSERT INTO `vitals` (`id`, `patient_id`, `appointment_id`, `recorded_at`, `blood_pressure_systolic`, `blood_pressure_diastolic`, `heart_rate_bpm`, `respiratory_rate_bpm`, `temperature_celsius`, `spo2_percentage`, `weight_kg`, `height_cm`, `bmi`, `notes`) VALUES
(1, 1, 1, '2026-09-10 09:35:00', 138, 88, 76, 16, 36.8, 98.5, 74.50, 172.00, 25.2, 'Slightly elevated BP; patient was rushing prior to checkup.'),
(2, 2, 2, '2026-09-12 10:25:00', 108, 68, 88, 20, 37.1, 99.0, 22.00, 118.00, 15.8, 'Pediatric patient, normal developmental percentiles.'),
(3, 3, 3, '2026-09-14 11:05:00', 124, 82, 72, 17, 36.7, 98.0, 68.00, 168.00, 24.1, 'Vitals stable; cervical tenderness noted on exam.'),
(4, 4, NULL, '2026-09-15 08:30:00', 118, 76, 70, 16, 36.6, 99.0, 62.00, 165.00, 22.8, 'Self-reported home monitoring.');

-- ----------------------------------------------------------------------------
-- 8. Seed: medications
-- Prescriptions tied to medical records
-- ----------------------------------------------------------------------------
INSERT INTO `medications` (`id`, `medical_record_id`, `medicine_name`, `dosage`, `frequency`, `duration`, `instructions`) VALUES
(1, 1, 'Telmisartan 40mg', '1 Tablet', 'Once daily in the morning', '30 days', 'Take with or without food.'),
(2, 1, 'Atorvastatin 10mg', '1 Tablet', 'Once daily at bedtime', '30 days', 'Take after dinner.'),
(3, 2, 'Montelukast + Levocetirizine Syrup (Monticope)', '5 ml', 'Once daily at night', '7 days', 'Administer before sleep.'),
(4, 2, 'Fluticasone Propionate Nasal Spray', '1 Spray per nostril', 'Twice daily', '14 days', 'Blow nose gently before application.'),
(5, 3, 'Naproxen 250mg', '1 Tablet', 'Twice daily after food', '5 days', 'Take with an antacid.');

-- ----------------------------------------------------------------------------
-- 9. Seed: reviews
-- Patient reviews for doctors
-- ----------------------------------------------------------------------------
INSERT INTO `reviews` (`id`, `patient_id`, `doctor_id`, `appointment_id`, `rating`, `comment`, `created_at`) VALUES
(1, 1, 1, 1, 5, 'Dr. Priya Sharma is extremely patient and thorough. She explained my BP readings and diet changes very clearly.', '2026-09-10 12:00:00'),
(2, 2, 3, 2, 5, 'Dr. Ananya Iyer is wonderful with kids. My child felt at ease right away. Very happy with the care.', '2026-09-12 13:30:00'),
(3, 3, 2, 3, 4, 'Very knowledgeable doctor. Prompt diagnosis and helpful physiotherapy recommendations.', '2026-09-14 14:00:00');

-- ----------------------------------------------------------------------------
-- 10. Seed: invoices
-- INR billing invoices for hospital consultations
-- ----------------------------------------------------------------------------
INSERT INTO `invoices` (`id`, `invoice_number`, `patient_id`, `appointment_id`, `consultation_fee`, `procedure_fee`, `medicine_fee`, `tax_amount`, `total_amount`, `currency`, `payment_status`, `payment_method`, `issue_date`, `paid_at`) VALUES
(1, 'INV-2026-00101', 1, 1, 1000.00, 350.00, 0.00, 67.50, 1417.50, 'INR', 'PAID', 'UPI', '2026-09-10', '2026-09-10 10:15:00'),
(2, 'INV-2026-00102', 2, 2, 800.00, 0.00, 0.00, 40.00, 840.00, 'INR', 'PAID', 'CREDIT_CARD', '2026-09-12', '2026-09-12 11:00:00'),
(3, 'INV-2026-00103', 3, 3, 1200.00, 500.00, 0.00, 85.00, 1785.00, 'INR', 'PAID', 'NET_BANKING', '2026-09-14', '2026-09-14 12:15:00'),
(4, 'INV-2026-00104', 4, 4, 1000.00, 0.00, 0.00, 50.00, 1050.00, 'INR', 'PENDING', NULL, '2026-09-16', NULL);

-- ----------------------------------------------------------------------------
-- 11. Seed: resources
-- Apollo Hospitals Bengaluru medical infrastructure
-- ----------------------------------------------------------------------------
INSERT INTO `resources` (`id`, `resource_type`, `resource_code`, `hospital_name`, `location_ward`, `status`, `allocated_patient_id`, `last_inspected_at`) VALUES
(1, 'ICU_BED', 'AP-BLR-ICU-01', 'Apollo Hospitals Bengaluru', 'Block A, 2nd Floor, Critical Care Unit', 'OCCUPIED', 3, '2026-09-15 08:00:00'),
(2, 'ICU_BED', 'AP-BLR-ICU-02', 'Apollo Hospitals Bengaluru', 'Block A, 2nd Floor, Critical Care Unit', 'AVAILABLE', NULL, '2026-09-16 06:00:00'),
(3, 'GENERAL_BED', 'AP-BLR-GEN-101', 'Apollo Hospitals Bengaluru', 'Block B, 3rd Floor, Male General Ward', 'AVAILABLE', NULL, '2026-09-15 14:00:00'),
(4, 'GENERAL_BED', 'AP-BLR-GEN-204', 'Apollo Hospitals Bengaluru', 'Block B, 4th Floor, Female General Ward', 'AVAILABLE', NULL, '2026-09-15 14:00:00'),
(5, 'VENTILATOR', 'AP-BLR-VENT-03', 'Apollo Hospitals Bengaluru', 'Block A, 2nd Floor, Critical Care Unit', 'OCCUPIED', 3, '2026-09-15 08:00:00'),
(6, 'VENTILATOR', 'AP-BLR-VENT-04', 'Apollo Hospitals Bengaluru', 'Block A, 2nd Floor, Emergency Storage', 'AVAILABLE', NULL, '2026-09-16 07:30:00'),
(7, 'OXYGEN_CYLINDER', 'AP-BLR-O2-12', 'Apollo Hospitals Bengaluru', 'Central Gas Manifold, Ground Floor', 'AVAILABLE', NULL, '2026-09-16 05:00:00'),
(8, 'AMBULANCE', 'KA-01-MD-9001', 'Apollo Hospitals Bengaluru', 'Emergency Bay 1, Main Entrance', 'AVAILABLE', NULL, '2026-09-16 06:30:00'),
(9, 'OPERATION_THEATRE', 'AP-BLR-OT-02', 'Apollo Hospitals Bengaluru', 'Block C, 1st Floor, Surgical Suites', 'AVAILABLE', NULL, '2026-09-16 07:00:00');
