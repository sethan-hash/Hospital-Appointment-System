import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import { validateRegistration, validateLogin } from '../validators/auth.validator.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';

const router = Router();

// Public authentication routes
router.post('/register', validateRegistration, authController.register);
router.post('/login', validateLogin, authController.login);

// Protected user profile route
router.get('/me', authenticate, authController.getCurrentUser);

// Reusable role-authorization verification routes (used for RBAC testing)
router.get('/test/doctor-only', authenticate, requireRole('DOCTOR'), (req, res) => {
  res.status(200).json({ success: true, message: 'Authorized: Doctor access granted.', user: req.user });
});

router.get('/test/receptionist-only', authenticate, requireRole('RECEPTIONIST'), (req, res) => {
  res.status(200).json({ success: true, message: 'Authorized: Receptionist access granted.', user: req.user });
});

router.get('/test/admin-only', authenticate, requireRole('ADMIN'), (req, res) => {
  res.status(200).json({ success: true, message: 'Authorized: Admin access granted.', user: req.user });
});

export default router;
