//DONT FORGET TO LOAD env variables
import { defineConfig } from 'drizzle-kit';

//Configured for PostgreSQL with node-postgres
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/database/schema/index.ts',
  out: './src/database/migrations',
  dbCredentials: {
    url: process.env.DATABASE_URL as string,
  },
  strict: true,
  verbose: true,
});
