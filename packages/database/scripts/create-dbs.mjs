import pg from 'pg';
const { Client } = pg;

async function setup() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: process.env.DB_PASSWORD || 'password',
  });

  await client.connect();
  console.log('Connected to PostgreSQL server');

  for (const db of ['ogroniedu_dev', 'ogroniedu_test']) {
    const res = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [db]);
    if (res.rows.length === 0) {
      await client.query(`CREATE DATABASE ${db};`);
      console.log(`Successfully created database: ${db}`);
    } else {
      console.log(`Database already exists: ${db}`);
    }
  }

  await client.end();
}

setup().catch((err) => {
  console.error(err);
  process.exit(1);
});
