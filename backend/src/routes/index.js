import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import patientRoutes from './patient.routes.js';

const apiRouter = Router();

// Mount feature route modules
apiRouter.use('/health', healthRoutes);
apiRouter.use('/auth', authRoutes);
apiRouter.use('/patients', patientRoutes);

export default apiRouter;
