import { Router } from 'express';
import * as adminController from '../controllers/admin.controller.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import { validateCreateDoctor } from '../validators/admin.validator.js';

const router = Router();

// All admin routes require authentication and ADMIN role
router.use(authenticate, requireRole('ADMIN'));

// GET /api/admin/dashboard
router.get('/dashboard', adminController.getDashboard);

// GET /api/admin/users?search=&role=&status=
router.get('/users', adminController.getUsers);

// POST /api/admin/doctors
router.post('/doctors', validateCreateDoctor, adminController.createDoctor);

// DELETE /api/admin/doctors/:id
router.delete('/doctors/:id', adminController.removeDoctor);


// PATCH /api/admin/users/:id/status
router.patch('/users/:id/status', adminController.patchUserStatus);

// GET /api/admin/invoices?search=&status=&paymentMethod=&dateFrom=&dateTo=
router.get('/invoices', adminController.getInvoices);

// GET /api/admin/invoices/:id
router.get('/invoices/:id', adminController.getInvoiceById);

// PATCH /api/admin/invoices/:id/status
router.patch('/invoices/:id/status', adminController.patchInvoiceStatus);

// GET /api/admin/resources?search=&type=&status=
router.get('/resources', adminController.getResources);

// PATCH /api/admin/resources/:id/status
router.patch('/resources/:id/status', adminController.patchResourceStatus);

export default router;
