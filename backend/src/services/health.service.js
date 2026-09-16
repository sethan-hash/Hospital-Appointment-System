import { env } from '../config/env.js';
import { testDbConnection } from '../config/db.js';

/**
 * Service to generate application health status details.
 * Contains purely business and diagnostic logic, isolated from HTTP req/res.
 */
export async function getHealthStatus() {
  const dbStatus = await testDbConnection();

  return {
    status: 'ok',
    service: 'MedLink Care API',
    version: '1.0.0',
    environment: env.nodeEnv,
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    database: {
      connected: dbStatus.connected,
      message: dbStatus.message,
    },
  };
}
