-- ============================================================================
-- MedLink Care - MySQL Database Schema
-- Phase 2: Database Foundation
-- Character Set: utf8mb4 | Collation: utf8mb4_unicode_ci
-- ============================================================================

-- Create and select database
CREATE DATABASE IF NOT EXISTS `medlink_care`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE `medlink_care`;

-- ----------------------------------------------------------------------------
-- 1. Table: users
-- Core authentication and platform identity table.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `role` ENUM('PATIENT', 'DOCTOR', 'RECEPTIONIST', 'ADMIN') NOT NULL,
  `full_name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(150) NOT NULL UNIQUE,
  `phone` VARCHAR(20) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `status` ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED') NOT NULL DEFAULT 'ACTIVE',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_users_role` (`role`),
  INDEX `idx_users_status` (`status`)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 2. Table: patients
-- Profile and demographic information for patients.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `patients` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` BIGINT UNSIGNED NOT NULL UNIQUE,
  `date_of_birth` DATE NULL,
  `gender` ENUM('MALE', 'FEMALE', 'OTHER') NOT NULL,
  `blood_group` ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-') NULL,
  `address` VARCHAR(255) NULL,
  `city` VARCHAR(100) NOT NULL DEFAULT 'Bengaluru',
  `state` VARCHAR(100) NOT NULL DEFAULT 'Karnataka',
  `pincode` VARCHAR(10) NULL,
  `emergency_contact_name` VARCHAR(100) NULL,
  `emergency_contact_phone` VARCHAR(20) NULL,
  `allergies` TEXT NULL,
  `chronic_conditions` TEXT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_patients_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX `idx_patients_city` (`city`)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 3. Table: doctors
-- Profile, credentials, and consultation metadata for doctors.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `doctors` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` BIGINT UNSIGNED NOT NULL UNIQUE,
  `specialization` VARCHAR(100) NOT NULL,
  `qualification` VARCHAR(150) NOT NULL,
  `department` VARCHAR(100) NOT NULL,
  `hospital_name` VARCHAR(150) NOT NULL DEFAULT 'Apollo Hospitals Bengaluru',
  `consultation_fee` DECIMAL(10, 2) NOT NULL DEFAULT 800.00,
  `experience_years` INT UNSIGNED NOT NULL DEFAULT 5,
  `bio` TEXT NULL,
  `is_available` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_doctors_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX `idx_doctors_specialization` (`specialization`),
  INDEX `idx_doctors_department` (`department`),
  INDEX `idx_doctors_available` (`is_available`)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 4. Table: doctor_schedules
-- Recurring weekly availability slots for doctors.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `doctor_schedules` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `doctor_id` BIGINT UNSIGNED NOT NULL,
  `day_of_week` ENUM('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY') NOT NULL,
  `start_time` TIME NOT NULL,
  `end_time` TIME NOT NULL,
  `slot_duration_minutes` INT UNSIGNED NOT NULL DEFAULT 30,
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_schedules_doctor`
    FOREIGN KEY (`doctor_id`) REFERENCES `doctors` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `uq_doctor_day_time`
    UNIQUE (`doctor_id`, `day_of_week`, `start_time`),
  INDEX `idx_schedules_doctor_day` (`doctor_id`, `day_of_week`)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 5. Table: appointments
-- Appointments booked between patients and doctors.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `appointments` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `patient_id` BIGINT UNSIGNED NOT NULL,
  `doctor_id` BIGINT UNSIGNED NOT NULL,
  `appointment_date` DATE NOT NULL,
  `appointment_time` TIME NOT NULL,
  `status` ENUM('SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW') NOT NULL DEFAULT 'SCHEDULED',
  `type` ENUM('IN_PERSON', 'TELECONSULTATION') NOT NULL DEFAULT 'IN_PERSON',
  `reason_for_visit` VARCHAR(255) NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_appointments_patient`
    FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_appointments_doctor`
    FOREIGN KEY (`doctor_id`) REFERENCES `doctors` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  INDEX `idx_appointments_doctor_date` (`doctor_id`, `appointment_date`),
  INDEX `idx_appointments_patient_date` (`patient_id`, `appointment_date`),
  INDEX `idx_appointments_status` (`status`)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 6. Table: medical_records
-- Clinical consultation records, diagnosis, and doctor notes.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `medical_records` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `patient_id` BIGINT UNSIGNED NOT NULL,
  `doctor_id` BIGINT UNSIGNED NOT NULL,
  `appointment_id` BIGINT UNSIGNED NULL,
  `diagnosis` TEXT NOT NULL,
  `treatment_plan` TEXT NULL,
  `doctor_notes` TEXT NULL,
  `visit_date` DATE NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_records_patient`
    FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_records_doctor`
    FOREIGN KEY (`doctor_id`) REFERENCES `doctors` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_records_appointment`
    FOREIGN KEY (`appointment_id`) REFERENCES `appointments` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  INDEX `idx_records_patient_date` (`patient_id`, `visit_date`),
  INDEX `idx_records_doctor` (`doctor_id`)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 7. Table: vitals
-- Physiological measurements recorded during patient consultations.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `vitals` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `patient_id` BIGINT UNSIGNED NOT NULL,
  `appointment_id` BIGINT UNSIGNED NULL,
  `recorded_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `blood_pressure_systolic` INT UNSIGNED NULL,
  `blood_pressure_diastolic` INT UNSIGNED NULL,
  `heart_rate_bpm` INT UNSIGNED NULL,
  `respiratory_rate_bpm` INT UNSIGNED NULL,
  `temperature_celsius` DECIMAL(4, 1) NULL,
  `spo2_percentage` DECIMAL(4, 1) NULL,
  `weight_kg` DECIMAL(5, 2) NULL,
  `height_cm` DECIMAL(5, 2) NULL,
  `bmi` DECIMAL(4, 1) NULL,
  `notes` VARCHAR(255) NULL,
  CONSTRAINT `fk_vitals_patient`
    FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_vitals_appointment`
    FOREIGN KEY (`appointment_id`) REFERENCES `appointments` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  INDEX `idx_vitals_patient_recorded` (`patient_id`, `recorded_at`)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 8. Table: medications
-- Prescribed medications linked to specific medical consultation records.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `medications` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `medical_record_id` BIGINT UNSIGNED NOT NULL,
  `medicine_name` VARCHAR(150) NOT NULL,
  `dosage` VARCHAR(100) NOT NULL,
  `frequency` VARCHAR(100) NOT NULL,
  `duration` VARCHAR(50) NOT NULL,
  `instructions` VARCHAR(255) NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_medications_record`
    FOREIGN KEY (`medical_record_id`) REFERENCES `medical_records` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX `idx_medications_record` (`medical_record_id`)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 9. Table: reviews
-- Patient feedback and ratings for doctors.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `reviews` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `patient_id` BIGINT UNSIGNED NOT NULL,
  `doctor_id` BIGINT UNSIGNED NOT NULL,
  `appointment_id` BIGINT UNSIGNED NULL,
  `rating` TINYINT UNSIGNED NOT NULL,
  `comment` TEXT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_reviews_patient`
    FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_reviews_doctor`
    FOREIGN KEY (`doctor_id`) REFERENCES `doctors` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_reviews_appointment`
    FOREIGN KEY (`appointment_id`) REFERENCES `appointments` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `chk_review_rating`
    CHECK (`rating` BETWEEN 1 AND 5),
  INDEX `idx_reviews_doctor` (`doctor_id`),
  INDEX `idx_reviews_patient` (`patient_id`)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 10. Table: invoices
-- Financial billing invoices generated for medical consultations and treatments.
-- Currency is INR (₹).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `invoices` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `invoice_number` VARCHAR(50) NOT NULL UNIQUE,
  `patient_id` BIGINT UNSIGNED NOT NULL,
  `appointment_id` BIGINT UNSIGNED NULL,
  `consultation_fee` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `procedure_fee` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `medicine_fee` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `tax_amount` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `total_amount` DECIMAL(10, 2) NOT NULL,
  `currency` VARCHAR(5) NOT NULL DEFAULT 'INR',
  `payment_status` ENUM('PENDING', 'PAID', 'PARTIALLY_PAID', 'CANCELLED', 'REFUNDED') NOT NULL DEFAULT 'PENDING',
  `payment_method` ENUM('UPI', 'CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'NET_BANKING', 'INSURANCE') NULL,
  `issue_date` DATE NOT NULL,
  `paid_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_invoices_patient`
    FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_invoices_appointment`
    FOREIGN KEY (`appointment_id`) REFERENCES `appointments` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  INDEX `idx_invoices_patient_status` (`patient_id`, `payment_status`),
  INDEX `idx_invoices_status` (`payment_status`),
  INDEX `idx_invoices_issue_date` (`issue_date`)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 11. Table: resources
-- Hospital infrastructure resources such as ICU beds, ventilators, and ambulances.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `resources` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `resource_type` ENUM('ICU_BED', 'GENERAL_BED', 'VENTILATOR', 'OXYGEN_CYLINDER', 'AMBULANCE', 'OPERATION_THEATRE') NOT NULL,
  `resource_code` VARCHAR(50) NOT NULL UNIQUE,
  `hospital_name` VARCHAR(150) NOT NULL DEFAULT 'Apollo Hospitals Bengaluru',
  `location_ward` VARCHAR(100) NOT NULL,
  `status` ENUM('AVAILABLE', 'OCCUPIED', 'UNDER_MAINTENANCE', 'RESERVED') NOT NULL DEFAULT 'AVAILABLE',
  `allocated_patient_id` BIGINT UNSIGNED NULL,
  `last_inspected_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_resources_patient`
    FOREIGN KEY (`allocated_patient_id`) REFERENCES `patients` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  INDEX `idx_resources_type_status` (`resource_type`, `status`),
  INDEX `idx_resources_hospital` (`hospital_name`)
) ENGINE=InnoDB;
