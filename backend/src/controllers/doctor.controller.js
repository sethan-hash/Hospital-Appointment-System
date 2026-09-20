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
