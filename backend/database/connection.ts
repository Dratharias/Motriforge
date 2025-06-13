import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { config } from 'dotenv';
import * as schema from './schema';

// Load environment variables if not already loaded
if (!process.env.DATABASE_URL) {
  config();
}

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required. Please check your .env file.');
}

// PostgreSQL connection with optimized settings
const client = postgres(connectionString, {
  ssl: process.env.NODE_ENV === 'production' ? 'require' : false,
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
  prepare: false,
  types: {
    bigint: postgres.BigInt
  }
});

export const db = drizzle(client, {
  schema,
  logger: process.env.NODE_ENV === 'development'
});

export type Database = typeof db;

// Graceful shutdown
process.on('beforeExit', async () => {
  await client.end();
});

export { client };