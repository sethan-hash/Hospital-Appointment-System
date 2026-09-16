import morgan from 'morgan';
import { env } from '../config/env.js';

// Use concise colored output in development, Apache standard combined in production
const logFormat = env.isDevelopment ? 'dev' : 'combined';

export const requestLogger = morgan(logFormat);
