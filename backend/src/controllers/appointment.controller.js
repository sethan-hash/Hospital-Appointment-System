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
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
}

/**
 * Retrieves all upcoming scheduled appointments for the authenticated patient.
 * GET /api/appointments/upcoming
 */
export async function getUpcomingAppointments(req, res, next) {
  try {
    const userId = req.user.id;
    const appointments = await appointmentService.getUpcomingAppointments(userId);

    return res.status(200).json({
      success: true,
      data: { appointments },
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
}

/**
 * Reschedules an existing scheduled appointment for the authenticated patient.
 * PUT /api/appointments/:id/reschedule
 */
export async function rescheduleAppointment(req, res, next) {
  try {
    const userId = req.user.id;
    const appointmentId = Number(req.params.id);
    const { appointmentDate, startTime } = req.body;

    const appointment = await appointmentService.rescheduleAppointment({
      userId,
      appointmentId,
      appointmentDate,
      startTime,
    });

    return res.status(200).json({
      success: true,
      message: 'Appointment rescheduled successfully.',
      data: { appointment },
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
}

/**
 * Cancels an existing scheduled appointment for the authenticated patient.
 * PUT /api/appointments/:id/cancel
 */
export async function cancelAppointment(req, res, next) {
  try {
    const userId = req.user.id;
    const appointmentId = Number(req.params.id);

    const appointment = await appointmentService.cancelAppointment({
      userId,
      appointmentId,
    });

    return res.status(200).json({
      success: true,
      message: 'Appointment cancelled successfully.',
      data: { appointment },
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
}
