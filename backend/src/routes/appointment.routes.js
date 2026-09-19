import { Router } from 'express';
import * as appointmentController from '../controllers/appointment.controller.js';
import { validateAppointmentBooking } from '../validators/appointment.validator.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';

const router = Router();

// POST /api/appointments — authenticated PATIENT only
router.post(
  '/',
  authenticate,
  requireRole('PATIENT'),
  validateAppointmentBooking,
  appointmentController.createAppointment
);

export default router;
