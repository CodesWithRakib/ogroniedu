import { SeedRunner } from '../dist/index.js';

const targetDb = process.env.DB_NAME || (process.env.DATABASE_URL ? 'configured database' : 'ogroniedu_dev');
const runner = new SeedRunner(process.env.DATABASE_URL ? {} : { database: targetDb });

async function main() {
  console.log(`Starting seed data execution on database: ${process.env.DB_NAME || 'ogroniedu_dev'}...`);
  await runner.runSeeds();
  console.log('Database seeds executed successfully.');
}

main().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
