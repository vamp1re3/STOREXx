require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function main() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log('Connected to Neon');

  const recreateSql = fs.readFileSync(path.join(process.cwd(), 'recreate-db.sql'), 'utf8');
  await client.query(recreateSql);
  console.log('Recreate script applied');

  const migrationSql = fs.readFileSync(path.join(process.cwd(), 'migration.sql'), 'utf8');
  await client.query(migrationSql);
  console.log('Migration script applied');

  const tables = await client.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name"
  );
  console.log('Tables:', tables.rows.map((row) => row.table_name).join(', '));

  const checks = await client.query(
    "SELECT table_name, column_name FROM information_schema.columns WHERE table_schema='public' AND ((table_name='posts' AND column_name='media_type') OR (table_name='messages' AND column_name IN ('image_url','media_type')) OR (table_name='blocks' AND column_name IN ('blocker_id','blocked_id'))) ORDER BY table_name, column_name"
  );
  console.log('Verified columns:', checks.rows.map((row) => `${row.table_name}.${row.column_name}`).join(', '));

  await client.end();
}

main().catch(async (error) => {
  console.error('DB reset failed:', error.message);
  process.exit(1);
});
