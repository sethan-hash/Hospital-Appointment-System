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

// Clinical Consultation Records
router.get('/appointments/:appointmentId/clinical-record', doctorController.getClinicalRecord);
router.put('/appointments/:appointmentId/clinical-record', doctorController.saveClinicalRecord);

// Vitals
router.put('/appointments/:appointmentId/vitals', doctorController.saveVitals);

// Medications
router.post('/medical-records/:recordId/medications', doctorController.addMedication);
router.put('/medications/:id', doctorController.updateMedication);
router.delete('/medications/:id', doctorController.deleteMedication);

export default router;


