import * as dotenv from 'dotenv';
import { defineConfig } from 'prisma/config';
import * as path from 'path';

if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: path.resolve(__dirname, '../.env') });
}

export default defineConfig({
  schema: 'prisma/schema',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/schema/seed.ts',
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
