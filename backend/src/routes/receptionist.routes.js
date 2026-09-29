import { Router } from 'express';
import * as receptionistController from '../controllers/receptionist.controller.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import {
  validateReceptionistPatientRegistration,
  validateReceptionistAppointmentBooking,
  validateReceptionistReschedule,
  validateReceptionistStatusUpdate,
  validateAppointmentIdParam,
} from '../validators/receptionist.validator.js';

const router = Router();

// All receptionist endpoints require a valid JWT and RECEPTIONIST role
router.use(authenticate, requireRole('RECEPTIONIST'));

// Appointments queue & schedule
router.get('/appointments', receptionistController.getAppointments);

// Patient search & registration
router.get('/patients', receptionistController.getPatients);
router.post(
  '/patients',
  validateReceptionistPatientRegistration,
  receptionistController.registerPatient
);

// Appointment booking & lifecycle management
router.post(
  '/appointments',
  validateReceptionistAppointmentBooking,
  receptionistController.bookAppointment
);
router.put(
  '/appointments/:id/reschedule',
  validateAppointmentIdParam,
  validateReceptionistReschedule,
  receptionistController.rescheduleAppointment
);
router.put(
  '/appointments/:id/cancel',
  validateAppointmentIdParam,
  receptionistController.cancelAppointment
);
router.patch(
  '/appointments/:id/status',
  validateAppointmentIdParam,
  validateReceptionistStatusUpdate,
  receptionistController.patchAppointmentStatus
);

export default router;
