import * as patientService from '../services/patient.service.js';

/**
 * Retrieves the authenticated patient's profile.
 * GET /api/patients/profile
 */
export async function getProfile(req, res, next) {
  try {
    const userId = req.user.id;
    const profile = await patientService.getPatientProfileByUserId(userId);

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Patient profile not found.',
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
 * Updates the authenticated patient's profile.
 * PUT /api/patients/profile
 */
export async function updateProfile(req, res, next) {
  try {
    const userId = req.user.id;
    const updatedProfile = await patientService.updatePatientProfile(userId, req.body);

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      data: { profile: updatedProfile },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Retrieves past medical records for the authenticated patient.
 * GET /api/patients/medical-records
 */
export async function getMedicalRecords(req, res, next) {
  try {
    const userId = req.user.id;
    const records = await patientService.getMedicalRecordsByUserId(userId);

    return res.status(200).json({
      success: true,
      data: { records },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Retrieves a single medical record by ID for the authenticated patient.
 * GET /api/patients/medical-records/:id
 */
export async function getMedicalRecordById(req, res, next) {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const recordId = parseInt(id, 10);
    if (isNaN(recordId) || recordId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid medical record ID.',
      });
    }

    const record = await patientService.getMedicalRecordById(userId, recordId);

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Medical record not found.',
      });
    }

    return res.status(200).json({
      success: true,
      data: { record },
    });
  } catch (error) {
    next(error);
  }
}

