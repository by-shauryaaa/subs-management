import fs from 'node:fs';
import process from 'node:process';
import { inspect } from 'node:util';
import {
  loadEnvironment,
  parseEnvironment,
  type Environment,
} from '../src/config/environment.js';

const sample = {
  DATABASE_URL: 'postgresql://brightloop:brightloop@localhost:5432/brightloop',
  PORT: '4000',
  WEB_URL: 'http://localhost:5173',
  JWT_ACCESS_SECRET: 'change-me',
  JWT_REFRESH_SECRET: 'change-me-too',
  JWT_ACCESS_TTL: '15m',
  REFRESH_TTL_DAYS: '7',
  SMTP_HOST: 'localhost',
  SMTP_PORT: '1025',
  SMTP_USER: '',
  SMTP_PASS: '',
  MAIL_FROM: 'Brightloop Billing <billing@brightloop.local>',
  CRON_ENABLED: 'true',
  SEED_ADMIN_EMAIL: 'admin@brightloop.local',
  SEED_ADMIN_PASSWORD: 'Admin@12345',
};

function validationError(input: unknown): Error {
  try {
    parseEnvironment(input);
  } catch (error: unknown) {
    if (error instanceof Error) return error;
    throw error;
  }
  throw new Error('Expected environment validation to fail');
}

function withMockedLoader(
  input: Record<string, string | undefined>,
  loader: (path: Parameters<typeof fs.readFileSync>[0]) => string,
  assertions: () => void,
): void {
  const originalEnvironment = process.env;
  const originalLoader = fs.readFileSync;
  // Replace the whole object so neither real environment values nor .env are touched.
  process.env = { ...input };
  Object.defineProperty(fs, 'readFileSync', { value: loader });
  try {
    assertions();
  } finally {
    fs.readFileSync = originalLoader;
    process.env = originalEnvironment;
  }
}

describe('parseEnvironment', () => {
  it('accepts the exact documented API sample and returns typed values', () => {
    const environment: Environment = parseEnvironment(sample);
    expect(environment).toEqual({
      ...sample,
      PORT: 4000,
      SMTP_PORT: 1025,
      REFRESH_TTL_DAYS: 7,
      CRON_ENABLED: true,
    });
    expect(sample.PORT).toBe('4000');
  });

  it('parses the explicit string false as false', () => {
    expect(
      parseEnvironment({ ...sample, CRON_ENABLED: 'false' }).CRON_ENABLED,
    ).toBe(false);
  });

  it.each(['', '0', '1', 'yes', 'TRUE', 'False', ' true ', true, false, 0, 1])(
    'rejects a non-contract CRON_ENABLED value: %p',
    (CRON_ENABLED) => {
      expect(() => parseEnvironment({ ...sample, CRON_ENABLED })).toThrow(
        'Invalid configuration: CRON_ENABLED',
      );
    },
  );

  it('defaults only optional SMTP credentials to empty strings', () => {
    const input: Record<string, string | undefined> = { ...sample };
    delete input.SMTP_USER;
    delete input.SMTP_PASS;
    expect(parseEnvironment(input)).toMatchObject({
      SMTP_USER: '',
      SMTP_PASS: '',
    });
    expect(parseEnvironment(sample)).toMatchObject({
      SMTP_USER: '',
      SMTP_PASS: '',
    });
    expect(
      parseEnvironment({
        ...sample,
        SMTP_USER: 'mailer',
        SMTP_PASS: 'smtp-secret',
      }),
    ).toMatchObject({ SMTP_USER: 'mailer', SMTP_PASS: 'smtp-secret' });
  });

  it.each(
    Object.keys(sample).filter(
      (key) => !['SMTP_USER', 'SMTP_PASS'].includes(key),
    ),
  )('requires the documented field %s', (key) => {
    const input: Record<string, string | undefined> = { ...sample };
    delete input[key];
    expect(validationError(input).message).toBe(
      `Invalid configuration: ${key}`,
    );
  });

  it.each([
    ['PORT', '0'],
    ['PORT', '-1'],
    ['PORT', '1.5'],
    ['PORT', '65536'],
    ['PORT', ''],
    ['PORT', 'Infinity'],
    ['PORT', '4000junk'],
    ['SMTP_PORT', '0'],
    ['SMTP_PORT', '65536'],
    ['SMTP_PORT', '2.5'],
    ['REFRESH_TTL_DAYS', '0'],
    ['REFRESH_TTL_DAYS', '-7'],
    ['REFRESH_TTL_DAYS', '1.5'],
    ['REFRESH_TTL_DAYS', '9007199254740992'],
    ['WEB_URL', 'ftp://localhost'],
    ['WEB_URL', 'not-a-url'],
    ['JWT_ACCESS_SECRET', ''],
    ['JWT_REFRESH_SECRET', ''],
    ['JWT_ACCESS_TTL', '15'],
    ['JWT_ACCESS_TTL', '0m'],
    ['JWT_ACCESS_TTL', '-15m'],
    ['JWT_ACCESS_TTL', 'forever'],
    ['SMTP_HOST', ''],
    ['SMTP_HOST', '   '],
    ['MAIL_FROM', 'billing@brightloop.local'],
    ['MAIL_FROM', 'Brightloop Billing <not-an-email>'],
    ['MAIL_FROM', ' <billing@brightloop.local>'],
    [
      'MAIL_FROM',
      'Billing\r\nBcc: other@example.com <billing@brightloop.local>',
    ],
    ['SEED_ADMIN_EMAIL', 'not-an-email'],
    ['SEED_ADMIN_PASSWORD', 'Admin@12'],
    ['SEED_ADMIN_PASSWORD', 'admin@12345'],
    ['SEED_ADMIN_PASSWORD', 'ADMIN@12345'],
    ['SEED_ADMIN_PASSWORD', 'Admin12345'],
  ])('rejects an invalid %s', (key, value) => {
    expect(validationError({ ...sample, [key]: value }).message).toBe(
      `Invalid configuration: ${key}`,
    );
  });

  it.each([
    'mysql://localhost/db',
    'https://localhost/db',
    'postgres:db',
    'invalid',
  ])('rejects a non-PostgreSQL database URL: %s', (DATABASE_URL) => {
    expect(validationError({ ...sample, DATABASE_URL }).message).toBe(
      'Invalid configuration: DATABASE_URL',
    );
  });

  it.each(['postgres', 'postgresql'])(
    'accepts the %s database scheme',
    (scheme) => {
      const DATABASE_URL = `${scheme}://user:password@localhost:5432/db`;
      expect(parseEnvironment({ ...sample, DATABASE_URL }).DATABASE_URL).toBe(
        DATABASE_URL,
      );
    },
  );

  it.each(['1ms', '15s', '15m', '1h', '7d', '2w', '1y'])(
    'accepts a duration of %s',
    (JWT_ACCESS_TTL) => {
      expect(
        parseEnvironment({ ...sample, JWT_ACCESS_TTL }).JWT_ACCESS_TTL,
      ).toBe(JWT_ACCESS_TTL);
    },
  );

  it('accepts HTTPS, inclusive port boundaries and a nine-character password without digits', () => {
    expect(
      parseEnvironment({
        ...sample,
        WEB_URL: 'https://example.com',
        PORT: '1',
        SMTP_PORT: '65535',
        SEED_ADMIN_PASSWORD: 'Password!',
      }),
    ).toMatchObject({
      PORT: 1,
      SMTP_PORT: 65535,
      SEED_ADMIN_PASSWORD: 'Password!',
    });
  });

  it('ignores unrelated process and web variables without requiring extra keys', () => {
    expect(
      parseEnvironment({
        ...sample,
        VITE_API_URL: 'ignored',
        NODE_ENV: 'test',
      }),
    ).toEqual(parseEnvironment(sample));
  });

  it.each([null, undefined, 'secret-root-input', 42, []])(
    'rejects non-object input without exposing it: %p',
    (input) => {
      expect(validationError(input).message).toBe(
        'Invalid configuration: environment',
      );
    },
  );

  it('lists all failing fields once without retaining schema errors or secret values', () => {
    const input = {
      ...sample,
      DATABASE_URL: 'mysql://db-user:private-db-password@localhost/db',
      JWT_ACCESS_SECRET: 'private-access-secret',
      JWT_REFRESH_SECRET: 'private-refresh-secret',
      SMTP_PASS: 'private-smtp-password',
      CRON_ENABLED: 'private-invalid-cron-value',
      SEED_ADMIN_PASSWORD: 'weak',
    };
    const error = validationError(input);
    expect(error.message).toBe(
      'Invalid configuration: DATABASE_URL, CRON_ENABLED, SEED_ADMIN_PASSWORD',
    );
    expect(error.name).toBe('Error');
    expect(error).not.toHaveProperty('issues');
    expect(error).not.toHaveProperty('cause');
    const serialized = `${String(error)} ${JSON.stringify(error)} ${inspect(error)}`;
    for (const value of [
      input.DATABASE_URL,
      'private-db-password',
      input.JWT_ACCESS_SECRET,
      input.JWT_REFRESH_SECRET,
      input.SMTP_PASS,
      input.CRON_ENABLED,
      input.SEED_ADMIN_PASSWORD,
    ]) {
      expect(serialized).not.toContain(value);
    }
  });
});

describe('loadEnvironment', () => {
  it('loads the root .env relative to the module and returns parsed process variables', () => {
    let loadedPath: Parameters<typeof fs.readFileSync>[0];
    withMockedLoader(
      sample,
      (path) => {
        loadedPath = path;
        return '';
      },
      () => {
        expect(loadEnvironment()).toEqual(parseEnvironment(sample));
        expect(loadedPath).toEqual(new URL('../../../.env', import.meta.url));
      },
    );
  });

  it('parses file contents while preserving externally supplied values', () => {
    withMockedLoader(
      { PORT: '4500' },
      () =>
        Object.entries(sample)
          .map(([key, value]) => `${key}=${value}`)
          .join('\n'),
      () => {
        expect(loadEnvironment()).toEqual({
          ...parseEnvironment(sample),
          PORT: 4500,
        });
        expect(process.env.DATABASE_URL).toBeUndefined();
      },
    );
  });

  it('allows a missing .env when all required variables are supplied externally', () => {
    withMockedLoader(
      sample,
      () => {
        throw Object.assign(new Error('sensitive filesystem details'), {
          code: 'ENOENT',
        });
      },
      () => {
        expect(loadEnvironment()).toEqual(parseEnvironment(sample));
      },
    );
  });

  it('still validates externally supplied variables when .env is missing', () => {
    withMockedLoader(
      { ...sample, PORT: undefined },
      () => {
        throw Object.assign(new Error('sensitive filesystem details'), {
          code: 'ENOENT',
        });
      },
      () => {
        expect(() => loadEnvironment()).toThrow('Invalid configuration: PORT');
      },
    );
  });

  it('redacts non-missing-file errors instead of silently ignoring them', () => {
    withMockedLoader(
      sample,
      () => {
        throw Object.assign(new Error('private-file-content'), {
          code: 'EACCES',
        });
      },
      () => {
        expect(() => loadEnvironment()).toThrow(
          new Error('Invalid configuration: unable to load root .env'),
        );
      },
    );
  });
});
