import { Router } from 'express';
import * as doctorController from '../controllers/doctor.controller.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';

const router = Router();

// All doctor routes require a valid JWT.
// PATIENT role is required — only authenticated patients browse doctors.
router.use(authenticate, requireRole('PATIENT'));

// GET /api/doctors?search=&specialty=
router.get('/', doctorController.getDoctors);

// GET /api/doctors/:id/availability
// Must be registered BEFORE /:id so Express does not treat "availability" as an ID
router.get('/:id/availability', doctorController.getAvailability);

// GET /api/doctors/:id
router.get('/:id', doctorController.getDoctorById);

export default router;
