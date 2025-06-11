import { env } from "process";

export default {
  schema: './backend/database/schema/*',
  out: './backend/database/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
  migrations: {
    prefix: 'timestamp',
    table: 'schema_migrations',
    schema: 'public',
  },
  breakpoints: true,
};
