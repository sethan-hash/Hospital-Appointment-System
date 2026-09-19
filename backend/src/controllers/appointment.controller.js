import * as appointmentService from '../services/appointment.service.js';

/**
 * Creates a new appointment for the authenticated patient.
 * POST /api/appointments
 *
 * Patient identity is always derived from req.user (JWT) — never from the request body.
 */
export async function createAppointment(req, res, next) {
  try {
    const userId = req.user.id;
    const { doctorId, appointmentDate, startTime, reason } = req.body;

    const appointment = await appointmentService.bookAppointment({
      userId,
      doctorId: Number(doctorId),
      appointmentDate,
      startTime,
      reason,
    });

    return res.status(201).json({
      success: true,
      message: 'Appointment booked successfully.',
      data: { appointment },
    });
  } catch (error) {
    // Surface service-layer errors with their statusCode
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
}
