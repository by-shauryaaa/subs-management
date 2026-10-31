/** Default pagination limits */
export const PAGE_SIZE_DEFAULT = 25;
export const PAGE_SIZE_MAX = 100;

/**
 * Password validation rule per PRD AUTH-01:
 * - At least 9 characters long ("more than eight")
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one special character (any non-alphanumeric character)
 */
export const PASSWORD_MIN_LENGTH = 9;
export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{9,}$/;
export const PASSWORD_RULE_MESSAGE =
  'Password must be at least 9 characters long and contain at least one uppercase letter, one lowercase letter, and one special character.';

/** System-wide default settings per PRD §6.12 ADM-01 */
export const DEFAULT_CURRENCY = 'INR';
export const DEFAULT_TIMEZONE = 'Asia/Kolkata';
export const DEFAULT_AUTO_CONFIRM_INVOICES = true;
export const DEFAULT_QUOTATION_VALIDITY_DAYS = 30;
export const DEFAULT_INVOICE_FOOTER = 'Thank you for your business.';

/** Auth and security constants */
export const AUTH_RATE_LIMIT_TTL_MS = 60_000;
export const AUTH_RATE_LIMIT_MAX = 5;
export const JWT_ACCESS_TTL_SECONDS = 15 * 60; // 15 minutes
export const REFRESH_TOKEN_TTL_DAYS = 7;
export const PASSWORD_RESET_TOKEN_TTL_MINUTES = 30;
export const INVITE_TOKEN_TTL_HOURS = 72;
