import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import patientRoutes from './patient.routes.js';
import doctorRoutes from './doctor.routes.js';
import doctorPortalRoutes from './doctor-portal.routes.js';
import appointmentRoutes from './appointment.routes.js';
import adminRoutes from './admin.routes.js';
import receptionistRoutes from './receptionist.routes.js';

const apiRouter = Router();

// Mount feature route modules
apiRouter.use('/health', healthRoutes);
apiRouter.use('/auth', authRoutes);
apiRouter.use('/patients', patientRoutes);
apiRouter.use('/doctors', doctorRoutes);        // PATIENT role — browse doctors
apiRouter.use('/doctor', doctorPortalRoutes);   // DOCTOR role — doctor portal
apiRouter.use('/appointments', appointmentRoutes);
apiRouter.use('/admin', adminRoutes);           // ADMIN role — admin portal
apiRouter.use('/receptionist', receptionistRoutes); // RECEPTIONIST role — receptionist portal

export default apiRouter;

