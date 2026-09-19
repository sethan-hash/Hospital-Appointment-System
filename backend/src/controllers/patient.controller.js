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
