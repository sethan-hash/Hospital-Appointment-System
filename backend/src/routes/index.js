import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import patientRoutes from './patient.routes.js';
import doctorRoutes from './doctor.routes.js';
import appointmentRoutes from './appointment.routes.js';

const apiRouter = Router();

// Mount feature route modules
apiRouter.use('/health', healthRoutes);
apiRouter.use('/auth', authRoutes);
apiRouter.use('/patients', patientRoutes);
apiRouter.use('/doctors', doctorRoutes);
apiRouter.use('/appointments', appointmentRoutes);

export default apiRouter;

