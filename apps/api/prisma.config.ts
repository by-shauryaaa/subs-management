import { fileURLToPath } from 'node:url';
import { defineConfig, env } from 'prisma/config';

try {
  process.loadEnvFile(new URL('../../.env', import.meta.url));
} catch (error: unknown) {
  if (
    typeof error !== 'object' ||
    error === null ||
    !('code' in error) ||
    error.code !== 'ENOENT'
  ) {
    throw error;
  }
}

export default defineConfig({
  schema: fileURLToPath(new URL('./prisma/schema.prisma', import.meta.url)),
  migrations: {
    path: fileURLToPath(new URL('./prisma/migrations', import.meta.url)),
  },
  datasource: { url: env('DATABASE_URL') },
});
