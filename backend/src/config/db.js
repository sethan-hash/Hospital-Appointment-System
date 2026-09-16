import mysql from 'mysql2/promise';
import { env } from './env.js';

// Create MySQL connection pool
export const pool = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.database,
  waitForConnections: true,
  connectionLimit: env.db.connectionLimit,
  queueLimit: 0,
});

/**
 * Tests database connectivity gracefully.
 * Does not throw unhandled exceptions if the database service is currently offline.
 * @returns {Promise<{connected: boolean, message: string}>}
 */
export async function testDbConnection() {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    return { connected: true, message: 'MySQL connection established successfully.' };
  } catch (error) {
    return {
      connected: false,
      message: `MySQL connection warning: ${error.message}`,
    };
  }
}
