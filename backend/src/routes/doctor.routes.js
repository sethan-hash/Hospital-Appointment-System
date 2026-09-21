import { Router } from 'express';
import * as doctorController from '../controllers/doctor.controller.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';

const router = Router();

// All public doctor browse routes require a valid JWT.
router.use(authenticate);

// GET /api/doctors?search=&specialty=
router.get('/', requireRole('PATIENT'), doctorController.getDoctors);

// GET /api/doctors/:id/availability
// Must be registered BEFORE /:id so Express does not treat "availability" as an ID
router.get('/:id/availability', requireRole('PATIENT'), doctorController.getAvailability);

// GET /api/doctors/:id/reviews — any authenticated user (PATIENT or DOCTOR)
router.get('/:id/reviews', doctorController.getReviews);

// POST /api/doctors/:id/reviews — PATIENT only
router.post('/:id/reviews', requireRole('PATIENT'), doctorController.submitReview);

// GET /api/doctors/:id
router.get('/:id', requireRole('PATIENT'), doctorController.getDoctorById);

export default router;
