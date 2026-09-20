import { Router } from 'express';
import * as doctorController from '../controllers/doctor.controller.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';

const router = Router();

// All doctor-portal routes require a valid JWT and DOCTOR role.
router.use(authenticate, requireRole('DOCTOR'));

// GET /api/doctor/dashboard
router.get('/dashboard', doctorController.getDashboard);

// GET /api/doctor/appointments/:id
router.get('/appointments/:id', doctorController.getAppointmentDetails);

export default router;

