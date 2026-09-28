import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from current working directory or backend/.env
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// F-01 — Fail fast if JWT_SECRET is missing; never fall back to a hard-coded value.
if (!process.env.JWT_SECRET) {
  throw new Error(
    'FATAL: JWT_SECRET environment variable is not set. ' +
    'Set a cryptographically random value (≥256 bits) before starting the server.'
  );
}

export const env = {
  port: parseInt(process.env.PORT, 10) || 5000,
  // F-05 — Default to 'production' behaviour (safe) when NODE_ENV is unset.
  nodeEnv: process.env.NODE_ENV || 'production',
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV !== 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'medlink_care',
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT, 10) || 10,
    ssl: process.env.DB_SSL === 'true',
  },
  jwt: {
    // F-01 — No fallback; process will have already thrown above if secret is absent.
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },
};
