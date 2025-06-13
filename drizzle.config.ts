import { defineConfig } from 'drizzle-kit';
import { config } from 'dotenv';

// Load environment variables from .env file
config();

export default defineConfig({
  schema: './backend/database/schema/index.ts',
  out: './backend/database/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
  migrations: {
    prefix: 'timestamp',
    table: 'schema_migrations',
    schema: 'public',
  },
  breakpoints: true,
});