-- ============================================================================
-- Migration: 001_add_password_hash.sql
-- Description: Adds password_hash column to users table and health profile fields
--              (allergies, chronic_conditions) to patients table.
-- ============================================================================

USE `medlink_care`;

-- Add password_hash column to users if it does not already exist
SET @col_exists = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = 'medlink_care'
    AND TABLE_NAME = 'users'
    AND COLUMN_NAME = 'password_hash'
);

SET @sql_users = IF(
  @col_exists = 0,
  'ALTER TABLE `users` ADD COLUMN `password_hash` VARCHAR(255) NOT NULL AFTER `phone`;',
  'SELECT "password_hash column already exists in users table.";'
);

PREPARE stmt_users FROM @sql_users;
EXECUTE stmt_users;
DEALLOCATE PREPARE stmt_users;

-- Add allergies column to patients if it does not already exist
SET @allergies_exists = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = 'medlink_care'
    AND TABLE_NAME = 'patients'
    AND COLUMN_NAME = 'allergies'
);

SET @sql_allergies = IF(
  @allergies_exists = 0,
  'ALTER TABLE `patients` ADD COLUMN `allergies` TEXT NULL AFTER `emergency_contact_phone`;',
  'SELECT "allergies column already exists in patients table.";'
);

PREPARE stmt_allergies FROM @sql_allergies;
EXECUTE stmt_allergies;
DEALLOCATE PREPARE stmt_allergies;

-- Add chronic_conditions column to patients if it does not already exist
SET @conditions_exists = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = 'medlink_care'
    AND TABLE_NAME = 'patients'
    AND COLUMN_NAME = 'chronic_conditions'
);

SET @sql_conditions = IF(
  @conditions_exists = 0,
  'ALTER TABLE `patients` ADD COLUMN `chronic_conditions` TEXT NULL AFTER `allergies`;',
  'SELECT "chronic_conditions column already exists in patients table.";'
);

PREPARE stmt_conditions FROM @sql_conditions;
EXECUTE stmt_conditions;
DEALLOCATE PREPARE stmt_conditions;
