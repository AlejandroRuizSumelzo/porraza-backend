import type { PoolConfig } from 'pg';
import { config as dotenvConfig } from 'dotenv';

dotenvConfig();

export const databaseConfig: PoolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'porraza_db',
  user: process.env.DB_USER || 'posgress',
  password: process.env.DB_PASSWORD || 'postgres',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};
