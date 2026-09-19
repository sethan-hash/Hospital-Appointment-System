import { Router } from 'express';
import * as patientController from '../controllers/patient.controller.js';
import { validateProfileUpdate } from '../validators/patient.validator.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';

const router = Router();

// Protect all patient routes with authentication and PATIENT role requirement
router.use(authenticate, requireRole('PATIENT'));

// GET /api/patients/profile
router.get('/profile', patientController.getProfile);

// PUT /api/patients/profile
router.put('/profile', validateProfileUpdate, patientController.updateProfile);

// GET /api/patients/medical-records
router.get('/medical-records', patientController.getMedicalRecords);

// GET /api/patients/medical-records/:id
router.get('/medical-records/:id', patientController.getMedicalRecordById);

export default router;

