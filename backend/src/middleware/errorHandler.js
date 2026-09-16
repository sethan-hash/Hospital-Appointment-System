import { env } from '../config/env.js';

/**
 * Centralized application error handling middleware.
 * Formats any unhandled error into a clean, predictable JSON response.
 */
export function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';

  const response = {
    success: false,
    message,
    ...(env.isDevelopment && { stack: err.stack }),
  };

  res.status(statusCode).json(response);
}
