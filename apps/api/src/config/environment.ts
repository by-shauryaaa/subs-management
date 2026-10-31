import fs from 'node:fs';
import process from 'node:process';
import { parseEnv } from 'node:util';
import { z } from 'zod';

const nonemptyString = z.string().refine((value) => value.trim().length > 0);
const positiveInteger = z
  .string()
  .regex(/^\d+$/u)
  .transform(Number)
  .pipe(z.number().int().positive());
const port = positiveInteger.pipe(z.number().max(65_535));
const email = z.email();

function urlWithProtocols(protocols: readonly string[]) {
  return z.string().refine((value) => {
    const url = URL.parse(value);
    return (
      url !== null &&
      url.hostname.length > 0 &&
      protocols.includes(url.protocol)
    );
  });
}

const environmentSchema = z.object({
  DATABASE_URL: urlWithProtocols(['postgresql:', 'postgres:']),
  PORT: port,
  WEB_URL: urlWithProtocols(['http:', 'https:']),
  JWT_ACCESS_SECRET: nonemptyString,
  JWT_REFRESH_SECRET: nonemptyString,
  JWT_ACCESS_TTL: z.string().regex(/^[1-9]\d*(?:ms|s|m|h|d|w|y)$/u),
  REFRESH_TTL_DAYS: positiveInteger,
  SMTP_HOST: nonemptyString,
  SMTP_PORT: port,
  SMTP_USER: z.string().default(''),
  SMTP_PASS: z.string().default(''),
  MAIL_FROM: z.string().refine((value) => {
    const match = /^([^<>\r\n]+)\s+<([^<>\s]+)>$/u.exec(value);
    return (
      match !== null &&
      (match[1]?.trim().length ?? 0) > 0 &&
      email.safeParse(match[2]).success
    );
  }),
  CRON_ENABLED: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true'),
  SEED_ADMIN_EMAIL: email,
  SEED_ADMIN_PASSWORD: z
    .string()
    .min(9)
    .regex(/[A-Z]/u)
    .regex(/[a-z]/u)
    .regex(/[^a-zA-Z0-9]/u),
});

export type Environment = z.infer<typeof environmentSchema>;

export function parseEnvironment(input: unknown): Environment {
  const result = environmentSchema.safeParse(input);
  if (!result.success) {
    const fields = [
      ...new Set(
        result.error.issues.map(
          (issue) => issue.path.join('.') || 'environment',
        ),
      ),
    ];
    // Never expose Zod issues or their messages: they can contain input values.
    throw new Error(`Invalid configuration: ${fields.join(', ')}`);
  }
  return result.data;
}

export function loadEnvironment(): Environment {
  let loadFailed = false;
  let fileEnvironment: Record<string, string | undefined> = {};
  try {
    // Explicit parsing also works with Jest's isolated process.env object.
    fileEnvironment = parseEnv(
      fs.readFileSync(new URL('../../../../.env', import.meta.url), 'utf8'),
    );
  } catch (error: unknown) {
    loadFailed =
      typeof error !== 'object' ||
      error === null ||
      !('code' in error) ||
      error.code !== 'ENOENT';
  }
  if (loadFailed) {
    throw new Error('Invalid configuration: unable to load root .env');
  }
  return parseEnvironment({ ...fileEnvironment, ...process.env });
}
