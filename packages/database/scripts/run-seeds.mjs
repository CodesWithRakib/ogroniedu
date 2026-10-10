import { SeedRunner } from '../dist/index.js';

const runner = new SeedRunner({
  database: process.env.DB_NAME || 'ogroniedu_dev',
});

async function main() {
  console.log(`Starting seed data execution on database: ${process.env.DB_NAME || 'ogroniedu_dev'}...`);
  await runner.runSeeds();
  console.log('Database seeds executed successfully.');
}

main().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
