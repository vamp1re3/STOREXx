import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Neon-specific optimizations
  max: 10, // Maximum number of connections
  idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
  ssl: {
    rejectUnauthorized: false, // Required for Neon
  },
});

// Test the connection
pool.on('connect', (client) => {
  console.log('Connected to Neon database');
});

pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
});

export default pool;