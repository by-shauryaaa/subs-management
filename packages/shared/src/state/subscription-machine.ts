import type { SubscriptionStatus } from '../enums.js';

export type SubscriptionAction =
  | 'send'
  | 'revert'
  | 'confirm'
  | 'cancel'
  | 'activate'
  | 'pause'
  | 'resume'
  | 'close'
  | 'renew';

export interface PlanFlags {
  pausable: boolean;
  closable: boolean;
  renewable: boolean;
}

/** SUB-03 transition table: action → [allowed from statuses, resulting status]. */
export const SUBSCRIPTION_TRANSITIONS: Record<
  SubscriptionAction,
  { from: SubscriptionStatus[]; to: SubscriptionStatus | null }
> = {
  send: { from: ['DRAFT'], to: 'QUOTATION' },
  revert: { from: ['QUOTATION'], to: 'DRAFT' },
  confirm: { from: ['DRAFT', 'QUOTATION'], to: 'CONFIRMED' },
  cancel: { from: ['DRAFT', 'QUOTATION', 'CONFIRMED'], to: 'CLOSED' },
  activate: { from: ['CONFIRMED'], to: 'ACTIVE' },
  pause: { from: ['ACTIVE'], to: 'PAUSED' },
  resume: { from: ['PAUSED'], to: 'ACTIVE' },
  close: { from: ['ACTIVE', 'PAUSED'], to: 'CLOSED' },
  // Renew creates a new DRAFT subscription; the original keeps its status.
  renew: { from: ['ACTIVE', 'PAUSED', 'CLOSED'], to: null },
};

export function canTransition(
  status: SubscriptionStatus,
  action: SubscriptionAction,
  plan: PlanFlags,
  context: { renewed?: boolean } = {},
): { ok: true } | { ok: false; code: string } {
  if (!SUBSCRIPTION_TRANSITIONS[action].from.includes(status)) {
    return { ok: false, code: 'INVALID_TRANSITION' };
  }
  if (action === 'pause' && !plan.pausable)
    return { ok: false, code: 'PLAN_NOT_PAUSABLE' };
  if (action === 'close' && !plan.closable)
    return { ok: false, code: 'PLAN_NOT_CLOSABLE' };
  if (action === 'renew' && !plan.renewable)
    return { ok: false, code: 'PLAN_NOT_RENEWABLE' };
  if (action === 'renew' && context.renewed)
    return { ok: false, code: 'ALREADY_RENEWED' };
  return { ok: true };
}

export function allowedActions(
  status: SubscriptionStatus,
  plan: PlanFlags,
  context: { renewed?: boolean } = {},
): SubscriptionAction[] {
  return (Object.keys(SUBSCRIPTION_TRANSITIONS) as SubscriptionAction[]).filter(
    (action) => canTransition(status, action, plan, context).ok,
  );
}
