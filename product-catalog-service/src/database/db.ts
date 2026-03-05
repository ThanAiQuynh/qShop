import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';
import { Pool } from 'pg';
import { Logger } from '@nestjs/common';

const logger = new Logger('Database');
logger.log('Initializing Drizzle with DATABASE_URL:', process.env.DATABASE_URL ? 'EXISTS' : 'MISSING');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 15,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export const db = drizzle(pool, { schema });
