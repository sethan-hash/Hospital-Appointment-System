import app from './app.js';
import { env } from './config/env.js';
import { testDbConnection, pool } from './config/db.js';

const PORT = env.port;

const server = app.listen(PORT, async () => {
  console.log(`[MedLink Backend] Server listening on port ${PORT} (${env.nodeEnv})`);
  console.log(`[MedLink Backend] Health check available at: http://localhost:${PORT}/api/health`);

  // Verify database connectivity
  const dbStatus = await testDbConnection();
  if (dbStatus.connected) {
    console.log(`[MedLink Backend] Database: ${dbStatus.message}`);
  } else {
    console.warn(`[MedLink Backend] Database: ${dbStatus.message}`);
  }
});

// Graceful shutdown handling
function handleGracefulShutdown(signal) {
  console.log(`\n[MedLink Backend] ${signal} signal received. Closing server gracefully...`);

  server.close(async () => {
    console.log('[MedLink Backend] HTTP server closed.');
    try {
      await pool.end();
      console.log('[MedLink Backend] Database pool closed.');
    } catch (err) {
      console.error('[MedLink Backend] Error closing database pool:', err.message);
    }
    process.exit(0);
  });

  // Force shutdown after 10 seconds if closing hangs
  setTimeout(() => {
    console.error('[MedLink Backend] Forcefully shutting down due to timeout.');
    process.exit(1);
  }, 10000);
}

process.on('SIGINT', () => handleGracefulShutdown('SIGINT'));
process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM'));
