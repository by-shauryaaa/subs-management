export const Role = {
  ADMIN: 'ADMIN',
  STAFF: 'STAFF',
  CUSTOMER: 'CUSTOMER',
} as const;
export type Role = (typeof Role)[keyof typeof Role];
export const ROLES = [Role.ADMIN, Role.STAFF, Role.CUSTOMER] as const;

export const AuthTokenType = {
  PASSWORD_RESET: 'PASSWORD_RESET',
  INVITE: 'INVITE',
} as const;
export type AuthTokenType = (typeof AuthTokenType)[keyof typeof AuthTokenType];
export const AUTH_TOKEN_TYPES = [
  AuthTokenType.PASSWORD_RESET,
  AuthTokenType.INVITE,
] as const;

export const ProductType = {
  SERVICE: 'SERVICE',
  GOODS: 'GOODS',
} as const;
export type ProductType = (typeof ProductType)[keyof typeof ProductType];
export const PRODUCT_TYPES = [ProductType.SERVICE, ProductType.GOODS] as const;

export const BillingPeriod = {
  DAILY: 'DAILY',
  WEEKLY: 'WEEKLY',
  MONTHLY: 'MONTHLY',
  YEARLY: 'YEARLY',
} as const;
export type BillingPeriod = (typeof BillingPeriod)[keyof typeof BillingPeriod];
export const BILLING_PERIODS = [
  BillingPeriod.DAILY,
  BillingPeriod.WEEKLY,
  BillingPeriod.MONTHLY,
  BillingPeriod.YEARLY,
] as const;

export const SubscriptionStatus = {
  DRAFT: 'DRAFT',
  QUOTATION: 'QUOTATION',
  CONFIRMED: 'CONFIRMED',
  ACTIVE: 'ACTIVE',
  PAUSED: 'PAUSED',
  CLOSED: 'CLOSED',
} as const;
export type SubscriptionStatus =
  (typeof SubscriptionStatus)[keyof typeof SubscriptionStatus];
export const SUBSCRIPTION_STATUSES = [
  SubscriptionStatus.DRAFT,
  SubscriptionStatus.QUOTATION,
  SubscriptionStatus.CONFIRMED,
  SubscriptionStatus.ACTIVE,
  SubscriptionStatus.PAUSED,
  SubscriptionStatus.CLOSED,
] as const;

export const InvoiceStatus = {
  DRAFT: 'DRAFT',
  CONFIRMED: 'CONFIRMED',
  PAID: 'PAID',
  CANCELLED: 'CANCELLED',
} as const;
export type InvoiceStatus = (typeof InvoiceStatus)[keyof typeof InvoiceStatus];
export const INVOICE_STATUSES = [
  InvoiceStatus.DRAFT,
  InvoiceStatus.CONFIRMED,
  InvoiceStatus.PAID,
  InvoiceStatus.CANCELLED,
] as const;

export const DiscountType = {
  FIXED: 'FIXED',
  PERCENTAGE: 'PERCENTAGE',
} as const;
export type DiscountType = (typeof DiscountType)[keyof typeof DiscountType];
export const DISCOUNT_TYPES = [
  DiscountType.FIXED,
  DiscountType.PERCENTAGE,
] as const;

export const DiscountScope = {
  PRODUCTS: 'PRODUCTS',
  SUBSCRIPTION: 'SUBSCRIPTION',
} as const;
export type DiscountScope = (typeof DiscountScope)[keyof typeof DiscountScope];
export const DISCOUNT_SCOPES = [
  DiscountScope.PRODUCTS,
  DiscountScope.SUBSCRIPTION,
] as const;

export const PaymentMethod = {
  BANK_TRANSFER: 'BANK_TRANSFER',
  UPI: 'UPI',
  CARD: 'CARD',
  CASH: 'CASH',
  CHEQUE: 'CHEQUE',
  OTHER: 'OTHER',
} as const;
export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];
export const PAYMENT_METHODS = [
  PaymentMethod.BANK_TRANSFER,
  PaymentMethod.UPI,
  PaymentMethod.CARD,
  PaymentMethod.CASH,
  PaymentMethod.CHEQUE,
  PaymentMethod.OTHER,
] as const;

export const BillingRunTrigger = {
  SCHEDULED: 'SCHEDULED',
  MANUAL: 'MANUAL',
} as const;
export type BillingRunTrigger =
  (typeof BillingRunTrigger)[keyof typeof BillingRunTrigger];
export const BILLING_RUN_TRIGGERS = [
  BillingRunTrigger.SCHEDULED,
  BillingRunTrigger.MANUAL,
] as const;
