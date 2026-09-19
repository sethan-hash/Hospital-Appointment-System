import * as doctorService from '../services/doctor.service.js';

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
