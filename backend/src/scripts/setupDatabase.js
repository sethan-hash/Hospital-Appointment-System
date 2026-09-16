import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import { env } from '../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../..');

async function runSqlFile(connection, relativeFilePath, description) {
  const filePath = path.resolve(projectRoot, relativeFilePath);
  console.log(`[Database Setup] Reading ${description} from: ${filePath}`);
  const sqlContent = fs.readFileSync(filePath, 'utf8');

  console.log(`[Database Setup] Executing ${description}...`);
  await connection.query(sqlContent);
  console.log(`[Database Setup] ✓ ${description} executed successfully.`);
}

async function verifyTablesAndRows(connection) {
  console.log('\n[Database Setup] Verifying tables and row counts:');
  const [tables] = await connection.query('SHOW TABLES;');
  const tableKey = Object.keys(tables[0])[0];

  const expectedTables = [
    'users',
    'patients',
    'doctors',
    'doctor_schedules',
    'appointments',
    'medical_records',
    'vitals',
    'medications',
    'reviews',
    'invoices',
    'resources',
  ];

  const existingTableNames = tables.map((row) => row[tableKey]);
  console.log(`[Database Setup] Total tables found: ${existingTableNames.length}`);

  for (const tableName of expectedTables) {
    if (existingTableNames.includes(tableName)) {
      const [countResult] = await connection.query(`SELECT COUNT(*) AS count FROM \`${tableName}\`;`);
      const rowCount = countResult[0].count;
      console.log(`  ✓ Table '${tableName}': ${rowCount} records`);
    } else {
      console.error(`  ✗ Missing table: '${tableName}'`);
    }
  }
}

async function setupDatabase() {
  console.log('[Database Setup] Connecting to MySQL server...');

  // Connect without database initially so we can create it if missing
  const connection = await mysql.createConnection({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    multipleStatements: true,
  });

  try {
    console.log('[Database Setup] Connected to MySQL successfully.');

    // 1. Run Schema
    await runSqlFile(connection, 'database/schema.sql', 'schema.sql');

    // Select the created database
    await connection.changeUser({ database: env.db.database });

    // 2. Run Seed
    await runSqlFile(connection, 'database/seed.sql', 'seed.sql');

    // 3. Verify
    await verifyTablesAndRows(connection);

    console.log('\n[Database Setup] ★ MedLink Care database initialized successfully!\n');
  } catch (error) {
    console.error('[Database Setup] ✗ Error setting up database:', error);
    process.exitCode = 1;
  } finally {
    await connection.end();
  }
}

setupDatabase();
