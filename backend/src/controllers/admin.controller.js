import * as adminService from '../services/admin.service.js';

/**
 * Admin Controller
 * Handles incoming HTTP requests for Admin endpoints.
 * Admin identity is always derived from req.user.id (set by JWT authenticate middleware).
 */

/**
 * GET /api/admin/dashboard
 * Retrieves comprehensive statistics, recent appointments, and resources for the Admin Dashboard.
 */
export async function getDashboard(req, res, next) {
  try {
    const adminUserId = req.user.id;
    const dashboardData = await adminService.getAdminDashboardMetrics(adminUserId);

    res.status(200).json({
      success: true,
      message: 'Admin dashboard metrics retrieved successfully.',
      data: dashboardData,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/admin/users
 * Lists all platform users with optional search + role + status filters.
 * Query params: ?search=<str>&role=<PATIENT|DOCTOR|RECEPTIONIST|ADMIN>&status=<ACTIVE|INACTIVE|SUSPENDED>
 */
export async function getUsers(req, res, next) {
  try {
    const { search = '', role = '', status = '' } = req.query;

    const users = await adminService.listUsers({ search, role, status });

    res.status(200).json({
      success: true,
      message: 'User list retrieved successfully.',
      data: { users, total: users.length },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/admin/users/:id/status
 * Updates a user's account status. Body: { status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' }
 * Prevents deactivating the last active admin (lockout guard enforced in service).
 */
export async function patchUserStatus(req, res, next) {
  try {
    const adminUserId = req.user.id;
    const targetUserId = Number(req.params.id);
    const { status } = req.body;

    if (!targetUserId || !Number.isInteger(targetUserId) || targetUserId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID in path parameter.',
      });
    }

    if (!status || typeof status !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Request body must include a valid "status" field.',
      });
    }

    const result = await adminService.updateUserStatus(adminUserId, targetUserId, status);

    res.status(200).json({
      success: true,
      message: `User account status updated to ${result.newStatus}.`,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/admin/invoices
 * Lists hospital invoices with optional search, status, payment method, and date filters.
 * Query params: ?search=&status=&paymentMethod=&dateFrom=&dateTo=
 */
export async function getInvoices(req, res, next) {
  try {
    const { search = '', status = '', paymentMethod = '', dateFrom = '', dateTo = '' } = req.query;

    const { invoices, summary } = await adminService.listInvoices({
      search,
      status,
      paymentMethod,
      dateFrom,
      dateTo,
    });

    res.status(200).json({
      success: true,
      message: 'Invoices retrieved successfully.',
      data: {
        invoices,
        summary,
        total: invoices.length,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/admin/invoices/:id
 * Retrieves detailed invoice information by ID.
 */
export async function getInvoiceById(req, res, next) {
  try {
    const invoiceId = Number(req.params.id);

    if (!invoiceId || !Number.isInteger(invoiceId) || invoiceId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid invoice ID in path parameter.',
      });
    }

    const invoice = await adminService.getInvoiceById(invoiceId);

    res.status(200).json({
      success: true,
      message: 'Invoice details retrieved successfully.',
      data: { invoice },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/admin/invoices/:id/status
 * Updates invoice payment status and optionally payment method.
 * Body: { paymentStatus: string, paymentMethod?: string | null }
 */
export async function patchInvoiceStatus(req, res, next) {
  try {
    const adminUserId = req.user.id;
    const invoiceId = Number(req.params.id);
    const { paymentStatus, paymentMethod } = req.body;

    if (!invoiceId || !Number.isInteger(invoiceId) || invoiceId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid invoice ID in path parameter.',
      });
    }

    if (!paymentStatus || typeof paymentStatus !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Request body must include a valid "paymentStatus" field.',
      });
    }

    const updated = await adminService.updateInvoiceStatus(adminUserId, invoiceId, {
      paymentStatus,
      paymentMethod,
    });

    res.status(200).json({
      success: true,
      message: `Invoice ${updated.invoiceNumber} status updated to ${updated.paymentStatus}.`,
      data: { invoice: updated },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/admin/resources
 * Lists hospital infrastructure resources with optional search, type, and status filters.
 * Query params: ?search=&type=&status=
 */
export async function getResources(req, res, next) {
  try {
    const { search = '', type = '', status = '' } = req.query;

    const { resources, summary } = await adminService.listResources({
      search,
      type,
      status,
    });

    res.status(200).json({
      success: true,
      message: 'Resources retrieved successfully.',
      data: {
        resources,
        summary,
        total: resources.length,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/admin/resources/:id/status
 * Updates hospital resource status and optional patient allocation.
 * Body: { status: string, allocatedPatientId?: number | null }
 */
export async function patchResourceStatus(req, res, next) {
  try {
    const adminUserId = req.user.id;
    const resourceId = Number(req.params.id);
    const { status, allocatedPatientId } = req.body;

    if (!resourceId || !Number.isInteger(resourceId) || resourceId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid resource ID in path parameter.',
      });
    }

    if (!status || typeof status !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Request body must include a valid "status" field.',
      });
    }

    const updated = await adminService.updateResourceStatus(adminUserId, resourceId, {
      status,
      allocatedPatientId,
    });

    res.status(200).json({
      success: true,
      message: `Resource ${updated.resourceCode} status updated to ${updated.status}.`,
      data: { resource: updated },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/admin/doctors
 * Creates a new Doctor user and doctor profile atomically.
 * Admin identity is verified from req.user.id.
 */
export async function createDoctor(req, res, next) {
  try {
    const adminUserId = req.user.id;
    const result = await adminService.createDoctor(adminUserId, req.body);

    res.status(201).json({
      success: true,
      message: 'Doctor account created successfully.',
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/admin/doctors/:id
 * Removes or archives a doctor account using dual-path removal.
 * - Zero history -> permanent hard delete
 * - Existing history -> archive, unlist, cancel upcoming scheduled appointments
 */
export async function removeDoctor(req, res, next) {
  try {
    const adminUserId = req.user.id;
    const targetDoctorId = Number(req.params.id);

    if (!targetDoctorId || !Number.isInteger(targetDoctorId) || targetDoctorId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid doctor ID in path parameter.',
      });
    }

    const result = await adminService.removeDoctor(adminUserId, targetDoctorId);

    res.status(200).json({
      success: true,
      message: result.message || 'Doctor removed successfully.',
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

