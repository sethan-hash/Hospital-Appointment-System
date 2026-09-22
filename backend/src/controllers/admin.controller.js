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
