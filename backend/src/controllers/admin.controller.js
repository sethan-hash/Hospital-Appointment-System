import * as adminService from '../services/admin.service.js';

/**
 * Admin Controller
 * Handles incoming HTTP requests for Admin endpoints.
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
