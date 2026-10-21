import { DataSource } from 'typeorm';

const databaseUrl = process.env.DATABASE_URL;
const isSsl =
  process.env.DB_SSL === 'true' ||
  Boolean(databaseUrl && databaseUrl.includes('sslmode=require')) ||
  process.env.NODE_ENV === 'production';

export const AppDataSource = new DataSource(
  databaseUrl
    ? {
        type: 'postgres',
        url: databaseUrl,
        ssl: isSsl ? { rejectUnauthorized: false } : false,
        synchronize: false,
        logging: process.env.NODE_ENV !== 'production',
        entities: [],
        migrations: ['dist/migrations/*.js'],
        subscribers: [],
      }
    : {
        type: 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT) || 5432,
        username: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD || 'password',
        database: process.env.DB_NAME || 'ogroniedu_dev',
        ssl: isSsl ? { rejectUnauthorized: false } : false,
        synchronize: false, // Strictly false: migrations are the single source of truth
        logging: process.env.NODE_ENV !== 'production',
        entities: [],
        migrations: ['dist/migrations/*.js'],
        subscribers: [],
      },
);
