import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';
import type { Role } from '@prisma/client';

export interface AccessPayload {
  sub: string;
  role: Role;
  customerId: string | null;
  exp: number;
}

const b64 = (input: Buffer | string) =>
  Buffer.from(input).toString('base64url');

/** Parses JWT_ACCESS_TTL values like "15m", "1h", "30s" into seconds. */
export function ttlSeconds(ttl: string): number {
  const match = /^(\d+)(ms|s|m|h|d|w|y)$/u.exec(ttl);
  if (!match) return 900;
  const unit = {
    ms: 0.001,
    s: 1,
    m: 60,
    h: 3600,
    d: 86_400,
    w: 604_800,
    y: 31_536_000,
  };
  return Math.max(
    1,
    Math.floor(Number(match[1]) * unit[match[2] as keyof typeof unit]),
  );
}

/** HS256 JWT. */
export function signAccess(
  payload: Omit<AccessPayload, 'exp'>,
  secret: string,
  ttl: string,
): string {
  const header = b64(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = b64(
    JSON.stringify({
      ...payload,
      exp: Math.floor(Date.now() / 1000) + ttlSeconds(ttl),
    }),
  );
  const signature = createHmac('sha256', secret)
    .update(`${header}.${body}`)
    .digest('base64url');
  return `${header}.${body}.${signature}`;
}

export function verifyAccess(
  token: string,
  secret: string,
): AccessPayload | null {
  const [header, body, signature] = token.split('.');
  if (!header || !body || !signature) return null;
  const expected = createHmac('sha256', secret)
    .update(`${header}.${body}`)
    .digest();
  const given = Buffer.from(signature, 'base64url');
  if (given.length !== expected.length || !timingSafeEqual(given, expected))
    return null;
  try {
    const payload = JSON.parse(
      Buffer.from(body, 'base64url').toString(),
    ) as AccessPayload;
    return payload.exp > Date.now() / 1000 ? payload : null;
  } catch {
    return null;
  }
}

export const randomToken = () => randomBytes(32).toString('base64url');
export const sha256 = (value: string) =>
  createHash('sha256').update(value).digest('hex');
