import { restoreDoctor } from '../services/admin.service.js';
import { pool } from '../config/db.js';

const adminUserId = 11; // admin.manoj user ID
const doctorUserIds = [1, 2, 3, 4]; // Dr. Priya Sharma, Dr. Rajesh Kulkarni, Dr. Ananya Iyer, Dr. Vikram Venkatesh

async function restoreAllDoctors() {
  console.log('Restoring the four existing doctors...\n');
  for (const id of doctorUserIds) {
    try {
      const result = await restoreDoctor(adminUserId, id);
      console.log(`✓ ${result.doctorName}: action=${result.action}, status=${result.status}, isAvailable=${result.isAvailable}`);
    } catch (err) {
      console.error(`✗ Doctor user_id=${id}: ${err.message}`);
    }
  }
  console.log('\nDone.');
  await pool.end();
}

restoreAllDoctors();
