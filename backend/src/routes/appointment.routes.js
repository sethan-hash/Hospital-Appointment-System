import { Router } from 'express';
import * as appointmentController from '../controllers/appointment.controller.js';
import {
  validateAppointmentBooking,
  validateReschedule,
  validateAppointmentId,
} from '../validators/appointment.validator.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';

const router = Router();

// GET /api/appointments/upcoming — authenticated PATIENT only
router.get(
  '/upcoming',
  authenticate,
  requireRole('PATIENT'),
  appointmentController.getUpcomingAppointments
);

// POST /api/appointments — authenticated PATIENT only
router.post(
  '/',
  authenticate,
  requireRole('PATIENT'),
  validateAppointmentBooking,
  appointmentController.createAppointment
);

// PUT /api/appointments/:id/reschedule — authenticated PATIENT only
router.put(
  '/:id/reschedule',
  authenticate,
  requireRole('PATIENT'),
  validateReschedule,
  appointmentController.rescheduleAppointment
);

// PUT /api/appointments/:id/cancel — authenticated PATIENT only
router.put(
  '/:id/cancel',
  authenticate,
  requireRole('PATIENT'),
  validateAppointmentId,
  appointmentController.cancelAppointment
);

export default router;
