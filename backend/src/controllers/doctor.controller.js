import * as doctorService from '../services/doctor.service.js';

/**
 * Retrieves the authenticated doctor's dashboard data.
 * Doctor identity is derived exclusively from req.user.id (JWT) — never from the client.
 * GET /api/doctor/dashboard
 */
export async function getDashboard(req, res, next) {
  try {
    const data = await doctorService.getDashboardData(req.user.id);

    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'Doctor profile not found for this account.',
      });
    }

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Retrieves details for a specific appointment belonging to the authenticated doctor,
 * including basic patient information.
 * GET /api/doctor/appointments/:id
 */
export async function getAppointmentDetails(req, res, next) {
  try {
    const rawId = req.params.id;
    if (!rawId || !/^\d+$/.test(rawId) || Number(rawId) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid appointment ID',
      });
    }

    const appointmentId = parseInt(rawId, 10);
    const result = await doctorService.getDoctorAppointmentDetails(req.user.id, appointmentId);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Appointment details retrieved successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Retrieves the clinical consultation record, vitals, and medications for an appointment.
 * GET /api/doctor/appointments/:appointmentId/clinical-record
 */
export async function getClinicalRecord(req, res, next) {
  try {
    const rawId = req.params.appointmentId;
    if (!rawId || !/^\d+$/.test(rawId) || Number(rawId) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid appointment ID',
      });
    }

    const appointmentId = parseInt(rawId, 10);
    const result = await doctorService.getClinicalRecordByAppointmentId(req.user.id, appointmentId);

    if (result.error === 'APPOINTMENT_NOT_FOUND') {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found',
      });
    }

    if (result.error === 'DOCTOR_NOT_FOUND') {
      return res.status(404).json({
        success: false,
        message: 'Doctor profile not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Clinical record retrieved successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Creates or updates the clinical consultation record for an appointment.
 * PUT /api/doctor/appointments/:appointmentId/clinical-record
 */
export async function saveClinicalRecord(req, res, next) {
  try {
    const rawId = req.params.appointmentId;
    if (!rawId || !/^\d+$/.test(rawId) || Number(rawId) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid appointment ID',
      });
    }

    const { diagnosis, treatmentPlan, doctorNotes } = req.body;

    if (!diagnosis || typeof diagnosis !== 'string' || diagnosis.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Diagnosis is required and must be at least 2 characters.',
      });
    }

    if (diagnosis.trim().length > 2000) {
      return res.status(400).json({
        success: false,
        message: 'Diagnosis cannot exceed 2000 characters.',
      });
    }

    if (treatmentPlan && (typeof treatmentPlan !== 'string' || treatmentPlan.length > 2000)) {
      return res.status(400).json({
        success: false,
        message: 'Treatment plan cannot exceed 2000 characters.',
      });
    }

    if (doctorNotes && (typeof doctorNotes !== 'string' || doctorNotes.length > 2000)) {
      return res.status(400).json({
        success: false,
        message: 'Doctor notes cannot exceed 2000 characters.',
      });
    }

    const appointmentId = parseInt(rawId, 10);
    const result = await doctorService.saveClinicalRecord(req.user.id, appointmentId, {
      diagnosis: diagnosis.trim(),
      treatmentPlan: treatmentPlan ? treatmentPlan.trim() : null,
      doctorNotes: doctorNotes ? doctorNotes.trim() : null,
    });

    if (result.error === 'APPOINTMENT_NOT_FOUND') {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found',
      });
    }

    if (result.error === 'DOCTOR_NOT_FOUND') {
      return res.status(404).json({
        success: false,
        message: 'Doctor profile not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Clinical record saved successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Creates or updates vitals for an appointment.
 * PUT /api/doctor/appointments/:appointmentId/vitals
 */
export async function saveVitals(req, res, next) {
  try {
    const rawId = req.params.appointmentId;
    if (!rawId || !/^\d+$/.test(rawId) || Number(rawId) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid appointment ID',
      });
    }

    const body = req.body || {};
    const {
      bloodPressureSystolic,
      bloodPressureDiastolic,
      heartRateBpm,
      respiratoryRateBpm,
      temperatureCelsius,
      spo2Percentage,
      weightKg,
      heightCm,
      bmi,
      notes,
    } = body;

    // Validate numbers if present
    if (bloodPressureSystolic != null) {
      const v = Number(bloodPressureSystolic);
      if (isNaN(v) || v < 40 || v > 300) {
        return res.status(400).json({ success: false, message: 'Systolic blood pressure must be between 40 and 300' });
      }
    }

    if (bloodPressureDiastolic != null) {
      const v = Number(bloodPressureDiastolic);
      if (isNaN(v) || v < 30 || v > 200) {
        return res.status(400).json({ success: false, message: 'Diastolic blood pressure must be between 30 and 200' });
      }
    }

    if (heartRateBpm != null) {
      const v = Number(heartRateBpm);
      if (isNaN(v) || v < 30 || v > 250) {
        return res.status(400).json({ success: false, message: 'Heart rate must be between 30 and 250 bpm' });
      }
    }

    if (respiratoryRateBpm != null) {
      const v = Number(respiratoryRateBpm);
      if (isNaN(v) || v < 5 || v > 80) {
        return res.status(400).json({ success: false, message: 'Respiratory rate must be between 5 and 80 bpm' });
      }
    }

    if (temperatureCelsius != null) {
      const v = Number(temperatureCelsius);
      if (isNaN(v) || v < 30 || v > 45) {
        return res.status(400).json({ success: false, message: 'Temperature must be between 30°C and 45°C' });
      }
    }

    if (spo2Percentage != null) {
      const v = Number(spo2Percentage);
      if (isNaN(v) || v < 50 || v > 100) {
        return res.status(400).json({ success: false, message: 'SpO2 must be between 50% and 100%' });
      }
    }

    if (weightKg != null) {
      const v = Number(weightKg);
      if (isNaN(v) || v < 1 || v > 500) {
        return res.status(400).json({ success: false, message: 'Weight must be between 1 and 500 kg' });
      }
    }

    if (heightCm != null) {
      const v = Number(heightCm);
      if (isNaN(v) || v < 30 || v > 250) {
        return res.status(400).json({ success: false, message: 'Height must be between 30 and 250 cm' });
      }
    }

    if (bmi != null) {
      const v = Number(bmi);
      if (isNaN(v) || v < 5 || v > 100) {
        return res.status(400).json({ success: false, message: 'BMI must be between 5 and 100' });
      }
    }

    if (notes && (typeof notes !== 'string' || notes.length > 255)) {
      return res.status(400).json({ success: false, message: 'Vitals notes cannot exceed 255 characters' });
    }

    const appointmentId = parseInt(rawId, 10);
    const result = await doctorService.saveVitals(req.user.id, appointmentId, body);

    if (result.error === 'APPOINTMENT_NOT_FOUND') {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    if (result.error === 'DOCTOR_NOT_FOUND') {
      return res.status(404).json({ success: false, message: 'Doctor profile not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Vitals saved successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Adds a medication to a medical record.
 * POST /api/doctor/medical-records/:recordId/medications
 */
export async function addMedication(req, res, next) {
  try {
    const rawId = req.params.recordId;
    if (!rawId || !/^\d+$/.test(rawId) || Number(rawId) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid medical record ID',
      });
    }

    const { medicineName, dosage, frequency, duration, instructions } = req.body || {};

    if (!medicineName || typeof medicineName !== 'string' || medicineName.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Medicine name is required.' });
    }
    if (medicineName.trim().length > 150) {
      return res.status(400).json({ success: false, message: 'Medicine name cannot exceed 150 characters.' });
    }

    if (!dosage || typeof dosage !== 'string' || dosage.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Dosage is required.' });
    }
    if (dosage.trim().length > 100) {
      return res.status(400).json({ success: false, message: 'Dosage cannot exceed 100 characters.' });
    }

    if (!frequency || typeof frequency !== 'string' || frequency.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Frequency is required.' });
    }
    if (frequency.trim().length > 100) {
      return res.status(400).json({ success: false, message: 'Frequency cannot exceed 100 characters.' });
    }

    if (!duration || typeof duration !== 'string' || duration.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Duration is required.' });
    }
    if (duration.trim().length > 50) {
      return res.status(400).json({ success: false, message: 'Duration cannot exceed 50 characters.' });
    }

    if (instructions && (typeof instructions !== 'string' || instructions.length > 255)) {
      return res.status(400).json({ success: false, message: 'Instructions cannot exceed 255 characters.' });
    }

    const recordId = parseInt(rawId, 10);
    const result = await doctorService.addMedication(req.user.id, recordId, {
      medicineName: medicineName.trim(),
      dosage: dosage.trim(),
      frequency: frequency.trim(),
      duration: duration.trim(),
      instructions: instructions ? instructions.trim() : null,
    });

    if (result.error === 'RECORD_NOT_FOUND') {
      return res.status(404).json({ success: false, message: 'Medical record not found' });
    }

    if (result.error === 'DOCTOR_NOT_FOUND') {
      return res.status(404).json({ success: false, message: 'Doctor profile not found' });
    }

    return res.status(201).json({
      success: true,
      message: 'Medication added successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Updates a medication.
 * PUT /api/doctor/medications/:id
 */
export async function updateMedication(req, res, next) {
  try {
    const rawId = req.params.id;
    if (!rawId || !/^\d+$/.test(rawId) || Number(rawId) <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid medication ID' });
    }

    const { medicineName, dosage, frequency, duration, instructions } = req.body || {};

    if (!medicineName || typeof medicineName !== 'string' || medicineName.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Medicine name is required.' });
    }
    if (!dosage || typeof dosage !== 'string' || dosage.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Dosage is required.' });
    }
    if (!frequency || typeof frequency !== 'string' || frequency.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Frequency is required.' });
    }
    if (!duration || typeof duration !== 'string' || duration.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Duration is required.' });
    }

    const medicationId = parseInt(rawId, 10);
    const result = await doctorService.updateMedication(req.user.id, medicationId, {
      medicineName: medicineName.trim(),
      dosage: dosage.trim(),
      frequency: frequency.trim(),
      duration: duration.trim(),
      instructions: instructions ? instructions.trim() : null,
    });

    if (result.error === 'MEDICATION_NOT_FOUND') {
      return res.status(404).json({ success: false, message: 'Medication not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Medication updated successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Deletes a medication.
 * DELETE /api/doctor/medications/:id
 */
export async function deleteMedication(req, res, next) {
  try {
    const rawId = req.params.id;
    if (!rawId || !/^\d+$/.test(rawId) || Number(rawId) <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid medication ID' });
    }

    const medicationId = parseInt(rawId, 10);
    const result = await doctorService.deleteMedication(req.user.id, medicationId);

    if (result.error === 'MEDICATION_NOT_FOUND') {
      return res.status(404).json({ success: false, message: 'Medication not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Medication deleted successfully',
    });
  } catch (error) {
    next(error);
  }
}



/**
 * Searches active doctors with optional name/specialty filters.
 * GET /api/doctors?search=&specialty=
 */
export async function getDoctors(req, res, next) {
  try {
    const search = (req.query.search || '').trim();
    const specialty = (req.query.specialty || '').trim();

    const doctors = await doctorService.searchDoctors({ search, specialty });

    return res.status(200).json({
      success: true,
      data: { doctors, count: doctors.length },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Retrieves a single doctor's details by ID.
 * GET /api/doctors/:id
 */
export async function getDoctorById(req, res, next) {
  try {
    const doctorId = req.params.id;
    const doctor = await doctorService.getDoctorById(doctorId);

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found.',
      });
    }

    return res.status(200).json({
      success: true,
      data: { doctor },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Retrieves the weekly availability schedule for a doctor.
 * GET /api/doctors/:id/availability
 */
export async function getAvailability(req, res, next) {
  try {
    const doctorId = req.params.id;
    const result = await doctorService.getDoctorAvailability(doctorId);

    if (!result.doctorExists) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found.',
      });
    }

    return res.status(200).json({
      success: true,
      data: { schedule: result.schedule },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Retrieves the authenticated doctor's full profile.
 * GET /api/doctor/profile
 */
export async function getProfile(req, res, next) {
  try {
    const profile = await doctorService.getDoctorProfile(req.user.id);
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Doctor profile not found.',
      });
    }

    return res.status(200).json({
      success: true,
      data: { profile },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Updates the authenticated doctor's editable profile information.
 * PUT /api/doctor/profile
 */
export async function updateProfile(req, res, next) {
  try {
    const data = req.body || {};

    // Input validation
    if (data.name !== undefined || data.fullName !== undefined) {
      const name = String(data.name || data.fullName).trim();
      if (name.length < 2 || name.length > 100) {
        return res.status(400).json({
          success: false,
          message: 'Doctor name must be between 2 and 100 characters.',
        });
      }
    }

    if (data.email !== undefined) {
      const email = String(data.email).trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email) || email.length > 150) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid email address.',
        });
      }
    }

    if (data.phone !== undefined) {
      const phone = String(data.phone).trim();
      const phoneRegex = /^\+?[\d\s-]{8,20}$/;
      if (!phoneRegex.test(phone)) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid phone number.',
        });
      }
    }

    if (data.consultationFee !== undefined) {
      const fee = parseFloat(data.consultationFee);
      if (isNaN(fee) || fee < 0) {
        return res.status(400).json({
          success: false,
          message: 'Consultation fee must be a non-negative number.',
        });
      }
    }

    if (data.experienceYears !== undefined) {
      const exp = parseInt(data.experienceYears, 10);
      if (isNaN(exp) || exp < 0 || exp > 70) {
        return res.status(400).json({
          success: false,
          message: 'Experience years must be between 0 and 70.',
        });
      }
    }

    if (data.bio !== undefined && data.bio !== null) {
      const bio = String(data.bio);
      if (bio.length > 2000) {
        return res.status(400).json({
          success: false,
          message: 'Bio cannot exceed 2000 characters.',
        });
      }
    }

    const result = await doctorService.updateDoctorProfile(req.user.id, data);

    if (result.error === 'DOCTOR_NOT_FOUND') {
      return res.status(404).json({
        success: false,
        message: 'Doctor profile not found.',
      });
    }

    if (result.error === 'DUPLICATE_EMAIL') {
      return res.status(409).json({
        success: false,
        message: result.message,
      });
    }

    if (result.error === 'DUPLICATE_PHONE') {
      return res.status(409).json({
        success: false,
        message: result.message,
      });
    }

    return res.status(200).json({
      success: true,
      data: { profile: result.profile },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Retrieves the authenticated doctor's full recurring weekly schedule.
 * GET /api/doctor/schedule
 */
export async function getSchedule(req, res, next) {
  try {
    const result = await doctorService.getDoctorSchedule(req.user.id);
    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Doctor profile not found.',
      });
    }

    return res.status(200).json({
      success: true,
      data: { schedule: result.schedule },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Atomically updates the authenticated doctor's recurring weekly schedule.
 * PUT /api/doctor/schedule
 */
export async function updateSchedule(req, res, next) {
  try {
    const scheduleList = Array.isArray(req.body)
      ? req.body
      : req.body?.schedule;

    if (!Array.isArray(scheduleList) || scheduleList.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Schedule must be a non-empty array of day configurations.',
      });
    }

    const result = await doctorService.updateDoctorSchedule(req.user.id, scheduleList);

    if (result.error === 'DOCTOR_NOT_FOUND') {
      return res.status(404).json({
        success: false,
        message: 'Doctor profile not found.',
      });
    }

    if (result.error) {
      return res.status(400).json({
        success: false,
        message: result.message || 'Invalid schedule configuration.',
      });
    }

    return res.status(200).json({
      success: true,
      data: { schedule: result.schedule },
    });
  } catch (error) {
    next(error);
  }
}

