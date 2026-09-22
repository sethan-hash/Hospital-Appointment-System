import { Router } from 'express';
import * as adminController from '../controllers/admin.controller.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';

const router = Router();

// All admin routes require authentication and ADMIN role
router.use(authenticate, requireRole('ADMIN'));

// GET /api/admin/dashboard
router.get('/dashboard', adminController.getDashboard);

// GET /api/admin/users?search=&role=&status=
router.get('/users', adminController.getUsers);

// PATCH /api/admin/users/:id/status
router.patch('/users/:id/status', adminController.patchUserStatus);

export default router;
