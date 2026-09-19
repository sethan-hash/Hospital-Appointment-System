import * as authService from '../services/auth.service.js';

/**
 * Handles patient registration.
 * POST /api/auth/register
 */
export async function register(req, res, next) {
  try {
    const result = await authService.registerPatient(req.body);
    return res.status(201).json({
      success: true,
      message: 'Registration completed successfully.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Handles user login.
 * POST /api/auth/login
 */
export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const result = await authService.loginUser(email, password);
    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Retrieves the currently authenticated user's profile.
 * GET /api/auth/me
 */
export async function getCurrentUser(req, res, next) {
  try {
    return res.status(200).json({
      success: true,
      data: {
        user: req.user,
      },
    });
  } catch (error) {
    next(error);
  }
}
