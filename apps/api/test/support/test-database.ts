import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import pg from 'pg';
import { loadEnvironment } from '../../src/config/environment.js';

export interface TestDatabase {
  /** Prisma client bound to the isolated schema. */
  client: PrismaClient;
  /** Raw pg client on the default schema, for catalog queries. */
  admin: pg.Client;
  schema: string;
  /** Runs `prisma migrate deploy` against the isolated schema; returns its output. */
  deployMigrations(): string;
  setup(): Promise<void>;
  teardown(): Promise<void>;
}

/** An isolated Postgres schema per test file, dropped on teardown. */
export function createTestDatabase(): TestDatabase {
  const sourceURL = loadEnvironment().DATABASE_URL;
  const schema = `brightloop_test_${randomUUID().replaceAll('-', '')}`;
  const migrationURL = new URL(sourceURL);
  migrationURL.searchParams.set('schema', schema);
  const client = new PrismaClient({
    adapter: new PrismaPg({ connectionString: sourceURL }, { schema }),
  });
  const admin = new pg.Client({
    connectionString: sourceURL,
    connectionTimeoutMillis: 10_000,
  });
  let adminConnected = false;

  function deployMigrations(): string {
    return execFileSync(
      process.execPath,
      [
        fileURLToPath(
          new URL('../../node_modules/prisma/build/index.js', import.meta.url),
        ),
        'migrate',
        'deploy',
      ],
      {
        cwd: fileURLToPath(new URL('../../', import.meta.url)),
        env: { ...process.env, DATABASE_URL: migrationURL.toString() },
        timeout: 45_000,
        encoding: 'utf8',
        stdio: 'pipe',
      },
    );
  }

  async function dropSchema(): Promise<void> {
    if (!/^brightloop_test_[0-9a-f]{32}$/u.test(schema)) {
      throw new Error('Refusing to drop an unowned schema');
    }
    if (adminConnected) {
      const { rows } = await admin.query<{ statement: string }>(
        `SELECT format('DROP SCHEMA %I CASCADE', $1::text) AS statement
         FROM pg_catalog.pg_namespace WHERE nspname = $1`,
        [schema],
      );
      if (rows[0]) await admin.query(rows[0].statement);
    }
  }

  return {
    client,
    admin,
    schema,
    deployMigrations,
    async setup() {
      await admin.connect();
      adminConnected = true;
      deployMigrations();
      await client.$connect();
    },
    async teardown() {
      try {
        await client.$disconnect();
      } finally {
        try {
          await dropSchema();
        } finally {
          await admin.end();
        }
      }
    },
  };
}
