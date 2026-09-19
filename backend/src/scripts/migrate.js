import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import { env } from '../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../..');

async function runMigrations() {
  console.log('[Migration] Connecting to MySQL database...');
  const connection = await mysql.createConnection({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    database: env.db.database,
    multipleStatements: true,
  });

  try {
    const migrationsDir = path.resolve(projectRoot, 'database/migrations');
    if (!fs.existsSync(migrationsDir)) {
      console.log('[Migration] No database/migrations directory found.');
      return;
    }

    const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
    console.log(`[Migration] Found ${files.length} migration file(s).`);

    for (const file of files) {
      console.log(`[Migration] Running ${file}...`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      await connection.query(sql);
      console.log(`[Migration] ✓ ${file} applied successfully.`);
    }

    console.log('[Migration] ★ All migrations completed successfully!\n');
  } catch (err) {
    console.error('[Migration] ✗ Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    await connection.end();
  }
}

runMigrations();
