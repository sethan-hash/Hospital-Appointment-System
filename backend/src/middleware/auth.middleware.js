import jwt from 'jsonwebtoken';
import { verifyToken, getUserById } from '../services/auth.service.js';

/**
 * Middleware to authenticate requests using JWT Bearer token.
 * Extracts token, verifies signature and expiration, and attaches user info to req.user.
 */
export async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. No Bearer token provided.',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifyToken(token);

    // Retrieve fresh user record to ensure user still exists and status is active
    const user = await getUserById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'The account associated with this token no longer exists.',
      });
    }

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        message: 'Your account is inactive or suspended.',
      });
    }

    // Attach authenticated user to request
    req.user = user;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        success: false,
        message: 'Authentication token has expired. Please log in again.',
      });
    }

    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        success: false,
        message: 'Invalid authentication token.',
      });
    }

    return next(error);
  }
}

/**
 * Reusable role-based authorization middleware factory.
 * Restricts access to specified user roles (e.g. PATIENT, DOCTOR, RECEPTIONIST, ADMIN).
 * @param  {...string} allowedRoles
 */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required before role verification.',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Requires one of the following roles: ${allowedRoles.join(', ')}. Your role is: ${req.user.role}.`,
      });
    }

    next();
  };
}
