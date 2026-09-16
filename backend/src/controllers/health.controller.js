import { getHealthStatus } from '../services/health.service.js';

/**
 * Controller to handle health-check requests.
 * Coordinates input/output without embedding domain logic.
 */
export async function getHealth(req, res, next) {
  try {
    const healthData = await getHealthStatus();
    res.status(200).json(healthData);
  } catch (error) {
    next(error);
  }
}
