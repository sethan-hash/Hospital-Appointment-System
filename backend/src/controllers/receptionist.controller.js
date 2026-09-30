import * as receptionistService from '../services/receptionist.service.js';

/**
 * GET /api/receptionist/appointments?date=&doctorId=&status=
 * Retrieves appointments for receptionist queue/schedule.
 * If date is omitted, defaults to today.
 */
export async function getAppointments(req, res, next) {
  try {
    const { date, doctorId, status } = req.query;
    const appointments = await receptionistService.listAppointments({
      date,
      doctorId,
      status,
    });

    return res.status(200).json({
      success: true,
      message: 'Appointments retrieved successfully.',
      data: {
        appointments,
        total: appointments.length,
      },
    });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({
        success: false,
        message: err.message,
      });
    }
    next(err);
  }
}

/**
 * GET /api/receptionist/patients?search=
 * Searches patients by full_name, email, or phone.
 */
export async function getPatients(req, res, next) {
  try {
    const { search = '' } = req.query;
    const patients = await receptionistService.searchPatients({ search });

    return res.status(200).json({
      success: true,
      message: 'Patients retrieved successfully.',
      data: {
        patients,
        total: patients.length,
      },
    });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({
        success: false,
        message: err.message,
      });
    }
    next(err);
  }
}

/**
 * POST /api/receptionist/patients
 * Registers a new walk-in patient atomically without creating a session.
 */
export async function registerPatient(req, res, next) {
  try {
    const patient = await receptionistService.registerPatient(req.body);

    return res.status(201).json({
      success: true,
      message: 'Patient registered successfully.',
      data: { patient },
    });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({
        success: false,
        message: err.message,
      });
    }
    next(err);
  }
}

/**
 * POST /api/receptionist/appointments
 * Books an appointment for an explicit patientId with doctor slot locking.
 */
export async function bookAppointment(req, res, next) {
  try {
    const { patientId, doctorId, appointmentDate, startTime, reason, type } = req.body;
    const appointment = await receptionistService.bookAppointment({
      patientId: Number(patientId),
      doctorId: Number(doctorId),
      appointmentDate,
      startTime,
      reason,
      type,
    });

    return res.status(201).json({
      success: true,
      message: 'Appointment booked successfully.',
      data: { appointment },
    });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({
        success: false,
        message: err.message,
      });
    }
    next(err);
  }
}

/**
 * PUT /api/receptionist/appointments/:id/reschedule
 * Reschedules an appointment to a new date/time slot.
 */
export async function rescheduleAppointment(req, res, next) {
  try {
    const appointmentId = Number(req.params.id);
    const { appointmentDate, startTime } = req.body;

    const appointment = await receptionistService.rescheduleAppointment({
      appointmentId,
      appointmentDate,
      startTime,
    });

    return res.status(200).json({
      success: true,
      message: 'Appointment rescheduled successfully.',
      data: { appointment },
    });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({
        success: false,
        message: err.message,
      });
    }
    next(err);
  }
}

/**
 * PUT /api/receptionist/appointments/:id/cancel
 * Cancels a scheduled appointment.
 */
export async function cancelAppointment(req, res, next) {
  try {
    const appointmentId = Number(req.params.id);
    const appointment = await receptionistService.cancelAppointment({
      appointmentId,
    });

    return res.status(200).json({
      success: true,
      message: 'Appointment cancelled successfully.',
      data: { appointment },
    });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({
        success: false,
        message: err.message,
      });
    }
    next(err);
  }
}

/**
 * PATCH /api/receptionist/appointments/:id/status
 * Updates appointment status (e.g. COMPLETED for check-in / finished consultation).
 */
export async function patchAppointmentStatus(req, res, next) {
  try {
    const appointmentId = Number(req.params.id);
    const { status } = req.body;

    const appointment = await receptionistService.updateAppointmentStatus({
      appointmentId,
      newStatus: status,
    });

    return res.status(200).json({
      success: true,
      message: `Appointment status updated to ${appointment.status}.`,
      data: { appointment },
    });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({
        success: false,
        message: err.message,
      });
    }
    next(err);
  }
}

/**
 * PATCH /api/receptionist/invoices/:id/payment
 * Collects or updates payment for an invoice at the front desk.
 * Only PAID and PENDING statuses permitted — admin-only transitions are blocked.
 */
export async function patchInvoicePayment(req, res, next) {
  try {
    const invoiceId = Number(req.params.id);
    const { paymentStatus, paymentMethod } = req.body;

    const invoice = await receptionistService.updateInvoicePayment(invoiceId, {
      paymentStatus,
      paymentMethod,
    });

    return res.status(200).json({
      success: true,
      message: `Invoice ${invoice.invoiceNumber} payment status updated to ${invoice.paymentStatus}.`,
      data: { invoice },
    });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({
        success: false,
        message: err.message,
      });
    }
    next(err);
  }
}
